# Stage Factory Blueprint - UPDATE 1.1

**Date**: 2025-11-19
**Status**: Technical Clarifications & Architecture Refinements

---

## Critical Findings from User Requirements

Based on detailed codebase investigation and user feedback, the following critical systems **MUST** be preserved and clearly defined for the new architecture:

---

## 1. UI Layer Architecture (Z-Index Hierarchy)

### Layer Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────┐
│  LAYER 3: Glass Footer (Actions Bar)            │
│  z-index: 1500                                   │
│  Position: Fixed, right side, vertical stack    │
│  Status: MUST PRESERVE - ALL FUNCTIONALITY      │
└─────────────────────────────────────────────────┘
                     ▲
┌─────────────────────────────────────────────────┐
│  LAYER 2: UI Frame Overlay                      │
│  z-index: 200                                    │
│  Source: /public/svg/uiframe/002.svg            │
│  Status: MUST PRESERVE - Missing in v1.0        │
└─────────────────────────────────────────────────┘
                     ▲
┌─────────────────────────────────────────────────┐
│  LAYER 1: WebGL/WebGPU Canvas                   │
│  z-index: 0                                      │
│  Renderer: WebGPU with WebGL fallback           │
│  Status: NEW - Upgrade to WebGPU                │
└─────────────────────────────────────────────────┘
```

### UI Frame System

**Current Implementation** (`index.html:43-45`):
```html
<div class="ui-frame ui-frame--landscape" aria-hidden="true">
    <img class="ui-frame__image" src="/svg/uiframe/002.svg" alt="" />
</div>
```

**CSS Specifications** (`style.css:201-215`):
```css
.ui-frame {
    position: fixed;
    inset: 0;
    z-index: 200;
    pointer-events: none;  /* Allows canvas interaction */
    overflow: hidden;
    --ui-frame-rotation: 0deg;
}

.ui-frame__image {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%) rotate(var(--ui-frame-rotation));
}
```

**Migration Requirements**:
- Preserve 2 SVG frames: `001.svg` (151KB), `002.svg` (45KB)
- Maintain landscape/portrait responsive variants
- Keep rotation CSS custom property
- Ensure pointer-events: none for canvas passthrough

### Glass Footer (Actions Bar)

**Current Implementation** (`index.html:69-418`):

**Structure**:
- 3 button groups with visual dividers
- Group 1: Info, Tasks, Sound (UI interactions)
- Group 2: Scenes, Deployments, AI, Debug, DB + Social links (CodePen, GitHub)
- Group 3: Social links (Instagram, X/Twitter, SoundCloud)

**Total Buttons**: 14 interactive elements

**CSS Specifications** (`style.css:388-470`):
```css
.glass-footer {
    position: fixed;
    right: clamp(1.25rem, 4vh, 3rem);
    top: 50%;
    transform: translate3d(0, -50%, 0);
    z-index: 1500;  /* CRITICAL - Above all other layers */
    display: inline-flex;
    width: fit-content;
    flex-direction: column;
    gap: clamp(0.5rem, 1.5vw, 0.75rem);
    padding: clamp(0.8rem, 2.5vw, 1.1rem);
    background: rgba(10, 14, 22, 0.42);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(180, 215, 255, 0.08);
    border-radius: 1.2rem;
}
```

**Glassmorphism Effects**:
- Background: `rgba(10, 14, 22, 0.42)` (semi-transparent dark)
- Backdrop filter: `blur(14px)`
- Border: `rgba(180, 215, 255, 0.08)` (subtle glow)
- Border radius: `1.2rem`

**Button Specifications**:
- Size: `2.15rem x 2.15rem`
- Individual backgrounds: `rgba(18, 24, 34, 0.78)`
- Hover state: Opacity transitions
- SVG icons: 60% container size

**Migration Requirements**:
1. **Organize as Module**: Create `src/modules/actionsBar/` directory structure:
   ```
   src/modules/actionsBar/
   ├── ActionsBarModule.js       # Main coordinator
   ├── components/
   │   ├── GlassFooter.js         # Container component
   │   ├── ButtonGroup.js         # Group wrapper
   │   └── ActionButton.js        # Individual button
   ├── styles/
   │   └── actionsBar.css         # Extracted CSS
   └── config/
       └── buttons.json           # Button definitions
   ```

2. **Preserve All Functionality**:
   - Info modal trigger
   - Tasks modal trigger
   - Sound player integration (with equalizer animation)
   - Scene picker trigger
   - Deployments timeline trigger
   - AI actions trigger
   - Debug panel trigger
   - Database actions trigger
   - External links (CodePen, GitHub, Instagram, X, SoundCloud)

3. **Integration Points**:
   - Modal service (open/close)
   - Event bus (action triggers)
   - Tippy.js tooltips
   - Sound button state reflection (playing/paused)

---

## 2. Spotlight/Gobo Projector System

**CRITICAL**: This system was missing from Blueprint v1.0 and **MUST** be preserved.

### Overview

The "projector" is a **SpotLight with Gobo texture mapping** - a theatrical lighting technique where a texture is projected through the spotlight.

### Current Implementation

**Location**: `src/world/index.js:301-318, 780-814`

**Spotlight Configuration** (`SPOTLIGHT_DEFAULTS`):
```javascript
{
  color: '#ffffff',
  intensity: 2.5,
  angle: Math.PI / 5,        // 36 degrees
  penumbra: 0.4,
  decay: 1,
  distance: 35,
  position: [2.5, 5.5, 2.5],
  target: [0, 0.6, 0],
  gobo: null                  // Gobo texture ID
}
```

**Shadow Properties**:
- `castShadow: true`
- Shadow map size: `1024x1024`
- Shadow bias: `-0.001`

### Gobo Atlas System

**Gobo Texture Loading**:
- Gobos stored in texture atlas for performance
- Atlas loaded via: `loadTextureAtlasImage()` + `loadTextureAtlasJson()`
- UV coordinates extracted from JSON manifest
- Individual gobos cloned from atlas with UV offsets

**Key Functions**:

```javascript
function resolveGoboTexture(goboId) {
  // 1. Get gobo entry from catalog
  const entry = getGoboById(goboId) ?? goboAssets.find(asset => asset.id === goboId);

  // 2. Extract UV frame from atlas
  const frame = goboAtlasData.frames[frameKey];
  const { u0, v0, u1, v1 } = frame.uv;

  // 3. Clone atlas texture with UV offset
  const texture = goboAtlas.clone();
  texture.repeat.set(u1 - u0, v1 - v0);
  texture.offset.set(u0, v0);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function applySpotlightState() {
  spotlight.color.set(spotlightState.color);
  spotlight.intensity = spotlightState.intensity;
  spotlight.angle = spotlightState.angle;
  spotlight.penumbra = spotlightState.penumbra;
  spotlight.decay = spotlightState.decay;
  spotlight.distance = spotlightState.distance;
  spotlight.position.fromArray(spotlightState.position);
  spotlightTarget.position.fromArray(spotlightState.target);

  // Apply gobo texture to spotlight.map
  const goboTexture = spotlightState.gobo?.id ? resolveGoboTexture(spotlightState.gobo.id) : null;
  spotlight.map = goboTexture ?? null;
  if (spotlight.map) {
    spotlight.map.needsUpdate = true;
  }

  register('lights', 'spotlight', {
    ref: spotlight,
    target: spotlightTarget,
    state: serialiseSpotlightState(spotlightState)
  });
}
```

### Gobo Catalog Integration

**Asset Catalog** (`src/config/assetCatalog.js`):
```javascript
export const goboAssets = [
  { id: 'gobo-001', source: 'gobo001.png', label: 'Circular Pattern' },
  { id: 'gobo-002', source: 'gobo002.png', label: 'Grid Pattern' },
  // ... additional gobos
];

export function getGoboById(id) {
  return goboAssets.find(asset => asset.id === id);
}
```

### Tweakpane Integration

Gobos are selectable via Tweakpane dropdown (dynamically populated from catalog).

### Migration Requirements

1. **WebGPU Compatibility**:
   - Verify `SpotLight.map` property support in WebGPURenderer
   - TSL shader compatibility for projected textures
   - Maintain shadow mapping with WebGPU shadow pipelines

2. **Module Organization**:
   ```
   src/stages/components/lighting/
   ├── Spotlight.js              # SpotLight wrapper
   ├── GoboLibrary.js            # Gobo catalog + atlas manager
   └── goboAtlas.js              # Atlas texture loader
   ```

3. **Scene JSON Schema**:
   ```json
   {
     "lighting": {
       "spotlight": {
         "enabled": true,
         "color": "#ffffff",
         "intensity": 2.5,
         "angle": 0.628,
         "penumbra": 0.4,
         "decay": 1,
         "distance": 35,
         "position": [2.5, 5.5, 2.5],
         "target": [0, 0.6, 0],
         "gobo": "gobo-001",
         "shadows": {
           "enabled": true,
           "mapSize": 1024,
           "bias": -0.001
         }
       }
     }
   }
   ```

---

## 3. Tweakpane Complete Configuration

**Location**: `src/config/tweakpane-config.js` (419 lines)

### Panel Structure

```
HTDI Controls (root)
├── Scene
│   ├── Camera
│   │   ├── Position (binding)
│   │   ├── FOV (binding, min:10, max:150)
│   │   ├── Overview Preset (button)
│   │   └── Focus Preset (button)
│   ├── Controls
│   │   ├── Enabled (binding)
│   │   ├── Auto Rotate (binding)
│   │   ├── AutoRot Speed (binding, -10 to 10)
│   │   ├── Damping On (binding)
│   │   ├── Damping Factor (binding, 0.01-0.25)
│   │   ├── Min Distance (binding, 0.01-20)
│   │   ├── Max Distance (binding, 0.1-100)
│   │   └── Target (binding)
│   ├── Lights
│   │   ├── Dir Intensity (binding, 0-5)
│   │   ├── Dir Position (binding)
│   │   └── Dir Color (binding)
│   ├── Environment (dynamic)
│   └── Water (dynamic)
├── Rendering
│   ├── Post-processing
│   │   ├── Composer On (binding)
│   │   ├── Bloom
│   │   │   ├── Enabled (binding)
│   │   │   ├── Intensity (0-5)
│   │   │   ├── Threshold (0-1)
│   │   │   ├── Smoothing (0-1)
│   │   │   ├── Resolution (0.1-2)
│   │   │   ├── Luminance Pass (binding)
│   │   │   ├── Mipmap Blur (binding)
│   │   │   ├── Bloom Radius (0-2)
│   │   │   ├── Blur Levels (1-8)
│   │   │   ├── Blend Opacity (0-1)
│   │   │   └── Kernel Size (0-5)
│   │   ├── Depth of Field
│   │   │   ├── Enabled (binding)
│   │   │   ├── Focus (0-1)
│   │   │   ├── Focus Range (0-1)
│   │   │   ├── Focal Length (0-1)
│   │   │   ├── Bokeh (0-10)
│   │   │   ├── Resolution (0.1-2)
│   │   │   ├── Kernel Size (0-5)
│   │   │   └── Blend Opacity (0-1)
│   │   └── FXAA
│   │       ├── Enabled (binding)
│   │       ├── Min Edge (0-1, step:0.001)
│   │       ├── Max Edge (0-1, step:0.001)
│   │       ├── Subpixel (0-1)
│   │       ├── Samples (1-32)
│   │       └── Blend Opacity (0-1)
│   └── Tone Mapping
│       └── Exposure (0-5)
├── Assets
│   ├── Models
│   │   ├── Outer Mesh Visible (binding)
│   │   ├── Reference Cube Visible (binding)
│   │   ├── Reference Cube Opacity (0-1)
│   │   └── Reference Cube Wireframe (binding)
│   ├── Characters (dynamic)
│   ├── Material Library (dynamic)
│   ├── Kid Skins (dynamic)
│   ├── Textures (dynamic)
│   └── Particles (dynamic)
└── Performance
    └── FPS (fpsgraph)
```

### Dynamic Sections

**Environment Controls** (populated from scene manager):
- HDR selection dropdown
- Cubemap selection dropdown
- Environment intensity slider

**Water Controls** (populated from water instance):
- Water color
- Sun color
- Sun direction
- Distortion scale
- Time speed
- Alpha
- Reflection intensity

**Material Library** (populated from materials.json):
- Dropdowns for each registered material
- Apply to selected mesh buttons

**Kid Skins** (populated from asset catalog):
- Skin variant dropdown
- Apply button

**Characters** (populated from character registry):
- Character selection dropdown

### Binding Path Format

Tweakpane bindings use dot-notation paths to Scene Registry:

```javascript
{
  type: 'binding',
  path: 'sceneRegistry.postprocessing.bloomEffect.ref.intensity',
  label: 'Intensity',
  min: 0,
  max: 5,
  step: 0.01
}
```

### Button Handlers

Custom handlers registered in TweakpaneManager:

```javascript
{
  type: 'button',
  title: 'Overview Preset',
  handler: 'activateCameraPreset',
  args: ['overview']
}
```

### Migration Requirements

1. **WebGPU Post-Processing Binding Updates**:
   - Update binding paths for WebGPU EffectComposer
   - Verify all effect properties are accessible
   - Add TSL-specific controls if needed

2. **Module Organization**:
   ```
   src/modules/tweakpane/
   ├── TweakpaneManager.js       # Singleton manager
   ├── config/
   │   └── panels.js              # Panel definitions
   ├── bindings/
   │   ├── sceneBindings.js       # Scene-specific bindings
   │   ├── renderBindings.js      # Rendering bindings
   │   └── assetBindings.js       # Asset bindings
   └── handlers/
       ├── cameraHandlers.js      # Camera preset handlers
       └── materialHandlers.js    # Material apply handlers
   ```

3. **HMR Integration**:
   - Maintain `window.__tpManager` singleton
   - Alt+R hotkey for reload
   - State persistence across reloads

---

## 4. Three.js r182 WebGPU + TSL Strategy

### Research Findings

**Three.js WebGPU Status** (as of 2025):
- **r166**: TSL (Three.js Shading Language) introduced
- **r170+**: Mature WebGPU support
- **r182**: Latest release (user confirmed availability)

**TSL Features**:
- **Renderer-agnostic**: Works with WebGL and WebGPU
- **Node-based**: JavaScript composition instead of GLSL strings
- **Type-safe**: IDE autocomplete, compile-time error checking
- **Modular**: Reusable shader components
- **Compute shaders**: WebGPU-exclusive capability

**Browser Support**:
- Chrome/Edge: Full WebGPU support
- Safari/iOS: Full WebGPU support (2024+)
- Firefox: WebGPU enabled (2024+)

### TSL Example (Node-Based Materials)

**Traditional GLSL**:
```glsl
varying vec2 vUv;
uniform sampler2D map;
uniform float opacity;

void main() {
  vec4 texColor = texture2D(map, vUv);
  gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
}
```

**TSL Equivalent**:
```javascript
import { texture, uv, float, vec4, Fn } from 'three/tsl';

const customShader = Fn(() => {
  const texColor = texture(map, uv());
  const alpha = texColor.a.mul(float(opacity));
  return vec4(texColor.rgb, alpha);
});

material.fragmentNode = customShader();
```

### WebGPU Renderer Setup

**Module Import** (Critical):
```javascript
// WRONG - WebGPURenderer not in default build
import * as THREE from 'three';

// CORRECT - Use three/webgpu module
import WebGPU from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
```

**Renderer Initialization with Fallback**:
```javascript
import WebGPU from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
import * as THREE from 'three';

async function createRenderer(canvas) {
  // Check WebGPU availability
  const isWebGPUAvailable = await WebGPU.isAvailable();

  if (isWebGPUAvailable) {
    console.log('✅ WebGPU supported - using WebGPURenderer');
    const renderer = new WebGPURenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    await renderer.init();
    return { renderer, backend: 'webgpu' };
  } else {
    console.warn('⚠️ WebGPU not supported - falling back to WebGLRenderer');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    return { renderer, backend: 'webgl' };
  }
}
```

### Spotlight Gobo WebGPU Compatibility

**Critical Check**: Verify `SpotLight.map` support in WebGPURenderer

**WebGL Implementation**:
```javascript
spotlight.map = goboTexture;  // Works in WebGLRenderer
```

**WebGPU Migration**:
```javascript
// Option 1: Native support (verify in r182 docs)
spotlight.map = goboTexture;

// Option 2: TSL custom shader (if native not supported)
import { texture, uv, Fn } from 'three/tsl';

const goboProjection = Fn(() => {
  const projectedUV = calculateSpotlightUV();  // Custom TSL function
  const goboColor = texture(goboTexture, projectedUV);
  return goboColor;
});

spotlight.customDepthMaterial = new THREE.MeshBasicNodeMaterial();
spotlight.customDepthMaterial.fragmentNode = goboProjection();
```

### Migration Requirements

1. **Dependency Update**:
   ```json
   {
     "dependencies": {
       "three": "^0.182.0"
     }
   }
   ```

2. **Import Strategy**:
   - Use `three/webgpu` for WebGPU-specific imports
   - Use `three` for shared classes (Vector3, Color, etc.)
   - Use `three/tsl` for shader node imports

3. **Compute Shader Opportunities**:
   - Particle system updates (GPU-accelerated)
   - Water simulation (flow map calculations)
   - Gobo atlas texture manipulation

4. **Testing Matrix**:
   | Browser | WebGPU | WebGL Fallback |
   |---------|--------|----------------|
   | Chrome 113+ | ✅ Primary | ✅ Fallback |
   | Safari 17+ (iOS/macOS) | ✅ Primary | ✅ Fallback |
   | Firefox 121+ | ✅ Primary | ✅ Fallback |
   | Older browsers | ❌ No WebGPU | ✅ Fallback |

---

## 5. Post-Processing WebGPU Strategy

### Critical Decision Point

**pmndrs/postprocessing Library Compatibility**:

| Version | WebGPURenderer Support | Three.js Compatibility | Status |
|---------|------------------------|------------------------|--------|
| v6.37.8 (current) | ❌ **NOT SUPPORTED** | r157 - r178 | Stable |
| v7.0.0-beta.12 | ✅ **SUPPORTED** | r170+ | Beta |

**Findings from Research**:
- pmndrs/postprocessing v6 only works with `WebGLRenderer`
- pmndrs/postprocessing v7 (beta) adds `WebGPURenderer` support via new `RenderPipeline` architecture
- Three.js r170+ includes native WebGPU post-processing: `three/webgpu` → `Postprocessing` class

### Option A: pmndrs/postprocessing v7 (Beta)

**Pros**:
- Familiar API (similar to v6)
- Extensive effect library (Bloom, DOF, FXAA, SMAA, etc.)
- Community support
- Active development

**Cons**:
- Beta status (potential instability)
- API changes from v6
- Limited documentation

**Implementation**:
```javascript
import { RenderPipeline } from 'postprocessing/v7';  // Hypothetical import
import { EffectPass, BloomEffect, DepthOfFieldEffect, FXAAEffect } from 'postprocessing/v7';

async function createPostProcessing(renderer, scene, camera) {
  const pipeline = new RenderPipeline(renderer);  // Works with WebGPU or WebGL

  const bloomEffect = new BloomEffect({
    intensity: 1.0,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.3
  });

  const dofEffect = new DepthOfFieldEffect(camera, {
    focusDistance: 0.5,
    focalLength: 0.05,
    bokehScale: 2.0
  });

  const fxaaEffect = new FXAAEffect();

  const effectPass = new EffectPass(camera, bloomEffect, dofEffect, fxaaEffect);
  pipeline.addPass(effectPass);

  return { pipeline, bloomEffect, dofEffect, fxaaEffect };
}
```

### Option B: Three.js Native WebGPU Post-Processing

**Pros**:
- Official Three.js implementation
- Guaranteed WebGPU compatibility
- TSL integration
- No external dependency

**Cons**:
- Less mature than pmndrs
- Smaller effect library
- Sparse documentation

**Implementation**:
```javascript
import { Postprocessing } from 'three/webgpu';
import { bloom, depthOfField, fxaa } from 'three/tsl';

async function createPostProcessing(renderer, scene, camera) {
  const postProcessing = new Postprocessing(renderer);

  // TSL-based effects
  const bloomPass = postProcessing.createPass(bloom({
    intensity: 1.0,
    threshold: 0.9,
    smoothing: 0.3
  }));

  const dofPass = postProcessing.createPass(depthOfField({
    focusDistance: 0.5,
    focalLength: 0.05,
    bokehScale: 2.0
  }));

  const fxaaPass = postProcessing.createPass(fxaa());

  postProcessing.addPass(bloomPass);
  postProcessing.addPass(dofPass);
  postProcessing.addPass(fxaaPass);

  return { postProcessing, bloomPass, dofPass, fxaaPass };
}
```

### Option C: Dual Pipeline (Recommended for MVP)

**Strategy**: Maintain both pipelines with feature parity

**Pros**:
- Maximum compatibility
- Gradual migration path
- Fallback safety net

**Cons**:
- Code duplication
- Maintenance overhead

**Implementation**:
```javascript
async function createPostProcessing(renderer, scene, camera, backend) {
  if (backend === 'webgpu') {
    // Use Three.js native WebGPU post-processing
    return await createWebGPUPostProcessing(renderer, scene, camera);
  } else {
    // Use pmndrs/postprocessing v6 for WebGL
    return await createWebGLPostProcessing(renderer, scene, camera);
  }
}

// Unified interface
class PostProcessingManager {
  constructor(pipeline, effects, backend) {
    this.pipeline = pipeline;
    this.effects = effects;
    this.backend = backend;
  }

  setBloomIntensity(value) {
    if (this.backend === 'webgpu') {
      this.effects.bloom.intensity.value = value;
    } else {
      this.effects.bloom.intensity = value;
    }
  }

  setDOFFocus(value) {
    if (this.backend === 'webgpu') {
      this.effects.dof.focusDistance.value = value;
    } else {
      this.effects.dof.circleOfConfusionMaterial.uniforms.focusDistance.value = value;
    }
  }

  // ... unified interface for all effects
}
```

### Recommended Approach

**Phase 1 (MVP)**: Dual Pipeline
- Use pmndrs/postprocessing v6 for WebGL fallback
- Use Three.js native WebGPU post-processing
- Unified `PostProcessingManager` interface

**Phase 2 (Post-MVP)**: Migrate to Single Solution
- Evaluate pmndrs/postprocessing v7 stability
- If stable, migrate WebGPU pipeline to v7
- If not, continue with Three.js native + v6 WebGL fallback

**Phase 3 (Future)**: TSL Custom Effects
- Develop custom TSL-based effects for unique visual styles
- Leverage compute shaders for advanced techniques

### Migration Requirements

1. **Tweakpane Compatibility**:
   - Update bindings to work with both backends
   - Abstraction layer for effect property paths

2. **Scene Registry Integration**:
   ```javascript
   register('postprocessing', 'controller', {
     ref: postProcessingManager,
     backend: 'webgpu',  // or 'webgl'
     enabled: true
   });

   register('postprocessing', 'bloomEffect', {
     ref: postProcessingManager.effects.bloom,
     enabled: true,
     intensity: 1.0
   });
   ```

3. **Effect Parity**:
   | Effect | pmndrs v6 (WebGL) | Three.js WebGPU |
   |--------|-------------------|------------------|
   | Bloom | ✅ BloomEffect | ✅ bloom() |
   | Depth of Field | ✅ DepthOfFieldEffect | ✅ depthOfField() |
   | FXAA | ✅ FXAAEffect | ✅ fxaa() |
   | SMAA | ✅ SMAAEffect | ⚠️ TBD |
   | Chromatic Aberration | ✅ ChromaticAberrationEffect | ⚠️ TBD |

---

## 6. Scene JSON Schema for LeAgentDiary

Based on existing `scenes.js` structure and LeAgentDiary bridge requirements:

### Complete Scene Schema

```json
{
  "stageId": "stage_codex_navigator_20251119",
  "agentId": "codex-navigator",
  "version": "1.0.0",
  "created": "2025-11-19T12:00:00Z",
  "scenePreset": "studio-lite",

  "metadata": {
    "name": "Codex Navigator Home",
    "description": "Analytical workspace with technical aesthetics",
    "tags": ["analytical", "technical", "blue-palette"],
    "memoryRef": "prov/2025-11-19/codex-nav.json"
  },

  "environment": {
    "hdr": {
      "file": "env_club_1k.hdr",
      "directory": "/envs",
      "intensity": 1.0
    },
    "cubemap": {
      "directory": "/cubes/cube001",
      "files": ["px.webp", "nx.webp", "py.webp", "ny.webp", "pz.webp", "nz.webp"]
    },
    "fallback": "#0f141c",
    "fog": {
      "enabled": false,
      "type": "exp2",
      "color": "#1a2430",
      "density": 0.02
    }
  },

  "assets": {
    "characterModel": {
      "type": "glb",
      "url": "s3://leagentdiary-agents/codex-nav/model.glb",
      "scale": 1.0,
      "position": [0, 0, 0],
      "rotation": [0, 0, 0]
    },
    "videoTexture": {
      "type": "webm",
      "url": "/stages/codex-nav/eye.webm",
      "autoplay": true,
      "muted": true,
      "loop": true
    },
    "alphaMap": {
      "url": "/alphamaps/alpha-002.png"
    }
  },

  "materials": {
    "outerSphere": {
      "type": "MeshPhysicalMaterial",
      "color": "#ffffff",
      "metalness": 0.8,
      "roughness": 0.2,
      "transmission": 0.9,
      "thickness": 0.5,
      "ior": 1.5,
      "alphaMap": "alpha-002.png",
      "transparent": true,
      "envMapIntensity": 1.0
    },
    "innerSphere": {
      "type": "MeshStandardMaterial",
      "emissive": "#4A90E2",
      "emissiveIntensity": 1.8,
      "opacity": 0.5,
      "transparent": true,
      "map": "video:eye"
    },
    "character": {
      "baseColor": {
        "src": "/models/skins/codex-nav/map.png",
        "colorSpace": "srgb"
      },
      "roughness": "/models/skins/codex-nav/roughnessMap.png",
      "normal": "/models/skins/codex-nav/NormalMap.png",
      "color": "#f3d9c4"
    },
    "ground": {
      "type": "MeshStandardMaterial",
      "color": "#1a1a1a",
      "roughness": 0.9,
      "metalness": 0.1
    }
  },

  "lighting": {
    "directional": {
      "enabled": true,
      "color": "#ffffff",
      "intensity": 1.5,
      "position": [6, 8, 6],
      "castShadow": true,
      "shadow": {
        "mapSize": 1024,
        "bias": -0.0001,
        "normalBias": 0.02
      }
    },
    "rotatingPoints": {
      "enabled": true,
      "count": 3,
      "radius": 5.0,
      "height": 2.0,
      "speed": 0.3,
      "colors": ["#4A90E2", "#5DADE2", "#76C7F0"],
      "intensities": [0.8, 0.6, 0.9]
    },
    "spotlight": {
      "enabled": true,
      "color": "#ffffff",
      "intensity": 2.5,
      "angle": 0.628,
      "penumbra": 0.4,
      "decay": 1,
      "distance": 35,
      "position": [2.5, 5.5, 2.5],
      "target": [0, 0.6, 0],
      "gobo": "gobo-003",
      "castShadow": true,
      "shadow": {
        "mapSize": 1024,
        "bias": -0.001
      }
    }
  },

  "camera": {
    "preset": "focus",
    "fov": 45,
    "position": [0, 1.5, 5],
    "target": [0, 0.6, 0],
    "near": 0.01,
    "far": 1000
  },

  "controls": {
    "enabled": true,
    "autoRotate": false,
    "autoRotateSpeed": 1.0,
    "enableDamping": true,
    "dampingFactor": 0.1,
    "minDistance": 2,
    "maxDistance": 20,
    "target": [0, 0.6, 0]
  },

  "water": {
    "enabled": true,
    "alpha": 0.7,
    "waterColor": "#1b3a4b",
    "sunColor": "#f5f5f5",
    "sunDirection": [0.28, 0.75, 0.45],
    "distortionScale": 1.2,
    "size": 2.8,
    "timeSpeed": 0.1,
    "reflectionIntensity": 0.25,
    "radius": 16,
    "segments": 128
  },

  "postprocessing": {
    "enabled": true,
    "backend": "webgpu",
    "effects": {
      "bloom": {
        "enabled": true,
        "intensity": 1.0,
        "luminanceThreshold": 0.9,
        "luminanceSmoothing": 0.3,
        "mipmapBlur": true,
        "radius": 0.85
      },
      "depthOfField": {
        "enabled": false,
        "focusDistance": 0.5,
        "focalLength": 0.05,
        "bokehScale": 2.0
      },
      "fxaa": {
        "enabled": true,
        "minEdgeThreshold": 0.0312,
        "maxEdgeThreshold": 0.125,
        "subpixelQuality": 0.75
      }
    },
    "toneMapping": {
      "type": "ACESFilmicToneMapping",
      "exposure": 1.0
    }
  },

  "ui": {
    "palette": {
      "surfaceBg": "rgba(15, 20, 28, 0.92)",
      "surfaceBorder": "rgba(120, 160, 200, 0.16)",
      "cardBg": "rgba(20, 26, 36, 0.88)",
      "cardBorder": "rgba(140, 190, 230, 0.18)",
      "accent": "#4A90E2",
      "textPrimary": "#E8F1FF",
      "textSecondary": "#B5C4D8"
    },
    "frame": {
      "enabled": true,
      "svg": "/svg/uiframe/002.svg",
      "rotation": 0
    }
  },

  "particles": {
    "enabled": false,
    "count": 1000,
    "size": 0.05,
    "color": "#ffffff",
    "opacity": 0.6,
    "velocity": [0, 0.01, 0]
  }
}
```

### Schema Validation

**Zod Schema** (TypeScript/JavaScript validation):

```javascript
import { z } from 'zod';

const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);

const SceneSchema = z.object({
  stageId: z.string(),
  agentId: z.string(),
  version: z.string().default('1.0.0'),
  created: z.string().datetime(),
  scenePreset: z.enum(['studio-lite', 'era', 'omega', 'custom']),

  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    memoryRef: z.string().optional()
  }),

  environment: z.object({
    hdr: z.object({
      file: z.string(),
      directory: z.string(),
      intensity: z.number().min(0).max(10).default(1.0)
    }),
    cubemap: z.object({
      directory: z.string(),
      files: z.array(z.string()).length(6)
    }),
    fallback: z.string(),
    fog: z.object({
      enabled: z.boolean(),
      type: z.enum(['linear', 'exp2']),
      color: z.string(),
      density: z.number().optional(),
      near: z.number().optional(),
      far: z.number().optional()
    }).optional()
  }),

  assets: z.object({
    characterModel: z.object({
      type: z.enum(['glb', 'fbx']),
      url: z.string().url(),
      scale: z.number().default(1.0),
      position: Vector3Schema.default([0, 0, 0]),
      rotation: Vector3Schema.default([0, 0, 0])
    }),
    videoTexture: z.object({
      type: z.enum(['webm', 'mp4']),
      url: z.string(),
      autoplay: z.boolean().default(true),
      muted: z.boolean().default(true),
      loop: z.boolean().default(true)
    }),
    alphaMap: z.object({
      url: z.string()
    })
  }),

  lighting: z.object({
    directional: z.object({
      enabled: z.boolean(),
      color: z.string(),
      intensity: z.number().min(0).max(10),
      position: Vector3Schema,
      castShadow: z.boolean(),
      shadow: z.object({
        mapSize: z.number(),
        bias: z.number(),
        normalBias: z.number().optional()
      }).optional()
    }),
    rotatingPoints: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(10),
      radius: z.number(),
      height: z.number(),
      speed: z.number(),
      colors: z.array(z.string()),
      intensities: z.array(z.number())
    }),
    spotlight: z.object({
      enabled: z.boolean(),
      color: z.string(),
      intensity: z.number().min(0).max(10),
      angle: z.number(),
      penumbra: z.number().min(0).max(1),
      decay: z.number(),
      distance: z.number(),
      position: Vector3Schema,
      target: Vector3Schema,
      gobo: z.string().optional(),
      castShadow: z.boolean(),
      shadow: z.object({
        mapSize: z.number(),
        bias: z.number()
      }).optional()
    }).optional()
  }),

  camera: z.object({
    preset: z.enum(['overview', 'focus', 'maxZoomOut', 'custom']),
    fov: z.number().min(10).max(150),
    position: Vector3Schema,
    target: Vector3Schema,
    near: z.number(),
    far: z.number()
  }),

  postprocessing: z.object({
    enabled: z.boolean(),
    backend: z.enum(['webgpu', 'webgl']),
    effects: z.object({
      bloom: z.object({
        enabled: z.boolean(),
        intensity: z.number(),
        luminanceThreshold: z.number(),
        luminanceSmoothing: z.number(),
        mipmapBlur: z.boolean().optional(),
        radius: z.number().optional()
      }),
      depthOfField: z.object({
        enabled: z.boolean(),
        focusDistance: z.number(),
        focalLength: z.number(),
        bokehScale: z.number()
      }),
      fxaa: z.object({
        enabled: z.boolean(),
        minEdgeThreshold: z.number(),
        maxEdgeThreshold: z.number(),
        subpixelQuality: z.number()
      })
    }),
    toneMapping: z.object({
      type: z.string(),
      exposure: z.number()
    })
  }),

  ui: z.object({
    palette: z.object({
      surfaceBg: z.string(),
      surfaceBorder: z.string(),
      cardBg: z.string(),
      cardBorder: z.string(),
      accent: z.string(),
      textPrimary: z.string(),
      textSecondary: z.string()
    }),
    frame: z.object({
      enabled: z.boolean(),
      svg: z.string(),
      rotation: z.number().default(0)
    })
  })
});

export function validateSceneJSON(json) {
  try {
    return { valid: true, data: SceneSchema.parse(json) };
  } catch (error) {
    return { valid: false, errors: error.errors };
  }
}
```

---

## 7. Updated Migration Plan

### Phase 1: Archive & Extract (Week 1) - UPDATED

**Additional Tasks**:
1. Extract UI Frame system (`public/svg/uiframe/`, CSS)
2. Extract Spotlight/Gobo system (`src/world/index.js:301-814`, gobo atlas)
3. Document complete Tweakpane configuration (`src/config/tweakpane-config.js`)
4. Extract Actions Bar as complete module (all 14 buttons + functionality)

### Phase 2: Scaffold Modern Stack (Week 1-2) - UPDATED

**Technology Stack Revisions**:
```json
{
  "dependencies": {
    "three": "^0.182.0",
    "postprocessing": "^7.0.0-beta.12",
    "@tweenjs/tween.js": "^25.0.0",
    "tweakpane": "^4.0.5",
    "@tweakpane/plugin-essentials": "^0.2.1",
    "tippy.js": "^6.3.7",
    "zustand": "^5.0.0",
    "zod": "^3.23.0"
  }
}
```

**Vite Configuration**:
```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      'three/webgpu': 'three/webgpu',
      'three/tsl': 'three/tsl',
      // ... existing aliases
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'three-webgpu': ['three/webgpu'],
          'three-tsl': ['three/tsl'],
          'postprocessing': ['postprocessing']
        }
      }
    }
  }
});
```

### Phase 3: Migrate Core Systems (Week 2-3) - UPDATED

**Additional Components**:
- **UI Frame Module**: `src/ui/frames/`
- **Actions Bar Module**: `src/modules/actionsBar/` (complete reorganization)
- **Spotlight/Gobo Module**: `src/stages/components/lighting/spotlight/`
- **Tweakpane Module**: `src/modules/tweakpane/` (with WebGPU bindings)

### Phase 4: Implement WebGPU Renderer (Week 3-4) - NEW

**Tasks**:
1. Create renderer factory with WebGPU/WebGL fallback
2. Implement browser capability detection
3. Test WebGPU on Chrome, Safari, Firefox
4. Verify spotlight gobo projection in WebGPU
5. TSL material conversion for custom shaders
6. Compute shader experiments (particles, water sim)

**Deliverables**:
- Working WebGPU renderer with fallback
- Browser compatibility matrix
- Performance benchmarks (WebGPU vs WebGL)

### Phase 5: Post-Processing Migration (Week 4-5) - UPDATED

**Strategy**: Dual Pipeline Implementation

**Tasks**:
1. Implement WebGL pipeline (pmndrs/postprocessing v6)
2. Implement WebGPU pipeline (Three.js native OR pmndrs v7 beta)
3. Create unified `PostProcessingManager` interface
4. Update Tweakpane bindings for dual backend
5. Test effect parity (Bloom, DOF, FXAA)

**Deliverables**:
- Dual post-processing system
- Unified manager API
- Tweakpane integration for both backends

### Phase 8: UI/UX Preservation (Week 8-9) - EXPANDED

**Additional Tasks**:
1. **UI Frames**:
   - Migrate SVG frames (001.svg, 002.svg)
   - Implement responsive frame system
   - CSS rotation animations

2. **Actions Bar**:
   - Organize as complete module
   - All 14 buttons with icons
   - Glassmorphism styling
   - Tippy.js tooltip integration
   - Sound button equalizer animation

3. **Modals**:
   - Info, Tasks, Scenes, Music modals
   - Scanline overlay effects
   - Modal service integration

4. **Custom Cursor**:
   - Lime yellow (#D7FF00) cursor
   - Glow effects
   - Click animations

---

## 8. Critical Questions Answered

### From User Feedback:

**Q1: Actions Bar Organization**
**A**: Complete module reorganization planned (see Section 1). All 14 buttons preserved with full functionality.

**Q2: WebGPU Post-Processing**
**A**: Dual pipeline strategy recommended (see Section 5). pmndrs v6 for WebGL + Three.js native or pmndrs v7 beta for WebGPU.

**Q3: Projector System**
**A**: Spotlight/Gobo system documented (see Section 2). WebGPU compatibility to be verified in Phase 4.

**Q4: Tweakpane Setup**
**A**: Complete configuration mapped (see Section 3). 419-line config with dynamic sections for materials, characters, assets.

**Q5: Three.js r182**
**A**: Migration strategy defined (see Section 4). TSL adoption, WebGPU renderer, compute shaders.

**Q6: S3 Configuration**
**A**: Defer to gen-idea-lab backend. Reference htdi-agentic-lab for details.

**Q7: LeAgentDiary Scene JSON**
**A**: Complete schema defined (see Section 6). Zod validation included.

---

## 9. Next Steps

### Immediate Actions:

1. **Review Update with User**:
   - Confirm Actions Bar preservation strategy
   - Approve post-processing dual pipeline approach
   - Validate scene JSON schema

2. **Technical Validation**:
   - Test Three.js r182 WebGPU renderer
   - Verify spotlight gobo support in WebGPU
   - Evaluate pmndrs/postprocessing v7 beta stability

3. **Begin Phase 1**:
   - Create archive branch
   - Extract UI Frames, Actions Bar, Spotlight/Gobo modules
   - Document extraction map

### Follow-Up Questions for User:

1. **Post-Processing Strategy**:
   - Accept dual pipeline recommendation (pmndrs v6 WebGL + Three.js native WebGPU)?
   - OR wait for pmndrs v7 stable release?
   - OR risk pmndrs v7 beta for unified API?

2. **TSL Adoption Timeline**:
   - Convert existing GLSL shaders to TSL immediately?
   - OR maintain GLSL for WebGL, TSL only for WebGPU-specific features?

3. **Compute Shader Priorities**:
   - Which systems benefit most from compute shaders? (particles, water, gobo effects, other?)

4. **LeAgentDiary Integration Testing**:
   - Can we access a test LeAgentDiary instance to validate scene JSON rendering?
   - Or should we create a mock renderer for testing?

5. **UI Frame Customization**:
   - Should UI frames be agent-customizable (per-stage SVG)?
   - Or fixed design elements?

---

**Document End** | Version 1.1 | 2025-11-19 | Critical Update
