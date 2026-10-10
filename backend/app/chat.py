import json
import os
import base64
import uuid
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from sqlmodel import Session, select

from app.models import get_session, Organization, Listing
from app.listings import search_listings, _to_out, create_listing_internal, UPLOAD_DIR
from app.reservations import reserve_listing_core

router = APIRouter()

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_KEY")
client = OpenAI(api_key=DEEPSEEK_KEY, base_url="https://api.deepseek.com") if DEEPSEEK_KEY else None

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
            "description": "Reserve food for a buyer. Call this only after the user has explicitly confirmed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "integer", "description": "ID of the listing to reserve"},
                    "quantity": {"type": "integer", "description": "Number of units to reserve"},
                    "buyer_name": {"type": "string", "description": "Name of the buyer, for the pickup code"},
                },
                "required": ["listing_id", "quantity", "buyer_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "claim_food",
            "description": "Claim food for an organization. Call this only after the org has explicitly confirmed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "integer", "description": "ID of the listing to claim"},
                    "quantity": {"type": "integer", "description": "Number of units to claim"},
                    "organization_name": {"type": "string", "description": "Exact registered name of the organization"},
                },
                "required": ["listing_id", "quantity", "organization_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_listing",
            "description": "Create a new surplus food listing. Used when a vendor describes food they want to post. If the user sent a photo, it will be attached.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vendor_name": {"type": "string", "description": "Name of the vendor/restaurant"},
                    "title": {"type": "string", "description": "Food item title"},
                    "quantity": {"type": "integer", "description": "Number of units available"},
                    "original_price": {"type": "number", "description": "Original price per unit in PKR"},
                    "current_price": {"type": "number", "description": "Discounted price per unit in PKR"},
                    "pickup_location": {"type": "string", "description": "Pickup location"},
                    "expiry_hours": {"type": "number", "description": "Hours until food expires (default 4)"},
                },
                "required": ["vendor_name", "title", "quantity", "original_price", "current_price", "pickup_location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "sponsor_listing",
            "description": "Sponsor units of an existing public restaurant listing so they move to the orgs-only feed. Call this only after the donor has explicitly confirmed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "listing_id": {"type": "integer", "description": "ID of the listing to sponsor"},
                    "donor_name": {"type": "string", "description": "Name of the donor"},
                    "units": {"type": "integer", "description": "Number of units to sponsor"},
                    "sponsor_percentage": {"type": "integer", "description": "Percent of the price the donor covers (1-100)"},
                },
                "required": ["listing_id", "donor_name", "units", "sponsor_percentage"],
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
        audience = "You help VENDORS post their surplus food listings. You CAN create listings for them. If they send a photo, use it for the listing."
    else:  # donor
        audience = "You help DONORS sponsor food for organizations. You CAN sponsor existing listings after they confirm."

    return (
        f"You are SaveFood's AI assistant in Lahore, Pakistan. {audience} "
        "Always search first before answering questions about available food. "
        "Reply in the same language the user writes: English, Urdu, or Roman Urdu. "
        "Show prices as 'Rs 180' in PKR. "
        "CRITICAL: Before taking ANY action (reserve, claim, create, sponsor), ask for confirmation with 'yes' or 'no'. "
        "Only call action functions AFTER the user explicitly confirms with 'yes', 'haan', 'ji', 'theek hai', or similar affirmative. "
        "After successful actions, provide the pickup code and clear instructions. "
        f"Current time: {now}."
    )


def _save_uploaded_image(image_base64: str) -> str:
    """Save base64 image and return URL path"""
    try:
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]

        image_data = base64.b64decode(image_base64)
        filename = f"{uuid.uuid4()}.jpg"
        filepath = Path(UPLOAD_DIR) / filename

        Path(UPLOAD_DIR).mkdir(exist_ok=True)
        with open(filepath, 'wb') as f:
            f.write(image_data)

        return f"/uploads/{filename}"
    except Exception as e:
        print(f"Image save error: {e}")
        return "/uploads/placeholder.jpg"


def _execute_tool(tool_name: str, args: dict, session: Session, role: str, uploaded_image_url: Optional[str] = None) -> dict:
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
            result = reserve_listing_core(
                session,
                listing_id=int(args["listing_id"]),
                role="buyer",
                qty=int(args["quantity"]),
                name=args["buyer_name"],
            )
            return {
                "success": True,
                "pickup_code": result.pickup_code,
                "message": f"Reserved! Pickup code: {result.pickup_code}. Show this at {result.pickup_location}.",
            }

        elif tool_name == "claim_food":
            org = session.exec(
                select(Organization).where(Organization.name.ilike(args["organization_name"]))
            ).first()
            if not org:
                return {"success": False, "error": f"No organization registered as '{args['organization_name']}'. Check the exact name."}
            result = reserve_listing_core(
                session,
                listing_id=int(args["listing_id"]),
                role="org",
                qty=int(args["quantity"]),
                org_id=org.id,
            )
            return {
                "success": True,
                "pickup_code": result.pickup_code,
                "message": f"Claimed for {org.name}! Pickup code: {result.pickup_code}. Show this at {result.pickup_location}.",
            }

        elif tool_name == "create_listing":
            expiry_time = datetime.utcnow() + timedelta(hours=args.get("expiry_hours", 4))
            listing = create_listing_internal(
                session,
                source="restaurant",
                title=args["title"],
                qty=int(args["quantity"]),
                pickup_location=args["pickup_location"],
                expiry_time=expiry_time,
                vendor_name=args["vendor_name"],
                original_price=args["original_price"],
                current_price=args["current_price"],
                image_url=uploaded_image_url,
            )
            return {"success": True, "listing_id": listing.id, "message": f"Listing created! ID: {listing.id}."}

        elif tool_name == "sponsor_listing":
            listing = session.get(Listing, int(args["listing_id"]))
            if not listing:
                return {"success": False, "error": "Listing not found"}

            donor_name = args["donor_name"]
            units = int(args["units"])
            sponsor_pct = int(args["sponsor_percentage"])

            if listing.source != "restaurant" or listing.audience != "public":
                return {"success": False, "error": "Only public restaurant listings can be sponsored"}
            if listing.expiry_time <= datetime.utcnow():
                return {"success": False, "error": "This listing has already expired"}
            if not (1 <= sponsor_pct <= 100):
                return {"success": False, "error": "sponsor_percentage must be between 1 and 100"}
            if units <= 0 or units > listing.qty:
                return {"success": False, "error": f"Only {listing.qty} units left to sponsor"}

            sponsored_listing = create_listing_internal(
                session,
                source="sponsored",
                title=listing.title,
                qty=units,
                pickup_location=listing.pickup_location,
                expiry_time=listing.expiry_time,
                vendor_name=listing.vendor_name,
                original_price=listing.original_price,
                donor_name=donor_name,
                sponsor_pct=sponsor_pct,
                image_url=listing.image_url or uploaded_image_url,
            )

            listing.qty -= units
            if listing.qty == 0:
                listing.status = "sold_out"
            session.add(listing)

            session.commit()
            session.refresh(sponsored_listing)

            cost = listing.original_price * units * sponsor_pct / 100
            free_text = "FREE for orgs!" if sponsor_pct == 100 else f"Rs {sponsored_listing.org_price} per unit for orgs"
            return {
                "success": True,
                "message": f"Sponsored! {units} units moved to the orgs-only feed. Your cost: Rs {cost}. {free_text}",
            }

        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    except HTTPException as e:
        return {"success": False, "error": e.detail}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _run_tool_loop(role: str, messages: list[dict], session: Session, uploaded_image_url: Optional[str]) -> tuple[list[dict], list]:
    last_listings = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            tools=TOOLS,
        )

        choice = response.choices[0]
        if choice.finish_reason != "tool_calls" or not choice.message.tool_calls:
            # No tool call needed — stop here and let the caller generate the
            # final answer as a stream, so we never answer twice.
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

            result = _execute_tool(tool_call.function.name, args, session, role, uploaded_image_url)

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
        raise HTTPException(500, "DEEPSEEK_KEY is not configured on the server")
    if body.role not in {"buyer", "org", "vendor", "donor"}:
        raise HTTPException(422, "role must be 'buyer', 'org', 'vendor' or 'donor'")

    uploaded_image_url = None
    if body.image_base64:
        uploaded_image_url = _save_uploaded_image(body.image_base64)

    messages = [{"role": "system", "content": _system_prompt(body.role)}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages]

    if uploaded_image_url and messages:
        last_user_msg = next((m for m in reversed(messages) if m["role"] == "user"), None)
        if last_user_msg:
            last_user_msg["content"] += f" [User uploaded an image: {uploaded_image_url}]"

    def event_stream():
        messages_after_tools, listings = _run_tool_loop(body.role, messages, session, uploaded_image_url)

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