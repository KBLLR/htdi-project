import * as THREE from 'three';
import {
  loadTextureAsset,
  loadCubeTextureAsset,
  loadHDRTextureAsset,
  waitForAsset,
  registerAsset,
  getAssetEntry,
  listAssets,
  disposeAsset
} from '@modules/assetRegistry.js';
import { scenes } from '@data/scenes.js';
import {
  getRuntimeScenes,
  addRuntimeScene,
  ensureUniqueSceneId
} from '@three/runtimeScenes.js';

const THREE_CONSTANTS = {
  LinearFilter: THREE.LinearFilter,
  NearestFilter: THREE.NearestFilter,
  RepeatWrapping: THREE.RepeatWrapping,
  MirroredRepeatWrapping: THREE.MirroredRepeatWrapping,
  ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
  SRGBColorSpace: THREE.SRGBColorSpace
};

function sanitiseKey(value) {
  if (value === null || value === undefined) return '';
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureDirectoryPath(path, fallback = '') {
  let value = path ?? '';
  if (!value) value = fallback;
  if (!value) return '';
  if (!value.startsWith('/')) value = `/${value}`;
  if (!value.endsWith('/')) value = `${value}/`;
  return value;
}

function normaliseEnvironmentDefinition(definition) {
  if (!definition) return null;

  if (typeof definition === 'string') {
    const file = definition.trim();
    if (!file) return null;
    const path = ensureDirectoryPath('/envs');
    const id = sanitiseKey(`${path}${file}`) || sanitiseKey(file);
    return {
      id,
      hdr: { file, path },
      cubemap: null,
      fallback: '#050505',
      intensity: undefined
    };
  }

  if (typeof definition === 'object') {
    const hdrConfig = definition.hdr ?? definition;
    const file = hdrConfig.file ?? hdrConfig.name ?? hdrConfig.src ?? hdrConfig.source ?? '';
    if (!file) return null;
    const path = ensureDirectoryPath(
      hdrConfig.path ?? hdrConfig.directory ?? definition.path ?? definition.directory ?? '/envs'
    );
    const fallback = definition.fallback ?? hdrConfig.fallback ?? '#050505';
    const intensityValue = definition.intensity ?? hdrConfig.intensity;
    const intensity = typeof intensityValue === 'number' ? intensityValue : undefined;
    let cubemap = null;

    if (definition.cubemap) {
      const cubeConfig = definition.cubemap;
      let files = Array.isArray(cubeConfig.files)
        ? cubeConfig.files
        : Array.isArray(cubeConfig)
          ? cubeConfig
          : null;

      if (!files && typeof cubeConfig === 'object' && Array.isArray(cubeConfig.items)) {
        files = cubeConfig.items;
      }

      const normalisedFiles = Array.isArray(files)
        ? files
            .map((entry) => {
              if (typeof entry === 'string') return entry.split('/').pop();
              if (entry && typeof entry === 'object') {
                const value = entry.file ?? entry.name ?? entry.source ?? '';
                return value.split('/').pop();
              }
              return null;
            })
            .filter(Boolean)
        : [];

      if (normalisedFiles.length) {
        cubemap = {
          files: normalisedFiles,
          path: ensureDirectoryPath(
            cubeConfig.path ?? cubeConfig.directory ?? definition.cubemapPath ?? ''
          ),
        };
      }
    }

    const idBase = definition.id ?? hdrConfig.id ?? `${path}${file}`;
    const id = sanitiseKey(idBase) || sanitiseKey(`${path}${file}`);
    return {
      id,
      hdr: { file, path },
      cubemap,
      fallback,
      intensity
    };
  }

  return null;
}

let sharedContext = {
  scene: null,
  renderer: null,
  alphaMaterial: null,
  innerSphereMaterial: null
};

const environmentMaterials = new Set();
let environmentIntensity = 1;
let kidMaterialAccessor = null;
const kidMaterialWatchers = new Set();

let activeSceneId = null;
let activeSceneToken = 0;
let currentSceneState = null;
let currentSceneMeta = {
  environment: null
};

function cloneScene(scene) {
  return scene ? JSON.parse(JSON.stringify(scene)) : null;
}

function getAllScenes() {
  return [...scenes, ...getRuntimeScenes()];
}

function findSceneById(sceneId) {
  return getAllScenes().find((scene) => scene.id === sceneId) ?? null;
}

export function getScenes() {
  return getAllScenes().map(({ id, name, description, thumbnail, metadata }) => ({
    id,
    name,
    description,
    thumbnail: thumbnail ?? null,
    metadata: metadata ?? null
  }));
}

export function setEnvironmentIntensity(value = 1) {
  const next = Number.isFinite(value) ? Math.max(0, value) : environmentIntensity;
  environmentIntensity = next;
  environmentMaterials.forEach((target) => applyEnvIntensityToTarget(target, environmentIntensity));
  updateCurrentScene({ environment: { intensity: environmentIntensity } });
  return environmentIntensity;
}

export function getEnvironmentIntensity() {
  return environmentIntensity;
}

export function getActiveSceneId() {
  return activeSceneId;
}

export function setSceneContext({ scene, renderer, alphaMaterial, innerSphereMaterial }) {
  console.log('setSceneContext called with:', { scene, renderer, alphaMaterial, innerSphereMaterial });
  if (scene) {
    sharedContext.scene = scene;
  }
  if (renderer) {
    sharedContext.renderer = renderer;
  }
  if (alphaMaterial) {
    sharedContext.alphaMaterial = alphaMaterial;
  }
  if (innerSphereMaterial) {
    sharedContext.innerSphereMaterial = innerSphereMaterial;
    registerEnvironmentTarget(innerSphereMaterial);
  }
  console.log('sharedContext after setSceneContext:', sharedContext);
}

export async function setEnvironment(definition) {
  ensureContext();
  const env = normaliseEnvironmentDefinition(definition);
  if (!env) {
    console.warn('setEnvironment received an invalid definition', definition);
    return;
  }

  const targetIntensity =
    typeof env.intensity === 'number' ? env.intensity : environmentIntensity;

  const hdrId = `env:hdr:${env.id}`;
  const pmremId = `env:pmrem:${env.id}`;

  loadHDRTextureAsset(hdrId, env.hdr.file, {
    path: env.hdr.path,
    mapping: THREE.EquirectangularReflectionMapping,
    name: `${env.id}-hdr`
  });

  let environmentTexture = null;
  try {
    environmentTexture = await resolvePMREMTexture(
      {
        id: env.id,
        environment: {
          hdr: {
            file: env.hdr.file,
            path: env.hdr.path
          }
        }
      },
      hdrId,
      pmremId
    );
  } catch (error) {
    console.warn('Failed to generate PMREM texture', error);
    environmentTexture = null;
  }

  applyEnvironmentTexture(environmentTexture, env.fallback);
  setEnvironmentIntensity(targetIntensity);

  if (env.cubemap?.files?.length) {
    const cubeKey = env.cubemap.path
      ? `${env.cubemap.path}${env.cubemap.files.join('-')}`
      : env.cubemap.files.join('-');
    const cubemapId = `env:cubemap:${sanitiseKey(cubeKey) || env.id}`;

    loadCubeTextureAsset(cubemapId, env.cubemap.files, {
      path: env.cubemap.path,
      colorSpace: THREE.SRGBColorSpace,
      name: `${env.id}-cube`,
      crossOrigin: 'anonymous'
    });

    try {
      const cubeTexture = await waitForAsset(cubemapId);
      sharedContext.scene.background = cubeTexture;
    } catch (error) {
      console.warn('Failed to load cubemap texture', error);
      if (environmentTexture) {
        sharedContext.scene.background = environmentTexture;
      } else {
        applyBackgroundFallback(env.fallback);
      }
    }
  } else if (environmentTexture) {
    sharedContext.scene.background = environmentTexture;
  } else {
    applyBackgroundFallback(env.fallback);
  }

  currentSceneMeta.environment = env;
  updateCurrentScene({
    environment: {
      hdr: { file: env.hdr.file, path: env.hdr.path },
      cubemap: env.cubemap ? { path: env.cubemap.path, files: [...(env.cubemap.files ?? [])] } : null,
      fallback: env.fallback,
      intensity: targetIntensity
    }
  });
}

export function registerEnvironmentTarget(target) {
  if (!target) return;
  environmentMaterials.add(target);
  const envTexture = sharedContext.scene?.environment;
  if (envTexture) {
    applyEnvTextureToTarget(target, envTexture);
  }
  applyEnvIntensityToTarget(target, environmentIntensity);
}

export function registerKidMaterialAccessor(getter) {
  kidMaterialAccessor = getter;
  const material = resolveKidMaterial();
  if (material) {
    registerEnvironmentTarget(material);
    kidMaterialWatchers.forEach((watch) => {
      try {
        watch(material);
      } catch (error) {
        console.error('Kid material watcher failed', error);
      }
    });
  }
}

export function onKidMaterialAvailable(callback) {
  kidMaterialWatchers.add(callback);
  const material = resolveKidMaterial();
  if (material) {
    try {
      callback(material);
    } catch (error) {
      console.error('Kid material watcher failed', error);
    }
  }
  return () => kidMaterialWatchers.delete(callback);
}

export async function applyScene(sceneId, overrideContext) {
  const startTime = performance.now();
  if (overrideContext) {
    setSceneContext(overrideContext);
  }

  ensureContext();

  const allScenes = getAllScenes();
  const sceneDef = findSceneById(sceneId) ?? allScenes[0];
  if (!sceneDef) {
    throw new Error('No scene definitions available.');
  }

  currentSceneState = cloneScene(sceneDef);
  currentSceneMeta.environment = cloneScene(sceneDef.environment);

  const token = ++activeSceneToken;

  // Dispose of previous scene's assets
  if (activeSceneId) {
    const assetsToDispose = listAssets().filter(asset =>
      asset.id.startsWith(`env:hdr:${activeSceneId}`)
      || asset.id.startsWith(`env:pmrem:${activeSceneId}`)
      || asset.id.startsWith(`env:cubemap:${activeSceneId}`)
      || asset.id.startsWith(`scene:background:${activeSceneId}`)
      || asset.id.startsWith(`texture:alpha:${activeSceneId}`)
      || asset.id.startsWith(`texture:kid:${activeSceneId}`)
      || asset.id === 'particles:main'
    );
    assetsToDispose.forEach(asset => {
      console.log(`Disposing asset: ${asset.id}`);
      disposeAsset(asset.id);
    });
  }

  applyBackgroundFallback(sceneDef.environment.fallback);

  const hdrId = `env:hdr:${sceneDef.id}`;
  const pmremId = `env:pmrem:${sceneDef.id}`;
  const cubeId = sceneDef.environment.cubemap?.files?.length
    ? `env:cubemap:${sceneDef.id}`
    : null;

  loadHDRTextureAsset(hdrId, sceneDef.environment.hdr.file, {
    path: sceneDef.environment.hdr.path,
    mapping: THREE.EquirectangularReflectionMapping,
    name: `${sceneDef.id}-hdr`
  });

  if (cubeId) {
    loadCubeTextureAsset(cubeId, sceneDef.environment.cubemap.files, {
      path: sceneDef.environment.cubemap.path,
      colorSpace: THREE.SRGBColorSpace,
      name: `${sceneDef.id}-cube`,
      crossOrigin: 'anonymous'
    });
  }

  let environmentTexture = null;
  try {
    environmentTexture = await resolvePMREMTexture(sceneDef, hdrId, pmremId);
  } catch (error) {
    console.warn('Failed to generate PMREM texture', error);
    environmentTexture = null;
  }

  if (token !== activeSceneToken) {
    return;
  }

  applyEnvironmentTexture(environmentTexture, sceneDef.environment.fallback);
  const sceneEnvIntensity =
    typeof sceneDef.environment?.intensity === 'number'
      ? sceneDef.environment.intensity
      : environmentIntensity;
  setEnvironmentIntensity(sceneEnvIntensity);
  await applySceneBackground(sceneDef, cubeId, token);

  await applyAlphaTexture(sceneDef, token);
  await applyInnerSphereSettings(sceneDef, environmentTexture, token);
  await applyKidTextures(sceneDef, environmentTexture, token);
  applyUITheme(sceneDef.ui);

  activeSceneId = sceneDef.id;
  const endTime = performance.now();
  console.log(`Scene '${sceneId}' loaded in ${((endTime - startTime) / 1000).toFixed(2)} seconds.`);
  return sceneDef;
}

function ensureContext() {
  console.log('ensureContext called. Current sharedContext:', sharedContext);
  if (!sharedContext.scene || !sharedContext.renderer) {
    throw new Error('Scene context has not been initialised. Call setSceneContext first.');
  }
  if (!sharedContext.alphaMaterial) {
    throw new Error('Alpha material is not registered with the scene manager.');
  }
  if (!sharedContext.innerSphereMaterial) {
    throw new Error('Inner sphere material is not registered with the scene manager.');
  }
}

async function resolvePMREMTexture(sceneDef, hdrId, pmremId) {
  const existing = getAssetEntry(pmremId);
  if (existing?.resource) {
    return existing.resource;
  }

  const hdrTexture = await waitForAsset(hdrId);
  const pmremGenerator = new THREE.PMREMGenerator(sharedContext.renderer);
  const cubeRenderTarget = pmremGenerator.fromEquirectangular(hdrTexture);
  pmremGenerator.dispose();

  hdrTexture.dispose();

  registerAsset(pmremId, cubeRenderTarget.texture, {
    type: 'texture',
    source: {
      from: `${sceneDef.environment.hdr.path}${sceneDef.environment.hdr.file}`
    },
    dispose: () => cubeRenderTarget.texture.dispose()
  });

  return cubeRenderTarget.texture;
}

function applyEnvironmentTexture(texture, fallbackColor) {
  if (texture) {
    sharedContext.scene.environment = texture;
    environmentMaterials.forEach((material) => {
      applyEnvTextureToTarget(material, texture);
    });
  } else {
    applyBackgroundFallback(fallbackColor);
  }
}

function applyEnvTextureToTarget(target, texture) {
  if (!target || !texture) {
    return;
  }
  if (Array.isArray(target)) {
    target.forEach((mat) => applyEnvTextureToTarget(mat, texture));
    return;
  }
  if (target.isMaterial) {
    target.envMap = texture;
    applyEnvIntensityToTarget(target, environmentIntensity);
    target.needsUpdate = true;
    return;
  }

  if (target.isObject3D) {
    target.traverse((child) => {
      if (child.isMesh && child.material) {
        applyEnvTextureToTarget(child.material, texture);
      }
    });
  }
}

function applyEnvIntensityToTarget(target, intensity) {
  if (!target) return;
  if (Array.isArray(target)) {
    target.forEach((mat) => applyEnvIntensityToTarget(mat, intensity));
    return;
  }
  if (target.isMaterial) {
    if (typeof target.envMapIntensity === 'number') {
      target.envMapIntensity = intensity;
      target.needsUpdate = true;
    }
    return;
  }
  if (target.isObject3D) {
    target.traverse((child) => {
      if (child.isMesh && child.material) {
        applyEnvIntensityToTarget(child.material, intensity);
      }
    });
  }
}

function applyBackgroundFallback(color) {
  const fallback = new THREE.Color(color ?? '#050505');
  sharedContext.scene.background = fallback;
}

export function getCurrentSceneState() {
  return cloneScene(currentSceneState);
}

export function updateCurrentScene(partial = {}) {
  if (!currentSceneState) return;
  const next = cloneScene(currentSceneState) ?? {};

  if (partial.id) next.id = partial.id;
  if (partial.name) next.name = partial.name;
  if (partial.description) next.description = partial.description;
  if (partial.thumbnail !== undefined) next.thumbnail = partial.thumbnail;

  if (partial.environment) {
    next.environment = mergeSection(next.environment, partial.environment);
  }
  if (partial.alpha) {
    next.alpha = mergeSection(next.alpha, partial.alpha);
  }
  if (partial.kid) {
    next.kid = mergeSection(next.kid, partial.kid);
  }
  if (partial.innerSphere) {
    next.innerSphere = mergeSection(next.innerSphere, partial.innerSphere);
  }
  if (partial.ui) {
    next.ui = mergeSection(next.ui, partial.ui);
  }
  if (partial.character !== undefined) {
    next.character = mergeSection(next.character, partial.character);
  }
  if (partial.fog !== undefined) {
    next.fog = mergeSection(next.fog, partial.fog);
  }
  if (partial.lighting !== undefined) {
    next.lighting = mergeSection(next.lighting, partial.lighting);
  }
  if (partial.metadata) {
    next.metadata = mergeSection(next.metadata, partial.metadata);
  }

  currentSceneState = next;
}

export function saveScenePreset(sceneInput) {
  if (!sceneInput) {
    throw new Error('saveScenePreset requires a scene definition.');
  }
  const candidateId = sceneInput.id ?? sceneInput.name ?? `scene-${Date.now()}`;
  const id = ensureUniqueSceneId(candidateId);
  const input = {
    ...cloneScene(sceneInput),
    id,
    metadata: {
      ...(sceneInput.metadata ?? {}),
      createdAt: sceneInput.metadata?.createdAt ?? new Date().toISOString(),
      type: 'runtime'
    }
  };
  const scene = addRuntimeScene(input);
  return scene;
}

async function applySceneBackground(sceneDef, cubeId, token) {
  const background = sceneDef.environment?.background ?? null;

  if (background?.texture) {
    try {
      const backgroundTexture = await loadTextureAsset(
        `scene:background:${sceneDef.id}`,
        background.texture,
        {
          path: background.path ?? '',
          colorSpace: THREE.SRGBColorSpace,
          name: `${sceneDef.id}-background`
        }
      );

      if (token === activeSceneToken && backgroundTexture) {
        sharedContext.scene.background = backgroundTexture;
        return;
      }
    } catch (error) {
      console.warn(`Scene background texture failed for "${sceneDef.id}"`, error);
    }
  }

  try {
    if (cubeId) {
      const cubeTexture = await waitForAsset(cubeId);
      if (token === activeSceneToken && cubeTexture) {
        sharedContext.scene.background = cubeTexture;
        return;
      }
    }
  } catch (error) {
    console.warn(`Scene cubemap background failed for "${sceneDef.id}"`, error);
  }

  if (background?.color) {
    sharedContext.scene.background = new THREE.Color(background.color);
    return;
  }

  applyBackgroundFallback(sceneDef.environment.fallback);
}

async function applyAlphaTexture(sceneDef, token) {
  const alphaId = `texture:alpha:${sceneDef.id}`;
  const alphaSettings = sceneDef.alpha?.settings ?? {};
  loadTextureAsset(alphaId, sceneDef.alpha.src, {
    magFilter: resolveThreeConstant(alphaSettings.magFilter),
    minFilter: resolveThreeConstant(alphaSettings.minFilter),
    wrapS: resolveThreeConstant(alphaSettings.wrapS),
    wrapT: resolveThreeConstant(alphaSettings.wrapT),
    repeat: alphaSettings.repeat
  });

  try {
    const alphaTexture = await waitForAsset(alphaId);
    if (token === activeSceneToken && alphaTexture) {
      sharedContext.alphaMaterial.alphaMap = alphaTexture;
      sharedContext.alphaMaterial.needsUpdate = true;
    }
  } catch (error) {
    console.warn(`Failed to apply alpha texture for scene "${sceneDef.id}"`, error);
  }
}

async function applyInnerSphereSettings(sceneDef, environmentTexture, token) {
  const material = sharedContext.innerSphereMaterial;
  if (!material) {
    return;
  }

  if (sceneDef.innerSphere?.emissive) {
    material.emissive.set(sceneDef.innerSphere.emissive);
  }
  if (sceneDef.innerSphere?.emissiveIntensity !== undefined) {
    material.emissiveIntensity = sceneDef.innerSphere.emissiveIntensity;
  }
  if (sceneDef.innerSphere?.opacity !== undefined) {
    material.opacity = sceneDef.innerSphere.opacity;
    material.transparent = true;
  }

  if (environmentTexture && token === activeSceneToken) {
    material.envMap = environmentTexture;
    material.needsUpdate = true;
  }
}

async function applyKidTextures(sceneDef, environmentTexture, token) {
  const baseId = `texture:kid:${sceneDef.id}:base`;
  const roughId = `texture:kid:${sceneDef.id}:roughness`;
  const normalId = `texture:kid:${sceneDef.id}:normal`;

  loadTextureAsset(baseId, sceneDef.kid.baseColor.src, {
    colorSpace: resolveThreeConstant(sceneDef.kid.baseColor.colorSpace),
    name: `${sceneDef.id}-kid-base`
  });
  if (sceneDef.kid.roughness?.src) {
    loadTextureAsset(roughId, sceneDef.kid.roughness.src, {
      name: `${sceneDef.id}-kid-roughness`
    });
  }
  if (sceneDef.kid.normal?.src) {
    loadTextureAsset(normalId, sceneDef.kid.normal.src, {
      name: `${sceneDef.id}-kid-normal`
    });
  }

  try {
    const [baseTexture, roughTexture, normalTexture] = await Promise.all([
      waitForAsset(baseId),
      sceneDef.kid.roughness?.src ? waitForAsset(roughId) : Promise.resolve(null),
      sceneDef.kid.normal?.src ? waitForAsset(normalId) : Promise.resolve(null)
    ]);

    if (token !== activeSceneToken) {
      return;
    }

    const kidMaterial = resolveKidMaterial();
    if (!kidMaterial) {
      const unsubscribe = onKidMaterialAvailable((material) => {
        assignKidTextures(material, {
          baseTexture,
          roughTexture,
          normalTexture,
          color: sceneDef.kid.color
        }, environmentTexture);
        unsubscribe?.();
      });
      return;
    }

    assignKidTextures(kidMaterial, {
      baseTexture,
      roughTexture,
      normalTexture,
      color: sceneDef.kid.color
    }, environmentTexture);
  } catch (error) {
    console.warn(`Failed to apply kid textures for scene "${sceneDef.id}"`, error);
  }
}

function assignKidTextures(material, textures, environmentTexture) {
  if (!material) {
    return;
  }
  if (textures.baseTexture) {
    material.map = textures.baseTexture;
    material.map.needsUpdate = true;
  }
  if (textures.roughTexture) {
    material.roughnessMap = textures.roughTexture;
    material.roughnessMap.needsUpdate = true;
  }
  if (textures.normalTexture) {
    material.normalMap = textures.normalTexture;
    material.normalMap.needsUpdate = true;
  }
  if (textures.color) {
    material.color = new THREE.Color(textures.color);
  }

  if (environmentTexture) {
    registerEnvironmentTarget(material);
  }
  material.needsUpdate = true;
}

function applyUITheme(theme = {}) {
  const root = document.documentElement;
  const map = {
    '--ui-surface-bg': theme.surfaceBg,
    '--ui-surface-border': theme.surfaceBorder,
    '--ui-card-bg': theme.cardBg,
    '--ui-card-border': theme.cardBorder,
    '--ui-accent': theme.accent,
    '--ui-text-primary': theme.textPrimary,
    '--ui-text-secondary': theme.textSecondary
  };
  Object.entries(map).forEach(([property, value]) => {
    if (value) {
      root.style.setProperty(property, value);
    }
  });
}

function resolveThreeConstant(name) {
  if (!name) {
    return undefined;
  }
  return THREE_CONSTANTS[name] ?? THREE[name] ?? undefined;
}

function resolveKidMaterial() {
  if (typeof kidMaterialAccessor === 'function') {
    try {
      return kidMaterialAccessor();
    } catch (error) {
      console.error('Kid material accessor threw an error', error);
      return null;
    }
  }
  return null;
}

function mergeSection(target, source) {
  if (source === null) return null;
  if (source === undefined) return target ?? undefined;
  if (Array.isArray(source)) return [...source];
  if (typeof source === 'object') {
    const base = target && typeof target === 'object' ? { ...target } : {};
    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined) return;
      if (value === null) {
        base[key] = null;
      } else if (Array.isArray(value)) {
        base[key] = [...value];
      } else if (typeof value === 'object') {
        base[key] = mergeSection(base[key], value);
      } else {
        base[key] = value;
      }
    });
    return base;
  }
  return source;
}
