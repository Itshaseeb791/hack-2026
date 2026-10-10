# SaveFood — Backend Build Plan (10 Phases)

Implementation plan for the scope in [`../BACKEND_SCOPE.md`](../BACKEND_SCOPE.md). All backend code lives in this `backend/` folder.

**Total build time:** ~3h 40m of work + 20m buffer = 4 hours.

| # | Phase | Time | Running total |
|---|---|---|---|
| 1 | Project setup and Docker | 15m | 0:15 |
| 2 | Database models | 15m | 0:30 |
| 3 | Seed data | 10m | 0:40 |
| 4 | Organizations | 10m | 0:50 |
| 5 | Create listings and photo upload | 30m | 1:20 |
| 6 | Feeds | 15m | 1:35 |
| 7 | Reserve, claim and pickup | 25m | 2:00 |
| 8 | Sponsor existing listings and donor impact | 25m | 2:25 |
| 9 | AI chatbot | 45m | 3:10 |
| 10 | End-to-end test, README and demo rehearsal | 30m | 3:40 |
| — | Buffer | 20m | 4:00 |

**Order matters:** phases 1–8 give a working marketplace without AI. If the chatbot runs late, there is still something to demo.

---

## Changes from the scope document

Working through the details exposed two problems in `BACKEND_SCOPE.md`. This plan uses the corrected versions:

1. **New `reservations` table.** The scope puts `pickup_code` and `claimed_by` on the listing, but partial reservations (2 of 20 sandwiches) mean one listing can have many reservations, each with its own pickup code. So reservations get their own table, and listing status becomes just `available` / `sold_out`.
2. **Pickup endpoint path.** `POST /listings/{id}/pickup` becomes `POST /reservations/pickup`, because the pickup code alone identifies the reservation.

---

## File structure

```
backend/
├── docker-compose.yml     # app + postgres
├── Dockerfile
├── requirements.txt
├── .env.example           # DEEPSEEK_API_KEY=
├── README.md
└── app/
    ├── __init__.py
    ├── main.py            # FastAPI app, CORS, static uploads, organizations, impact
    ├── models.py          # engine, session, 3 tables
    ├── seed.py            # demo data, loaded on startup if DB is empty
    ├── listings.py        # listing, feed, reserve, sponsor, pickup routes
    ├── chat.py            # DeepSeek chatbot + search_listings tool
    └── smoke_test.py      # end-to-end check (phase 10), runs inside the container
```

---

## Phase 1 — Project setup and Docker (15m)

**Goal:** `docker compose up` starts the API and Postgres, and `/docs` loads in the browser.

**Tasks**
- `requirements.txt`: `fastapi`, `uvicorn[standard]`, `sqlmodel`, `psycopg2-binary`, `python-multipart` (form uploads), `openai` (DeepSeek client), `tzdata` (Asia/Karachi time zone inside the slim image), `requests` (smoke test).
- `Dockerfile`: `python:3.11-slim`, install requirements, run `uvicorn app.main:app --host 0.0.0.0 --reload`.
- `docker-compose.yml`:
  - `db`: `postgres:16-alpine`, named volume for data, healthcheck with `pg_isready`.
  - `app`: builds from the Dockerfile, port `8000:8000`, mounts `./app` for hot reload, mounts an `uploads` volume, reads `.env`, waits for `db` to be healthy.
  - `DATABASE_URL=postgresql://savefood:savefood@db:5432/savefood`
- `.env.example` with `DEEPSEEK_API_KEY=`. Real `.env` is git-ignored.
- `main.py`: app with CORS open to all origins and `GET /health` returning `{"ok": true}`.

**Done when:** `docker compose up --build` runs, and `http://localhost:8000/health` returns `{"ok": true}`.

---

## Phase 2 — Database models (15m)

**Goal:** three tables created automatically on startup.

### `organizations`
| Field | Type | Notes |
|---|---|---|
| id | int PK | |
| name | str | |
| type | str | `shelter` / `orphanage` |
| area | str | e.g. "Gulberg, Lahore" |
| daily_need | str | e.g. "40 meals" |
| dietary_notes | str, nullable | |

### `listings`
| Field | Type | Notes |
|---|---|---|
| id | int PK | |
| source | str | `restaurant` / `sponsored` / `donated` |
| vendor_name | str, nullable | Restaurant name |
| donor_name | str, nullable | Sponsored / donated only |
| title | str | |
| description | str, nullable | |
| qty | int | Units still available |
| original_price | float | PKR per unit |
| current_price | float | Public price (restaurant listings) |
| sponsor_pct | int, nullable | 1–100 |
| org_price | float, nullable | Price per unit for organizations |
| audience | str | `public` / `orgs_only` |
| image_url | str, nullable | |
| pickup_location | str | |
| prepared_at | datetime, nullable | Required for donated |
| expiry_time | datetime | |
| status | str | `available` / `sold_out` |
| created_at | datetime | |

### `reservations`
| Field | Type | Notes |
|---|---|---|
| id | int PK | |
| listing_id | FK → listings | |
| reserved_by | str | Buyer name or organization name |
| org_id | FK → organizations, nullable | Set when an org claims |
| qty | int | |
| price_per_unit | float | Locked in at reservation time |
| pickup_code | str, unique | 6 chars |
| status | str | `reserved` / `collected` |
| created_at | datetime | |

**Notes**
- All datetimes stored as UTC (`timestamptz`); converted to Asia/Karachi only when shown to users (chat replies).
- `SQLModel.metadata.create_all(engine)` on startup. No migrations; for schema changes during the hackathon, `docker compose down -v` resets the database.

**Done when:** after startup, `docker compose exec db psql -U savefood -c '\dt'` lists all three tables.

---

## Phase 3 — Seed data (10m)

**Goal:** realistic demo data in the database on first startup, so the chatbot has something to find.

**Seed contents** (only inserted if `organizations` is empty):
- **Organizations:** 2 shelters (e.g. "Edhi Shelter Gulberg", "Saylani Dastarkhwan Johar Town") and 2 orphanages (e.g. "SOS Children's Village Lahore", "Dar-ul-Aman Orphanage Model Town").
- **Restaurant listings (public):** ~5 items across Lahore: sandwiches at a café (Rs 350 → Rs 180), naan at a bakery, biryani, pastries, daal chawal. Expiry times a few hours from startup so they're always fresh in the demo.
- **Sponsored listing (orgs only):** 30 biryani plates at Haveli, sponsored 100% by "Ahmed" → org price Rs 0.
- **Sponsored listing (orgs only):** 20 meal boxes, sponsored 50% → org pays half.
- **Donated listing (orgs only):** homemade food from a donor, free.
- No images in seed data; `image_url` is null and the frontend shows a placeholder.

**Done when:** `docker compose down -v && docker compose up` gives a fresh database with all seed rows.

---

## Phase 4 — Organizations (10m)

**Goal:** add and list shelters and orphanages.

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/organizations` | `{name, type, area, daily_need, dietary_notes?}` | Created org |
| GET | `/organizations` | `?type=shelter\|orphanage` (optional) | List of orgs |

**Validation:** `type` must be `shelter` or `orphanage` (422 otherwise).

**Done when:** creating an org in `/docs` returns it with an id, and it shows up in the list.

---

## Phase 5 — Create listings and photo upload (30m)

**Goal:** one endpoint creates all three kinds of listing, with an optional photo.

**`POST /listings`** — `multipart/form-data`

| Field | Required for |
|---|---|
| source | all (`restaurant` / `sponsored` / `donated`) |
| title, qty, pickup_location, expiry_time | all |
| description | optional |
| vendor_name | restaurant, sponsored |
| original_price | restaurant, sponsored |
| current_price | restaurant |
| donor_name | sponsored, donated |
| sponsor_pct | sponsored (1–100) |
| prepared_at | donated |
| photo | optional file |

**Server sets automatically**
- `audience`: `public` for restaurant; `orgs_only` for sponsored and donated.
- `org_price`: sponsored = `original_price × (100 − sponsor_pct) / 100`; donated = `0`; restaurant = null.
- `status`: `available`.

**Validation (trust boundary — never skip)**
- `qty > 0`, prices ≥ 0, `current_price ≤ original_price`, `sponsor_pct` 1–100.
- `expiry_time` must be in the future; `prepared_at` must be before `expiry_time`.
- Required fields per source as in the table above → 422 with a clear message.

**Photo upload**
- Allowed: jpg, png, webp — check both the file extension and the content type.
- Max 5 MB: read at most 5 MB + 1 byte and reject if larger.
- Save as `uploads/<uuid>.<ext>` (random name, so user file names never touch the filesystem).
- `image_url = "/uploads/<uuid>.<ext>"`.
- `main.py` mounts the uploads directory with `StaticFiles` at `/uploads`.

**Done when:** creating one listing of each source in `/docs` works, a photo opens at its `image_url`, and a 10 MB file or a `.pdf` is rejected.

---

## Phase 6 — Feeds (15m)

**Goal:** each role sees the right food at the right price.

**`GET /listings?role=buyer|org`** (+ optional `q` keyword, `max_price`, `free_only`, `area`)

| Role | Shows | Price shown |
|---|---|---|
| buyer | `audience = public` | `current_price` |
| org | `audience = orgs_only` | `org_price` |

**Always filtered:** `status = available`, `qty > 0`, `expiry_time > now`. Sorted by soonest expiry first.

**Response:** each listing plus a `price` field (the role's price), `is_free` flag and `minutes_left`, so the frontend doesn't need role logic.

**Also:** `GET /listings/{id}`.

The filter logic goes in one function, `search_listings(role, filters)`, which phase 9 reuses as the chatbot's tool, so the chatbot can never see more than the feed does.

**Done when:** `role=buyer` shows only the restaurant items, `role=org` shows only sponsored and donated items, and an expired listing disappears from both.

---

## Phase 7 — Reserve, claim and pickup (25m)

**Goal:** buyers reserve, organizations claim, and the restaurant or donor confirms pickup with a code.

**`POST /listings/{id}/reserve`**
```json
{ "role": "buyer", "name": "Ali", "qty": 2 }
{ "role": "org", "org_id": 3, "qty": 30 }
```
- Rejects if: listing not available or expired, `qty` > remaining, or role doesn't match the audience (a buyer can't reserve orgs-only food → 403).
- `price_per_unit` = `current_price` for buyers, `org_price` for orgs.
- Decreases listing `qty`; sets `status = sold_out` at 0.
- Generates a unique 6-character pickup code (uppercase letters + digits, without confusable characters like O/0, I/1).
- **Concurrency:** lock the listing row (`SELECT … FOR UPDATE`) so two people can't reserve the last units at the same time.
- Returns `{reservation_id, pickup_code, qty, total_price, pickup_location, expiry_time}`.

**`POST /reservations/pickup`**
```json
{ "pickup_code": "K7M2QX" }
```
- Marks the reservation `collected`. Unknown code → 404; already collected → 409.

**`GET /reservations?name=Ali`** or `?org_id=3` — lets the frontend show "my reservations".

**Done when:** reserving 2 of 20 leaves 18, reserving more than remains fails, a buyer can't reserve orgs-only food, and a pickup code can be used once only.

---

## Phase 8 — Sponsor existing listings and donor impact (25m)

**Goal:** donors can sponsor food already on the buyer feed, and see what their giving achieved.

**`POST /listings/{id}/sponsor`**
```json
{ "donor_name": "Ahmed", "qty": 20, "sponsor_pct": 100 }
```
- Only restaurant (public) listings can be sponsored.
- Locks the row, takes `qty` units off the public listing, and creates a **new** listing: `source = sponsored`, `audience = orgs_only`, same title/photo/vendor/pickup/expiry, `original_price` = the listing's `current_price` (the donor pays the discounted price), `org_price` computed from `sponsor_pct`.
- Returns the new sponsored listing.

**`GET /donors/{name}/impact`**
- Counts only `collected` reservations on that donor's sponsored and donated listings.
- Returns:
```json
{
  "donor_name": "Ahmed",
  "meals_delivered": 30,
  "amount_sponsored_pkr": 7500,
  "organizations_helped": [{"name": "SOS Children's Village Lahore", "type": "orphanage", "meals": 30}]
}
```
- `amount_sponsored_pkr` = sum of `original_price × sponsor_pct / 100 × qty` for collected units (donated food counts meals, not money).

**Done when:** sponsoring 20 of a public listing moves those 20 to the org feed at the right price, and impact shows meals only after pickup is confirmed.

---

## Phase 9 — AI chatbot (45m)

**Goal:** users ask in English, Urdu or Roman Urdu, and get a streamed answer about available food.

**`POST /chat`**
```json
{
  "role": "buyer | org",
  "messages": [{"role": "user", "content": "What is freely available for kids?"}]
}
```

**DeepSeek setup**
- `OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")`, model `deepseek-chat`.

**Tool: `search_listings`**
```json
{
  "name": "search_listings",
  "description": "Search food currently available to this user.",
  "parameters": {
    "type": "object",
    "properties": {
      "keyword": {"type": "string", "description": "Food type, e.g. biryani, bread"},
      "max_price": {"type": "number", "description": "Max price per unit in PKR"},
      "free_only": {"type": "boolean"},
      "area": {"type": "string", "description": "Lahore area, e.g. Gulberg"},
      "expiring_within_hours": {"type": "number"}
    }
  }
}
```
- Runs the phase 6 `search_listings` function with the **request's role**, not anything the model says, so the model can't widen what the user sees.
- Returns at most 10 listings, compact JSON (title, price, qty, location, minutes left, sponsor info).

**System prompt (key rules)**
- You help people in Lahore find surplus and sponsored food on SaveFood.
- Always use `search_listings` before answering about food; never invent listings.
- Reply in the same language and script as the user: English, Urdu script or Roman Urdu.
- Prices in PKR as "Rs 180". Times in Pakistan time.
- Be short. Mention sponsors by name ("sponsored 100% by Ahmed").
- You can't reserve or claim; tell the user to tap Reserve or Claim on the card.
- If nothing matches, say so and suggest a broader search.
- Current time is inserted into the prompt so "expiring tonight" works.

**Flow**
1. Call DeepSeek with the messages and the tool (not streamed).
2. If it calls the tool: run the search, add the result to the messages, and repeat — max 3 rounds to avoid loops.
3. Send listing cards from the last search to the client.
4. Call DeepSeek again with `stream=True` for the final reply, and forward each piece of text as it arrives.

**Response:** `StreamingResponse`, `text/event-stream`:
```
event: listings
data: [{"id": 6, "title": "Chicken biryani", "price": 0, ...}]

event: token
data: {"text": "30 plates of free "}

event: token
data: {"text": "biryani at Haveli..."}

event: done
data: {}
```

**Errors:** if DeepSeek fails or times out (20s), send `event: error` with a friendly message instead of breaking the stream. Missing API key → clear 500 at startup log, not a crash on first message.

**Done when:**
- "What is freely available for kids?" as `org` streams back the free biryani with its listing card.
- "Rs 200 se kam mein kya hai?" as `buyer` replies in Roman Urdu with cheap restaurant items.
- Asking for free food as `buyer` does **not** return orgs-only listings.

---

## Phase 10 — End-to-end test, README and demo rehearsal (30m)

**Goal:** prove the whole demo works from a clean start, and document how to run it.

**`app/smoke_test.py`** (plain `requests` + `assert`, runs inside the app container against `localhost:8000`, because Python isn't installed on the laptop):
1. Restaurant listing with a photo → appears on the buyer feed.
2. Buyer reserves 2 → qty drops, pickup code returned.
3. Donor sponsors 10 at 100% → appears on the org feed at Rs 0.
4. Buyer can't see or reserve the sponsored item.
5. Orphanage claims it → pickup with the code → impact shows 10 meals.
6. `/chat` as org streams `listings`, `token` and `done` events.

**`README.md`**
- What SaveFood is, in two lines.
- Setup: copy `.env.example` → `.env`, add the DeepSeek key, `docker compose up --build`.
- Reset data: `docker compose down -v`.
- API reference: `http://localhost:8000/docs`.
- Notes for the frontend: `/chat` is a stream (read with `fetch` + stream reader, not one JSON response); voice via the browser's Web Speech API with `ur-PK` / `en-US`; photos at `/uploads/...`.

**Demo rehearsal:** run the 4-step demo script from `BACKEND_SCOPE.md` once from a fresh database.

**Done when:** `docker compose down -v && docker compose up --build`, then `docker compose exec app python -m app.smoke_test` passes, and the demo runs start to finish.

---

## If time runs short

Cut in this order (last = most important to keep):
1. `GET /reservations` (frontend can show the code from the reserve response)
2. Optional feed filters (`q`, `max_price`, `area`) on `GET /listings` — the chatbot still has them
3. Donor impact's `organizations_helped` breakdown (keep the totals)
4. Streaming — fall back to one JSON reply `{reply, listings}`

Never cut: input validation, upload checks, role-based feed filtering, the chatbot.
