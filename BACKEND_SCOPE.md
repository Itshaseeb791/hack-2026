# SaveFood — Backend Scope

Hackathon project (Track: **Community & Society**). Backend only, built in a single **4-hour** session.

## 1. The idea

Restaurants and bakeries throw away good food every night. SaveFood moves that food to people who need it before it expires:

- **Buyers** (price-sensitive people) get restaurant surplus at a discount.
- **Shelters and orphanages** get food free or cheap.
- **Donors** (anyone who wants to help) can pay a restaurant 1–100% of a food order and list it for shelters and orphanages, or donate their own fresh food.
- An **AI chatbot** (text or voice, English / Urdu / Roman Urdu) answers questions like *"What is freely available for kids?"* → *"30 plates of free biryani at Haveli, Gulberg, pickup by 8pm, sponsored 100% by Ahmed."*

## 2. How food gets onto the platform

| Source | Who lists it | Who can see it | Price |
|---|---|---|---|
| Restaurant surplus | Restaurant | Buyers (public feed) | Discounted |
| Sponsored | Donor, who pays the restaurant 1–100% | Shelters and orphanages only | Whatever the donor didn't cover |
| Donated | Donor (their own fresh food: homemade, event leftovers) | Shelters and orphanages only | Free |

A donor can also **sponsor an existing restaurant listing**: those units move from the public buyer feed to the orgs-only feed at the donor's chosen percentage.

Example: a donor goes to Haveli, pays 50% for 30 biryani plates, and lists them. An orphanage claims them and pays the other 50% at pickup. At 100%, the orphanage pays Rs 0.

## 3. Users (roles)

No login. Roles are passed as a plain field from the frontend.

| Role | Can do |
|---|---|
| `buyer` | Browse the public feed, reserve food, ask the chatbot |
| `org` (shelter or orphanage) | Browse the orgs-only feed, claim food, ask the chatbot |
| `vendor` (restaurant/bakery) | Post surplus listings, mark food collected |
| `donor` | Create sponsored listings, sponsor existing listings, donate food, view impact |

## 4. Tech stack

- **API:** Python, FastAPI
- **Database:** PostgreSQL (SQLModel)
- **AI:** DeepSeek (`deepseek-chat`) through the `openai` Python SDK with DeepSeek's base URL
- **Runtime:** Docker Compose (app + Postgres) on a local laptop. No local Python install needed.
- **Image storage:** Docker volume, served by FastAPI at `/uploads/{file}`
- **API reference for the frontend:** FastAPI's auto-generated `/docs`
- **Currency:** PKR. **Time zone:** Asia/Karachi.

## 5. Data model (2 tables)

### `listings`
| Field | Notes |
|---|---|
| id | |
| source | `restaurant` / `sponsored` / `donated` |
| vendor_name | Restaurant name |
| donor_name | Set for sponsored/donated |
| title | e.g. "Chicken biryani plates" |
| qty | Decreases as people reserve/claim |
| original_price | PKR per unit |
| current_price | Discounted public price |
| sponsor_pct | 1–100, sponsored only |
| org_price | `original_price × (100 − sponsor_pct) / 100`; 0 for donated |
| audience | `public` / `orgs_only` |
| image_url | From photo upload |
| pickup_location | Restaurant name + area, or donor's area |
| prepared_at | Required for donated food |
| expiry_time | Required for all listings |
| status | `available` / `reserved` / `claimed` / `collected` |
| claimed_by | Buyer name or organization id |
| pickup_code | 6 characters, generated on reserve/claim |
| created_at | |

### `organizations`
| Field | Notes |
|---|---|
| id | |
| name | e.g. "Edhi Shelter Gulberg" |
| type | `shelter` / `orphanage` |
| area | e.g. "Gulberg, Lahore" |
| daily_need | e.g. "40 meals" |
| dietary_notes | Optional |

## 6. Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/listings` | Create a listing (multipart form + photo). Handles all three sources. |
| GET | `/listings?role=buyer\|org` | Buyers get the public feed, orgs get the orgs-only feed. Expired items hidden. |
| POST | `/listings/{id}/reserve` | Reserve/claim part of a listing. Returns a pickup code. |
| POST | `/listings/{id}/sponsor` | Donor covers N units of an existing listing at a chosen % (moves them to orgs-only). |
| POST | `/listings/{id}/pickup` | Restaurant/donor enters the pickup code to mark food collected. |
| POST | `/organizations` | Add a shelter or orphanage |
| GET | `/organizations` | List shelters and orphanages |
| GET | `/donors/{name}/impact` | What the donor's food achieved (collected food only) |
| GET | `/uploads/{file}` | Serve listing photos |
| POST | `/chat` | AI chatbot, streamed reply (see below) |

### Photo upload rules
- jpg / png / webp only, 5 MB max, checked on the server
- Stored on a Docker volume; the database stores only the URL

## 7. AI chatbot (`POST /chat`)

The only AI feature. It **answers questions only** and takes no actions. All actions (reserve, claim, sponsor, create) happen through the normal endpoints, called by frontend buttons.

**Request**
```json
{
  "role": "buyer | org",
  "messages": [{ "role": "user", "content": "What is freely available for kids?" }]
}
```
The frontend sends the full chat history every time. Nothing is stored on the server.

**How it works**
- DeepSeek has **one tool: `search_listings`**, with filters for food type, max price, free only, area, expiring before.
- The bot only searches the feed for the given role, so a buyer can't find the orphanages' free food by asking for it.
- It replies in the language the user writes in: English, Urdu or Roman Urdu.

**Response:** Server-Sent Events, in this order:
1. `listings`: listing cards (JSON) for the frontend to render with photos
2. `token`: reply text, streamed word by word
3. `done`: end of reply

The tool call runs first without streaming; only the final reply streams.

**Voice** is handled entirely in the frontend with the browser's Web Speech API (`en-US` or `ur-PK`). It reaches `/chat` as plain text. Works best in Chrome and Edge.

## 8. Rules and assumptions

- No auth. Requests carry a plain name; organizations are picked by id.
- Payment is simulated. Percentages and prices are recorded only; money is settled in person.
- Donor claims ("I paid Haveli for 30 plates") are trusted without restaurant confirmation.
- Partial reservations are allowed (2 of 20); `qty` goes down.
- First come, first served. No per-organization claim limits.
- Reservations don't expire.
- Donated food must include `prepared_at` and `expiry_time`. No other food-safety checks.
- Expired listings are hidden from feeds, never deleted.
- "Impact" counts only food marked collected, not just claimed.
- CORS open for a local frontend.

## 9. Out of scope

Auth/login, payments, maps/geo queries, scheduled jobs (cron), push notifications, an autonomous allocation agent, chatbot actions (reserve/claim/create via chat), photos through chat, backend speech-to-text, frontend, deployment.

## 10. Timeline (4 hours)

| Time | Work |
|---|---|
| 0:00–0:30 | Docker Compose, models, seed data (Lahore restaurants, 2 shelters, 2 orphanages) |
| 0:30–1:30 | Listing endpoints, photo upload, feeds, reserve, sponsor, pickup, organizations, impact |
| 1:30–2:15 | `/chat` with `search_listings`, languages, streaming |
| 2:15–2:45 | End-to-end demo run, README |
| 2:45–4:00 | Buffer |

**Optional extra if time remains:** let the chatbot reserve food after the user confirms with "yes" in the chat.

## 11. Demo script

1. A restaurant posts surplus sandwiches. A buyer asks the chatbot by voice in Roman Urdu ("Rs 200 se kam mein kya hai?", meaning "What's under Rs 200?"), finds them, and reserves with the button.
2. A donor sponsors 30 biryani plates at Haveli at 100% through the form.
3. An orphanage asks "What is freely available for kids?" The bot replies "30 plates free biryani at Haveli." The orphanage claims them and gets a pickup code.
4. Haveli marks the pickup collected. The donor's impact shows 30 plates delivered to the orphanage.

## 12. Before starting

- DeepSeek API key **with credit** (the API is prepaid), saved in `.env` as `DEEPSEEK_API_KEY`. Never commit `.env`.
- Docker Desktop running; pull images in advance: `docker pull postgres:16-alpine` and `docker pull python:3.11-slim`.
- Frontend team needs to know: voice needs Chrome/Edge, `/chat` is a stream (not one JSON response), API reference at `http://localhost:8000/docs`.
- Check hackathon rules on whether code may be prepared before the event.
