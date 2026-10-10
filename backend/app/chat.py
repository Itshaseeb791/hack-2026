import json
import os
import base64
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from sqlmodel import Session, select

from app.models import get_session, Listing, Organization
from app.listings import search_listings, _to_out, create_listing_internal
from app.reservations import reserve_listing_internal

router = APIRouter()

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_KEY")
client = OpenAI(api_key=DEEPSEEK_KEY, base_url="https://api.deepseek.com") if DEEPSEEK_KEY else None

# Enhanced tools with actions
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_listings",
            "description": "Search food currently available to this user on SaveFood.",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "Food type or dish, e.g. biryani, bread, sandwiches"},
                    "max_price": {"type": "number", "description": "Maximum price per unit in PKR"},
                    "free_only": {"type": "boolean", "description": "Only show free (Rs 0) food"},
                    "area": {"type": "string", "description": "Lahore area or restaurant name, e.g. Gulberg"},
                    "expiring_within_hours": {"type": "number", "description": "Only food expiring within this many hours"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "reserve_food",
            "description": "Reserve food for a buyer. Call this when user confirms they want to reserve.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string", "description": "ID of the listing to reserve"},
                    "quantity": {"type": "number", "description": "Number of units to reserve"},
                    "buyer_name": {"type": "string", "description": "Name of the buyer"},
                },
                "required": ["listing_id", "quantity", "buyer_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "claim_food",
            "description": "Claim food for an organization. Call this when org confirms they want to claim.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "string", "description": "ID of the listing to claim"},
                    "quantity": {"type": "number", "description": "Number of units to claim"},
                    "organization_name": {"type": "string", "description": "Name of the organization"},
                },
                "required": ["listing_id", "quantity", "organization_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_listing",
            "description": "Create a new food listing. Used when vendor describes food they want to post.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vendor_name": {"type": "string", "description": "Name of the vendor/restaurant"},
                    "title": {"type": "string", "description": "Food item title"},
                    "quantity": {"type": "number", "description": "Number of units available"},
                    "original_price": {"type": "number", "description": "Original price per unit in PKR"},
                    "current_price": {"type": "number", "description": "Discounted price per unit in PKR"},
                    "pickup_location": {"type": "string", "description": "Pickup location"},
                    "expiry_hours": {"type": "number", "description": "Hours until food expires (default 4)"},
                },
                "required": ["vendor_name", "title", "quantity", "original_price", "current_price", "pickup_location"],
            },
        },
    },
]

MAX_TOOL_ROUNDS = 5

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    role: str  # "buyer" | "org" | "vendor" | "donor"
    messages: list[ChatMessage]
    image_base64: Optional[str] = None  # For image uploads

def _system_prompt(role: str) -> str:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    
    if role == "buyer":
        audience = "You help BUYERS find and reserve discounted restaurant surplus food. You CAN reserve food for them after they confirm."
    elif role == "org":
        audience = "You help ORGANIZATIONS (shelters/orphanages) find and claim free or subsidized food. You CAN claim food for them after they confirm."
    elif role == "vendor":
        audience = "You help VENDORS post their surplus food listings. You CAN create listings for them based on their description."
    else:  # donor
        audience = "You help DONORS sponsor food for organizations. You CAN help them find food to sponsor."
    
    return (
        f"You are SaveFood's AI assistant in Lahore, Pakistan. {audience} "
        "Always search first before answering questions about available food. "
        "Reply in the same language the user writes: English, Urdu, or Roman Urdu. "
        "Show prices as 'Rs 180' in PKR. "
        "IMPORTANT: Before taking ANY action (reserve, claim, create), ask for confirmation with 'yes' or 'no'. "
        "Only call action functions after the user explicitly confirms with 'yes', 'haan', 'ji', or similar. "
        "After successful actions, provide the pickup code and details. "
        f"Current time: {now}."
    )

def _execute_tool(tool_name: str, args: dict, session: Session, role: str) -> dict:
    """Execute agent tool and return result"""
    try:
        if tool_name == "search_listings":
            results = search_listings(
                session, role,
                keyword=args.get("keyword"),
                max_price=args.get("max_price"),
                free_only=args.get("free_only"),
                area=args.get("area"),
                expiring_within_hours=args.get("expiring_within_hours"),
                limit=10,
            )
            listings = [_to_out(l, role) for l in results]
            return {"success": True, "listings": [l.model_dump(mode="json") for l in listings]}
        
        elif tool_name == "reserve_food":
            result = reserve_listing_internal(
                session,
                listing_id=args["listing_id"],
                name=args["buyer_name"],
                qty=args["quantity"],
            )
            return {"success": True, "pickup_code": result["pickup_code"], "message": f"Reserved! Pickup code: {result['pickup_code']}"}
        
        elif tool_name == "claim_food":
            result = reserve_listing_internal(
                session,
                listing_id=args["listing_id"],
                name=args["organization_name"],
                qty=args["quantity"],
            )
            return {"success": True, "pickup_code": result["pickup_code"], "message": f"Claimed! Pickup code: {result['pickup_code']}"}
        
        elif tool_name == "create_listing":
            expiry_hours = args.get("expiry_hours", 4)
            expiry_time = datetime.utcnow() + timedelta(hours=expiry_hours)
            
            # Create placeholder listing (without image for now)
            listing_data = {
                "source": "restaurant",
                "vendor_name": args["vendor_name"],
                "title": args["title"],
                "qty": args["quantity"],
                "original_price": args["original_price"],
                "current_price": args["current_price"],
                "pickup_location": args["pickup_location"],
                "expiry_time": expiry_time,
                "audience": "public",
                "image_url": "/uploads/placeholder.jpg",  # Placeholder
            }
            
            listing = Listing(**listing_data)
            session.add(listing)
            session.commit()
            session.refresh(listing)
            
            return {"success": True, "listing_id": str(listing.id), "message": f"Listing created! ID: {listing.id}"}
        
        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def _run_tool_loop(role: str, messages: list[dict], session: Session) -> tuple[list[dict], list]:
    last_listings = []
    
    for round_num in range(MAX_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            tools=TOOLS,
        )
        
        choice = response.choices[0]
        if choice.finish_reason != "tool_calls" or not choice.message.tool_calls:
            break

        messages.append({
            "role": "assistant",
            "content": choice.message.content or "",
            "tool_calls": [tc.model_dump() for tc in choice.message.tool_calls],
        })

        for tool_call in choice.message.tool_calls:
            try:
                args = json.loads(tool_call.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            
            result = _execute_tool(tool_call.function.name, args, session, role)
            
            if result.get("listings"):
                last_listings = result["listings"]
            
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result),
            })

    return messages, last_listings

@router.post("/chat")
def chat(body: ChatRequest, session: Session = Depends(get_session)):
    if client is None:
        raise HTTPException(500, "DEEPSEEK_KEY not configured")
    if body.role not in {"buyer", "org", "vendor", "donor"}:
        raise HTTPException(422, "role must be buyer/org/vendor/donor")

    messages = [{"role": "system", "content": _system_prompt(body.role)}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages]

    def event_stream():
        messages_after_tools, listings = _run_tool_loop(body.role, messages, session)

        if listings:
            listings_json = json.dumps(listings)
            yield f"event: listings\ndata: {listings_json}\n\n"

        stream = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages_after_tools,
            stream=True,
        )
        
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"event: token\ndata: {json.dumps({'text': delta})}\n\n"

        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
