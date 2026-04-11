# LeAgentDiary Bridge

HTDI is the canonical owner of the diary runtime objects that LeAgentDiary reviews and edits.

## Ownership

HTDI owns:
- `agent.profile.v1`
- `diary.session.v2`
- `task.record.v1`

LeAgentDiary consumes and edits those records for:
- profile questionnaire intake
- timeline review
- task and handoff inspection
- deterministic export preparation

LeAgentDiary does **not** own:
- the stage runtime
- public publication
- the archive/compiler layer

## Runtime boundary

HTDI can use profile media and prompt references to render or link stage surfaces, but those are downstream consumers of profile data:
- `portrait_prompt`
- `portrait_image_refs`
- `manual_stage_prompt`
- `stage_scene_refs`

3D generation remains manual. LeAgentDiary stores prompt/reference data only.

## API seam

Expected HTDI endpoints:
- `GET /api/diary`
- `GET /api/profiles`
- `GET /api/profiles/:agentHandle`
- `PUT /api/profiles/:agentHandle`
- `GET /api/tasks`
- `PUT /api/tasks/:taskId`
- `PUT /api/sessions/:sessionId/reflection`
- `PUT /api/sessions/:sessionId/events`

The active LeAgentDiary UI only requires `GET /api/diary` to function. The rest are compatibility and editing endpoints for the richer intake/review flow.

## Publication boundary

Diary-derived public material does not publish directly from HTDI.

The approved flow is:
1. HTDI holds canonical profile/session/task data.
2. LeAgentDiary reviews and marks curated reflections or profile excerpts.
3. Anthology ingests `trace.reflection`.
4. Le Belle Epoch publishes approved `Le Agent Diary` stories as curated editorial entries.

## Notion mirror

Notion is optional and mirrored only:
- Agent Profiles database
- Agent Journals database
- Cross-House Tasks database

Edits in Notion do not overwrite HTDI in this pass.

## Stage bridge status

The existing `/v1/stages` bridge remains experimental and secondary.

It is not the primary contract between HTDI and LeAgentDiary anymore, and it must not redefine LeAgentDiary as a stage platform.
