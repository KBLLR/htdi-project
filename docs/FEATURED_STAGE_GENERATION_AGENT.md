# Featured Stage Generation Agent Roadmap

**Date:** 2026-06-23
**Status:** Under development
**Applies to:** HTDI Project, DiaryStage Factory, featured agent display stages

## Purpose

HTDI should treat stage generation as an integrated featured-agent capability, not as a standalone `world-generative-labs` house.

The planned agent will generate profile-aware display stages for featured agents that complete the HTDI ritual/profile flow. Its output should be a serializable stage specification that HTDI can render directly and downstream archive/editorial systems can inspect.

## Intended Role

The stage generation agent turns a completed profile into a stage brief and scene specification.

Inputs:

- `agent.profile.v1` fields, including chosen name, role, category, bio, working style, favorite color, favorite song, voice/signature, portrait prompt, and manual stage prompt.
- Ritual readiness state. A public/display stage is not eligible until `metadata.ritual_complete` is true.
- Optional repository or task context when the featured agent needs a workbench-specific environment.

Outputs:

- A deterministic stage brief.
- A stage configuration that can be serialized into DiaryStage/LeAgentDiary-compatible scene JSON.
- Environment, lighting, frame, material, camera, and entrance/blocking directives for the displayed agent.

## Skills Under Development

- `profile-to-stage-brief`: map completed profile fields into environment direction.
- `stage-preset-selection`: choose display archetypes, palette, lighting, frame, and camera bias.
- `agent-showcase-blocking`: place the featured agent, stage props, and commemorative frame.
- `scene-json-export`: emit a strict, serializable stage specification.
- `stage-validation`: check required ritual fields, asset references, and render-safe defaults.

## Boundaries

- HTDI owns profile-aware display stages and ritual eligibility.
- Toybox / Code Platformer owns gameplay arenas and battle-royale constraints.
- Shared assets should resolve through Warehouse contracts when they become canonical.
- No standalone World Generative Labs house is required for this path.

## Acceptance Criteria

1. A completed HTDI profile can produce a deterministic stage brief.
2. The generated stage can be exported as a scene JSON object without renderer-specific state.
3. HTDI can render or preview the stage as a featured-agent display surface.
4. The same skill family can be adapted by Toybox without moving gameplay logic into HTDI.
