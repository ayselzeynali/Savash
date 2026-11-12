# TABRIZ WORLD — live voice calling

## Goal
Buyer and seller can speak live over the internet using the device microphone. This is a real-time call, not a recorded voice note.

## Current prototype
- `prototype/voice-chat.html` provides a Persian RTL call screen and requests microphone access only after the user taps the microphone button.
- It uses browser WebRTC audio tracks, echo cancellation, noise suppression, and an audio-only peer connection.
- The WebSocket signaling URL is intentionally blank until a secure signaling backend is deployed. Therefore the current page can test microphone permission, but cannot yet connect two users.
- The included public STUN server is for connectivity discovery only; production also needs TURN for users behind restrictive NAT/firewalls.

## Required signaling server contract
Deploy an authenticated WSS endpoint and set `SIGNALING_URL` in `prototype/voice-chat.html`.

The server must:
1. Authenticate the user's existing TABRIZ WORLD session; never trust a client-supplied user or seller identity.
2. Authorize the caller to join only a conversation associated with an order they own, or a shop conversation the verified seller owns.
3. Accept `{type:"join", room, role}`; verify the room/order membership server-side.
4. Relay `description` and `ice` messages only to the other authorized participant in that room.
5. Send `{type:"peer-joined"}` when the second participant joins and `{type:"peer-left"}` on disconnect.
6. Enforce one buyer and one authorized seller per private order room, rate limits, message-size limits, and short-lived room authorization.
7. Use WSS, authenticated access, audit-safe metadata only, and short retention. Do not record calls by default.

## Production networking
- Configure TURN over TLS (443) with short-lived credentials; do not ship permanent TURN secrets in the client.
- Use HTTPS for the web app and request microphone permission only after a clear user action.
- Add incoming-call notification, busy/decline states, reconnect handling, call duration, mute, speaker routing, and accessibility states before release.
- For native Android/iOS builds, implement native WebRTC audio routing and OS microphone permission flows; this HTML prototype alone is not a native mobile integration.

## Test plan
1. Serve the page over HTTPS (localhost is permitted for local development).
2. Test microphone permission and denial on Android Chrome and iOS Safari.
3. After the authenticated signaling service and TURN are deployed, test two separate phones on different networks.
4. Verify that a buyer cannot join another buyer's order room and that a seller cannot join a shop/order they do not own.
5. Confirm no audio is recorded or stored unless a separate, explicit recording feature is designed and consented to.
