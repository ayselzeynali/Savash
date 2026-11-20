# Savash — Squad Combat

Savash is a mobile-friendly top-down squad combat game.

## Campaign
- 30 increasingly difficult battle waves.
- Boss encounters on waves 5, 10, 15, 20, 25, and 30.
- Five-soldier squad with automatic support fire.
- Touch controls and keyboard controls.
- Built-in soundtrack and optional user-selected audio.

## Controls
- Move: on-screen directional pad, WASD, or arrow keys.
- Attack: hold **FIRE** to shoot the nearest enemy.
- Pause: use the **PAUSE** button or Escape on a keyboard.

## Android build
The GitHub Actions workflow **Build Savash Android APK** creates an installable debug APK on every manual run or relevant push. If all four release-signing secrets are configured, it also creates a signed release APK:
- `SAVASH_KEYSTORE_BASE64`
- `SAVASH_STORE_PASSWORD`
- `SAVASH_KEY_ALIAS`
- `SAVASH_KEY_PASSWORD`

Download the APK from the workflow run's Artifacts section.

## Project scope
This repository contains Savash only. The separate `TABRIZ-WORLD` project is not part of the Savash deliverable.
