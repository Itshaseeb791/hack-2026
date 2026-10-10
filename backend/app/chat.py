import json
import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from sqlmodel import Session, select

from app.models import get_session, Organization
from app.listings import search_listings, _to_out, create_listing_internal
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
            "description": "Create a new surplus food listing. Used when a vendor describes food they want to post.",
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
]

MAX_TOOL_ROUNDS = 5


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    role: str  # "buyer" | "org" | "vendor" | "donor"
    messages: list[ChatMessage]


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
        "After successful actions, give the pickup code and pickup location. "
        "If an action fails, say why in plain language and suggest what to try next. "
        f"Current time: {now}."
    )


def _execute_tool(tool_name: str, args: dict, session: Session, role: str) -> dict:
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
            )
            return {"success": True, "listing_id": listing.id, "message": f"Listing created! ID: {listing.id}. Add a photo from the vendor form if you have one."}

        else:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

    except HTTPException as e:
        return {"success": False, "error": e.detail}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _run_tool_loop(role: str, messages: list[dict], session: Session) -> tuple[list[dict], list]:
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
        raise HTTPException(500, "DEEPSEEK_KEY is not configured on the server")
    if body.role not in {"buyer", "org", "vendor", "donor"}:
        raise HTTPException(422, "role must be 'buyer', 'org', 'vendor' or 'donor'")

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
