# LeAgentDiary Bridge Blueprint

This document distills the HTDI experience into reusable chunks so agents can transplant the UI, tasking metaphors, and 3D scene scaffolding into the LeAgentDiary initiative. Pair it with the templates that live in `../code-platformer-AI/agents` to keep both repos in sync.

## Experience Overview

- **Entry + orchestration** — `src/main.js` wires the cursor, music player, actions bar, modal service, scene picker, and deployment timeline. Treat this as the contract for how UI chrome talks to the 3D scene (`createExperience()`, `applyScene()`, deployment overlays).
- **Layout shell** — `index.html` defines the HUD: footer actions bar (`#info-btn`, `#tasks-btn`, `#music-btn`, `#deployments-btn`), modal portals for Info/Tasks/Scenes (`data-modal-id="info|tasks|scenes"`), scene carousel container (`#scene-picker`), and the deployment timeline overlay (`#deployment-timeline-overlay`).
- **Styling system** — `src/css/style.css` holds the glassmorphism tone (look at the `.glass-footer`, `.modal`, `.tasks-layout`, `.deployment-card`, and `.scene-card` blocks). Export the token palette per scene via `scenes.js`.

## UI Components To Mirror

1. **Task Planner modal** — `index.html:469-618` plus `.tasks-layout*` in `src/css/style.css` implements a two-column kanban (Open Tasks + Assistants) with a task generator form. Hook this into the `code-platformer-AI/agents` task catalog so LeAgentDiary agents see live work items.
2. **Scene Picker** — `src/modules/scenePickerUI.js` renders cards with thumbnail upload/edit/delete controls and keyboard support. Source data is `getScenes()` from `@world/sceneManager.js` which in turn reads `src/data/scenes.js`.
3. **Deployment Timeline + Cards** — `src/modules/history/deploymentTimelineUI.js` builds the infinite scroller and cards with inline preview + CTA buttons, while `src/modules/history/deploymentViewer.js` handles the iframe overlay. Styling is under `.deployment-*` in `src/css/style.css`.
4. **Actions Bar + Modals** — `src/modules/actionsBar/ActionsBarManager.js` + `src/modules/bootstrapApp.js` register button handlers driven by `src/config/actions.json`. `src/shared/modalService.js` centralizes open/close, and `src/modules/wireModalButtons.js` connects discrete buttons to modal IDs.

## Scene + Asset Stack

- **Scene definitions** — `src/data/scenes.js` exposes three presets (`studio-lite`, `era`, `omega`) with HDR/cubemap references, kid skin material overrides, UI palette tokens, and water shader params. Each entry is the blueprint for a LeAgentDiary “room”.
- **Asset catalog** — `src/config/assetCatalog.js` parses `src/config/assets.js` (auto-generated) and buckets HDRIs, cubemaps, GLB/FBX models, gobos, textures, and kid skin variants. Pipelines depend on `npm run generate:assets`.
- **Public assets** — `/public` is organized by type (envs, cubes, models, sounds, svg UI frames, thumbnails). Keep structure when copying into LeAgentDiary to avoid breaking manifest IDs.

## Integration Notes

| Feature | Source | Target Hook |
| --- | --- | --- |
| Task Planner | `index.html` + `.tasks-layout` styles + `initTasksAction()` | Connect to `code-platformer-AI/agents/projects/*/tasks.md` + surface active assistant profiles. |
| Deployment Timeline | `src/modules/history/*`, `api/vercel-deployments.mjs` | Reuse Vercel fetcher or point to LeAgentDiary build logs; keep `deploymentFavorites` local storage contract. |
| Scene Carousel | `src/modules/scenePickerUI.js`, `src/data/scenes.js` | Use agent-selected scenes to seed LeAgentDiary mission rooms (one profile ↔ one scene). |
| Frame Overlay + Cursor | `.ui-frame` markup + `src/modules/customCursor.js` | Map to LeAgentDiary’s hero banner & agent hover states. |

## Suggested Merge Flow

1. **Snapshot HTDI UI** — Export the DOM/CSS for footer actions, modals, scene carousel, and deployment timeline. Capture token palettes from each scene entry.
2. **Extend Agent Templates** — Inside `../code-platformer-AI/agents`, add a LeAgentDiary profile template (see `agents/templates/leagentdiary-profile-template.md`) to enforce references to HTDI scenes/UI swatches.
3. **Sync 3D Assets** — Copy required HDRs, cubemaps, kid skins, and GLBs into `code-platformer-AI/public/assets/models/assets` (already staged) and document provenance.
4. **Wire Data Sources** — Point the Task Planner to `agents/OPENTASKS.md` output and populate deployment cards from LeAgentDiary’s future API (placeholder is acceptable now).
5. **Push Preparations** — Clean `.DS_Store` edits, commit blueprint/template files, and push both repos to their GitHub origins before opening PRs for https://github.com/KBLLR/Leagentdiary.

## Asset + Backend Strategy

- **3D Models in S3** — Move every agent GLB/texture set from local repos into an external bucket, e.g., `s3://leagentdiary-agent-models/{agentId}/model.glb`. HTDI keeps references only for previewing; runtime downloads happen via signed URLs exposed by a backend (see below).
- **gen_idea_lab backend extension** — Attach an asset microservice to `gen_idea_lab` that can mint signed URLs, record provenance metadata (commit hash, agent ID, origin repo), and emit CloudWatch events when models are updated. This service is also responsible for syncing the `public/assets/models/assets/` manifest consumed by HTDI.
- **Scene metadata registry** — Persist generated scene JSON (camera rigs, palette overrides, layout seeds) alongside asset pointers so multiple repos can reference the same scene definition without duplicating data.

## Scene Orchestrator Service

Create a clean repo (working name: `leagentdiary-stage-service`) that:

1. **Ingests agent profiles** — Watches `code-platformer-AI/agents/profiles/*.json` (or accepts webhooks) to build a canonical agent directory. Every profile contains the HTDI palette tokens defined in the template.
2. **Generates stages** — Calls into HTDI scene recipes to compose a stage per agent (or groups of agents). If multiple profiles come from the same upstream repo, the service merges them into a single scene with per-agent placement metadata while keeping individual references back to their models and tasks.
3. **Publishes scene links** — Emits a signed stage URL (hosted render or deployment) that LeAgentDiary can embed inside its timeline cards. Each card unfolds to show contributions, agent bios, and CTA buttons (e.g., “Talk to agent”).
4. **Feeds the timeline + chat** — For every stage update, push a record into the LeAgentDiary timeline API so UI cards stay in sync. The same payload includes agent chat endpoints so visitors can converse with a specific agent inside the rendered scene.

HTDI remains the canonical **visual reference** (UI, shaders, deployment cards), but rendering + data orchestration shift to the new service and S3-backed assets.

## Memory + Provenance Layer

A dedicated memory agent watches contribution events (commits, sessions, scene generation) and anchors them to a “provenance house” repo. It exposes read/write APIs so downstream agents can pull prior context, append summaries, or fetch related assets before they respond to users.

1. **Write side** — Every time the stage service generates/updates a scene, it sends a provenance payload (agent IDs, repo references, tasks, asset S3 keys) to the memory agent, which stores it in the provenance repo and indexes it for semantic retrieval.
2. **Read side** — The LeAgentDiary timeline card (and chat UI) can request memory snapshots keyed by agent ID + scene ID to surface history, goals, and conversation entry points.

## OpenAI API 3.1.0 Endpoint Contract

All services should expose OpenAI-compatible REST endpoints (v3.1.0) so tooling across repos stays consistent. Suggested surface:

| Endpoint | Method | Description | Request Body | Response Snapshot |
| --- | --- | --- | --- | --- |
| `/v1/agents/profiles:sync` | `POST` | Receives profile payloads from `code-platformer-AI` (either webhook or batch). Stores metadata + S3 pointers. | `{ "profiles": [{ "agentId": "codex-navigator", "scene": "studio-lite", "modelUrl": "s3://...", "repo": "code-platformer-AI", "commit": "abc123", "palette": {...}}] }` | `{"status":"ok","ingested":1}` |
| `/v1/stages:generate` | `POST` | Generates/updates a stage for one or more agents; triggers HTDI-based layout logic. | `{ "agentIds": ["codex-navigator","vault-keeper"], "seedScene": "studio-lite", "tools": ["tasks","deployments"], "preferences": {...} }` | `{ "stageId":"stage_codex_nav","deploymentUrl":"https://...", "sceneConfig": {...}, "agents":[...]} ` |
| `/v1/stages/{stageId}` | `GET` | Fetches stored scene configuration plus signed asset URLs. | n/a | `{ "stageId":"...", "sceneConfig": {...}, "assets": [{ "type":"model", "url":"https://signed-s3" }], "timelineEntry": {...} }` |
| `/v1/timeline/events` | `POST` | Pushes stage updates into the LeAgentDiary timeline so UI cards stay fresh. | `{ "stageId":"...", "agentIds":[...], "deploymentUrl":"...", "memoryRef":"prov/2025-03-12.json" }` | `{ "eventId":"timeline_123","status":"queued" }` |
| `/v1/memory/snapshots` | `POST` | Writes provenance notes for the memory agent. | `{ "agentId":"codex-navigator","stageId":"stage_codex_nav","summary":"...", "repo":"...", "assets":[...]} ` | `{ "snapshotId":"mem_456","status":"stored" }` |
| `/v1/memory/snapshots:query` | `POST` | Retrieves context for chat/assistants based on agent + contribution metadata. | `{ "agentId":"codex-navigator","stageId":"stage_codex_nav","filters":{"tasks":["GH-001"]}}` | `{ "snapshots":[{"summary":"...", "links":[...]}] }` |

These endpoints can live inside `gen_idea_lab` (asset + stage orchestration) and the provenance service. Consumers (HTDI preview app, LeAgentDiary timeline, agent chat UIs) only need to know the OpenAI-spec JSON schema, which keeps the broader refactor coherent.

## Multi-Agent Checklist

1. **Research Agent** — Reads this file + HTDI code references to extract assets, confirms S3 + endpoint mappings.
2. **Profile Agent** — Uses the template in `code-platformer-AI/agents/templates/leagentdiary-profile-template.md` to author/refresh profiles including S3 pointers and scene preferences.
3. **Scene Orchestrator Agent** — Operates in the new stage service repo, calling `/v1/stages:generate` and `/v1/timeline/events`.
4. **Memory Agent** — Writes provenance snapshots via `/v1/memory/snapshots` and answers downstream queries.
5. **QA Agent** — Runs `npm run dev` (HTDI reference) plus end-to-end tests in the new stage + timeline repos, ensuring cards render the linked scene URLs.

Document every handoff in `code-platformer-AI/agents/HANDOFFS.md` and cite the relevant session logs for traceability.
