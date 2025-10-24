// src/modules/assetRegistry.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const assets = new Map();
const listeners = new Map();

const loaders = {
  texture: new THREE.TextureLoader(),
  cube: new THREE.CubeTextureLoader(),
  hdr: new HDRLoader(),
  gltf: new GLTFLoader(),
  fbx: new FBXLoader(),
};

const noop = () => { };

function createDeferred() {
  let resolve = noop;
  let reject = noop;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function resolveSource(source, options = {}) {
  return options.path ? `${options.path}${source}` : source;
}

function notifyListeners(id, resource) {
  const queue = listeners.get(id);
  if (!queue) return;
  queue.forEach(({ resolve }) => resolve(resource));
  listeners.delete(id);
}

function notifyErrorListeners(id, error) {
  const queue = listeners.get(id);
  if (!queue) return;
  queue.forEach(({ reject }) => reject(error));
  listeners.delete(id);
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }
  material.dispose?.();
}

function disposeObject3D(root) {
  root.traverse((child) => {
    if (child.isMesh || child.isLine || child.isPoints) {
      child.geometry?.dispose?.();
      disposeMaterial(child.material);
    }
  });
}

function createDefaultDisposer(resource) {
  if (!resource) return noop;

  if (resource.isTexture || resource.isCubeTexture || resource.isWebGLRenderTarget) {
    return () => resource.dispose();
  }

  if (resource.isMaterial) {
    return () => resource.dispose();
  }

  if (resource.isObject3D) {
    return () => disposeObject3D(resource);
  }

  if (resource.texture?.isTexture) {
    return () => {
      resource.texture.dispose();
      if (resource.element && typeof resource.element.remove === 'function') {
        resource.element.remove();
      }
    };
  }

  return noop;
}

export function registerAsset(id, resource, { type = 'generic', dispose, source, metadata, ready } = {}) {
  if (!id) throw new Error('Asset id is required to register.');

  // replace existing
  if (assets.has(id)) {
    try { assets.get(id)?.dispose?.(); } catch { /* noop */ }
    assets.delete(id);
  }

  const entry = {
    id,
    type,
    resource,
    source: source ?? null,
    metadata: metadata ?? {},
    dispose: dispose ?? createDefaultDisposer(resource),
    ready: ready ?? null,
    error: null,
  };

  assets.set(id, entry);

  if (entry.ready) {
    entry.ready
      .then(() => notifyListeners(id, resource))
      .catch((error) => {
        entry.error = error;
        notifyErrorListeners(id, error);
      });
  } else {
    notifyListeners(id, resource);
  }

  return resource;
}

export function getAsset(id) {
  return assets.get(id)?.resource;
}

export function getAssetEntry(id) {
  return assets.get(id);
}

export function hasAsset(id) {
  return assets.has(id);
}

export function listAssets() {
  // Deliberately omit the raw `resource` to avoid JSON/serialization spam in logs
  return Array.from(assets.values()).map(({ id, type, source, metadata }) => ({
    id, type, source, metadata,
  }));
}

export function waitForAsset(id) {
  const entry = assets.get(id);
  if (entry) {
    if (entry.error) return Promise.reject(entry.error);
    if (entry.ready) return entry.ready.then(() => entry.resource);
    return Promise.resolve(entry.resource);
  }

  return new Promise((resolve, reject) => {
    const queue = listeners.get(id) ?? [];
    queue.push({ resolve, reject });
    listeners.set(id, queue);
  });
}

export function disposeAsset(id) {
  const entry = assets.get(id);
  if (!entry) return false;

  try { entry.dispose?.(); } catch (e) { console.warn(`Failed to dispose asset "${id}"`, e); }
  assets.delete(id);
  listeners.delete(id);
  return true;
}

export function disposeAllAssets() {
  for (const id of assets.keys()) disposeAsset(id);
}

/* ──────────────────────────────
   Texture (2D)
   ────────────────────────────── */
export function loadTextureAsset(id, url, options = {}) {
  const existing = assets.get(id);
  if (existing) return existing.resource;

  const loader = options.loader ?? loaders.texture;
  const prevPath = loader.path;
  const prevCrossOrigin = loader.crossOrigin;

  if (options.path) loader.setPath(options.path);
  if (options.crossOrigin !== undefined && typeof loader.setCrossOrigin === 'function') {
    loader.setCrossOrigin(options.crossOrigin);
  }

  const { promise: ready, resolve, reject } = createDeferred();

  const texture = loader.load(
    url,
    (tex) => {
      if (options.colorSpace) tex.colorSpace = options.colorSpace;
      options.onLoad?.(tex);
      resolve(tex);
    },
    options.onProgress,
    (event) => {
      options.onError?.(event);
      const error = event instanceof Error
        ? event
        : new Error(`Failed to load texture asset "${id}" from "${url}"`);
      error.cause = event;
      reject(error);
      assets.delete(id);
      notifyErrorListeners(id, error);
    }
  );

  texture.name = options.name ?? id;

  // transforms & sampling
  if (options.wrapS) texture.wrapS = options.wrapS;
  if (options.wrapT) texture.wrapT = options.wrapT;

  if (options.repeat) {
    if (Array.isArray(options.repeat)) {
      const [rx, ry = options.repeat[0]] = options.repeat;
      texture.repeat.set(rx, ry);
    } else if (typeof options.repeat === 'object') {
      const { x = 1, y = 1 } = options.repeat;
      texture.repeat.set(x, y);
    }
  }

  if (options.offset) {
    const { x = 0, y = 0 } = options.offset;
    texture.offset.set(x, y);
  }

  if (options.center) {
    const { x = 0.5, y = 0.5 } = options.center;
    texture.center.set(x, y);
  }

  if (options.rotation) texture.rotation = options.rotation;
  if (options.magFilter) texture.magFilter = options.magFilter;
  if (options.minFilter) texture.minFilter = options.minFilter;
  if (options.anisotropy) texture.anisotropy = options.anisotropy;

  registerAsset(id, texture, {
    type: 'texture',
    source: resolveSource(url, options),
    metadata: { ready },
    ready,
  });

  if (options.path) loader.setPath(prevPath ?? '');
  if (options.crossOrigin !== undefined && typeof loader.setCrossOrigin === 'function') {
    loader.setCrossOrigin(prevCrossOrigin ?? 'anonymous');
  }

  return texture;
}

/* ──────────────────────────────
   CubeTexture (6 faces)
   ────────────────────────────── */
export function loadCubeTextureAsset(id, files, options = {}) {
  const existing = assets.get(id);
  if (existing) return existing.resource;

  const loader = options.loader ?? loaders.cube;
  const prevPath = loader.path;
  const prevCrossOrigin = loader.crossOrigin;

  if (options.crossOrigin !== undefined && typeof loader.setCrossOrigin === 'function') {
    loader.setCrossOrigin(options.crossOrigin);
  }
  if (options.path) loader.setPath(options.path);

  const { promise: ready, resolve, reject } = createDeferred();

  const texture = loader.load(
    files,
    (cubeTexture) => {
      if (options.colorSpace) cubeTexture.colorSpace = options.colorSpace;
      cubeTexture.generateMipmaps = options.generateMipmaps ?? true;
      cubeTexture.name = options.name ?? id;
      options.onLoad?.(cubeTexture);
      resolve(cubeTexture);
    },
    options.onProgress,
    (event) => {
      options.onError?.(event);
      const error = event instanceof Error
        ? event
        : new Error(`Failed to load cube texture asset "${id}" from "${options.path ?? ''}"`);
      error.cause = event;
      reject(error);
      assets.delete(id);
      notifyErrorListeners(id, error);
    }
  );

  registerAsset(id, texture, {
    type: 'cube-texture',
    source: { path: options.path ?? null, files: [...files] },
    metadata: { ready },
    ready,
  });

  if (options.path) loader.setPath(prevPath ?? '');
  if (options.crossOrigin !== undefined && typeof loader.setCrossOrigin === 'function') {
    loader.setCrossOrigin(prevCrossOrigin ?? 'anonymous');
  }

  return texture;
}

/* ──────────────────────────────
   HDR equirectangular (RGBE)
   ────────────────────────────── */
export function loadHDRTextureAsset(id, file, options = {}) {
  const existing = assets.get(id);
  if (existing) return existing.resource;

  const loader = options.loader ?? loaders.hdr;
  const prevPath = loader.path;

  if (options.path) loader.setPath(options.path);

  const { promise: ready, resolve, reject } = createDeferred();

  const texture = loader.load(
    file,
    (hdrTexture) => {
      hdrTexture.name = options.name ?? id;
      // sensible defaults for IBL
      hdrTexture.mapping = options.mapping ?? THREE.EquirectangularReflectionMapping;
      hdrTexture.colorSpace = options.colorSpace ?? THREE.LinearSRGBColorSpace;
      options.onLoad?.(hdrTexture);
      resolve(hdrTexture);
    },
    options.onProgress,
    (event) => {
      options.onError?.(event);
      const error = event instanceof Error
        ? event
        : new Error(`Failed to load HDR texture asset "${id}" from "${file}"`);
      error.cause = event;
      reject(error);
      assets.delete(id);
      notifyErrorListeners(id, error);
    }
  );

  registerAsset(id, texture, {
    type: 'hdr-texture',
    source: resolveSource(file, options),
    metadata: { ready },
    ready,
  });

  if (options.path) loader.setPath(prevPath ?? '');

  return texture;
}

/* ──────────────────────────────
   GLTF / FBX
   ────────────────────────────── */
function disposeGLTF(gltf) {
  if (gltf.scene) disposeObject3D(gltf.scene);
  if (Array.isArray(gltf.scenes)) gltf.scenes.forEach(disposeObject3D);
  if (Array.isArray(gltf.animations)) gltf.animations.length = 0;
}

export async function loadGLTFAsset(id, url, options = {}) {
  const existing = assets.get(id);
  if (existing) return existing.resource;

  const loader = options.loader ?? loaders.gltf;
  const prevPath = loader.path;
  if (options.path) loader.setPath(options.path);

  try {
    const gltf = await loader.loadAsync(url);
    registerAsset(id, gltf, {
      type: 'gltf',
      source: resolveSource(url, options),
      metadata: {
        animations: gltf.animations?.length ?? 0,
        scenes: gltf.scenes?.length ?? (gltf.scene ? 1 : 0),
      },
      ready: Promise.resolve(gltf),
      dispose: () => disposeGLTF(gltf),
    });
    return gltf;
  } catch (error) {
    notifyErrorListeners(id, error);
    throw error;
  } finally {
    if (options.path) loader.setPath(prevPath ?? '');
  }
}

export async function loadFBXAsset(id, url, options = {}) {
  const existing = assets.get(id);
  if (existing) return existing.resource;

  const loader = options.loader ?? loaders.fbx;
  const prevPath = loader.path;
  if (options.path) loader.setPath(options.path);

  try {
    const object = await loader.loadAsync(url);
    registerAsset(id, object, {
      type: 'fbx',
      source: resolveSource(url, options),
      metadata: { animations: object.animations?.length ?? 0 },
      ready: Promise.resolve(object),
      dispose: () => disposeObject3D(object),
    });
    return object;
  } catch (error) {
    notifyErrorListeners(id, error);
    throw error;
  } finally {
    if (options.path) loader.setPath(prevPath ?? '');
  }
}

/* ──────────────────────────────
   Video → VideoTexture (+ DOM element)
   ────────────────────────────── */
export function loadVideoTextureAsset(id, options = {}) {
  const existing = assets.get(id);
  if (existing) return existing.resource;

  if (!options.src) throw new Error(`Video asset "${id}" requires a src option.`);
  if (typeof document === 'undefined') throw new Error('Video textures require a DOM environment.');

  const video = options.element ?? document.createElement('video');
  video.id = options.elementId ?? id;
  video.loop = options.loop ?? true;
  video.muted = options.muted ?? true;
  video.playsInline = options.playsInline ?? true;
  video.preload = options.preload ?? 'auto';
  video.crossOrigin = options.crossOrigin ?? 'anonymous';
  video.setAttribute('muted', '');

  const mountTarget = options.appendTo === false ? null : options.appendTo ?? document.body;
  if (mountTarget && !video.isConnected) mountTarget.appendChild(video);

  const { promise: ready, resolve, reject } = createDeferred();

  const cleanup = () => {
    video.removeEventListener('canplay', handleCanPlay);
    video.removeEventListener('error', handleError);
  };

  const handleCanPlay = () => {
    cleanup();
    console.log(`Video element readyState for '${id}': ${video.readyState}`);
    if (options.autoplay !== false) {
      video.play().catch((error) => {
        console.warn(`Autoplay failed for video asset "${id}"`, error);
      });
    }
    resolve(resource);
  };

  const handleError = (event) => {
    cleanup();
    const error = event?.error ?? event ?? new Error(`Video failed: ${options.src}`);
    reject(error);
    assets.delete(id);
    notifyErrorListeners(id, error);
  };

  video.addEventListener('canplay', handleCanPlay, { once: true });
  video.addEventListener('error', handleError, { once: true });
  video.src = options.src;

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = options.colorSpace ?? THREE.SRGBColorSpace;
  texture.name = options.name ?? id;

  const resource = { element: video, texture, ready };

  registerAsset(id, resource, {
    type: 'video',
    source: options.src,
    metadata: { ready },
    ready,
    dispose: () => {
      texture.dispose();
      video.pause?.();
      if (!options.element && video.isConnected) video.remove();
    },
  });

  return resource;
}

/* ──────────────────────────────
   Metadata helpers
   ────────────────────────────── */
export function updateAssetMetadata(id, updater) {
  const entry = assets.get(id);
  if (!entry) return;
  entry.metadata = typeof updater === 'function' ? updater(entry.metadata) : updater;
}

export function setAssetMetadata(id, metadata) {
  const entry = assets.get(id);
  if (!entry) return;
  entry.metadata = metadata;
}

/* ──────────────────────────────
   Dev convenience (no heavy objects)
   ────────────────────────────── */
if (typeof window !== 'undefined') {
  window.assetRegistry = {
    get: getAsset,
    entry: getAssetEntry,
    has: hasAsset,
    list: listAssets,
    wait: waitForAsset,
    dispose: disposeAsset,
    disposeAll: disposeAllAssets,
  };
}
