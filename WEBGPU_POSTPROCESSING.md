# WebGPU Postprocessing System

This document describes the dual WebGPU/WebGL postprocessing pipeline implemented in HTDI Project.

## Overview

The system provides:

- **RendererFactory**: Auto-detects WebGPU support and falls back to WebGL
- **PostProcessingManager**: Unified interface for both rendering backends
- **Dual Pipeline Architecture**:
  - **WebGL Pipeline**: Uses `pmndrs/postprocessing` v6 (stable, production-ready)
  - **WebGPU Pipeline**: Native Three.js rendering (TSL effects pending)
- **SpotlightGobo**: Spotlight with gobo (projected texture) support
- **UIFrameOverlay**: SVG overlay system for stage UI frames
- **LeAgentDiary Integration**: JSON schema validation and API bridge

## Architecture

```
src/
├── world/
│   ├── core/
│   │   └── rendererFactory.js          # WebGPU/WebGL factory
│   ├── postprocessing/
│   │   ├── PostProcessingManager.js    # Dual pipeline manager
│   │   └── pipelines/
│   │       ├── webglPipeline.js        # pmndrs/postprocessing
│   │       └── webgpuPipeline.js       # Native WebGPU (TSL pending)
│   └── lighting/
│       └── spotlightGobo.js            # Gobo spotlight
├── ui/
│   ├── uiFrame/
│   │   └── UIFrameOverlay.js           # SVG frame overlay
│   └── actionsBar/
│       └── actionsConfig.js            # 14-button actions config
└── integrations/
    ├── leAgentDiarySceneSchema.js      # Zod schema for scenes
    └── leAgentDiaryBridge.js           # API bridge
```

## Quick Start

### Basic Usage

```javascript
import { RendererFactory } from './src/world/core/rendererFactory.js';
import { PostProcessingManager } from './src/world/postprocessing/PostProcessingManager.js';

// Create renderer with auto-detection
const rendererFactory = new RendererFactory({ canvas });
await rendererFactory.init();

const backend = rendererFactory.getBackend(); // 'webgpu' | 'webgl'
const renderer = rendererFactory.getRenderer();

// Create postprocessing manager
const ppm = new PostProcessingManager({
  backend,
  renderer,
  scene,
  camera
});
await ppm.init();

// Render loop
function loop(delta) {
  ppm.render(delta);
  requestAnimationFrame(loop);
}
```

### Running the Demo

```bash
npm run dev
# Then open examples/webgpu-postprocessing-demo.js in your browser
```

The demo exposes `window.__webgpuDemo` with:
- `scene`, `camera`, `renderer`
- `postProcessingManager`
- `exportCurrentScene()` - Export to LeAgentDiary format
- `backend` - Current rendering backend

## Components

### RendererFactory

Auto-detects WebGPU and falls back to WebGL.

```javascript
const factory = new RendererFactory({ canvas, antialias: true, alpha: true });
await factory.init();

console.log(factory.getBackend()); // 'webgpu' or 'webgl'
const renderer = factory.getRenderer();
```

### PostProcessingManager

Unified interface for both pipelines.

```javascript
const ppm = new PostProcessingManager({ backend, renderer, scene, camera });
await ppm.init();

// Update settings (applies to active pipeline)
ppm.updateSettings({
  bloom: { intensity: 1.2 },
  dof: { enabled: true, focusDistance: 0.05 }
});

// Resize
ppm.resize(width, height);

// Render
ppm.render(delta);
```

### WebGL Pipeline

Uses `pmndrs/postprocessing` for production-quality effects:

- **BloomEffect**: Intensity-based bloom
- **DepthOfFieldEffect**: Bokeh DOF with focus controls
- **FXAAEffect**: Anti-aliasing

Settings are applied in real-time via `updateSettings()`.

### WebGPU Pipeline

Minimal implementation - renders directly through WebGPU renderer. TSL-based effects to be added:

- Bloom (TSL)
- DOF (TSL)
- Custom compute shaders (particles, water, gobo atlas)

### SpotlightGobo

Spotlight with gobo (projected texture) support.

```javascript
import { SpotlightGobo } from './src/world/lighting/spotlightGobo.js';

const spotlight = new SpotlightGobo({
  goboTexture: textureLoader.load('/textures/gobo.png'),
  intensity: 3,
  angle: Math.PI / 6,
  penumbra: 0.4
});

spotlight.setPosition(0, 8, 4);
spotlight.lookAt(0, 0, 0);
spotlight.addToScene(scene);

// Update dynamically
spotlight.applyState({ intensity: 5, angle: Math.PI / 8 });
```

### UIFrameOverlay

SVG overlay for stage UI frames.

```javascript
import { UIFrameOverlay } from './src/ui/uiFrame/UIFrameOverlay.js';

const frameOverlay = new UIFrameOverlay({
  container: document.getElementById('app'),
  svgPath: '/svg/uiframe/001.svg',
  zIndex: 200
});

frameOverlay.mount();

// Switch frames
frameOverlay.updateSvg('/svg/uiframe/002.svg');

// Control visibility
frameOverlay.setOpacity(0.5);
frameOverlay.hide();
frameOverlay.show();
```

### LeAgentDiary Integration

JSON schema validation and API bridge for scene export/import.

```javascript
import { LeAgentDiaryBridge } from './src/integrations/leAgentDiaryBridge.js';
import { validateSceneJson } from './src/integrations/leAgentDiarySceneSchema.js';

const bridge = new LeAgentDiaryBridge({
  baseUrl: 'https://leagentdiary.example.com',
  apiKey: process.env.VITE_LEAGENTDIARY_API_KEY
});

// Push scene
const sceneJson = { /* ... */ };
const validatedScene = validateSceneJson(sceneJson);
await bridge.pushScene(validatedScene);

// Fetch scene
const scene = await bridge.fetchScene('stage-123');

// List scenes
const scenes = await bridge.listScenes('agent-456');
```

## Scene JSON Schema

Scenes follow the LeAgentDiary schema with Zod validation:

```javascript
{
  id: string,
  agentId: string,
  diaryEntryId?: string,
  createdAt: string (ISO),
  environment: {
    hdrUrl?: string,
    cubemapUrl?: string,
    fog?: { color, near, far }
  },
  camera: { preset, fov, position, target },
  lighting: {
    directional: { intensity, position },
    rotatingPoints: [...],
    spotlightGobo: { enabled, goboUrl?, position, target, intensity, angle, penumbra }
  },
  materials: { outerSphere, innerSphere, ground, character },
  ui: { palette, frameSvg, actionsBarPreset },
  postprocessing: {
    backend: 'webgl' | 'webgpu',
    bloom: { enabled, intensity },
    dof: { enabled },
    fxaa: { enabled }
  },
  assets: { characterModelUrl?, videoTextureUrl?, alphaMapUrl? }
}
```

## Environment Variables

Add to `.env.local`:

```bash
VITE_LEAGENTDIARY_API_URL=https://your-api.example.com
VITE_LEAGENTDIARY_API_KEY=your_api_key_here
```

## Browser Support

- **WebGPU**: Chrome 113+, Edge 113+ (behind flag in Firefox)
- **WebGL**: All modern browsers (fallback)
- The system auto-detects and falls back gracefully

## TSL Integration (Roadmap)

For WebGPU pipeline:

1. **Bloom** - TSL node-based bloom effect
2. **DOF** - TSL depth-of-field
3. **Compute shaders**:
   - Particle systems
   - Water/flow simulation
   - Gobo atlas effects

These will be added to `webgpuPipeline.js` as TSL nodes become stable in Three.js.

## Actions Bar Config

14-button glassmorphism bar with 4 groups:

```javascript
import { ACTION_GROUPS } from './src/ui/actionsBar/actionsConfig.js';

// Groups: scene, camera, mood, tools
// Total: 14 buttons with dividers
```

See `src/ui/actionsBar/actionsConfig.js` for full configuration.

## Performance

- WebGPU renderer is generally faster for complex scenes
- WebGL pipeline is battle-tested with `pmndrs/postprocessing`
- Both backends use the same scene/material setup
- Postprocessing settings are synchronized across backends

## Debugging

Expose debug interface:

```javascript
window.__webgpuDemo = {
  scene,
  camera,
  renderer,
  rendererFactory,
  postProcessingManager,
  exportCurrentScene,
  backend
};
```

Access in console:

```javascript
window.__webgpuDemo.backend // 'webgpu' | 'webgl'
window.__webgpuDemo.exportCurrentScene() // Export scene
window.__webgpuDemo.postProcessingManager.updateSettings({ bloom: { intensity: 2.0 } })
```

## Next Steps

1. **Integrate with existing HTDI app** - Wire into `src/main.js`
2. **Add TSL effects** to WebGPU pipeline
3. **S3 + DrawThings** integration in `src/integrations/`
4. **Figma MCP** client for frame sync
5. **Compute shaders** for particles, water, gobo atlas

## License

MIT - See main project LICENSE
