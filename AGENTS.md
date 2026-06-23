# HTDI Project Agents

HTDI Project is the canonical runtime and stage-facing surface for diary profiles, sessions, tasks, and scene references.
It participates in the persona/diary/archive ritual chain.

## House Contract

- House ID: `htdi-project`
- Tier: `Lab`
- Runtime: Vite app and stage-facing profile/session/task surface
- Canonical identity: `house.manifest.json`
- Primary UI: `http://localhost:5170`

## Read First

- Root `AGENTS.md`
- `house.manifest.json`
- `HOUSE_PROFILE.md`
- `README.md`
- `docs/leagentdiary-bridge.md`
- `houses/Leagentdiary/AGENTS.md` for persona ritual and diary export semantics

## Ritual Chain Boundary

HTDI Project sits at the beginning of:

`HTDI Project -> LeAgentDiary / Diary Entry -> Notion mirror -> Anthology -> Le Belle Epoch / public editorial`

Rules:

- HTDI owns canonical `agent.profile.v1`, `diary.session.v2`, and `task.record.v1` shape.
- Active diary identity is persona-first, not provider-first.
- Provider is optional metadata only and belongs under `metadata.source_provider`.
- A profile is ready for mirror/export/public-candidate workflows only when `metadata.ritual_complete` is true.
- LeAgentDiary performs intake/review/export and owns the ritual readiness check.
- Notion is a mirror/export workspace only; do not write canonical state back from Notion.
- Public publication belongs downstream in Le Belle Epoch, not in HTDI Project.

Required ritual fields include:

- chosen/display name
- role and category
- gender and pronouns
- bio and working style
- favorite color, favorite animal, favorite song
- voice and signature
- portrait prompt
- manual stage prompt

## Interfaces

Canonical diary API target shape:

- `GET /api/diary`
- `GET /api/profiles`
- `PUT /api/profiles/:agentHandle`
- `GET /api/tasks`
- `PUT /api/tasks/:taskId`
- `PUT /api/sessions/:sessionId/reflection`
- `PUT /api/sessions/:sessionId/events`

Communication:

- Emit and consume OpenResponses events via Event Bus.
- Use canonical Core-X OpenResponses schemas; no local schema forks.
- Use `response.*` and `tool.*` events for agent activity and tool calls.

## Runtime

- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Asset catalog: `npm run generate:assets`

## Asset Pipeline

- Public assets are indexed via `scripts/assetManifest.mjs`.
- Do not hand-edit generated `src/config/assets.js`.
- Large static assets belong under `static/`.
- Respect third-party font/model/audio licenses.

## Verification

```bash
npm run build
```

Manual QA:

- Scene renders without console errors.
- Diary/profile/task data remains canonical here even when downstream houses consume it.
- Asset paths resolve from `public/` and `static/` in dev and build.
