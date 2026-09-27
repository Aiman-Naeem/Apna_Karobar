# Apna Karobar — AI Service Contract

This is the interface between `backend/` (Node/Express, Person B) and `ai-service/` (Python, Person C). Person C builds a service that implements exactly these 3 endpoints — internal structure, model choice, and training approach are entirely up to Person C as long as these shapes hold.

**Base URL (local dev):** `http://localhost:8000` — set via `AI_SERVICE_URL` in `backend/.env`

## How this differs from the frontend↔backend contract

- This crosses a **language boundary** (Node calling Python), so field name typos or type mismatches won't get caught by any shared code — double check field names match exactly on both sides.
- The backend **calls ai-service**, not the other way around. `ai-service` never talks to MongoDB directly — it receives data in the request body/params and returns a result. Person C's service should be stateless from the backend's perspective (any storage `ai-service` needs internally, like model files, is its own business).
- Every call from the backend has a **timeout and fallback** already built in (`src/services/aiService.js`). If `ai-service` is down, slow, or returns something malformed, the backend won't crash — it degrades gracefully. This means Person C can develop independently without blocking B, but also means silent bugs (wrong field names, etc.) will just look like "the fallback is always being used" rather than a hard error — check your server logs for `⚠️ ai-service ... call failed` warnings if scores/replies look wrong.

---

## 1. `POST /trust-score`

Called after a kameti payment is marked paid, to get this member's updated trust score.

**Request body:**
```json
{
  "userId": "66f1a2b3c4d5e6f7a8b9c0d1",
  "paymentHistory": [
    { "month": 1, "amount": 2000, "status": "paid", "dueDate": "2026-08-05T00:00:00.000Z", "paidDate": "2026-08-03T00:00:00.000Z" },
    { "month": 2, "amount": 2000, "status": "paid", "dueDate": "2026-09-05T00:00:00.000Z", "paidDate": "2026-09-10T00:00:00.000Z" },
    { "month": 3, "amount": 2000, "status": "pending", "dueDate": "2026-10-05T00:00:00.000Z", "paidDate": null }
  ]
}
```
> `paymentHistory` is the user's FULL history across all their committees, not just the one payment that triggered this call — the model needs full context to score properly.
> `status` is one of: `"pending"`, `"paid"`, `"late"`.

**Required response (`200`):**
```json
{ "trustScore": 78 }
```
- `trustScore` must be a **number between 0 and 100**. Anything else (string, missing field, out of range) causes the backend to fall back to a simple rule-based score instead — so this will silently look "wrong" rather than erroring loudly. Test this response shape directly (e.g. with `curl` or Postman) before assuming the integration works end to end.

**Timeout:** backend gives up after 5 seconds and falls back.

---

## 2. `POST /chatbot`

Called when a user sends a message to the business-advice chatbot.

**Request body:**
```json
{
  "userId": "66f1a2b3c4d5e6f7a8b9c0d1",
  "message": "How should I price my hand-embroidered dupattas?",
  "history": [
    { "role": "user", "message": "Hi, I need help pricing my products" },
    { "role": "assistant", "message": "I'd be happy to help! What kind of products do you sell?" }
  ]
}
```
> `history` is the last 20 messages of this conversation session, oldest first — use it to give the LLM conversational context. It will be `[]` for a brand-new conversation.

**Required response (`200`):**
```json
{ "reply": "For hand-embroidered dupattas, consider pricing based on..." }
```
- `reply` must be a **non-empty string**. This is what gets shown directly to the user and saved to the chat history — no other fields are read from this response.

**Timeout:** backend gives up after 15 seconds (LLM calls are slower than the trust-score call) and falls back to a generic "not available right now" message.

**Suggested system prompt framing** (up to Person C, but should stay consistent): the assistant should give practical, actionable business advice suited to small home-based entrepreneurs in Pakistan — pricing, marketing on a small budget, managing customers — not generic startup advice. Consider supporting Urdu input/output since the app is Urdu-first, though this isn't a hard requirement for the MVP.

---

## 3. `GET /market-insights`

Called when a user views market trend info for a product category.

**Query params:**
```
GET /market-insights?category=tailoring&region=Islamabad
```
- `category` — **required**. Matches the `category` field used in `Product`/`Storefront` (`tailoring`, `food`, `crafts`, `tutoring`, `other`).
- `region` — optional. If omitted, return general/national insights for that category.

**Required response (`200`):**
```json
{
  "category": "tailoring",
  "region": "Islamabad",
  "averagePrice": { "min": 800, "max": 3500, "typical": 1500 },
  "demandTrend": "rising",
  "topSellingItems": ["stitched kurta", "alterations", "embroidery work"],
  "note": "Demand for custom stitching typically rises ahead of Eid."
}
```
> This exact shape is a **suggested starting point**, not fixed in stone the way the other two are — since this is sample/mocked data rather than a live feed for the MVP, work out the specific fields with Person A once you know what the UI actually wants to display. Whatever shape you settle on, update this doc in the same PR.

**Response `503`** if insights aren't available for that category — the backend passes this through to the frontend as-is, no fallback data is invented.

**Timeout:** backend gives up after 5 seconds.

---

## Error handling

If any request fails, times out, or returns a malformed body, the backend logs a warning (`⚠️ ai-service ... call failed: <reason>`) and uses its fallback behavior — it does **not** crash or return a 500 to the frontend. This is deliberate so B and A aren't blocked while C is still building. But it also means:

- **Test your endpoints directly** (curl/Postman) before assuming the integration works — a silently-used fallback looks identical to "everything's fine" unless you check the backend's console logs.
- **Match field names and types exactly.** `trustScore` not `trust_score`, `reply` not `response` or `message`. A close-but-wrong shape triggers the fallback instead of an obvious error.

---

## Checklist for Person C before demo day

- [ ] `POST /trust-score` returns a real number (not always the same value regardless of input)
- [ ] `POST /chatbot` gives relevant, on-topic replies for business questions
- [ ] `GET /market-insights` returns data for at least the product categories your storefronts actually use
- [ ] Confirmed with Person B that the fallback paths in `backend/src/services/aiService.js` should be removed (or left as a safety net) before the final demo — team decision, not a given
