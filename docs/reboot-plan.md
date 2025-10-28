# Pipeline Reboot Notes

## Why start fresh
- The current entry point (`src/main.js`) drives every system in one block, making it harder to adopt the modular `WaterScene` style we want.
- `src/three/index.js` has grown into an 800+ line monolith that mixes asset loading, character logic, water effects, post-processing, and loop orchestration.
- UI actions and modals are anchored to specific DOM ids, so swapping components or rendering targets requires manual changes across files.
- The asset pipeline now generates manifests, but the repo still tracks hundreds of legacy assets and scripts; cleaning them while refactoring would add noise.

## Goals for the reboot
- Bootstrap a clean Vite + Three.js app using discrete experience modules (e.g. `WaterScene`) that can be mounted or swapped without touching global state.
- Split environment concerns into focused modules: characters, water/ground, lighting, post-processing, and runtime loop management.
- Replace DOM-id wiring with declarative registries so UI elements can be composed or replaced without editing markup.
- Keep the asset manifest tooling, but start with a pruned `public/` folder and documented workflows (`scripts/updateAssets.mjs`, atlas helpers).
- Establish baseline quality gates (lint + smoke build) before layering features.

## Migration approach
1. Scaffold a new workspace with the desired Vite/Three setup.
2. Port over reusable modules (asset registry, Water material helpers, event bus) after they are trimmed and documented.
3. Rebuild UI systems (actions bar, modals) with the new architecture, keeping legacy styles only where they still serve the design.
4. Reintroduce scenes, characters, and shaders incrementally—each as self-contained modules that expose lifecycle hooks.

This note is here so future contributors understand why the Git history shows a clean slate and what principles guided the reboot.
