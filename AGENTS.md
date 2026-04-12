# Repository Guidelines

## Paradigm (House-Level)
- House ID: `htdi-project`
- Role: canonical runtime and stage-facing surface for diary profiles, sessions, tasks, and scene references
- Status/Type: discovered · ui
- This house participates in the Core-X ecosystem by emitting and consuming **OpenResponses** events via the Event Bus. No local schema forks.

## Persona Ritual Boundary
- HTDI remains the canonical owner of `agent.profile.v1`, but active diary identity is persona-first.
- Provider is optional metadata only and should live under `metadata.source_provider`.
- A profile is only considered ready for mirror/export/public-candidate workflows once the persona ritual is complete and `metadata.ritual_complete` is true.
- Required ritual fields include chosen/display name, role, category, gender, pronouns, bio, working style, favorite color, favorite animal, favorite song, voice, signature, portrait prompt, and manual stage prompt.

## Sources of Truth (No Split Brain)
- `/registries/houses.registry.json`
- `/registries/agents.registry.json`
- `/registries/services.registry.json`
- `/registries/models.registry.json` (model-zoo)
- Event Bus: `http://localhost:8085/events` (SSE) and `POST http://localhost:8085/emit`

## Interfaces
- Primary UI: Vite app at `http://localhost:5170`
- Canonical diary API target shape:
  - `GET /api/diary`
  - `GET /api/profiles`
  - `PUT /api/profiles/:agentHandle`
  - `GET /api/tasks`
  - `PUT /api/tasks/:taskId`
  - `PUT /api/sessions/:sessionId/reflection`
  - `PUT /api/sessions/:sessionId/events`

## Services
- No registered services (see `/registries/houses.registry.json`).

## Communication (OpenResponses)
- Emit events using the canonical OpenResponses schema (no local copies).
- Subscribe to the Event Bus SSE stream for activity.
- Use `response.*` and `tool.*` events for agent activity and tool calls.

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
  - Diary/profile/task data still remains canonical here even when downstream houses consume it.
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

## LeAgentDiary Boundary
- HTDI owns canonical `agent.profile.v1`, `diary.session.v2`, and `task.record.v1`
- LeAgentDiary is the review/intake/export surface
- LeAgentDiary now performs persona ritual intake, not just thin provider-backed profile capture
- Any `/v1/stages` bridge is experimental and secondary
- Public publication belongs in Le Belle Epoch, not here
