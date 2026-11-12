# TABRIZ WORLD voice signaling server

This service relays WebRTC offer/answer and ICE signaling only. It does not carry or record audio. Media flows peer-to-peer when possible, or through a separately configured TURN relay.

## Deploy
1. Deploy this folder to a Node.js 20+ host that supports persistent WebSocket connections.
2. Configure HTTPS/WSS at the host or reverse proxy.
3. Set `CALL_JWT_SECRET` to a random secret of at least 32 characters and optionally `PORT`.
4. Run `npm install` then `npm start`.
5. Verify `GET /health` returns JSON.
6. Configure the frontend `SIGNALING_URL` as `wss://YOUR_HOST/signal`.

## Security-critical token issuance
The mobile/web client must never create its own call token. A trusted application backend must:
- authenticate the logged-in user;
- load the order/shop from the database;
- confirm the user is that order's buyer or the verified seller for that shop;
- ensure the order permits an active conversation;
- issue a short-lived HS256 JWT with `iss=tabriz-world`, `aud=voice-call`, `sub=<authenticated-user-id>`, `room_id=<opaque-random-room-id>`, and `role=buyer|seller`;
- sign it with the same server-side `CALL_JWT_SECRET`.

Use an expiry of about 2–5 minutes for the token and mint a fresh token for each join. Never put the signing secret in the browser, Android app, iOS app, or GitHub. The token is passed as a query parameter in this initial prototype; configure access logs to redact query strings on this endpoint. A later production revision should use a short-lived one-time ticket or an authenticated WebSocket handshake that avoids URL token logging.

## Room rules
At most one buyer and one seller can join a room. The room ID and role are trusted only because they are signed in the short-lived JWT. The signaling server does not decide order ownership itself; token issuance must do that check. Add rate limits and distributed room coordination before running multiple server instances.

## TURN
Configure a production TURN service with TLS on port 443 and short-lived credentials. STUN alone is not sufficient for reliable calls across carrier networks and restrictive NATs. Do not commit permanent TURN credentials.

## Current limitations
- This is a signaling foundation, not a complete calling product.
- The current static voice page has a blank `SIGNALING_URL`; set it after deployment.
- The current page must also be updated to fetch a short-lived call token from the authenticated app backend before connecting.
- No incoming-call push notifications, mute/speaker UI, call history, billing, or native mobile SDK integration is included yet.
- Calls are not recorded.
