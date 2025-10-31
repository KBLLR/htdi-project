// src/world/sceneManager.js
import * as THREE from 'three';
import {
  loadTextureAsset,
  loadCubeTextureAsset,
  loadHDRTextureAsset,
  waitForAsset,
  registerAsset,
  getAssetEntry,
  listAssets,
  disposeAsset,
} from '@modules/assetRegistry.js';
import { scenes } from '@data/scenes.js';
import {
  getRuntimeScenes,
  addRuntimeScene,
  ensureUniqueSceneId,
} from '@world/runtimeScenes.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS / HELPERS
// ─────────────────────────────────────────────────────────────
const THREE_CONSTANTS = {
  LinearFilter: THREE.LinearFilter,
  NearestFilter: THREE.NearestFilter,
  RepeatWrapping: THREE.RepeatWrapping,
  MirroredRepeatWrapping: THREE.MirroredRepeatWrapping,
  ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
  SRGBColorSpace: THREE.SRGBColorSpace,
};

const LOCAL_PRESET_KEY = 'htdi.scene.presets.v1';

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

// Turn whatever the scene says into the canonical env shape
function normaliseEnvironmentDefinition(definition) {
  if (!definition) return null;

  // string → hdr in /envs
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
      intensity: undefined,
    };
  }

  // object → try hdr, cubemap, intensity
  if (typeof definition === 'object') {
    const hdrConfig = definition.hdr ?? definition;
    const file =
      hdrConfig.file ?? hdrConfig.name ?? hdrConfig.src ?? hdrConfig.source ?? '';
    if (!file) return null;
    const path = ensureDirectoryPath(
      hdrConfig.path ??
      hdrConfig.directory ??
      definition.path ??
      definition.directory ??
      '/envs'
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
      intensity,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// SHARED CONTEXT (flexible)
// ─────────────────────────────────────────────────────────────
let sharedContext = {
  scene: null,
  renderer: null,

  // materials
  alphaMaterial: null,
  innerSphereMaterial: null,

  // optional controllers
  uiController: null,
  audioController: null,
  appController: null,

  // optional lights: { spot, key, fill, rim, ... }
  lights: null,
};

// materials that should get envMap
const environmentMaterials = new Set();
let environmentIntensity = 1;

// kid material access
let kidMaterialAccessor = null;
const kidMaterialWatchers = new Set();

// scene state
let activeSceneId = null;
let activeSceneToken = 0;
let currentSceneState = null;
let currentSceneMeta = {
  environment: null,
};

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────
function cloneScene(scene) {
  return scene ? JSON.parse(JSON.stringify(scene)) : null;
}

function getAllScenes() {
  return [...scenes, ...getRuntimeScenes()];
}

function findSceneById(sceneId) {
  return getAllScenes().find((scene) => scene.id === sceneId) ?? null;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: list scenes
// ─────────────────────────────────────────────────────────────
export function getScenes() {
  return getAllScenes().map(({ id, name, description, thumbnail, metadata }) => ({
    id,
    name,
    description,
    thumbnail: thumbnail ?? null,
    metadata: metadata ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────
// ENV INTENSITY
// ─────────────────────────────────────────────────────────────
export function setEnvironmentIntensity(value = 1) {
  const next = Number.isFinite(value) ? Math.max(0, value) : environmentIntensity;
  environmentIntensity = next;
  environmentMaterials.forEach((target) =>
    applyEnvIntensityToTarget(target, environmentIntensity)
  );
  updateCurrentScene({ environment: { intensity: environmentIntensity } });
  return environmentIntensity;
}

export function getEnvironmentIntensity() {
  return environmentIntensity;
}

export function getActiveSceneId() {
  return activeSceneId;
}

// ─────────────────────────────────────────────────────────────
// CONTEXT SETUP  (NOW FLEXIBLE)
// ─────────────────────────────────────────────────────────────
export function setSceneContext({
  scene,
  renderer,
  alphaMaterial,
  innerSphereMaterial,
  uiController,
  audioController,
  appController,
  lights,
}) {
  console.log('setSceneContext called with:', {
    scene,
    renderer,
    alphaMaterial,
    innerSphereMaterial,
    uiController,
    audioController,
    appController,
    lights,
  });

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
    // backward compatible: keep registering it for env
    registerEnvironmentTarget(innerSphereMaterial);
  }
  if (uiController) {
    sharedContext.uiController = uiController;
  }
  if (audioController) {
    sharedContext.audioController = audioController;
  }
  if (appController) {
    sharedContext.appController = appController;
  }
  if (lights) {
    sharedContext.lights = lights;
  }

  console.log('sharedContext after setSceneContext:', sharedContext);
}

// ─────────────────────────────────────────────────────────────
// ENVIRONMENT (manual override)
// ─────────────────────────────────────────────────────────────
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
    name: `${env.id}-hdr`,
  });

  let environmentTexture = null;
  try {
    environmentTexture = await resolvePMREMTexture(
      {
        id: env.id,
        environment: {
          hdr: {
            file: env.hdr.file,
            path: env.hdr.path,
          },
        },
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

  // optional cubemap
  if (env.cubemap?.files?.length) {
    const cubeKey = env.cubemap.path
      ? `${env.cubemap.path}${env.cubemap.files.join('-')}`
      : env.cubemap.files.join('-');
    const cubemapId = `env:cubemap:${sanitiseKey(cubeKey) || env.id}`;

    loadCubeTextureAsset(cubemapId, env.cubemap.files, {
      path: env.cubemap.path,
      colorSpace: THREE.SRGBColorSpace,
      name: `${env.id}-cube`,
      crossOrigin: 'anonymous',
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
      cubemap: env.cubemap
        ? { path: env.cubemap.path, files: [...(env.cubemap.files ?? [])] }
        : null,
      fallback: env.fallback,
      intensity: targetIntensity,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// REQUIRED CONTEXT CHECK (RELAXED)
// ─────────────────────────────────────────────────────────────
function ensureContext() {
  console.log('ensureContext called. Current sharedContext:', sharedContext);
  if (!sharedContext.scene || !sharedContext.renderer) {
    throw new Error('Scene context has not been initialised. Call setSceneContext first.');
  }
  // alpha & innerSphere are now OPTIONAL; warn only
  if (!sharedContext.alphaMaterial) {
    console.warn(
      '[sceneManager] alphaMaterial not provided — alpha overlays for scenes will be skipped.'
    );
  }
  if (!sharedContext.innerSphereMaterial) {
    console.warn(
      '[sceneManager] innerSphereMaterial not provided — inner sphere styling will be skipped.'
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PMREM
// ─────────────────────────────────────────────────────────────
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
      from: `${sceneDef.environment.hdr.path}${sceneDef.environment.hdr.file}`,
    },
    dispose: () => cubeRenderTarget.texture.dispose(),
  });

  return cubeRenderTarget.texture;
}

// ─────────────────────────────────────────────────────────────
// ENV APPLICATION
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// KID MATERIAL SUPPORT
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// MAIN: APPLY SCENE
// ─────────────────────────────────────────────────────────────
export async function applyScene(sceneId, overrideContext) {
  const startTime = performance.now();
  if (overrideContext) {
    setSceneContext(overrideContext);
  }

  ensureContext();

  const allScenes = getAllScenes();
  // keep your “first scene = default” behaviour
  const sceneDef = findSceneById(sceneId) ?? allScenes[0];
  if (!sceneDef) {
    throw new Error('No scene definitions available.');
  }

  currentSceneState = cloneScene(sceneDef);
  currentSceneMeta.environment = cloneScene(sceneDef.environment);

  const token = ++activeSceneToken;

  // Dispose of previous scene's env-scoped assets
  if (activeSceneId) {
    const assetsToDispose = listAssets().filter(
      (asset) =>
        asset.id.startsWith(`env:hdr:${activeSceneId}`) ||
        asset.id.startsWith(`env:pmrem:${activeSceneId}`) ||
        asset.id.startsWith(`env:cubemap:${activeSceneId}`) ||
        asset.id.startsWith(`scene:background:${activeSceneId}`) ||
        asset.id.startsWith(`texture:alpha:${activeSceneId}`) ||
        asset.id.startsWith(`texture:kid:${activeSceneId}`) ||
        asset.id === 'particles:main'
    );
    assetsToDispose.forEach((asset) => {
      console.log(`Disposing asset: ${asset.id}`);
      disposeAsset(asset.id);
    });
  }

  // ── ENV / BACKGROUND ─────────────────────────────
  applyBackgroundFallback(sceneDef.environment.fallback);

  const hdrId = `env:hdr:${sceneDef.id}`;
  const pmremId = `env:pmrem:${sceneDef.id}`;
  const cubeId = sceneDef.environment.cubemap?.files?.length
    ? `env:cubemap:${sceneDef.id}`
    : null;

  loadHDRTextureAsset(hdrId, sceneDef.environment.hdr.file, {
    path: sceneDef.environment.hdr.path,
    mapping: THREE.EquirectangularReflectionMapping,
    name: `${sceneDef.id}-hdr`,
  });

  if (cubeId) {
    loadCubeTextureAsset(cubeId, sceneDef.environment.cubemap.files, {
      path: sceneDef.environment.cubemap.path,
      colorSpace: THREE.SRGBColorSpace,
      name: `${sceneDef.id}-cube`,
      crossOrigin: 'anonymous',
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

  // ── UI / THEMING ────────────────────────────────
  applyUITheme(sceneDef.ui);
  await applySceneUIController(sceneDef);

  // ── ALPHA (optional) ───────────────────────────
  await applyAlphaTexture(sceneDef, token);

  // ── INNER SPHERE (optional) ─────────────────────
  await applyInnerSphereSettings(sceneDef, environmentTexture, token);

  // ── KID SKIN / AVATAR ───────────────────────────
  await applyKidTextures(sceneDef, environmentTexture, token);

  // ── LIGHTING / GOBOS (new) ──────────────────────
  await applySceneLighting(sceneDef, token);

  // ── MUSIC / AUDIO (new) ─────────────────────────
  await applySceneAudio(sceneDef);

  // ── APP / MICRO-APP (new) ───────────────────────
  await applySceneApp(sceneDef);

  activeSceneId = sceneDef.id;
  const endTime = performance.now();
  console.log(
    `Scene '${sceneId}' loaded in ${((endTime - startTime) / 1000).toFixed(2)} seconds.`
  );
  return sceneDef;
}

// ─────────────────────────────────────────────────────────────
// APPLY: BACKGROUND / CUBEMAP
// ─────────────────────────────────────────────────────────────
async function applySceneBackground(sceneDef, cubeId, token) {
  if (!cubeId) {
    // fallback to hdr or solid already done
    return;
  }

  try {
    const cubeTexture = await waitForAsset(cubeId);
    if (token !== activeSceneToken) return;
    sharedContext.scene.background = cubeTexture;
  } catch (error) {
    console.warn('Failed to load cubemap texture for scene', sceneDef.id, error);
  }
}

// ─────────────────────────────────────────────────────────────
// APPLY: UI (controller aware)
// ─────────────────────────────────────────────────────────────
function applyUITheme(theme = {}) {
  const root = document.documentElement;
  const map = {
    '--ui-surface-bg': theme.surfaceBg,
    '--ui-surface-border': theme.surfaceBorder,
    '--ui-card-bg': theme.cardBg,
    '--ui-card-border': theme.cardBorder,
    '--ui-accent': theme.accent,
    '--ui-text-primary': theme.textPrimary,
    '--ui-text-secondary': theme.textSecondary,
  };
  Object.entries(map).forEach(([property, value]) => {
    if (value) {
      root.style.setProperty(property, value);
    }
  });
}

async function applySceneUIController(sceneDef) {
  if (!sharedContext.uiController) return;
  try {
    // e.g. sceneDef.ui.panels, sceneDef.ui.layout, sceneDef.ui.actions
    await sharedContext.uiController.applySceneUI?.(sceneDef.ui ?? {}, sceneDef);
  } catch (error) {
    console.warn('[sceneManager] UI controller failed for scene', sceneDef.id, error);
  }
}

// ─────────────────────────────────────────────────────────────
// APPLY: ALPHA
// ─────────────────────────────────────────────────────────────
async function applyAlphaTexture(sceneDef, token) {
  if (!sceneDef.alpha || !sharedContext.alphaMaterial) {
    return;
  }

  const alphaId = `texture:alpha:${sceneDef.id}`;
  loadTextureAsset(alphaId, sceneDef.alpha.src, {
    path: sceneDef.alpha.path,
    name: `${sceneDef.id}-alpha`,
    colorSpace: resolveThreeConstant(sceneDef.alpha.colorSpace),
  });

  try {
    const alphaTexture = await waitForAsset(alphaId);
    if (token !== activeSceneToken) return;
    const mat = sharedContext.alphaMaterial;
    mat.map = alphaTexture;
    mat.needsUpdate = true;
  } catch (error) {
    console.warn(`Failed to apply alpha texture for scene "${sceneDef.id}"`, error);
  }
}

// ─────────────────────────────────────────────────────────────
// APPLY: INNER SPHERE (now OPTIONAL)
// ─────────────────────────────────────────────────────────────
async function applyInnerSphereSettings(sceneDef, environmentTexture, token) {
  // old scenes might have { innerSphere: { color, opacity } }
  if (!sceneDef.innerSphere) return;
  if (!sharedContext.innerSphereMaterial) return;

  const mat = sharedContext.innerSphereMaterial;
  if (sceneDef.innerSphere.color) {
    mat.color = new THREE.Color(sceneDef.innerSphere.color);
  }
  if (typeof sceneDef.innerSphere.opacity === 'number') {
    mat.opacity = sceneDef.innerSphere.opacity;
    mat.transparent = mat.opacity < 1;
  }
  if (environmentTexture) {
    registerEnvironmentTarget(mat);
  }
  mat.needsUpdate = true;
}

// ─────────────────────────────────────────────────────────────
// APPLY: KID / AVATAR TEXTURES
// ─────────────────────────────────────────────────────────────
async function applyKidTextures(sceneDef, environmentTexture, token) {
  if (!sceneDef.kid) return;

  const baseId = `texture:kid:${sceneDef.id}:base`;
  const roughId = `texture:kid:${sceneDef.id}:rough`;
  const normalId = `texture:kid:${sceneDef.id}:normal`;

  loadTextureAsset(baseId, sceneDef.kid.baseColor.src, {
    colorSpace: resolveThreeConstant(sceneDef.kid.baseColor.colorSpace),
    name: `${sceneDef.id}-kid-base`,
  });
  if (sceneDef.kid.roughness?.src) {
    loadTextureAsset(roughId, sceneDef.kid.roughness.src, {
      name: `${sceneDef.id}-kid-roughness`,
    });
  }
  if (sceneDef.kid.normal?.src) {
    loadTextureAsset(normalId, sceneDef.kid.normal.src, {
      name: `${sceneDef.id}-kid-normal`,
    });
  }

  try {
    const [baseTexture, roughTexture, normalTexture] = await Promise.all([
      waitForAsset(baseId),
      sceneDef.kid.roughness?.src ? waitForAsset(roughId) : Promise.resolve(null),
      sceneDef.kid.normal?.src ? waitForAsset(normalId) : Promise.resolve(null),
    ]);

    if (token !== activeSceneToken) {
      return;
    }

    const kidMaterial = resolveKidMaterial();
    if (!kidMaterial) {
      // wait for material to become available
      const unsubscribe = onKidMaterialAvailable((material) => {
        assignKidTextures(
          material,
          {
            baseTexture,
            roughTexture,
            normalTexture,
            color: sceneDef.kid.color,
          },
          environmentTexture
        );
        unsubscribe?.();
      });
      return;
    }

    assignKidTextures(
      kidMaterial,
      {
        baseTexture,
        roughTexture,
        normalTexture,
        color: sceneDef.kid.color,
      },
      environmentTexture
    );
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

// ─────────────────────────────────────────────────────────────
// APPLY: LIGHTING / GOBOS (NEW)
// ─────────────────────────────────────────────────────────────
async function applySceneLighting(sceneDef, token) {
  const lighting = sceneDef.lighting;
  if (!lighting) return;
  if (!lighting.gobo) return;

  const gobos = Array.isArray(lighting.gobo) ? lighting.gobo : [lighting.gobo];
  const results = [];

  for (const gobo of gobos) {
    const file =
      typeof gobo === 'string'
        ? gobo
        : gobo.file ?? gobo.name ?? gobo.src ?? gobo.source ?? null;
    if (!file) continue;
    const path =
      typeof gobo === 'string'
        ? '/gobos'
        : gobo.path ?? gobo.directory ?? '/gobos';
    const id = `gobo:${sceneDef.id}:${sanitiseKey(file)}`;
    loadTextureAsset(id, file, {
      path,
      name: `${sceneDef.id}-gobo-${file}`,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
    results.push(waitForAsset(id).then((texture) => ({ id, texture })));
  }

  if (!results.length) return;

  try {
    const loaded = await Promise.all(results);
    if (token !== activeSceneToken) return;

    // try to apply to a known light
    const lights = sharedContext.lights;
    if (!lights) return;

    const spot =
      lights.spot ||
      lights.main ||
      lights.key ||
      null;

    if (spot && spot.isLight) {
      spot.userData.gobos = loaded.map((entry) => entry.texture);
      spot.userData.activeGoboIndex = 0;
      spot.needsUpdate = true;
    }
  } catch (error) {
    console.warn('[sceneManager] failed to load gobos for scene', sceneDef.id, error);
  }
}

// ─────────────────────────────────────────────────────────────
// APPLY: AUDIO / MUSIC (NEW)
// ─────────────────────────────────────────────────────────────
async function applySceneAudio(sceneDef) {
  if (!sharedContext.audioController) return;
  if (!sceneDef.music) {
    try {
      await sharedContext.audioController.stop?.();
    } catch {
      /* noop */
    }
    return;
  }

  try {
    await sharedContext.audioController.playTrack?.(sceneDef.music, sceneDef);
  } catch (error) {
    console.warn('[sceneManager] audio controller failed for scene', sceneDef.id, error);
  }
}

// ─────────────────────────────────────────────────────────────
// APPLY: APP / MICRO-APP (NEW)
// ─────────────────────────────────────────────────────────────
async function applySceneApp(sceneDef) {
  if (!sharedContext.appController) return;
  try {
    await sharedContext.appController.activateSceneApp?.(sceneDef.app ?? {}, sceneDef);
  } catch (error) {
    console.warn('[sceneManager] app controller failed for scene', sceneDef.id, error);
  }
}

// ─────────────────────────────────────────────────────────────
// STATE GET / PATCH
// ─────────────────────────────────────────────────────────────
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

  if (partial.environment !== undefined) {
    next.environment = mergeSection(next.environment, partial.environment);
  }
  if (partial.ui !== undefined) {
    next.ui = mergeSection(next.ui, partial.ui);
  }
  if (partial.kid !== undefined) {
    next.kid = mergeSection(next.kid, partial.kid);
  }
  if (partial.music !== undefined) {
    next.music = mergeSection(next.music, partial.music);
  }
  if (partial.lighting !== undefined) {
    next.lighting = mergeSection(next.lighting, partial.lighting);
  }
  if (partial.app !== undefined) {
    next.app = mergeSection(next.app, partial.app);
  }

  currentSceneState = next;
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

// ─────────────────────────────────────────────────────────────
// PRESET STORAGE (BACKWARD COMPAT)
// ─────────────────────────────────────────────────────────────
function readLocalPresets() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_PRESET_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalPresets(map) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_PRESET_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[sceneManager] failed to write presets', err);
  }
}

/**
 * saveScenePreset(name: string, snapshot?: Scene)
 * If snapshot is omitted, it saves the *current* scene state.
 */
export function saveScenePreset(name, snapshot) {
  const key = name?.trim();
  if (!key) {
    console.warn('[sceneManager] saveScenePreset called without a name');
    return;
  }
  const data = snapshot ? cloneScene(snapshot) : getCurrentSceneState();
  if (!data) {
    console.warn('[sceneManager] saveScenePreset: no current scene to save');
    return;
  }
  const presets = readLocalPresets();
  presets[key] = data;
  writeLocalPresets(presets);
  console.log('[sceneManager] preset saved:', key, data);
}

/**
 * loadScenePreset(name: string)
 * Loads scene JSON from localStorage and applies it through updateCurrentScene + applyScene
 */
export async function loadScenePreset(name) {
  const key = name?.trim();
  if (!key) return;
  const presets = readLocalPresets();
  const preset = presets[key];
  if (!preset) {
    console.warn('[sceneManager] loadScenePreset: not found', key);
    return;
  }

  // ensure the scene exists in registry, otherwise add it as runtime
  let targetId = preset.id;
  if (!targetId) {
    targetId = `local-${sanitiseKey(key)}`;
  }

  const existing = findSceneById(targetId);
  if (!existing) {
    const runtimeId = ensureUniqueSceneId(targetId);
    addRuntimeScene({
      ...preset,
      id: runtimeId,
    });
    await applyScene(runtimeId);
  } else {
    // we can just apply it, but we also want latest values
    updateCurrentScene(preset);
    // this applies env/kid/ui/audio again
    await applyScene(existing.id);
  }
}

/**
 * listScenePresets(): string[]
 */
export function listScenePresets() {
  const presets = readLocalPresets();
  return Object.keys(presets);
}

// ─────────────────────────────────────────────────────────────
// UTIL
// ─────────────────────────────────────────────────────────────
function resolveThreeConstant(name) {
  if (!name) {
    return undefined;
  }
  return THREE_CONSTANTS[name] ?? THREE[name] ?? undefined;
}
