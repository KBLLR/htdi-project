# HTDI DiaryStage Factory Blueprint

**Version**: 1.0.0
**Date**: 2025-11-19
**Status**: Assessment & Architecture Design

---

## Executive Summary

**Transformation**: HTDI Project → HTDI DiaryStage Factory

### Purpose
A data-driven generative stage system that creates customized 3D "homes" for AI agents based on:
- Agent profiles (personality, role, preferences)
- Diary entries (events, conversations, memory)
- Creative generation pipelines (characters via Sora/Tencent, video textures, cubemaps)

### Output
Stages rendered in LeAgentDiary timeline where agents can:
- Be summoned and communicate
- Interact with other agents
- Display their personality through environmental customization

### Agent Orchestration
- **Stage Artist**: Creative generation (materials, environments, compositions)
- **Stage Manager**: Orchestration, data flow, API coordination
- All communications: OpenResponses API v3.1.0 compliant

---

## Current State Assessment

### Architecture Analysis

#### PRESERVE - Core Reusable Systems ✅

| System | Location | Reason | Migration Priority |
|--------|----------|--------|-------------------|
| **Asset Registry** | `src/modules/assetRegistry.js` | Memory management, HMR-safe, deferred promises | **HIGH** - Critical for generative workflow |
| **Scene Manager** | `src/world/sceneManager.js` | Multi-preset switching, environment registration | **HIGH** - Foundation for stage templates |
| **Scene Registry** | `src/world/registry/SceneRegistry.js` | Runtime introspection via `window.sceneRegistry` | **MEDIUM** - Debugging tool |
| **Event Bus** | `src/shared/EventBus.js` | Clean pub/sub pattern | **HIGH** - Agent communication backbone |
| **Modal Service** | `src/shared/modalService.js` | Accessible, camera-integrated | **MEDIUM** - UI interaction pattern |
| **Material System** | `src/world/materials/createDefaultMaterials.js` | JSON-configurable PBR materials | **HIGH** - Generative material creation |
| **Camera Presets** | `src/world/core/createCamera.js` | Animated camera positions + DOF | **HIGH** - Stage presentation views |
| **Postprocessing** | `src/world/postprocessing/createPostprocessing.js` | Modern `postprocessing` library (Bloom, DOF, FXAA) | **MEDIUM** - Visual polish |
| **Custom Cursor** | `src/modules/customCursor.js` | HMR-safe singleton, elegant UX | **LOW** - Brand consistency |
| **Actions Bar** | `src/modules/actionsBar/ActionsBarManager.js` | JSON-driven, plugin architecture | **MEDIUM** - Agent action triggers |

#### PRESERVE - Design Assets ✅

| Asset Type | Location | Description | Usage in Factory |
|------------|----------|-------------|------------------|
| **CSS Tokens** | `src/css/tokens.css` | Design system variables | Scene-aware theming |
| **Glassmorphism** | `src/css/style.css` (1,761 lines) | `.glass-footer`, `.modal`, cards | UI chrome aesthetic |
| **Scene Presets** | `src/data/scenes.js` | 3 scenes: studio-lite, era, omega | Stage templates |
| **Material Database** | `src/config/materials.json` | 100+ PBR presets (metals, glass, organics) | Generative material selection |
| **Font System** | `src/css/fonts.css` | Pirulen, Roboto, Henke, Flowa, Pilowlava | Typography consistency |
| **Asset Catalog** | `src/config/assetCatalog.js` | HDRs, cubemaps, textures, gobos, PBR sets | Generation input library |

#### REFACTOR - Improvements Needed ⚠️

| Issue | Location | Problem | Solution |
|-------|----------|---------|----------|
| **Duplicate Video Loading** | `src/world/index.js:72-89, 120-137` | Same video texture loaded twice | Consolidate into single asset call |
| **Monolithic Entry** | `src/world/index.js` (800+ lines) | Mixes assets, characters, water, post, loop | Split into modular stage components |
| **DOM-ID Coupling** | `src/modules/wireModalButtons.js` | Hardcoded element IDs | Declarative component registry |
| **Scene Factory Pattern** | `src/data/scenes.js` | Factory wrapper improves readability | Extract to dedicated builder |

#### DEPRECATE - Remove or Archive 🗑️

| Component | Location | Reason |
|-----------|----------|--------|
| **Grid Layout** | `src/css/grid.css` | Experimental, hidden (`opacity: 0`) |
| **Alt Cursor** | `src/css/nodeCursor.css` | Alternative cursor (inactive) |
| **Radix Stub** | `src/css/_radix.css` | Placeholder with no components |
| **Legacy Assets** | `public/` | 100s of unused files (per reboot-plan.md) |
| **Deployment Timeline** | `src/modules/history/*` | HTDI-specific (Vercel integration) |

---

## Stage Factory Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    LeAgentDiary (Consumer)                       │
│  - Agent Timeline Cards                                          │
│  - 3D Stage Canvas Embed                                         │
│  - Chat Interface                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              HTDI DiaryStage Factory (Generator)                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  INPUTS (OpenResponses API v3.1.0 Compliant)                     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  1. Agent Profile JSON                                    │  │
│  │     - agentId, role, personality traits                   │  │
│  │     - Scene preference (studio-lite, era, omega)          │  │
│  │     - Color palette overrides                             │  │
│  │     - Model URL (S3 or local)                             │  │
│  │                                                            │  │
│  │  2. Diary Entries                                         │  │
│  │     - Events, conversations, memory snapshots             │  │
│  │     - Emotional tone, activity patterns                   │  │
│  │                                                            │  │
│  │  3. Generation Assets                                     │  │
│  │     - Character model (manual: Sora/Tencent)              │  │
│  │     - Video texture (manual upload)                       │  │
│  │     - Panorama image → cubemap (panorama-to-cubemap)      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STAGE ARTIST AGENT (Creative Generation)                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Responsibilities:                                        │  │
│  │  - Material selection from PBR database                   │  │
│  │  - Lighting mood (directional + rotating points)          │  │
│  │  - Camera preset selection                                │  │
│  │  - Water shader parameters (color, distortion, flow)      │  │
│  │  - Particle effects generation                            │  │
│  │  - UI palette customization                               │  │
│  │                                                            │  │
│  │  Connects to:                                             │  │
│  │  - DrawThings (local) for texture generation              │  │
│  │  - Figma MCP for design asset retrieval                   │  │
│  │  - panorama-to-cubemap for environment maps               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STAGE MANAGER AGENT (Orchestration)                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Responsibilities:                                        │  │
│  │  - Scene assembly from templates                          │  │
│  │  - Asset loading coordination (Asset Registry)            │  │
│  │  - Stage state serialization                              │  │
│  │  - OpenResponses API endpoint routing                            │  │
│  │  - Memory/provenance snapshot writes                      │  │
│  │  - Multi-agent placement (when >1 agent per stage)        │  │
│  │                                                            │  │
│  │  Manages:                                                 │  │
│  │  - Event Bus for inter-component communication            │  │
│  │  - Scene Manager for environment switching                │  │
│  │  - Scene Registry for runtime inspection                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OUTPUTS                                                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  1. Stage Configuration JSON                              │  │
│  │     - Scene preset ID + overrides                         │  │
│  │     - Asset manifest (S3 URLs, local paths)               │  │
│  │     - Camera/lighting/material parameters                 │  │
│  │                                                            │  │
│  │  2. Deployed Stage URL                                    │  │
│  │     - Hosted WebGL experience                             │  │
│  │     - Embeddable iframe                                   │  │
│  │                                                            │  │
│  │  3. Timeline Event Payload                                │  │
│  │     - agentIds, stageId, deploymentUrl                    │  │
│  │     - Memory reference, preview thumbnail                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                              │
├─────────────────────────────────────────────────────────────────┤
│  - S3 Bucket (agent models, textures)                            │
│  - gen_idea_lab backend (asset microservice, signed URLs)        │
│  - Memory/Provenance Service (context snapshots)                 │
│  - DrawThings (local texture generation)                         │
│  - Figma MCP (design asset sync)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage Generation Workflow

### Phase 1: Initialization
1. **Stage Manager** receives agent profile + diary entries via `/v1/stages:generate`
2. Validates input schema (agentId, scene preference, model URLs)
3. Selects base scene template from `scenes.js` (studio-lite, era, omega)

### Phase 2: Asset Gathering
1. **Stage Artist** analyzes diary emotional tone → selects color palette
2. Loads character model:
   - Manual upload (Sora/Tencent generated) → uploads to S3
   - Retrieves signed S3 URL via gen_idea_lab backend
3. Loads video texture (cube eye):
   - Manual upload → Asset Registry → `loadVideoTextureAsset()`
4. Generates cubemap:
   - Panorama image → `panorama-to-cubemap` function
   - Stores in Asset Registry → applies to environment targets
5. (Future) DrawThings integration:
   - Generates procedural textures based on diary keywords
   - Returns image data → loads as THREE.Texture

### Phase 3: Creative Assembly
**Stage Artist** coordinates:
1. **Materials**: Selects from `materials.json` PBR database
   - Agent personality → material properties (metalness, roughness, IOR)
   - Example: "analytical agent" → glass/chrome; "warm agent" → wood/clay
2. **Lighting**: Configures mood
   - Directional light intensity/position
   - Rotating point lights (color, speed, radius)
3. **Camera**: Sets default view preset
   - `overview`, `focus`, or `maxZoomOut` from `CAMERA_PRESETS`
4. **Water/Ground**: Adjusts shader params
   - Water color, distortion, flow speed (from scene template)
5. **UI Palette**: Overrides CSS tokens
   - Surface, card, accent, text colors → injected as `:root` vars

### Phase 4: Scene Serialization
**Stage Manager** generates:
```json
{
  "stageId": "stage_codex_navigator_20251119",
  "agentId": "codex-navigator",
  "scenePreset": "studio-lite",
  "assets": {
    "characterModel": "s3://leagentdiary-agents/codex-nav/model.glb",
    "videoTexture": "/stages/codex-nav/eye.webm",
    "cubemap": ["px.webp", "nx.webp", "py.webp", "ny.webp", "pz.webp", "nz.webp"],
    "hdrEnvironment": "/envs/studio-lite.hdr"
  },
  "overrides": {
    "materials": {
      "outerSphere": { "metalness": 0.8, "roughness": 0.2 },
      "innerSphere": { "emissive": "#4A90E2" }
    },
    "lighting": {
      "directional": { "intensity": 1.5, "position": [6, 8, 6] },
      "rotatingPoints": { "speed": 0.3, "radius": 5.0 }
    },
    "camera": { "preset": "focus" },
    "palette": {
      "surface": "rgba(10, 15, 25, 0.9)",
      "accent": "#4A90E2"
    }
  },
  "metadata": {
    "createdAt": "2025-11-19T12:00:00Z",
    "memoryRef": "prov/2025-11-19/codex-nav.json"
  }
}
```

### Phase 5: Deployment
1. Builds WebGL experience with Vite
2. Deploys to hosting (Vercel/Netlify)
3. Returns `deploymentUrl` to **Stage Manager**
4. Writes provenance snapshot via `/v1/memory/snapshots`
5. Emits timeline event via `/v1/timeline/events` → LeAgentDiary

---

## OpenResponses API v3.1.0 Endpoints

### Core Endpoints

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/v1/stages:generate` | POST | Generate/update stage | `{ agentIds, seedScene, diaryEntries, preferences }` | `{ stageId, deploymentUrl, sceneConfig, assets }` |
| `/v1/stages/{stageId}` | GET | Fetch stage config | - | `{ stageId, sceneConfig, assets, timelineEntry }` |
| `/v1/stages/{stageId}` | PATCH | Update stage | `{ overrides: { materials, lighting, camera } }` | `{ stageId, updated fields }` |
| `/v1/agents/profiles:sync` | POST | Sync agent profiles | `{ profiles: [{ agentId, scene, modelUrl, palette }] }` | `{ status, ingested }` |
| `/v1/timeline/events` | POST | Push to timeline | `{ stageId, agentIds, deploymentUrl, memoryRef }` | `{ eventId, status }` |
| `/v1/memory/snapshots` | POST | Write provenance | `{ agentId, stageId, summary, assets }` | `{ snapshotId, status }` |
| `/v1/memory/snapshots:query` | POST | Retrieve context | `{ agentId, stageId, filters }` | `{ snapshots }` |

### DrawThings Integration (Local)

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/v1/drawthings/generate` | POST | Generate texture | `{ prompt, size, model, steps }` | `{ imageData: base64, metadata }` |

### Figma MCP Integration

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/v1/figma/assets` | GET | Fetch design assets | `{ fileId, nodeIds }` | `{ assets: [{ id, url, type }] }` |
| `/v1/figma/palettes` | GET | Extract color palettes | `{ fileId }` | `{ palettes: [{ name, colors }] }` |

---

## Technology Stack

### Current (HTDI Legacy)
- **Build**: Vite 7.1.12
- **3D Engine**: Three.js r180
- **Post-processing**: `postprocessing` library v6.37.8
- **Animation**: Tween.js, GSAP
- **UI**: Tweakpane v4.0.5, Tippy.js
- **Loaders**: GLTFLoader (DRACO), FBXLoader, HDRLoader, KTX2Loader
- **Water**: Three.js Water class

### Proposed (DiaryStage Factory)
- **Build**: Vite 8+ (modern)
- **3D Engine**: Three.js r170+ with **WebGPU** renderer
- **Post-processing**: `postprocessing` library (maintained)
- **Animation**: Tween.js (lightweight)
- **UI**: Headless UI + Radix (for modals/controls)
- **Loaders**: Same + WebGPU texture compression
- **State**: Zustand or Valtio (reactive stage state)
- **API Client**: Custom OpenResponses-compliant fetch wrapper

### Additional Integrations
- **panorama-to-cubemap**: Import from KBLLR repo
- **DrawThings**: Local MCP server (texture generation)
- **Figma MCP**: Design asset sync
- **S3 SDK**: Asset upload/signed URL retrieval

---

## Modular Stage Components

### Component Architecture

```javascript
// src/stages/components/StageBase.js
export class StageBase {
  constructor(config) {
    this.config = config;
    this.scene = createScene();
    this.camera = createCamera();
    this.renderer = createRenderer({ backend: 'webgpu' });
    this.assets = new Map();
  }

  async init() {
    await this.loadAssets();
    await this.buildScene();
    this.setupLights();
    this.setupPostProcessing();
  }

  async loadAssets() { /* Asset Registry integration */ }
  async buildScene() { /* Override in subclasses */ }
  setupLights() { /* Lighting system */ }
  setupPostProcessing() { /* Effects chain */ }

  dispose() { /* Cleanup */ }
}

// src/stages/templates/StudioLiteStage.js
export class StudioLiteStage extends StageBase {
  async buildScene() {
    // Load studio-lite scene preset
    const preset = await getScenePreset('studio-lite');

    // Apply agent-specific overrides
    this.applyMaterialOverrides(this.config.overrides.materials);
    this.applyLightingOverrides(this.config.overrides.lighting);
    this.applyCameraPreset(this.config.overrides.camera);

    // Add agent character
    await this.loadAgentCharacter(this.config.assets.characterModel);

    // Setup environment
    await this.loadEnvironment(this.config.assets.cubemap);
  }
}
```

### Stage Templates

| Template | Scene Preset | Aesthetic | Use Case |
|----------|--------------|-----------|----------|
| `StudioLiteStage` | studio-lite | Clean, bright, professional | Analytical/technical agents |
| `EraStage` | era | Warm, nostalgic, organic | Creative/storytelling agents |
| `OmegaStage` | omega | Dark, mysterious, cinematic | Strategic/visionary agents |
| `CustomStage` | (generated) | Fully agent-driven | Unique personality expressions |

---

## Decommission & Migration Plan

### Phase 1: Archive Current HTDI (Week 1)
**Tasks:**
1. Create archive branch: `archive/htdi-legacy-20251119`
2. Export reusable modules to `/archive/extracted/`:
   - Asset Registry
   - Scene Manager
   - Event Bus
   - Material system
   - Camera presets
3. Document extraction in `/archive/EXTRACTION_MAP.md`
4. Tag release: `v1.0.1-legacy-final`

**Deliverables:**
- Archive branch with full history
- Extracted module directory with README
- Dependency mapping document

### Phase 2: Scaffold Modern Vite + Three.js WebGPU (Week 1-2)
**Tasks:**
1. Initialize new project structure:
   ```
   htdi-diarystage-factory/
   ├── src/
   │   ├── stages/
   │   │   ├── components/     # StageBase, Camera, Lights, etc.
   │   │   ├── templates/      # StudioLiteStage, EraStage, etc.
   │   │   └── generators/     # Stage Artist logic
   │   ├── api/
   │   │   ├── endpoints/      # OpenResponses API routes
   │   │   └── clients/        # DrawThings, Figma MCP
   │   ├── modules/
   │   │   ├── assetRegistry/  # Migrated from legacy
   │   │   ├── sceneManager/   # Migrated
   │   │   └── eventBus/       # Migrated
   │   ├── config/
   │   │   ├── materials.json  # Migrated
   │   │   └── scenes.js       # Migrated as templates
   │   └── main.js
   ├── public/
   │   └── assets/             # Curated asset library
   ├── scripts/
   │   └── panorama-to-cubemap.mjs  # Imported from repo
   └── vite.config.js
   ```

2. Setup dependencies:
   - Vite 8+
   - Three.js r170+ (WebGPU)
   - `postprocessing` library
   - Zustand (state management)
   - OpenResponses SDK (API client base)

3. Configure build:
   - WebGPU renderer fallback to WebGL
   - Code splitting by stage template
   - Asset optimization (KTX2, WebP)

**Deliverables:**
- Working dev server (`npm run dev`)
- Basic StageBase component rendering
- Asset Registry integrated

### Phase 3: Migrate Core Systems (Week 2-3)
**Tasks:**
1. **Asset Registry**:
   - Refactor for WebGPU textures
   - Add S3 signed URL support
   - Maintain HMR-safe singleton pattern

2. **Scene Manager**:
   - Convert scene presets to stage templates
   - Add override merging logic
   - Environment target registration (materials)

3. **Material System**:
   - Migrate `materials.json` database
   - Update for WebGPU shaders if needed
   - Add generative material selection (Stage Artist)

4. **Event Bus**:
   - Direct migration (no changes needed)
   - Document agent communication patterns

**Deliverables:**
- All core systems functional in new codebase
- Unit tests for Asset Registry, Scene Manager
- Migration verification checklist

### Phase 4: Implement OpenResponses API Endpoints (Week 3-4)
**Tasks:**
1. Create endpoint handlers:
   - `/v1/stages:generate` (core generator)
   - `/v1/stages/{stageId}` (CRUD)
   - `/v1/agents/profiles:sync`
   - `/v1/timeline/events`
   - `/v1/memory/snapshots`

2. Request/response validation (Zod schemas)
3. Error handling and logging
4. API documentation (OpenAPI spec)

**Deliverables:**
- Functional API server
- Postman/Insomnia collection
- OpenAPI 3.1.0 spec file

### Phase 5: Build Stage Templates (Week 4-5)
**Tasks:**
1. Implement `StudioLiteStage` (base template)
2. Implement `EraStage`
3. Implement `OmegaStage`
4. Create `CustomStage` generator

**Deliverables:**
- 3 working stage templates
- Template documentation
- Demo stages for each template

### Phase 6: Agent Integration (Week 5-6)
**Tasks:**
1. **Stage Artist Agent**:
   - Material selection logic (PBR database)
   - Lighting mood algorithm
   - Palette generation from diary tone
   - DrawThings integration (texture gen)

2. **Stage Manager Agent**:
   - Scene assembly orchestration
   - Asset loading coordination
   - State serialization
   - Timeline event emission

**Deliverables:**
- Working Stage Artist agent
- Working Stage Manager agent
- Agent handoff documentation

### Phase 7: External Integrations (Week 6-7)
**Tasks:**
1. **S3 Integration**:
   - Upload character models
   - Generate signed URLs
   - Asset manifest sync

2. **DrawThings MCP**:
   - Local server setup
   - Texture generation endpoint
   - Image processing pipeline

3. **Figma MCP**:
   - Asset retrieval
   - Palette extraction

4. **panorama-to-cubemap**:
   - Import from KBLLR repo
   - Integrate with Asset Registry

**Deliverables:**
- All integrations functional
- Integration test suite
- Configuration documentation

### Phase 8: LeAgentDiary Integration (Week 7-8)
**Tasks:**
1. Embed protocol (iframe vs. direct canvas)
2. Timeline event payload format
3. Chat interface communication
4. Memory/provenance snapshot flow

**Deliverables:**
- Working LeAgentDiary integration
- Integration documentation
- Demo deployment

### Phase 9: UI/UX Preservation (Week 8-9)
**Tasks:**
1. Migrate CSS design tokens
2. Rebuild glassmorphism components
3. Port Actions Bar (if needed for stage controls)
4. Custom cursor implementation

**Deliverables:**
- Consistent visual aesthetic
- Responsive UI components
- Accessibility compliance (ARIA)

### Phase 10: Testing & Deployment (Week 9-10)
**Tasks:**
1. End-to-end testing
2. Performance optimization (bundle size, rendering)
3. Documentation finalization
4. Production deployment (Vercel)

**Deliverables:**
- Production-ready DiaryStage Factory
- Complete documentation
- Deployment runbook

---

## Technical Debt Analysis

### Critical Issues (Fix Before Migration)
1. **Duplicate video texture loading** (`src/world/index.js:72-89, 120-137`)
   - **Impact**: Memory waste, potential race conditions
   - **Fix**: Consolidate into single `loadVideoTextureAsset()` call
   - **Status**: Document in extraction notes, don't migrate bug

2. **Monolithic `src/world/index.js`** (800+ lines)
   - **Impact**: Hard to test, maintain, extend
   - **Fix**: Split into stage components (already planned in new architecture)
   - **Status**: Addressed by modular design

### Medium Priority
3. **DOM-ID coupling** (`src/modules/wireModalButtons.js`)
   - **Impact**: Rigid UI, hard to reuse components
   - **Fix**: Declarative component registry
   - **Status**: New architecture uses headless UI

4. **Asset pipeline noise** (legacy assets in `public/`)
   - **Impact**: Confusing, slow builds
   - **Fix**: Curate asset library for migration
   - **Status**: Phase 1 - only migrate used assets

### Low Priority (Monitor)
5. **ESLint globals** (`THREE`, `gsap`, etc.)
   - **Impact**: Non-standard imports
   - **Fix**: Proper ES6 imports in new codebase
   - **Status**: Enforced in Vite config

6. **Commented code** (deployment timeline in `main.js:272`)
   - **Impact**: Code smell
   - **Fix**: Remove during migration
   - **Status**: Won't migrate commented code

---

## Asset Library Curation

### Migrate from Legacy HTDI

| Asset Type | Source | Destination | Count | Notes |
|------------|--------|-------------|-------|-------|
| **HDR Environments** | `public/envs/*.hdr` | `public/assets/envs/` | 3 | studio-lite, era, omega |
| **Cubemaps** | `public/cubes/*/*.webp` | `public/assets/cubes/` | 3 sets | 6 faces each |
| **Character Models** | `public/models/kid/*.fbx` | S3 bucket | 1 | Convert to GLB, upload |
| **PBR Textures** | `public/textures/pbr/` | `public/assets/textures/` | Selected | Only used sets |
| **Video Textures** | `public/vid/eye.webm` | `public/assets/video/` | 1 | Eye cube video |
| **Fonts** | `public/fonts/` | `public/assets/fonts/` | 5 | Design continuity |
| **UI Frames** | `public/svg/` | `public/assets/svg/` | Selected | If still used |

### New Assets (Generate/Acquire)

| Asset Type | Source | Purpose | Priority |
|------------|--------|---------|----------|
| **Agent Models** | Sora/Tencent (manual) | Character representations | HIGH |
| **Agent Textures** | DrawThings (generated) | Procedural materials | MEDIUM |
| **Panoramas** | Figma / Stock | Cubemap generation | HIGH |
| **UI Components** | Figma MCP | Design consistency | MEDIUM |

---

## Success Metrics

### Technical
- ✅ WebGPU renderer functional with WebGL fallback
- ✅ Stage generation time < 10 seconds (simple) / < 30 seconds (complex)
- ✅ Bundle size < 500KB (gzipped, excluding assets)
- ✅ Asset loading via S3 signed URLs (< 2s latency)
- ✅ All OpenResponses API endpoints return valid responses
- ✅ HMR functional for rapid development

### Functional
- ✅ Generate stage from agent profile + diary
- ✅ Support 3 base templates + custom generation
- ✅ Embed stages in LeAgentDiary timeline
- ✅ Agent communication via stage interface
- ✅ Memory/provenance snapshots persisted

### Quality
- ✅ Visual aesthetic matches HTDI glassmorphism design
- ✅ Accessible UI (WCAG 2.1 AA)
- ✅ Documentation complete (architecture, API, templates)
- ✅ Agent handoff workflows documented

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **WebGPU browser support** | HIGH | MEDIUM | Maintain WebGL fallback renderer |
| **DrawThings local dependency** | MEDIUM | LOW | Document alternative texture sources |
| **S3 upload latency** | MEDIUM | MEDIUM | Implement upload queue + progress UI |
| **Agent model quality** | HIGH | MEDIUM | Curated Sora/Tencent generation guidelines |
| **LeAgentDiary API changes** | MEDIUM | LOW | Versioned OpenResponses API contract |
| **Migration timeline overrun** | MEDIUM | MEDIUM | Phased rollout, MVP-first approach |

---

## Next Steps & Questions

### Follow-Up Questions (Required Before Implementation)

#### 1. Visual Preservation
**Which legacy components do you want to preserve?**
- [ ] Full glassmorphism aesthetic (glass-footer, modals, cards)
- [ ] Custom cursor (lime yellow with glow)
- [ ] Actions Bar UI pattern
- [ ] Scene Picker carousel
- [ ] Deployment Timeline (or replace with stage timeline?)
- [ ] Task Planner modal
- [ ] Music Player UI
- [ ] All CSS design tokens (tokens.css)
- [ ] Font system (Pirulen, Roboto, Henke, Flowa, Pilowlava)

**Specific elements:**
- Modal styling and animations?
- Footer glass bar layout?
- Color palettes from scenes.js?

#### 2. Stage Artistic Rules
**What governs stage builds?**

**Lighting:**
- [ ] Directional light rules (intensity range, position constraints)
- [ ] Rotating point lights (speed limits, color harmony)
- [ ] Spotlight usage (when to add, gobo selection)
- [ ] Ambient light baseline

**Camera Presets:**
- [ ] Default view per agent type (analytical → overview, creative → focus)
- [ ] FOV constraints
- [ ] DOF usage rules (when to blur background)
- [ ] Animation duration standards

**Rigging Details:**
- [ ] Agent character placement (ground, floating, scaled)
- [ ] Multiple agents in one stage (layout algorithm)
- [ ] Object hierarchy (groupKid pattern or new structure)

**Materials:**
- [ ] PBR selection algorithm (personality → material mapping)
- [ ] Color palette generation (diary tone → hue/saturation)
- [ ] Metalness/roughness ranges by agent type
- [ ] Environment map intensity rules

**Environment:**
- [ ] Cubemap selection (HDR vs. procedural)
- [ ] Water shader usage (when to include)
- [ ] Particle effects (trigger conditions)
- [ ] Fog/atmosphere rules

#### 3. Technical Decisions
**Implementation choices:**
- [ ] WebGPU mandatory or fallback to WebGL if unsupported?
- [ ] S3 bucket region and access pattern
- [ ] DrawThings: required or optional integration?
- [ ] Figma MCP: design sync frequency
- [ ] State management: Zustand, Valtio, or vanilla?
- [ ] UI framework: Headless UI + Radix or keep custom?

#### 4. Agent Workflow
**Stage Artist vs. Stage Manager boundaries:**
- Who decides material selection? (Artist suggests, Manager applies?)
- Who validates diary emotional tone? (Artist analyzes, Manager caches?)
- How do agents communicate? (Event Bus, direct API calls, message queue?)

#### 5. Deployment
**Hosting and delivery:**
- [ ] Single SPA or per-stage deployments?
- [ ] CDN for assets (Cloudflare, AWS CloudFront)?
- [ ] Environment config (dev, staging, prod)
- [ ] Monitoring and observability (Sentry, Datadog?)

---

## Appendix

### A. Reusable Module Extraction Map

| Legacy Module | New Location | Changes Required |
|---------------|--------------|------------------|
| `src/modules/assetRegistry.js` | `src/modules/assetRegistry/` | WebGPU texture support, S3 URLs |
| `src/world/sceneManager.js` | `src/modules/sceneManager/` | Template system, override merging |
| `src/shared/EventBus.js` | `src/modules/eventBus/` | None (direct copy) |
| `src/world/materials/createDefaultMaterials.js` | `src/stages/components/materials.js` | WebGPU shader updates |
| `src/world/core/createCamera.js` | `src/stages/components/camera.js` | Preset expansion |
| `src/world/lighting/createLights.js` | `src/stages/components/lights.js` | Mood algorithm |
| `src/world/postprocessing/createPostprocessing.js` | `src/stages/components/postprocessing.js` | WebGPU composer |
| `src/modules/customCursor.js` | `src/ui/customCursor.js` | None (direct copy) |
| `src/css/tokens.css` | `src/styles/tokens.css` | Scene template overrides |
| `src/css/style.css` | `src/styles/components.css` | Extract reusable components only |

### B. OpenResponses API Schema Examples

See inline in OpenResponses API Endpoints section above.

### C. Stage Template Specifications

#### StudioLiteStage
- **Scene Preset**: `studio-lite`
- **Environment**: `studio-lite.hdr` + `studio-lite` cubemap
- **Lighting**: Bright directional (intensity 1.5), cool rotating points
- **Camera**: Default `overview` preset
- **Palette**: Blues/grays (#9CD1FF accent)
- **Use Case**: Technical, analytical, professional agents

#### EraStage
- **Scene Preset**: `era`
- **Environment**: `era.hdr` + `era` cubemap
- **Lighting**: Warm directional (intensity 1.2), amber rotating points
- **Camera**: Default `focus` preset
- **Palette**: Greens/yellows (#D5FF7E accent)
- **Use Case**: Creative, nostalgic, storytelling agents

#### OmegaStage
- **Scene Preset**: `omega`
- **Environment**: `omega.hdr` + `omega` cubemap
- **Lighting**: Dim directional (intensity 0.8), purple rotating points
- **Camera**: Default `maxZoomOut` preset
- **Palette**: Purples/magentas (#FF9CF6 accent)
- **Use Case**: Strategic, mysterious, visionary agents

### D. Migration Checklist

**Phase 1: Archive**
- [ ] Create `archive/htdi-legacy-20251119` branch
- [ ] Export reusable modules to `/archive/extracted/`
- [ ] Document in `/archive/EXTRACTION_MAP.md`
- [ ] Tag `v1.0.1-legacy-final`

**Phase 2: Scaffold**
- [ ] Initialize new Vite project
- [ ] Setup Three.js WebGPU
- [ ] Configure build system
- [ ] Verify dev server

**Phase 3: Migrate Core**
- [ ] Asset Registry + S3 support
- [ ] Scene Manager + templates
- [ ] Material System + PBR database
- [ ] Event Bus

**Phase 4: API**
- [ ] `/v1/stages:generate`
- [ ] `/v1/stages/{stageId}` (GET, PATCH)
- [ ] `/v1/agents/profiles:sync`
- [ ] `/v1/timeline/events`
- [ ] `/v1/memory/snapshots`

**Phase 5: Templates**
- [ ] `StudioLiteStage`
- [ ] `EraStage`
- [ ] `OmegaStage`
- [ ] `CustomStage`

**Phase 6: Agents**
- [ ] Stage Artist implementation
- [ ] Stage Manager implementation
- [ ] Agent communication protocol

**Phase 7: Integrations**
- [ ] S3 bucket setup
- [ ] DrawThings MCP
- [ ] Figma MCP
- [ ] panorama-to-cubemap

**Phase 8: LeAgentDiary**
- [ ] Embed protocol
- [ ] Timeline events
- [ ] Chat interface
- [ ] Memory flow

**Phase 9: UI/UX**
- [ ] CSS migration
- [ ] Glassmorphism components
- [ ] Custom cursor
- [ ] Responsive design

**Phase 10: Deploy**
- [ ] Testing suite
- [ ] Performance optimization
- [ ] Documentation
- [ ] Production deployment

---

**Document End** | Version 1.0.0 | 2025-11-19
