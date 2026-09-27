# Apna Karobar — API Contract

This is the single source of truth for every backend endpoint. If the backend changes, this file changes in the same PR — don't let the two drift apart.

**Base URL (local dev):** `http://localhost:5000/api`

## Conventions

- All protected routes require a header: `Authorization: Bearer <token>` (token comes from `/auth/verify-otp`)
- All JSON request/response bodies use `Content-Type: application/json`, **except** endpoints marked 🖼️ which take `multipart/form-data` (file uploads)
- All error responses have the same shape: `{ "error": "message describing what went wrong" }`
- Dates are ISO 8601 strings (e.g. `"2026-10-05T14:30:00.000Z"`)
- `id` fields are MongoDB ObjectId strings (24 hex characters, e.g. `"66f1a2b3c4d5e6f7a8b9c0d1"`)

---

## Auth

### `POST /auth/send-otp`
Public. Request an OTP for a phone number.

**Request:**
```json
{ "phone": "03001234567" }
```
**Response `200`:**
```json
{ "success": true, "message": "OTP sent successfully", "otp": "123456" }
```
> `otp` is only included outside production — it's for dev/testing auto-fill, don't rely on it once `NODE_ENV=production`.

---

### `POST /auth/verify-otp`
Public. Verify the OTP and log in (creates the user on first login).

**Request:**
```json
{ "phone": "03001234567", "otp": "123456", "name": "Aiman" }
```
> `name` is optional — only needed on first signup. Omit on repeat logins.

**Response `200`:**
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": {
    "id": "66f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Aiman",
    "phone": "03001234567",
    "role": "both",
    "trustScore": 50,
    "language": "ur",
    "profileComplete": true
  }
}
```
**Response `400`:** `{ "error": "Invalid OTP" }`

---

### `GET /auth/me` 🔒
Get the logged-in user's full profile.

**Response `200`:**
```json
{ "user": { "id": "...", "name": "...", "phone": "...", "role": "both", "storefront": "66f...", "trustScore": 72, "language": "ur", "profilePicture": "", "profileComplete": true, "lastActive": "..." } }
```
> `storefront` is `null` if the user hasn't created one yet.

---

### `PUT /auth/update-profile` 🔒
**Request:**
```json
{ "name": "Aiman Khan", "language": "en" }
```
**Response `200`:** same shape as `GET /auth/me`

---

## Storefronts

### `GET /storefronts`
Public. Browse/search storefronts.

**Query params (all optional):** `?category=tailoring&city=Islamabad&search=dress`

**Response `200`:**
```json
[
  {
    "id": "66f...",
    "owner": { "id": "...", "name": "Sana", "phone": "..." },
    "name": "Sana's Tailoring",
    "nameUr": "ثناء کی سلائی",
    "category": "tailoring",
    "description": "...",
    "location": { "city": "Islamabad", "area": "F-10" },
    "contactPhone": "...",
    "isActive": true,
    "rating": { "average": 4.5, "count": 12 },
    "createdAt": "...", "updatedAt": "..."
  }
]
```
> No `coverImage` data here — fetch it separately via the cover-image endpoint below (see 🖼️ Images section).

---

### `GET /storefronts/:id`
Public. Same object shape as one item above.

---

### `GET /storefronts/:id/cover-image` 🖼️
Public. Returns the raw image file (not JSON). Use directly as an `<img src>`:
```
<img src="http://localhost:5000/api/storefronts/66f.../cover-image" />
```
**Response `404`:** `{ "error": "No cover image found for this storefront" }` — if the storefront has no image, show a placeholder in the UI.

---

### `POST /storefronts` 🔒🖼️
Create your storefront (one per user). `multipart/form-data` fields:

| Field | Type | Required |
|---|---|---|
| `name` | text | ✅ |
| `nameUr` | text | |
| `category` | text (`tailoring`/`food`/`crafts`/`tutoring`/`other`) | |
| `description` | text | |
| `descriptionUr` | text | |
| `location[city]` | text | |
| `location[area]` | text | |
| `contactPhone` | text | |
| `coverImage` | file (image, max 5MB) | |

**Response `201`:** the created storefront object (same shape as GET, no coverImage binary).
**Response `400`:** `{ "error": "You already have a storefront" }`

---

### `PUT /storefronts/:id` 🔒🖼️
Same fields as above, all optional — only send what's changing. Owner-only.

---

## Products

### `GET /products/storefront/:storefrontId`
Public. List a storefront's available products.

**Response `200`:**
```json
[
  {
    "id": "66f...",
    "storefront": "66f...",
    "name": "Stitched Kurta",
    "nameUr": "سلائی شدہ کرتا",
    "price": 1500,
    "unit": "item",
    "stock": null,
    "isAvailable": true,
    "category": "general",
    "createdAt": "...", "updatedAt": "..."
  }
]
```
> `stock: null` means made-to-order (tailoring/tutoring) rather than a countable inventory.

---

### `GET /products/:id/image` 🖼️
Public. Raw image file, same pattern as storefront cover images.

---

### `POST /products` 🔒🖼️
`multipart/form-data` fields:

| Field | Type | Required |
|---|---|---|
| `storefront` | text (storefront id) | ✅ |
| `name` | text | ✅ |
| `price` | number | ✅ |
| `nameUr`, `description`, `descriptionUr`, `category`, `unit`, `stock` | text | |
| `image` | file (max 5MB) | |

**Response `201`:** created product object.

---

### `PUT /products/:id` 🔒🖼️ — same fields, all optional, owner-only
### `DELETE /products/:id` 🔒 — owner-only. **Response `200`:** `{ "success": true }`

---

## Orders

### `POST /orders` 🔒
Place an order.

**Request:**
```json
{
  "storefront": "66f...",
  "items": [
    { "product": "66f...", "quantity": 2 },
    { "product": "66f...", "quantity": 1 }
  ],
  "deliveryAddress": "House 12, Street 4, F-10, Islamabad",
  "notes": "Please call before delivery"
}
```
**Response `201`:**
```json
{
  "id": "66f...",
  "customer": "66f...",
  "storefront": "66f...",
  "items": [{ "product": "66f...", "name": "Stitched Kurta", "price": 1500, "quantity": 2 }],
  "totalAmount": 3000,
  "status": "pending",
  "deliveryAddress": "...", "notes": "...",
  "createdAt": "...", "updatedAt": "..."
}
```
> `name`/`price` in `items` are snapshotted at order time — they won't change even if the seller later edits the product.

---

### `GET /orders/my-orders` 🔒 — orders you placed as a customer. Returns array, newest first.

### `GET /orders/storefront/:storefrontId` 🔒 — orders received by your storefront. Owner-only.

### `PUT /orders/:id/status` 🔒 — seller updates order status.

**Request:**
```json
{ "status": "confirmed" }
```
Valid values: `pending`, `confirmed`, `out_for_delivery`, `delivered`, `cancelled`

---

## Kameti (Committees)

### `GET /kameti/committees` 🔒 — committees you belong to.

### `POST /kameti/committees` 🔒 — create a committee.

**Request:**
```json
{ "name": "Family Savings", "nameUr": "خاندانی بچت", "monthlyAmount": 2000, "totalMembers": 6, "duration": 6, "language": "ur" }
```
**Response `201`:** the created committee, including a generated `inviteCode` (8 chars, share this with people who join).

---

### `POST /kameti/committees/join` 🔒
**Request:** `{ "inviteCode": "AB12CD34" }`
**Response `200`:** the committee object. **Response `400`:** `"Already a member"` or `"Committee is full"`.

---

### `POST /kameti/committees/:committeeId/pay` 🔒
Mark this month's payment as paid.

**Request:** `{ "month": 3 }`
**Response `200`:**
```json
{ "success": true, "payment": { "month": 3, "amount": 2000, "status": "paid", "paidDate": "...", "transactionId": "TXN_..." }, "trustScore": 78, "message": "Payment recorded successfully" }
```
> `trustScore` here is the user's **new** score after this payment, computed by the ML model (falls back to a rule-based score if that service is unreachable — the number itself always comes back the same way either way).

---

### `GET /kameti/committees/:committeeId` 🔒
Full committee detail, including `userPayments` — just the logged-in user's own payment rows, so you don't have to filter the full `payments` array client-side.

---

## Notifications

### `GET /kameti/notifications` 🔒 — last 50, newest first.
### `PUT /kameti/notifications/:id/read` 🔒 — marks one as read.

---

## Chatbot

### `POST /chatbot/message` 🔒
**Request:** `{ "message": "How do I price my tailoring work?", "sessionId": "session_abc123" }`
**Response `200`:** `{ "reply": "...", "sessionId": "session_abc123" }`
> `sessionId` — generate a UUID client-side per conversation thread and reuse it for the whole chat session so history stays grouped.

### `GET /chatbot/history/:sessionId` 🔒 — full message history for that session, oldest first.

---

## Error status codes (apply across all endpoints)

| Code | Meaning |
|---|---|
| 400 | Bad request — missing/invalid fields (check `error` message) |
| 401 | Missing or invalid token — redirect to login |
| 403 | Logged in, but not authorized for this action (e.g. editing someone else's storefront) |
| 404 | Resource not found |
| 500 | Server error — not your fault, but log it |

---

## 🖼️ Images — quick reference

Images are stored as binary data in MongoDB, not as URLs. This means:
- **Uploading:** send as `multipart/form-data` with the field name shown above (`coverImage` or `image`), not as a JSON string field.
- **Displaying:** don't look for an `imageUrl` in the JSON response — instead point an `<img>` tag straight at the dedicated image endpoint:
  ```
  GET /storefronts/:id/cover-image
  GET /products/:id/image
  ```
- If no image was uploaded, these return `404` — show a placeholder image in that case.
