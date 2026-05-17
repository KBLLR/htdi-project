# Stage Factory Brief — Assessment

## Mission
Turn the current `htdi-project` (LeAgentDiary dashboard/UI reference) into a purpose-built **Stage Factory**. The existing UI is visually on target but technically messy; treat it as legacy, document what’s worth preserving, and design a new pipeline that ingests agent profiles and outputs rigged stage assets ready for LeAgentDiary’s Agents Card.

## Assessment Tasks
1. **Inventory & Status**
   - Map the repo structure: components, assets, shaders, mock data, build scripts.
   - Highlight legacy patterns vs. reusable pieces (e.g., 3D scenes, asset loaders).

2. **Performance & Risk Audit**
   - Record bundle size, build warnings, dependency bloat, duplicated assets.
   - Note any blocking issues (e.g., outdated Three.js versions, custom loaders).

3. **Stage Factory Blueprint**
   - Define the new pipeline: inputs (agent profile schema, asset storage), processing steps (Stage Artist vs. Stage Manager responsibilities), outputs (GLB/JSON/thumbnails) for LeAgentDiary.
   - Identify infrastructure needs (CLI, CI, storage, integration with HTDI APIs and Secrets Bank/CIA for credentials).

4. **Decommission Plan**
   - Propose how to archive/flag current code as legacy while bootstrapping the factory codebase.
   - Suggest a migration path so future commits focus on the factory workflow.

## Follow-up Questions
After completing the assessment, ask the user:
1. Which legacy visual elements or components must be preserved in the new factory?
2. What specific requirements or artistic rules should govern stage builds (lighting, camera presets, rigging details)?

Acknowledge that Stage Artist and Stage Manager agents will eventually live in HTDI Agentic Lab, so the new factory should leave room for their workflows.
