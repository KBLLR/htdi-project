# Asset Registry

The asset registry centralises loading and lifecycle management for textures, cubemaps, HDRs, models, and video textures. Every asset is keyed so you can re-use, inspect, or dispose of it without digging through scene code.

## Core helpers

```js
import {
  loadTextureAsset,
  loadCubeTextureAsset,
  loadHDRTextureAsset,
  loadGLTFAsset,
  loadFBXAsset,
  loadVideoTextureAsset,
  waitForAsset,
  getAsset,
  listAssets,
  disposeAsset,
  disposeAllAssets
} from 'modules/assetRegistry.js';
```

### Loading and re-using assets

- **Textures**: `const map = loadTextureAsset('texture:ui:grid', '/pbrmaps/ui/grid.png');`
- **Cubemaps**: `loadCubeTextureAsset('env:cube:noche', ['px.png', ...], { path: '/pbrmaps/cube/noche/' });`
- **HDR files**: `loadHDRTextureAsset('env:hdr:studio', 'studio.hdr', { path: '/pbrmaps/equirectangular/' });`
- **GLTF / FBX**: the loader returns a promise — await the result, then add it to the scene.
- **Videos**: `const eye = loadVideoTextureAsset('video:eye', { src: '/vid/eye.webm' });` returns `{ element, texture, ready }`.

Calling a loader twice with the same id reuses the cached asset.

### Waiting for readiness

Use `waitForAsset('env:pmrem:era-7')` to get a promise that resolves when an asset is fully ready (e.g. after an HDRI is converted to a PMREM).

### Inspecting and disposing

```js
window.assetRegistry.list();        // quick snapshot for debugging
window.assetRegistry.get(id);       // grab the raw resource
disposeAsset('gltf:cFlow4');        // dispose a single asset
disposeAllAssets();                 // nuke everything (useful for scene resets)
```

Textures, geometries, and materials are disposed safely; video assets also remove the hidden `<video>` element.

## Naming conventions

- Prefix ids by domain: `env:`, `texture:`, `video:`, `gltf:`, `fbx:`.
- Use semantic suffixes so swaps are obvious, e.g. `texture:kid:skin004:normal`.
- Keep file paths relative to their directories to avoid leaking implementation paths (`path` option handles directory prefixes).

## Extending

If you need a new loader (audio, JSON data, etc.), add it to `src/modules/assetRegistry.js` and mirror the pattern (create loader, register asset, provide a disposer). The registry already exports `registerAsset` so you can register derived assets (PMREM textures, procedural outputs) without duplicating logic.
