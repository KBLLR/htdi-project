# Stage Factory Future Plan: Classroom as First-Class Object

**Version**: 2.0.0
**Date**: 2025-11-19
**Status**: Vision & Architecture Planning
**Complements**: `STAGE_FACTORY_BLUEPRINT.md`, `STAGE_FACTORY_BLUEPRINT_UPDATE.md`

---

## Executive Summary

This document outlines the vision for transforming the HTDI DiaryStage Factory into a system where **"classroom" / "stage world" is a first-class OpenResponses-style object** that agents can create, update, and export—not just a one-off scene.

The factory orchestrates a magical user journey from GitHub authentication through generative stage creation, culminating in a personalized 3D environment with commemorative frames that celebrate the user's development history.

**Key Principles:**
- **Agent-Driven**: Tools (OpenResponses/MCP) can remix environments, frames, and materials
- **Serializable**: LeAgentDiary-compatible scene schema
- **Discoverable**: GitHub universe becomes input for generative processes
- **Commemorative**: Frames celebrate developer identity and achievements

---

## 1. High-Level Vision

### The Classroom/Stage as an OpenResponses Object

Think of the **Classroom** (or **Stage**) as:

```typescript
interface Classroom {
  id: string;                    // Unique identifier
  userId: string;                // GitHub user ID
  agentIds: string[];            // Agents inhabiting this space
  config: ClassroomConfig;       // Scene configuration
  currentSceneJson: object;      // LeAgentDiary-compatible scene

  // Methods (conceptual - for tool exposure)
  update(overrides: Partial<ClassroomConfig>): void;
  export(): LeAgentDiaryScene;
  render(): StageRenderer;
}
```

**A Stage/Classroom object:**
- Knows about a user, their agents, and their GitHub universe
- Is serializable to LeAgentDiary scenes (via `LeAgentDiaryBridge`)
- Can be driven by tools (OpenResponses / MCP) to remix environments, frames, and materials
- Persists configuration across sessions

### Factory Responsibilities

The **factory** orchestrates the journey:

1. **Welcome screen** → GitHub login (stub now, real auth later)
2. **Repo + agent profile discovery** + generative setup
3. **Final "voilà" stage**: Agent walking in favorite environment, with music and commemorative frame

All designed so future agents can:
- Call tools (e.g., `create_or_update_stage_world`, `generate_commemorative_frame`)
- Read/write a JSON scene schema (LeAgentDiary style)
- Plug into UI/renderer/world layers without manual patching

---

## 2. User Journey (End-to-End)

### Phase 1: Welcome Screen

**Goal:** Soft, magical landing into the HTDI universe

**UI Elements:**
- Project title + tagline: *"Welcome to your HTDI Stage Factory"*
- Primary CTA: **"Sign in with GitHub"**
  - For now: stub button that runs fake flow / uses mock data
  - Later: real OAuth + GitHub API integration
- Secondary: "Learn more" / "What is this?" link explaining DiaryStage / LeAgentDiary

**Factory State:**
```typescript
interface AuthState {
  status: 'anonymous' | 'loading' | 'authenticated';
  user?: {
    id: string;
    login: string;
    name: string;
    avatar_url: string;
  };
}
```

**Implementation Notes:**
- Component: `WelcomeScreen.jsx` (or `.js`)
- State management via Zustand or similar
- Smooth animations matching LeAgentDiary visual language

---

### Phase 2: Agent Profile Discovery & Generative Prep

Once the user "logs in" (real or stub):

#### 2.1 Discovery Phase

**System discovers agent profiles** from repos:
- Scan for `STAGE_FACTORY_BRIEF.md`, `AGENT_PROFILE.json`, or similar config files
- Infer tags/topics from GitHub repo metadata:
  - Topics, languages, commit messages
  - Lines of code, contribution streaks, activity patterns

**For now:** Mock agent profiles with hardcoded JSON, but design the flow as if it were live

**Conceptual Agent Profile:**
```typescript
interface AgentProfile {
  id: string;                    // e.g., "codex-navigator"
  displayName: string;           // e.g., "Codex Navigator"
  primaryRepos: string[];        // Repo slugs (e.g., ["KBLLR/htdi-project"])
  tags: string[];                // ["analytical", "typescript", "creative-coding"]
  metrics: {
    linesOfCode: number;
    contributions: number;
    languages: string[];         // ["TypeScript", "JavaScript", "GLSL"]
    activityPattern: string;     // "night-owl" | "steady" | "burst"
  };
  preferences?: {
    environment?: string;        // "studio-lite" | "era" | "omega"
    musicalVibe?: string;        // "chill" | "focus" | "energetic"
    colorPalette?: string[];     // Hex colors
  };
}
```

#### 2.2 Loader / Generation Phase

**Show LeAgentDiary-style loader:**
- Visual: HTDI Universe iconography + loader animation
- Text: "Summoning your agents", "Reading your repos", etc.
- Narrate what's happening (even if stubbed)

**Run generative processes** (conceptually):
- Determine agent's "favorite" environment type (studio, forest, city, void, etc.)
- Musical vibe (chill, focus, energetic) – stub for now
- Tags based on GitHub:
  - Languages, frameworks, topics, activity patterns
  - Lines of code, contribution streaks, or other stats (real or mock)

**Factory State:**
```typescript
interface StageFactoryState {
  status: 'idle' | 'discovering-agents' | 'generating-stage' | 'ready';
  agents: AgentProfile[];
  currentStage?: Classroom;
  error?: string;
}
```

**Implementation Notes:**
- Loader layer: `StageLoader.jsx` with animation states
- Well-defined mapping:
  - From metrics/tags → environment presets
  - From metrics/tags → frame presets
  - From metrics/tags → material presets
- This mapping can live in `stagePresets.json` / `framePresets.json` later

---

### Phase 3: Final Stage - "Voilà" Moment

Once "generation" is done, user lands on the **stage view**:

**Stage Elements:**
1. **Agent avatar** walking / existing in **favorite environment**
2. **Background music** playing (stub: "music is playing" UI element)
3. **Commemorative frame** around the stage:
   - Shows their **name / handle**
   - Style depends on chosen metrics:
     - Number of contributions
     - Number of repos
     - Languages used
     - "Depth vs breadth" coder (few big repos vs many experiments)
   - Different frames for different "achievement archetypes":
     - *"Night Owl Committer"*
     - *"Polyglot Builder"*
     - *"Creative Explorer"*

**Configuration-Driven:**
The stage should be **driven by config**, not hardcoded:
- Environment preset (lighting, HDRI, camera bias)
- Frame preset
- Agent animation + path
- Music / mood preset

**Serializable:**
All of this is serializable into a **LeAgentDiary-compatible scene JSON**, so:
- Current stage can be exported
- Future agents/tools can call "create/update diary stage" without touching rendering logic

---

## 3. Frames System: From Figma to Generative Masks

We have two paths for the **commemorative frame system**:

### 3.1 Figma-First Approach

**Workflow:**
1. Design frame variants as static assets in Figma
2. Export SVGs / PNGs as:
   - UI overlays (like existing `UIFrameOverlay`)
   - Or masks applied as materials in 3D space
3. Factory only needs:
   - A `frameId` or `frameSvg` field for the scene
   - A mapping from metrics/tags → frame ID

**Frame Preset Example:**
```typescript
interface FramePreset {
  id: string;                    // "frame-polyglot-builder"
  svg: string;                   // "/svg/frames/polyglot.svg"
  style: {
    border?: string;             // CSS border style
    overlay?: string;            // Overlay color
    rotation?: number;           // Rotation angle
  };
  criteria: {
    minContributions?: number;
    minLanguages?: number;
    tags?: string[];
  };
}
```

**Mapping Logic:**
```typescript
function selectFrame(profile: AgentProfile): FramePreset {
  const frames = getFramePresets();

  // Priority matching
  if (profile.metrics.languages.length >= 5) {
    return frames.find(f => f.id === 'polyglot-builder');
  }
  if (profile.metrics.activityPattern === 'night-owl') {
    return frames.find(f => f.id === 'night-owl-committer');
  }
  // ... more criteria

  return frames.default;
}
```

---

### 3.2 Generative Frame Approach (Longer-Term)

**Workflow:**
1. Use an "ultra-creative" agent to:
   - Generate **frame masks / shapes**
   - Generate **prompts** for downstream image/texture tools (e.g., image model / diffusion)
2. **Inputs to generative agent:**
   - GitHub tags from user's repos
   - Aggregate stats (lines of code, contributions per year, etc.)
   - Agent actions / types (e.g., "debugger", "architect", "storyteller")
3. **Output:**
   - A set of **materials + frame shape** definitions:
     - Colors, patterns, roughness/metallic hints, motifs
     - Possibly links to generated textures

**Generative Frame Theme:**
```typescript
interface GenerativeFrameTheme {
  id: string;
  generated: true;
  materials: {
    border: {
      type: 'MeshPhysicalMaterial';
      color: string;
      metalness: number;
      roughness: number;
      emissive?: string;
      emissiveIntensity?: number;
    };
    pattern?: {
      textureUrl: string;        // Generated texture
      blendMode: string;
      opacity: number;
    };
  };
  shape: {
    geometry: string;            // "RoundedBox" | "Custom"
    segments?: number;
    radius?: number;
  };
  prompt: string;                // Original generation prompt
  metadata: {
    generatedAt: string;
    inputTags: string[];
    inputMetrics: object;
  };
}
```

**In both cases**, the **scene schema** should treat frames as a first-class config object:
- `ui.frameTheme` / `ui.frameSvg`
- `materials.frame` with generative metadata

---

## 4. Factory / API Surface: Preparing for Tools

We don't need to implement these now, but we **do** want to **name them** and make them **thinkable as OpenResponses / MCP tool objects**.

### 4.1 Conceptual Building Blocks

#### Stage World Constructor

**Concept:** `createStageWorld(stageConfig)`

**Responsibilities:**
- Take a structured config (user, agent, environment preset, frame preset, music preset)
- Initialize the renderer + scene + post-processing + UI frame
- Return handles the UI can use (e.g., `world.handle`, `world.exportSceneJSON()`)

**Signature (TypeScript):**
```typescript
interface StageConfig {
  stageId: string;
  userId: string;
  agentProfile: AgentProfile;
  scenePreset: string;           // "studio-lite" | "era" | "omega"
  framePreset: string;           // Frame ID
  musicPreset?: string;          // Music mood
  overrides?: {
    materials?: object;
    lighting?: object;
    camera?: object;
  };
}

async function createStageWorld(config: StageConfig): Promise<StageWorld> {
  // Initialize renderer, scene, post-processing
  // Load assets from config
  // Return world handle
}

interface StageWorld {
  handle: object;                // Three.js scene handle
  renderer: WebGPURenderer | WebGLRenderer;
  config: StageConfig;

  exportSceneJSON(): object;     // LeAgentDiary-compatible
  update(overrides: object): void;
  dispose(): void;
}
```

---

### 4.2 OpenResponses-Style Tools

**Conceptual tools** we might expose later:

#### Tool 1: `create_or_update_diary_stage`

**Purpose:** Create or update a stage/classroom

**Parameters:**
```typescript
{
  scene_spec: {
    agentIds: string[];
    seedScene?: string;          // "studio-lite" | "era" | "omega"
    frameTheme?: string;
    overrides?: object;
  }
}
```

**Returns:**
```typescript
{
  stageId: string;
  deploymentUrl: string;
  sceneConfig: object;
  assets: object;
}
```

**Implementation:** Uses `LeAgentDiaryBridge` under the hood to validate + push

---

#### Tool 2: `suggest_stage_preset_from_github_stats`

**Purpose:** Suggest environment + frame + mood from GitHub profile

**Parameters:**
```typescript
{
  github_profile: {
    login: string;
    repos: string[];
    stats?: object;
  }
}
```

**Returns:**
```typescript
{
  environmentPreset: string;     // "studio-lite" | "era" | "omega"
  frameTheme: string;            // Frame ID
  moodTags: string[];           // ["analytical", "focused", "calm"]
  suggestedMusic?: string;
}
```

---

#### Tool 3: `generate_commemorative_frame_theme`

**Purpose:** Generate a frame/material theme from user metrics

**Parameters:**
```typescript
{
  user_metrics: {
    contributions: number;
    languages: string[];
    repos: number;
    activityPattern: string;
  };
  repo_tags: string[];
}
```

**Returns:**
```typescript
{
  frameTheme: GenerativeFrameTheme;
  reasoning: string;             // Explain why this theme was chosen
}
```

---

### 4.3 Classroom as an API Object

**Treat "Classroom" / "Stage" as:**

```typescript
interface Classroom {
  id: string;                    // "classroom_abc123"
  userId: string;                // GitHub user ID
  agentId: string;               // Primary agent ID
  config: ClassroomConfig;       // Full stage configuration
  currentSceneJson: object;      // LeAgentDiary scene JSON

  // Metadata
  createdAt: string;
  updatedAt: string;
  memoryRef?: string;            // Reference to provenance snapshot
}

interface ClassroomConfig {
  scenePreset: string;
  environmentConfig: object;
  frameTheme: string;
  musicPreset?: string;
  overrides: {
    materials?: object;
    lighting?: object;
    camera?: object;
    palette?: object;
  };
}
```

**Agents can:**
- Read `Classroom.config` (what environment, what frame, what music)
- Update `Classroom.config` and trigger a re-render
- Export `Classroom.currentSceneJson` via LeAgentDiary

---

## 5. Type Stubs & Interface Definitions

### 5.1 AgentProfile (Complete)

```typescript
/**
 * AgentProfile - Represents an AI agent's identity and preferences
 * Discovered from GitHub repos and inferred from activity patterns
 */
interface AgentProfile {
  // Identity
  id: string;                    // Unique agent identifier (e.g., "codex-navigator")
  displayName: string;           // Human-readable name
  avatar?: string;               // Avatar URL

  // GitHub Context
  primaryRepos: string[];        // Main repos this agent works on
  tags: string[];                // Inferred tags ["analytical", "creative", "debugger"]

  // Metrics
  metrics: {
    linesOfCode: number;         // Total LOC across repos
    contributions: number;       // Number of contributions
    languages: string[];         // Programming languages used
    frameworks: string[];        // Frameworks/libraries
    activityPattern: 'night-owl' | 'steady' | 'burst' | 'morning-person';
    avgCommitSize: 'small' | 'medium' | 'large';
    repoCount: number;
    stargazersCount: number;
  };

  // Preferences (inferred or explicitly set)
  preferences?: {
    environment?: 'studio-lite' | 'era' | 'omega' | 'custom';
    musicalVibe?: 'chill' | 'focus' | 'energetic' | 'ambient';
    colorPalette?: string[];     // Preferred hex colors
    frameStyle?: string;         // Preferred frame aesthetic
  };

  // Generation hints
  personality?: {
    traits: string[];            // ["methodical", "creative", "detail-oriented"]
    archetype: string;           // "Polyglot Builder" | "Night Owl Committer" | etc.
  };
}
```

---

### 5.2 ClassroomConfig / StageConfig

```typescript
/**
 * ClassroomConfig - Complete configuration for a stage/classroom
 * Maps 1:1 to LeAgentDiary scene schema
 */
interface ClassroomConfig {
  // Base scene
  scenePreset: 'studio-lite' | 'era' | 'omega' | 'custom';

  // Environment
  environmentConfig: {
    hdr: {
      file: string;
      directory: string;
      intensity: number;
    };
    cubemap?: {
      directory: string;
      files: string[];           // 6 faces
    };
    fallbackColor: string;
  };

  // Frame & UI
  frameTheme: string;            // Frame ID or generative theme ID
  uiPalette: {
    surfaceBg: string;
    accent: string;
    textPrimary: string;
    textSecondary: string;
  };

  // Music / Audio (future)
  musicPreset?: string;

  // Overrides
  overrides?: {
    materials?: Record<string, object>;     // Material overrides
    lighting?: {
      directional?: object;
      rotatingPoints?: object;
      spotlight?: object;
    };
    camera?: {
      preset: string;
      position?: [number, number, number];
      fov?: number;
    };
    postprocessing?: object;
    water?: object;
  };

  // Assets
  assets?: {
    characterModel?: string;     // S3 URL or local path
    videoTexture?: string;
    customTextures?: Record<string, string>;
  };
}
```

---

### 5.3 FrameTheme / FramePreset

```typescript
/**
 * FrameTheme - Defines the commemorative frame appearance
 * Can be static (Figma-sourced) or generative
 */
interface FrameTheme {
  id: string;                    // "frame-polyglot-builder"
  name: string;                  // "Polyglot Builder"
  description?: string;

  // Static frame (Figma approach)
  static?: {
    svg: string;                 // SVG file path
    style: {
      border?: string;
      overlay?: string;
      rotation?: number;
    };
  };

  // Generative frame (future)
  generative?: {
    materials: {
      border: MaterialDefinition;
      pattern?: {
        textureUrl: string;
        blendMode: string;
        opacity: number;
      };
    };
    shape: {
      geometry: string;
      segments?: number;
      radius?: number;
    };
    metadata: {
      generatedAt: string;
      inputTags: string[];
      prompt: string;
    };
  };

  // Selection criteria
  criteria?: {
    minContributions?: number;
    minLanguages?: number;
    requiredTags?: string[];
    activityPattern?: string;
  };
}

interface MaterialDefinition {
  type: string;                  // "MeshPhysicalMaterial" | "MeshStandardMaterial"
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transmission?: number;
  ior?: number;
}
```

---

### 5.4 StageFactory State

```typescript
/**
 * StageFactoryState - Global state for the factory workflow
 * Managed by Zustand or similar
 */
interface StageFactoryState {
  // Authentication
  authState: {
    status: 'anonymous' | 'loading' | 'authenticated';
    user?: {
      id: string;
      login: string;
      name: string;
      avatar_url: string;
    };
  };

  // Discovery & Generation
  factoryStatus: 'idle' | 'discovering-agents' | 'generating-stage' | 'ready' | 'error';
  discoveredAgents: AgentProfile[];
  selectedAgent?: AgentProfile;

  // Current stage
  currentClassroom?: Classroom;

  // Error handling
  error?: {
    message: string;
    code: string;
    details?: object;
  };

  // Actions
  login: () => Promise<void>;
  discoverAgents: () => Promise<void>;
  generateStage: (agentId: string) => Promise<void>;
  updateStage: (overrides: object) => Promise<void>;
  exportStage: () => object;
}
```

---

## 6. Open Questions

### 6.1 GitHub Metrics

**Which GitHub metrics are easiest/most fun to use first?**

**Easy to collect:**
- Total contributions (from GitHub API)
- Number of repos
- Primary languages (from repo metadata)
- Stars received
- Commit count

**Fun but harder:**
- Lines of code per language (requires repo cloning or API)
- Commit time patterns (night owl detection)
- Average commit size
- Contribution streaks

**Recommendation:** Start with GitHub API-accessible metrics, add deeper analysis later.

---

### 6.2 Frame Variants

**How many frame variants do we need for v1?**

**Proposed MVP Set (5-7 frames):**
1. **Default Frame** - Clean, minimal (fallback)
2. **Polyglot Builder** - Multi-language developer (5+ languages)
3. **Night Owl Committer** - Late-night activity pattern
4. **Steady Contributor** - Consistent commit pattern
5. **Deep Diver** - Few repos, high LOC concentration
6. **Explorer** - Many repos, diverse topics
7. **Open Source Champion** - High stars/forks

**Future additions:**
- Framework-specific frames (React, Three.js, etc.)
- Achievement-based (100+ contributions, 1000+ stars)
- Generative custom frames

---

### 6.3 Figma → Generative Transition

**Do we start with Figma frames and gradually fold in generative frames?**

**Recommended Approach:**
1. **Phase 1 (MVP):** Static Figma frames (5-7 variants)
   - Fastest to implement
   - Fully controllable aesthetics
   - Matches existing UI frame system

2. **Phase 2 (Post-MVP):** Hybrid approach
   - Static frames for common archetypes
   - Generative frames for edge cases / unique profiles

3. **Phase 3 (Future):** Fully generative
   - All frames generated based on profile
   - Figma frames as design references / training data

---

### 6.4 Music Integration

**How should music work?**

**Options:**
1. **Stub for MVP:** Just show "music is playing" UI element
2. **Playlist Integration:** Link to Spotify/SoundCloud playlists by mood
3. **Background Music:** Serve audio files from `/audio/` directory
4. **Generative Audio:** Use AI audio tools (Suno, etc.) - future

**Recommendation:** Start with stub, add playlist links in Phase 2.

---

## 7. Implementation Phases

### Phase 0: Foundation (Parallel to Blueprint Migration)

**Goal:** Set up conceptual framework while core systems are being migrated

**Tasks:**
1. Define all TypeScript interfaces (AgentProfile, ClassroomConfig, FrameTheme, etc.)
2. Create `types/` directory with comprehensive type definitions
3. Document mapping logic (metrics → environment, metrics → frame)
4. Design frame selection algorithm
5. Create mock data for testing

**Deliverables:**
- `types/AgentProfile.ts`
- `types/ClassroomConfig.ts`
- `types/FrameTheme.ts`
- `types/StageFactoryState.ts`
- `config/framePresets.json`
- `config/environmentPresets.json`
- `docs/MAPPING_LOGIC.md`

---

### Phase 1: Welcome Screen & Auth Stub

**Goal:** Implement welcome screen with stub GitHub auth

**Tasks:**
1. Create `WelcomeScreen` component
2. Implement auth state management (Zustand)
3. Design stub OAuth flow with mock user data
4. Add "Learn more" modal explaining the concept
5. Animations matching LeAgentDiary aesthetic

**Deliverables:**
- `src/pages/WelcomeScreen.jsx`
- `src/stores/authStore.js`
- Mock user data with GitHub profile structure
- Animated transitions

---

### Phase 2: Agent Discovery & Loader

**Goal:** Implement discovery phase with beautiful loader

**Tasks:**
1. Create `AgentDiscoveryLoader` component
2. Implement mock GitHub repo scanning
3. Generate mock `AgentProfile` instances from repos
4. Design loader animations (HTDI/LeAgentDiary style)
5. Add narration text ("Summoning your agents", etc.)

**Deliverables:**
- `src/components/AgentDiscoveryLoader.jsx`
- `src/services/githubService.js` (mock for now)
- `src/services/agentProfileGenerator.js`
- Loader animation states

---

### Phase 3: Frame System (Figma Static)

**Goal:** Implement static frame system with 5-7 variants

**Tasks:**
1. Design frames in Figma (or use existing UI frames as starting point)
2. Export frames as SVGs
3. Create `FrameSelector` service
4. Implement frame selection logic based on metrics
5. Integrate frames into UI overlay system

**Deliverables:**
- `/public/svg/frames/*.svg` (5-7 variants)
- `src/services/frameSelector.js`
- `config/framePresets.json`
- Frame integration in `UIFrameOverlay`

---

### Phase 4: Stage Configuration Layer

**Goal:** Wire together profile → config → stage

**Tasks:**
1. Implement `StageConfigGenerator` service
2. Map AgentProfile → ClassroomConfig
3. Create config override system
4. Integrate with existing scene manager
5. Test with different profile archetypes

**Deliverables:**
- `src/services/stageConfigGenerator.js`
- `src/services/mappingEngine.js`
- Config validation (Zod schemas)
- Unit tests for mapping logic

---

### Phase 5: "Voilà" Stage View

**Goal:** Display final stage with all elements

**Tasks:**
1. Create `StageView` component
2. Integrate frame overlay with stage
3. Add music UI element (stub)
4. Implement agent avatar rendering
5. Add stage controls (camera presets, etc.)

**Deliverables:**
- `src/pages/StageView.jsx`
- Frame + stage integration
- Music player UI (stub)
- Stage controls UI

---

### Phase 6: OpenResponses Tool Preparation

**Goal:** Design tool interfaces (no implementation yet)

**Tasks:**
1. Document OpenResponses tool schemas
2. Create tool specification files (JSON)
3. Design LeAgentDiaryBridge integration points
4. Plan MCP server structure
5. Document tool usage examples

**Deliverables:**
- `docs/OPENAI_TOOLS.md`
- `schemas/tools/*.json` (OpenResponses tool definitions)
- MCP server architecture doc
- Integration plan with LeAgentDiary

---

### Phase 7: Export & Serialization

**Goal:** Enable stage export to LeAgentDiary format

**Tasks:**
1. Implement `exportSceneJSON()` method
2. Validate against LeAgentDiary schema
3. Add export UI controls
4. Test round-trip (export → import)
5. Document export format

**Deliverables:**
- `src/services/sceneExporter.js`
- Export validation tests
- Export UI in `StageView`
- Example exported scenes

---

### Phase 8: Generative Frames (Future)

**Goal:** Add generative frame capability

**Tasks:**
1. Design generative frame prompt templates
2. Integrate with image generation API (DrawThings, Midjourney, etc.)
3. Implement frame material generation
4. Create generative → static frame converter
5. A/B test static vs. generative

**Deliverables:**
- `src/services/generativeFrameEngine.js`
- Prompt templates
- Generated frame cache
- Performance comparison

---

## 8. Concrete Next Implementation Steps

### Step 1: Define Type System

**Action:** Create comprehensive TypeScript type definitions

**Files to create:**
- `src/types/AgentProfile.ts`
- `src/types/ClassroomConfig.ts`
- `src/types/FrameTheme.ts`
- `src/types/StageFactoryState.ts`
- `src/types/index.ts` (exports)

**Why first:** Types inform all downstream implementation

---

### Step 2: Create Mock Data Generator

**Action:** Build mock data factory for testing

**Files to create:**
- `src/mocks/agentProfiles.js` - Mock AgentProfile instances
- `src/mocks/githubUsers.js` - Mock GitHub user data
- `src/mocks/classroomConfigs.js` - Mock ClassroomConfig instances

**Why:** Enables UI development without real GitHub API

---

### Step 3: Design Frame Selection Logic

**Action:** Document and implement frame selection algorithm

**Files to create:**
- `docs/FRAME_SELECTION_LOGIC.md` - Algorithm documentation
- `src/services/frameSelector.js` - Implementation
- `config/framePresets.json` - Frame definitions

**Why:** Critical path for connecting metrics to visuals

---

### Step 4: Implement Welcome Screen

**Action:** Build welcome screen component with auth stub

**Files to create:**
- `src/pages/WelcomeScreen.jsx`
- `src/stores/authStore.js` (Zustand)
- `src/styles/welcomeScreen.css`

**Why:** Entry point for entire user journey

---

### Step 5: Build Agent Discovery Loader

**Action:** Create beautiful loader with mock discovery

**Files to create:**
- `src/components/AgentDiscoveryLoader.jsx`
- `src/services/mockGithubService.js`
- `src/services/agentProfileGenerator.js`

**Why:** Second step in user journey, showcases "magic"

---

### Step 6: Create Frame Assets (Figma)

**Action:** Design and export 5-7 static frames

**Files to create:**
- `/public/svg/frames/default.svg`
- `/public/svg/frames/polyglot-builder.svg`
- `/public/svg/frames/night-owl.svg`
- `/public/svg/frames/steady-contributor.svg`
- `/public/svg/frames/deep-diver.svg`

**Why:** Visual centerpiece of the "voilà" moment

---

### Step 7: Wire Profile → Config Mapping

**Action:** Implement mapping from AgentProfile to ClassroomConfig

**Files to create:**
- `src/services/mappingEngine.js`
- `src/services/stageConfigGenerator.js`
- Unit tests for mapping logic

**Why:** Core business logic connecting discovery to rendering

---

### Step 8: Build Stage View Page

**Action:** Create stage view with integrated frame

**Files to create:**
- `src/pages/StageView.jsx`
- Integration with existing renderer
- Frame overlay integration

**Why:** Final destination of user journey

---

### Step 9: Document OpenResponses Tool Specs

**Action:** Write comprehensive tool documentation

**Files to create:**
- `docs/OPENAI_TOOLS.md`
- `schemas/tools/create_or_update_diary_stage.json`
- `schemas/tools/suggest_stage_preset.json`
- `schemas/tools/generate_frame_theme.json`

**Why:** Enables future agent integration

---

### Step 10: Implement Export Function

**Action:** Add scene export to LeAgentDiary format

**Files to create:**
- `src/services/sceneExporter.js`
- Export validation tests
- Export UI controls

**Why:** Completes the loop - stages become portable

---

## 9. Success Metrics

### User Experience
- ✅ Complete user journey from welcome → "voilà" in < 60 seconds
- ✅ Frame selection feels "magical" and accurate (matches user identity)
- ✅ Stage export works with LeAgentDiary

### Technical
- ✅ All TypeScript types are well-defined and documented
- ✅ Frame selection algorithm is testable and deterministic
- ✅ Mock data generator covers 10+ archetypal profiles
- ✅ Exported scene JSON validates against LeAgentDiary schema

### Preparedness for Agent Integration
- ✅ OpenResponses tool specs are complete and accurate
- ✅ LeAgentDiaryBridge integration points are documented
- ✅ Classroom API surface is well-defined
- ✅ Future agents can extend system without core changes

---

## 10. Future Agent Instructions

**When you see this document, you should:**

1. **Start with types** - All interfaces are defined; implement them in TypeScript/JSDoc
2. **Use mock data first** - Don't wait for real GitHub API; use mocks to build UI
3. **Follow the phases** - Each phase builds on previous; don't skip ahead
4. **Test with archetypes** - Use the 5-7 frame archetypes to validate mapping logic
5. **Document decisions** - If you deviate from this plan, update this doc
6. **Think tool-first** - Always consider: "Could an agent call this as a tool?"
7. **Serialize everything** - All config should be JSON-serializable for LeAgentDiary

**Key files to read first:**
- This document (you're here!)
- `STAGE_FACTORY_BLUEPRINT.md` - Technical architecture
- `STAGE_FACTORY_BLUEPRINT_UPDATE.md` - WebGPU details
- `docs/leagentdiary-bridge.md` - Export format

**Before implementing, ask:**
- Does this mapping make sense for real developers?
- Would I feel celebrated by this frame choice?
- Can an agent understand and modify this config?

---

## Appendix A: Example Agent Profiles

### Example 1: Polyglot Builder

```json
{
  "id": "alice-polyglot",
  "displayName": "Alice Chen",
  "primaryRepos": ["alice/ml-toolkit", "alice/web-components", "alice/dotfiles"],
  "tags": ["polyglot", "full-stack", "experimental"],
  "metrics": {
    "linesOfCode": 125000,
    "contributions": 1847,
    "languages": ["Python", "TypeScript", "Rust", "Go", "GLSL"],
    "frameworks": ["React", "PyTorch", "Three.js"],
    "activityPattern": "steady",
    "avgCommitSize": "medium",
    "repoCount": 23,
    "stargazersCount": 342
  },
  "preferences": {
    "environment": "studio-lite",
    "musicalVibe": "focus",
    "colorPalette": ["#4A90E2", "#5DADE2", "#76C7F0"]
  },
  "personality": {
    "traits": ["curious", "methodical", "diverse"],
    "archetype": "Polyglot Builder"
  }
}
```

**Selected Frame:** `polyglot-builder.svg`
**Environment:** `studio-lite`
**Frame Reasoning:** 5+ languages, diverse frameworks, steady contributions

---

### Example 2: Night Owl Committer

```json
{
  "id": "bob-nightowl",
  "displayName": "Bob Martinez",
  "primaryRepos": ["bob/game-engine", "bob/shader-lab"],
  "tags": ["graphics", "creative-coding", "night-owl"],
  "metrics": {
    "linesOfCode": 89000,
    "contributions": 923,
    "languages": ["C++", "GLSL", "JavaScript"],
    "frameworks": ["OpenGL", "Three.js", "Unity"],
    "activityPattern": "night-owl",
    "avgCommitSize": "large",
    "repoCount": 8,
    "stargazersCount": 156
  },
  "preferences": {
    "environment": "omega",
    "musicalVibe": "ambient",
    "colorPalette": ["#9B59B6", "#8E44AD", "#6C3483"]
  },
  "personality": {
    "traits": ["creative", "focused", "nocturnal"],
    "archetype": "Night Owl Committer"
  }
}
```

**Selected Frame:** `night-owl.svg`
**Environment:** `omega` (dark, mysterious)
**Frame Reasoning:** Night-owl activity pattern, creative coding focus

---

### Example 3: Deep Diver

```json
{
  "id": "carol-deepdiver",
  "displayName": "Carol Kim",
  "primaryRepos": ["carol/quantum-simulator"],
  "tags": ["researcher", "deep-diver", "specialist"],
  "metrics": {
    "linesOfCode": 67000,
    "contributions": 2341,
    "languages": ["Python", "C++"],
    "frameworks": ["NumPy", "Qiskit"],
    "activityPattern": "burst",
    "avgCommitSize": "small",
    "repoCount": 3,
    "stargazersCount": 891
  },
  "preferences": {
    "environment": "era",
    "musicalVibe": "chill",
    "colorPalette": ["#27AE60", "#52BE80", "#76D7C4"]
  },
  "personality": {
    "traits": ["focused", "detail-oriented", "persistent"],
    "archetype": "Deep Diver"
  }
}
```

**Selected Frame:** `deep-diver.svg`
**Environment:** `era` (focused, warm)
**Frame Reasoning:** High contributions to few repos, specialist focus

---

## Appendix B: Frame Selection Decision Tree

```
START
  │
  ├─ metrics.languages.length >= 5?
  │   └─ YES → "Polyglot Builder" frame
  │
  ├─ metrics.activityPattern === "night-owl"?
  │   └─ YES → "Night Owl Committer" frame
  │
  ├─ metrics.repoCount < 5 && metrics.contributions > 1000?
  │   └─ YES → "Deep Diver" frame
  │
  ├─ metrics.repoCount > 20?
  │   └─ YES → "Explorer" frame
  │
  ├─ metrics.activityPattern === "steady" && metrics.contributions > 500?
  │   └─ YES → "Steady Contributor" frame
  │
  ├─ metrics.stargazersCount > 500?
  │   └─ YES → "Open Source Champion" frame
  │
  └─ DEFAULT → "Default" frame
```

---

## Appendix C: Environment Mapping

```typescript
function selectEnvironment(profile: AgentProfile): string {
  const { tags, metrics, preferences } = profile;

  // Explicit preference
  if (preferences?.environment) {
    return preferences.environment;
  }

  // Tag-based
  if (tags.includes('analytical') || tags.includes('technical')) {
    return 'studio-lite';  // Clean, bright, professional
  }

  if (tags.includes('creative') || tags.includes('artistic')) {
    return 'era';          // Warm, organic, nostalgic
  }

  if (tags.includes('strategic') || tags.includes('visionary')) {
    return 'omega';        // Dark, mysterious, cinematic
  }

  // Activity pattern
  if (metrics.activityPattern === 'night-owl') {
    return 'omega';
  }

  // Language-based
  const hasCreativeCodingLangs = metrics.languages.some(lang =>
    ['GLSL', 'Processing', 'OpenFrameworks'].includes(lang)
  );
  if (hasCreativeCodingLangs) {
    return 'era';
  }

  // Default
  return 'studio-lite';
}
```

---

**Document End** | Version 2.0.0 | 2025-11-19 | Future Vision
