# Authenticated call-token API contract

The static voice page calls this endpoint:

`POST /api/call-token`

Request (authenticated session required):
```json
{ "order_reference": "TW-10025" }
```

Success response:
```json
{ "token": "<short-lived-signed-jwt>", "role": "buyer" }
```

The endpoint must be implemented by the main TABRIZ WORLD application backend. It is deliberately not implemented inside the signaling service: the signaling process has no order database and must not trust a browser's claim that it is a buyer or seller.

## Required server-side checks

1. Validate the user's real login session.
2. Resolve the order reference from the database; do not accept a client-provided room ID or user ID.
3. Confirm the caller is either the buyer on that order or the verified seller who owns the shop for that order.
4. Confirm the order is in a state where buyer-seller communication is allowed.
5. Derive the role from the database, never from a request field.
6. Generate an opaque random room ID (or retrieve the stable private room ID for that order).
7. Sign a JWT using the same `CALL_JWT_SECRET` as the signaling server. Required claims:
   - `iss`: `tabriz-world`
   - `aud`: `voice-call`
   - `sub`: authenticated account ID
   - `room_id`: opaque room ID matching `^[A-Za-z0-9_-]{6,100}$`
   - `role`: `buyer` or `seller`, derived from database
   - `iat`: current Unix timestamp
   - `exp`: no more than 300 seconds after `iat`
8. Return `Cache-Control: no-store`, use HTTPS, and rate-limit token issuance.

The client sends its session cookie using `credentials: "include"`. Configure same-site secure cookies and strict CSRF protection (or require a CSRF token) if the API is cross-origin. Configure CORS to allow only the deployed TABRIZ WORLD app origin.

## Do not

- Do not expose `CALL_JWT_SECRET` to a browser, app bundle, or GitHub.
- Do not allow the client to choose its role, account ID, or internal room ID.
- Do not issue a call token based only on knowing an order number.
- Do not log authorization tokens or WebSocket query strings.
- Do not record call audio by default.

Until this authenticated endpoint is deployed and connected, the web page can test microphone permission but cannot establish a real two-person call.
