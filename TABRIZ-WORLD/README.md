# TABRIZ WORLD

A mobile-first virtual city and marketplace concept for Iran.

## Target platforms
- Samsung Android phones
- Apple iPhone (iOS)

## Product direction
- Ultra-quality realistic 3D city recreation of Tabriz
- Third-person camera
- User avatar generated from a selfie, with explicit consent
- Shared online city and proximity voice chat
- Real participating shops and seller dashboards
- Real checkout in Iranian toman through a licensed payment provider
- Domestic shipping and order tracking

## Important scope note
This repository folder is the project foundation and mobile UI prototype. It is not yet the finished 3D game. The production game requires an Unreal Engine project, optimized city assets, backend services, identity and privacy safeguards, seller onboarding, payment-provider integration, and shipping integrations.

## Suggested milestones
1. Mobile UI prototype and product specification
2. Tabriz vertical-slice: one accurately recreated street/block
3. Third-person movement and avatar pipeline
4. Multiplayer presence and voice
5. Seller storefronts and product catalogue
6. Secure real payments and delivery workflow
7. Android/iOS optimization, testing, and release

## Structure
- `prototype/`: mobile-first concept interface
- `docs/`: technical and product planning (to be expanded)

## Seller-direct payments
- Marketplace checkout is designed so each participating seller receives their sale through a payment provider's approved split-settlement / multi-beneficiary feature; TABRIZ WORLD receives only its disclosed commission when supported.
- Bank logos in the prototype are placeholders, not live payment integrations. Direct seller settlement must be confirmed in the provider's current contract and API before enabling a gateway.
- See [`docs/SELLER-DIRECT-PAYMENTS.md`](docs/SELLER-DIRECT-PAYMENTS.md) for the payment flow, security controls, and provider constraints.

## Seller dashboard prototype
- Open [`prototype/seller-dashboard.html`](prototype/seller-dashboard.html) to preview the seller onboarding form, product catalogue editor, sample order workflow, and secure settlement setup placeholder.
- This is a front-end demonstration only: it does not persist data, verify sellers, accept bank details, or process orders/payments. Production requires authenticated backend APIs, document verification, database access policies, and provider-approved settlement integration.

## Live buyer-seller voice calling
- `prototype/voice-chat.html` is the mobile-friendly WebRTC voice-call screen with microphone permission and mute controls.
- `voice-server/` contains the Node.js WebSocket signaling service and a Docker/Render deployment blueprint. It relays WebRTC signaling only; it does not record or transport call audio.
- `docs/LIVE-VOICE-CALLING.md` explains the architecture and TURN requirements.
- `docs/VOICE-CALL-TOKEN-API.md` defines the required authenticated API contract. The main application backend must validate the buyer/seller's order membership and issue a JWT lasting no more than five minutes.
- The voice call is not production-active yet: deploy the signaling service, configure TURN, implement the authenticated token API, and set `SIGNALING_URL` and `TOKEN_ENDPOINT` in the voice page. Never expose the JWT signing secret in the client.
