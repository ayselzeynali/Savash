# Savash — Squad Combat

Savash is a mobile-friendly top-down squad-combat game.

## Editions
- Full edition: 30 increasingly difficult battle waves.
- Buyer demo: first 3 waves only, built separately for private evaluation.

## Campaign
- 30 increasingly difficult battle waves in the full edition.
- Boss encounters on waves 5, 10, 15, 20, 25, and 30.
- Five-soldier squad with automatic support fire.
- Touch controls and keyboard controls.
- Built-in soundtrack and optional user-selected audio.

## Controls
- Move: on-screen directional pad, WASD, or arrow keys.
- Attack: hold **FIRE** to shoot the nearest enemy.
- Pause: use the **PAUSE** button or Escape on a keyboard.

## Android builds
- **Build Savash Android APK** creates the full-edition APK. If all four release-signing secrets are configured, it also creates a signed release APK.
- **Build Savash 3-Wave Buyer Demo** creates a separate 3-wave demo APK with application ID `com.savash.demo`.

Full-edition release-signing secrets:
- `SAVASH_KEYSTORE_BASE64`
- `SAVASH_STORE_PASSWORD`
- `SAVASH_KEY_ALIAS`
- `SAVASH_KEY_PASSWORD`

Download generated APKs from the relevant GitHub Actions run's Artifacts section. Keep this repository private and never publish its source archive or credentials.

## Project scope
This repository contains Savash only. The separate `TABRIZ-WORLD` project is not part of the Savash deliverable.
