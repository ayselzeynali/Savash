# Seller-direct payments — TABRIZ WORLD

## Product requirement

A customer buying from a participating shop must pay that shop's verified settlement account. TABRIZ WORLD must not silently collect every shop's sales into the platform owner's personal account.

## Required checkout flow

1. The customer chooses products from one seller. The checkout shows the seller's legal/shop name, item subtotal, delivery fee, platform fee (if any), and total in toman.
2. The backend creates an immutable order and payment attempt. The seller must already have completed identity/business verification and registered a settlement IBAN/account accepted by the licensed payment provider.
3. The backend requests a payment using a provider contract that explicitly supports marketplace split settlement / multi-beneficiary settlement. The seller receives the seller amount; the platform receives only its disclosed commission, if the provider supports that split.
4. The customer pays on the provider's hosted secure page. TABRIZ WORLD never collects or stores card number, CVV2, expiry, or one-time password.
5. The provider callback is only a notification. The backend verifies the transaction server-to-server, checks amount/currency/order reference, and handles duplicate callbacks idempotently before marking the order paid.
6. The seller dashboard receives the paid order and shipping details. Delivery tracking and refund/cancellation states are recorded against the order.

## Important provider constraint

Selecting a bank logo in the prototype does not mean that provider supports paying arbitrary sellers directly. Split settlement is provider-, product-, contract-, and merchant-approval-specific. The integration must be enabled in writing by the provider and tested in its sandbox before production.

The current public capability comparison for common Iranian gateways shows split settlement in some services (for example Zarinpal, Zibal, PayPing, Parsian, AsanPardakht and DigiPay), while the listed standard integrations for Behpardakht Mellat, Sadad, SEP/Saman, Sepehr and Pasargad do not show a generic split-settlement capability. This is a technical screening aid, not a guarantee or legal determination; confirm current official merchant documentation and contract terms with each provider.

If a selected bank gateway cannot split settlement, do not claim that payment went directly to the seller. Either:
- offer a provider-approved marketplace / multi-beneficiary product; or
- keep that gateway disabled for seller-direct checkout until a compliant payout arrangement is approved.

Do not implement an informal “platform collects then transfers later” workaround without legal, tax, payment-provider, and seller-contract review. Do not call it escrow unless the provider is licensed and contractually supports escrow.

## Backend records and controls

- Seller: verified legal identity, shop, settlement beneficiary token/IBAN (encrypted or provider-tokenized), provider approval status.
- Order: buyer, seller, line items, item total, shipping, commission, seller net amount, currency (IRR), status.
- Payment attempt: provider, provider transaction reference, amount, idempotency key, callback state, verification timestamp.
- Settlement: provider settlement reference, beneficiary, amount, status, timestamp.
- Refund: original payment reference, amount, reason, provider result.

Enforce server-side amount calculation, seller ownership checks, row-level access control, signed/verified callbacks, replay protection, audit logs, and reconciliation reports. Never trust amounts or seller bank details sent by the mobile client.

## Prototype status

The current `prototype/index.html` checkout is a visual prototype only. Its five gateway choices are not live payment integrations and no real money is moved. Production work still requires seller onboarding, provider contracts/credentials, secure backend endpoints, database policies, callback verification, refunds, and end-to-end testing.
