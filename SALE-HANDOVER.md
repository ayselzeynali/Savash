# Savash — Sale & Handover Notes

## Product
- Product name: Savash
- Type: mobile-friendly top-down squad combat game
- Android application ID: `com.savash.game`
- Campaign target: 30 waves; boss encounters on waves 5, 10, 15, 20, 25 and 30
- Main repository: https://github.com/ayselzeynali/Savash
- Delivery branch: `main`

## Included in the current source tree
- Game source: `index.html`
- Web app metadata: `manifest.webmanifest`
- Offline cache/service worker: `sw.js`
- Background image: `savash-bg.jpg`
- Built-in soundtrack: `savash-track-5.mp3`
- Android wrapper configuration: `capacitor.config.json`, `package.json`
- Automated Android build: `.github/workflows/android-apk.yml`
- Source handover archive workflow: `.github/workflows/source-package.yml`
- Documentation: `README.md`, `SALE-HANDOVER.md`, `ASSET-INVENTORY.md`

The repository also contains `file_00000000d45c81f48ba3ab6d5282ec87.png`. It is included in the source archive, but the current game HTML does not reference it; confirm whether it is an unused source asset before representing it as an in-game asset.

## Explicit exclusion
The separate `TABRIZ-WORLD` project is excluded from the current main-branch source package. Historical Git commits have not been rewritten.

## Android build and signing
The GitHub Actions workflow builds a debug APK and, when all four repository secrets are present, a signed release APK:
- `SAVASH_KEYSTORE_BASE64`
- `SAVASH_STORE_PASSWORD`
- `SAVASH_KEY_ALIAS`
- `SAVASH_KEY_PASSWORD`

Keep the original Android signing keystore and credentials for future updates. Do not regenerate or replace the key if the buyer must install updates over an existing installation. Private signing credentials are not included in the source archive and should only be transferred securely if included in the sale agreement.

The Android package uses Capacitor 7 dependencies declared in `package.json`. The build workflow currently uses Node.js 20 and Java 21.

## Current technical status
- Source contains a 30-wave campaign configuration and boss-wave logic.
- Mobile movement pad position has been raised in CSS; service-worker cache was advanced to `savash-shell-v9` so clients can fetch updated game files.
- A fresh Android build for commit `92465b6de701fb629188f0d4cd221c677de27215` is running here: https://github.com/ayselzeynali/Savash/actions/runs/44745929030
- The latest build must complete and the resulting APK must be installed and tested on a real phone before the product is advertised as device-tested or sale-ready.

## Pre-sale acceptance checklist
- [ ] Install the latest signed release APK on a real Android phone.
- [ ] Verify the four movement controls do not overlap Android navigation controls.
- [ ] Test menu, movement, firing, pause/resume, audio on/off, and user-selected audio.
- [ ] Complete or otherwise verify all 30 waves, including boss waves 5, 10, 15, 20, 25 and 30.
- [ ] Check gameplay performance, screen scaling, and audio on the intended buyer devices.
- [ ] Review the asset inventory and confirm transfer rights for every image, audio file, font, library, and other included material.
- [ ] Decide whether the sale includes source code, APK, repository ownership, signing keystore, credentials, store accounts, domain/hosting, and support.
- [ ] Remove personal tokens, private account information, and any seller-only secrets from buyer-facing materials.
- [ ] Make a dated backup before transferring repository ownership.

## Ownership, licenses, and commercial terms
There is currently no root `LICENSE` file in the repository. This handover note does not grant rights or prove ownership. Before sale, seller and buyer should sign a separate written agreement identifying the exact deliverables, intellectual-property rights being assigned or licensed, exclusions, payment, warranties, liabilities, transfer date, and support obligations. Confirm that all third-party libraries and media may be used and transferred under their applicable terms. Do not claim that third-party rights have been cleared until that review is complete.
