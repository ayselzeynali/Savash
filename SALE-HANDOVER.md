# Savash — Sale & Handover Notes

## Product
- Name: Savash
- Android application ID: `com.savash.game`
- Campaign target: 30 waves
- Current repository: https://github.com/ayselzeynali/Savash
- Main branch: `main`

## Included in the source handover
- Game source and web assets tracked in the main branch
- Images and soundtrack files tracked in the repository
- Capacitor Android build workflow
- Build and project notes in README.md

## Explicit exclusion
The separate `TABRIZ-WORLD` project is excluded from the current main-branch source package. Historical Git commits are not rewritten.

## Android build
The GitHub Actions workflow `.github/workflows/android-apk.yml` builds a debug APK and, when the configured signing secrets are available, a signed release APK.

For future updates to install over the existing Savash app, retain the original Android signing keystore and its passwords. Do not regenerate or replace the signing key. The private signing credentials are not included in this source archive and must be transferred securely by the seller if they are part of the agreed sale.

## Current build evidence
A successful GitHub Actions build was recorded for run:
https://github.com/ayselzeynali/Savash/actions/runs/44743819781

The release APK signature was verified with jarsigner. This confirms the APK signature structure, not that the game has passed a full device/gameplay test.

## Before advertising or completing a sale
- Install and test the release APK on a real Android phone.
- Test menu, movement, firing, audio, wave progression, and boss waves through wave 30.
- Confirm that all artwork, audio, fonts, libraries, and other included materials may be transferred to the buyer.
- Agree in writing whether the sale includes source code, compiled APK, signing keystore, signing credentials, repository ownership, store accounts, and future support.
- Transfer private signing credentials through a secure channel, never in a public repository or chat.
- Remove personal access tokens and private account information from any buyer-facing copy.
- Make a dated backup before transferring repository ownership.

## Important legal and commercial note
This document is a technical handover checklist, not a legal assignment, warranty, valuation, or proof of ownership. The seller and buyer should document the exact assets, rights, exclusions, payment terms, liabilities, and transfer date in a separate agreement appropriate to their jurisdiction.
