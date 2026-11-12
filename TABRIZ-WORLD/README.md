# TABRIZ WORLD

A mobile-first virtual city and marketplace concept for Iran.

## Target platforms
- Samsung Android phones
- Apple iPhone (iOS)

## Product direction
- Ultra-quality realistic 3D city recreation of Tabriz
- Third-person camera
- User avatar generated from a selfie, with explicit consent
- Shared online city and account-based text messaging between customers and sellers
- Real participating shops and seller dashboards
- Real checkout in Iranian toman through a licensed payment provider
- Domestic shipping and order tracking

## Important scope note
This repository folder is the project foundation and mobile UI prototype. It is not yet the finished 3D game. The production game requires an Unreal Engine project, optimized city assets, backend services, identity and privacy safeguards, seller onboarding, payment-provider integration, and shipping integrations.

## Suggested milestones
1. Mobile UI prototype and product specification
2. Tabriz vertical-slice: one accurately recreated street/block
3. Third-person movement and avatar pipeline
4. Account-based text messaging between customers and sellers
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

## Seller dashboard and cloud product catalogue
- Open [`prototype/seller-dashboard.html`](prototype/seller-dashboard.html) for seller sign-up/sign-in and product submission with a camera or gallery photo.
- Product records and images are stored in the connected Supabase project. New products start as pending and are not shown in public storefronts until approved.
- Open [`prototype/admin-dashboard.html`](prototype/admin-dashboard.html) to review, approve, or reject submitted products.
- Follow [`docs/ADMIN-SETUP.md`](docs/ADMIN-SETUP.md) to grant the first administrator access securely.
- Seller identity/business verification, orders, refunds, and live bank payments are not implemented yet.

## Buyer-seller text messaging
- `prototype/text-chat.html` is a mobile-friendly preview of the text-message interface.
- Live voice calls and microphone access are not part of the product direction.
- The current chat page is a local-only prototype: messages stay in the same browser and are not delivered to another account or device.
- Production messaging requires authenticated customer/seller accounts, server-side authorization (including order or shop access rules), persistent message storage, and a secure API or realtime delivery service. Do not expose messages across unrelated accounts.
