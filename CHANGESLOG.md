# Changelog

## feat: sculpt circular water feature
- Replaced the planar ground/water basin with matching circle geometries for a cleaner hero composition.
- Swapped in the Three.js reflective water shader with animated normals, sun highlights, and fog awareness driven by the main render loop.

## chore: chart modernisation reboot
- Documented the decision to sunset the legacy monolith and rebuild as a modular Vite + Three.js pipeline.
- Captured lessons from the current architecture and outlined migration goals in `docs/reboot-plan.md`.

## feat: tribute deployment timeline
- Reimagined deployments as an on-canvas overlay timeline with floating cards, keeping the actions bar live while you scrub milestones.
- Added luminous stems, hover parallax, and tuned scrollbars so the tribute rides above the Three.js scene without breaking immersion.
- Modularised the custom cursor so it can be paused when overlays appear, restoring precise pointer interaction on demand.
- Added environment intensity controls so the spotlight can breathe even under bright HDRs.
- Rebuilt deployment cards with live thumbnails, clearer hierarchy, and spacious typography so milestones read like real release notes.
- Flattened the deployment overlay into a clean dashboard row—solid backdrop, even spacing, and crisp typography for each release.
- Restored the timeline spine/markers and added lazy-loading batches so every deployment streams in as you scroll.
- Extended the timeline to full width with restored markers/dates, improved lazy loading, and typographic hierarchy using the new font stack.

## fix: restore modal focus wiring
- Reuse the initial modal service instance so camera focus and cleanup hooks fire when opening UI panels.
- Prevent duplicate modal event listeners that caused inconsistent modal state across hot reloads.

## feat: automate asset catalog and tweakpane tooling
- Added asset manifest generator with Vite integration to keep `src/config/assets.js` and derived catalog metadata in sync with `public/`.
- Introduced asset catalog helpers powering new Tweakpane selectors for HDRIs, cubemaps, gobos, kid skins, and reusable PBR material sets.
- Refactored Tweakpane manager with PBR material loader, fog/spotlight editors, atlas awareness, and pane visibility events surfaced to the Actions Bar.
- Expanded runtime scene definitions and loaders with environment presets, kid material variants, and runtime scene switching helpers.
- Reorganized public assets (alphamaps, cubemaps, texture atlases, cursor icons) and added scripts for atlas generation, image conversion, and Blender FBX exports.

## feat: add new feature
- Implemented scene picker UI with scene selection logic.
- Integrated asset loading for scene thumbnails and enabled scene transitions.
- Added scene metadata display and measured scene load times.
- Refactored TweakpaneManager for improved organization of scene settings, post-processing, and models.
- Implemented scene-specific asset disposal to reduce memory usage during scene transitions.
- Resolved various linting errors in modified files.

## chore: modular history & music reorg
- Moved deployment timeline UI/viewer modules into `src/modules/history` and added a dedicated alias for cleaner imports.
- Relocated the music player stack under `src/music` with a `@music` alias to prepare for upcoming AI integrations.
- Shifted particle utilities into `src/extras`, refreshed Vite aliases, and widened Tweakpane scale controls around the enlarged outer mesh.
