# Savash — Asset & Dependency Inventory

This inventory describes the files currently tracked on the `main` branch. It is a technical inventory, not proof of copyright ownership or permission to transfer.

## Game and web assets

| Path | Purpose / status |
|---|---|
| `index.html` | Main game code, UI, controls, gameplay logic, and audio selection |
| `manifest.webmanifest` | Web app metadata |
| `sw.js` | Service worker and offline cache; current cache key is `savash-shell-v9` |
| `savash-bg.jpg` | Background image referenced by the game menu |
| `savash-track-5.mp3` | Built-in soundtrack referenced by the game |
| `file_00000000d45c81f48ba3ab6d5282ec87.png` | PNG tracked in repository; current `index.html` does not reference this filename. Confirm its intended use and rights. |

## Android build files

| Path | Purpose |
|---|---|
| `package.json` | Declares Capacitor Android/Core/CLI dependencies |
| `capacitor.config.json` | Android app ID `com.savash.game`, app name, web asset directory |
| `.github/workflows/android-apk.yml` | Builds debug APK and optionally signed release APK |
| `.github/workflows/source-package.yml` | Creates ZIP source handover artifact |

## Declared direct software dependencies

- `@capacitor/android` — version range `^7.4.3`
- `@capacitor/core` — version range `^7.4.3`
- `@capacitor/cli` — development dependency, version range `^7.4.3`

The build workflow uses Node.js 20 and Java 21. Transitive dependencies are resolved during `npm install`; review the generated lockfile/dependency tree and each applicable license before a commercial transfer. No `LICENSE` file is currently present at the repository root.

## Rights review required before sale

1. Confirm who created or licensed each image and audio file, including the unreferenced PNG.
2. Confirm that the soundtrack and background may be commercially used and transferred to the buyer.
3. Review direct and transitive software dependency licenses.
4. Record any excluded assets or accounts in the sale agreement.
5. Transfer signing credentials only through a secure channel if they are part of the deal.

Do not publish passwords, keystores, access tokens, or private signing secrets in this repository or source ZIP.
