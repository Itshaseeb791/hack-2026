import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from sqlmodel import Session

from app.models import get_session
from app.listings import search_listings, _to_out

router = APIRouter()

DEEPSEEK_KEY = os.environ.get("DEEPSEEK_KEY")
client = OpenAI(api_key=DEEPSEEK_KEY, base_url="https://api.deepseek.com") if DEEPSEEK_KEY else None

SEARCH_TOOL = {
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
}

MAX_TOOL_ROUNDS = 3


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    role: str  # "buyer" | "org"
    messages: list[ChatMessage]


def _system_prompt(role: str) -> str:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    audience_note = (
        "This user is a BUYER. Only search and talk about public discounted food."
        if role == "buyer"
        else "This user is an ORGANIZATION (shelter or orphanage). Only search and talk about orgs-only sponsored/donated food."
    )
    return (
        "You are SaveFood's assistant, helping people in Lahore, Pakistan find surplus and "
        "sponsored food before it expires. "
        f"{audience_note} "
        "Always call search_listings before answering any question about available food — "
        "never invent listings or prices. "
        "Reply in the same language and script the user wrote in: English, Urdu script, or Roman Urdu. "
        "Show prices in PKR like 'Rs 180'. Mention sponsor names when a listing is sponsored "
        "(e.g. 'sponsored 100% by Ahmed'). Keep replies short. "
        "You cannot reserve or claim food yourself — tell the user to tap Reserve or Claim on the listing card. "
        "If nothing matches, say so plainly and suggest broadening the search. "
        f"The current time is {now}."
    )


def _run_tool_loop(role: str, messages: list[dict], session: Session) -> tuple[list[dict], list]:
    last_listings = []
    for _ in range(MAX_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            tools=[SEARCH_TOOL],
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
            results = search_listings(
                session,
                role,
                keyword=args.get("keyword"),
                max_price=args.get("max_price"),
                free_only=args.get("free_only"),
                area=args.get("area"),
                expiring_within_hours=args.get("expiring_within_hours"),
                limit=10,
            )
            last_listings = [_to_out(l, role) for l in results]
            tool_result = [listing.model_dump(mode="json") for listing in last_listings]
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(tool_result),
            })

    return messages, last_listings


@router.post("/chat")
def chat(body: ChatRequest, session: Session = Depends(get_session)):
    if client is None:
        raise HTTPException(500, "DEEPSEEK_KEY is not configured on the server")
    if body.role not in {"buyer", "org"}:
        raise HTTPException(422, "role must be 'buyer' or 'org'")

    messages = [{"role": "system", "content": _system_prompt(body.role)}]
    messages += [{"role": m.role, "content": m.content} for m in body.messages]

    def event_stream():
        messages_after_tools, listings = _run_tool_loop(body.role, messages, session)

        listings_json = json.dumps([l.model_dump(mode="json") for l in listings])
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
