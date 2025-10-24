# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTDI Project ("Hard To Debug Issues Project") is a Vite-based web application focused on interactive 3D/WebGL experiences using Three.js, postprocessing effects, and various creative coding libraries. It serves as a portfolio and experimental platform for creative development.

## Development Commands

```bash
# Development server (default port 5175, configurable via VITE_DEV_PORT)
npm run dev

# Build for production
npm run build

# Preview production build (port 4173)
npm run preview

# Lint JavaScript files
npm run lint
```

## Architecture Overview

### Module System & Path Aliases

The project uses extensive Vite path aliases configured in `vite.config.mjs`:

- **Core aliases**: `@app`, `@config`, `@css`, `@data`, `@modules`, `@shared`
- **Three.js domain**: `@three`, `@three/core`, `@three/lighting`, `@three/materials`, `@three/objects`, `@three/post`, `@three/registry`, `@three/utils`
- **Specialized**: `@controllers`, `@pages`, `@shaders`, `@svg`

Always use these aliases for imports rather than relative paths.

### Entry Points

- **Main entry**: `src/main.js` - Bootstraps the entire application, sets up Three.js experience, UI components, and event system
- **Three.js entry**: `src/three/index.js` - Creates and configures the 3D experience via `createExperience()`

### Core Systems

#### 1. Asset Registry (`src/modules/assetRegistry.js`)

Centralized asset management system with lifecycle control:

```javascript
// Load and register assets with automatic disposal
loadTextureAsset(id, url, options)
loadVideoTextureAsset(id, options)
loadGLTFAsset(id, url, options)
loadFBXAsset(id, url, options)
loadHDRTextureAsset(id, file, options)
loadCubeTextureAsset(id, files, options)

// Asset lifecycle
waitForAsset(id)        // Promise-based waiting
getAsset(id)            // Retrieve resource
disposeAsset(id)        // Clean up
```

**Important**: All Three.js assets (textures, models) should be loaded through this registry for proper memory management and HMR support.

#### 2. Scene Manager (`src/three/sceneManager.js`)

Manages scene presets and environment textures:

- Loads scene configurations from `src/data/scenes.js`
- Handles environment map application to materials
- Provides `applyScene(sceneId)` to switch between configured scenes
- Maintains `sharedContext` for scene, renderer, and key materials
- Tracks environment-aware materials via `registerEnvironmentTarget(material)`

#### 3. Scene Registry (`src/three/registry/SceneRegistry.js`)

Registers all Three.js objects, materials, lights, and resources for debugging and introspection:

```javascript
register('meshes', 'outerMesh', { ref: mesh, ... })
register('materials', 'alphaMat', { ref: material })
register('lights', 'directional', config)
```

Access via `window.sceneRegistry` in browser console.

#### 4. DevLog System (`src/modules/devlog.js`)

HMR-safe development logging overlay:

- Intercepts console calls at configurable level
- Press **Alt+D** to toggle overlay
- Automatically formats Three.js objects (Object3D, Texture)
- Persists across HMR reloads via singleton pattern

#### 5. Actions Bar Manager (`src/modules/actionsBar/ActionsBarManager.js`)

JSON-driven UI action registration system:

- Configuration: `src/config/actions.json`
- Action implementations: `src/modules/actionsBar/actions/*.js`
- Integrates with modal system and EventBus

#### 6. Modal Service (`src/modules/modalService.js`)

EventBus-driven modal system with camera integration:

- Modals trigger camera focus/defocus animations
- Integrates with depth-of-field effects
- Modal state managed via `data-modal-id` attributes

### Three.js Architecture

The Three.js setup is modular and split into domain-specific files:

- **Core**: `createScene`, `createCamera`, `createRenderer`, `createControls`, `startLoop`
- **Materials**: `createDefaultMaterials.js` exports material factory functions and JSON loader
- **Lighting**: `createLights.js` with rotating point lights system
- **Postprocessing**: Uses `postprocessing` library (not Three's EffectComposer)
- **Utils**: `resize.js`, `colorSpaces.js`

#### Key Three.js Objects

Created in `src/three/index.js`:

- **groupKid**: Main group containing character model, platform, and water
- **outer_Mesh**: Outer sphere with alpha material
- **inner_World**: Inner sphere with video texture (eye)
- **kid**: FBX model with walking animation
- **creativeFlow**: GLTF model (cFlow4) with animation
- **platform**: GLTF platform model with PBR textures
- **water**: Uses Three's `Water` class with flow simulation

### Configuration Files

- `src/config/materials.json` - Material presets loaded at startup
- `src/config/actions.json` - Actions bar module registration
- `src/config/tweakpane.json` - Tweakpane UI configuration
- `src/config/assets.js` - Asset path constants
- `src/data/scenes.js` - Scene preset definitions

### Video Texture Setup

The project uses a video eye texture with specific requirements:

- Source: `/vid/eye.webm`
- Loaded via `loadVideoTextureAsset` with autoplay
- Applied to `innerSphereMaterial`
- Format: RGBA with SRGBColorSpace
- **Note**: There's a duplicate video loading block in `src/three/index.js` (lines 72-89 and 120-137) that should be consolidated

### Tweakpane Integration

Uses Tweakpane v4.0.5 (not dat.gui):

- Singleton manager: `window.__tpManager`
- Material controls attached dynamically via `attachMaterialsPane`
- HMR reload via **Alt+R**
- JSON-driven configuration support

### Music & Audio

Music player system (`src/modules/musicPlayerUI.js`):

- Loads tracks from library
- Integrates with sound button UI
- State reflected in glass footer button
- Modal-based interface

### Event System

Custom EventBus (`src/shared/EventBus.js`):

- Used for actions bar and modal communication
- Decouples UI components from core logic
- Instance created per subsystem (e.g., `ActionsBarManager`)

### Custom Cursor

Implemented inline in `src/main.js`:

- Yellow/lime custom cursor with glow effect
- Responds to click with scale animation
- Hides default cursor via `cursor: none`

### Vercel Integration

Custom Vite plugin for deployment data:

- Endpoint: `/api/vercel-deployments`
- Fetches from `server/fetchVercelDeployments.mjs`
- Requires env vars: `VERCEL_ACCESS_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (optional)
- Powers deployment timeline UI

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
VERCEL_ACCESS_TOKEN=     # Required for deployment timeline
VERCEL_PROJECT_ID=       # Your Vercel project ID
VERCEL_TEAM_ID=          # Optional, for team projects
VITE_DEV_PORT=5175       # Override default dev port
```

## Important Patterns

### HMR-Safe Singletons

Many modules use window-scoped singletons to survive HMR:

```javascript
const KEY = '__kbllr_specific_key__';
if (!window[KEY]) window[KEY] = new Instance();
return window[KEY];
```

Used in: DevLog, Tweakpane Manager, Asset Registry watchers.

### Deferred Promises

Asset loading uses deferred promise pattern:

```javascript
function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
```

### Material Environment Mapping

Materials that should respond to scene environment changes must register:

```javascript
registerEnvironmentTarget(material);
```

This ensures environment maps are updated when scenes change.

## Known Issues

1. **Duplicate video texture loading** in `src/three/index.js` (lines 72-89 and 120-137)
2. **Commented-out deployment timeline initialization** in `src/main.js` (line 272)
3. **Variables before declaration** in some scope chains (`webmEye` used before declaration in line 68)

## ESLint Configuration

Project uses ESLint 9 with flat config (`eslint.config.js`):

- Globals: `THREE`, `gsap`, `GUI`, `Stats`, `dat`, `random`, `hsl`
- Browser + Node environments
- Based on `@eslint/js` recommended config

## Browser Compatibility

- **Node**: >=18
- **NPM**: >=9
- Targets modern browsers with ES modules
- WebXR/VR support via VRButton

## Debugging Tools

- **Scene Registry**: `window.sceneRegistry` - Inspect all registered objects
- **Asset Registry**: `window.assetRegistry` - List/inspect loaded assets
- **DevLog**: Alt+D to toggle console overlay
- **Tweakpane**: Alt+R to reload (with HMR support)

## Git Workflow

Current branch: `debug/serialisation`
Main branch: `main`

Recent focus: Modularization phase I completed, refactoring for Vite stack upgrade.
