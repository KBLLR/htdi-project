# Repository Guidelines

## Project Structure & Module Organization
- `src/` — application code: `js/` modules (e.g., `src/js/Particles.js`), `css/`, `pages/`, `controllers/`, `shaders/`, plus `main.js` entry.
- `public/` — served at site root by Vite (e.g., `/favicon.svg`, `/manifest.webmanifest`).
- `static/` — large/static assets copied to the root at build/dev (models, HDRs, audio). Avoid placing JS here.
- `dist/` — Vite production output. Do not hand‑edit.
- `index.html` — Vite HTML entry.
- `vite.config.js` — build/dev configuration; handles copying `static/`.

## Build, Test, and Development Commands
- `npm run dev` — Vite dev server with HMR; opens automatically.
- `npm run build` — Vite production build into `dist/`.
- `npm run preview` — serve the `dist/` build locally.
- `npm run generate:assets` — regenerate `src/config/assets.js` + asset catalog metadata from `public/`.

## Coding Style & Naming Conventions
- JavaScript: ES modules, 2‑space indentation, semicolons. Variables/functions `camelCase`; classes `PascalCase` (see `src/js/Navigation.js`).
- Files: class‑like modules `PascalCase.js` in `src/js/`; feature utilities `camelCase.js`.
- CSS: keep in `src/css/`; class names kebab‑case; import CSS from `src/main.js`.
- Linting: ESLint available; run `npm run lint`. Add `.eslintrc` if you need project rules.

## Testing Guidelines
- No unit tests configured. Manual QA:
  - `npm run dev` — scene renders; no console errors; interactions OK.
  - Asset paths resolve from `public/` and `static/` in dev and build.
  - Test desktop Chrome/Edge and one mobile viewport.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Keep PRs focused; include a clear description, linked issues, and before/after screenshots or clips for visual changes.
- Don’t edit `dist/` manually; always rebuild.

## Security & Assets
- Respect third‑party licenses (fonts, models, audio). Store large binaries under `static/`; reference them from code.
- Never commit secrets. No API keys required by default.

## Asset Pipeline
- Public assets are indexed automatically via `scripts/assetManifest.mjs`; do not hand-edit `src/config/assets.js`.
- Additional metadata lives in `src/config/assetCatalog.js` and powers Tweakpane selectors (HDRIs, cubemaps, gobos, PBR sets).
- Maintain texture/particle atlases with `scripts/make_atlas.mjs`; update accompanying `.json` manifests when adding sprites.
- Use KTX2/WebP helpers in `scripts/convertImageToKTX2.mjs` and `scripts/convertImageToWebP.mjs` for new textures.
- Blender FBX→GLB conversions rely on `scripts/convert_fbx_with_blender.zsh`; set `BLENDER_BIN` before running.
