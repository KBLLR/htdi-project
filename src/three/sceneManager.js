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

const THREE_CONSTANTS = {
  LinearFilter: THREE.LinearFilter,
  NearestFilter: THREE.NearestFilter,
  RepeatWrapping: THREE.RepeatWrapping,
  MirroredRepeatWrapping: THREE.MirroredRepeatWrapping,
  ClampToEdgeWrapping: THREE.ClampToEdgeWrapping,
  SRGBColorSpace: THREE.SRGBColorSpace
};

let sharedContext = {
  scene: null,
  renderer: null,
  alphaMaterial: null,
  innerSphereMaterial: null
};

const environmentMaterials = new Set();
let kidMaterialAccessor = null;
const kidMaterialWatchers = new Set();

let activeSceneId = null;
let activeSceneToken = 0;

export function getScenes() {
  return scenes.map(({ id, name, description }) => ({
    id,
    name,
    description
  }));
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

export function registerEnvironmentTarget(target) {
  if (!target) return;
  environmentMaterials.add(target);
  const envTexture = sharedContext.scene?.environment;
  if (envTexture) {
    applyEnvTextureToTarget(target, envTexture);
  }
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

  const sceneDef = scenes.find((scene) => scene.id === sceneId) ?? scenes[0];
  if (!sceneDef) {
    throw new Error('No scene definitions available.');
  }

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
    );
    assetsToDispose.forEach(asset => {
      console.log(`Disposing asset: ${asset.id}`);
      disposeAsset(asset.id);
    });
  }

  applyBackgroundFallback(sceneDef.environment.fallback);

  const hdrId = `env:hdr:${sceneDef.id}`;
  const pmremId = `env:pmrem:${sceneDef.id}`;
  const cubeId = `env:cubemap:${sceneDef.id}`;

  loadHDRTextureAsset(hdrId, sceneDef.environment.hdr.file, {
    path: sceneDef.environment.hdr.path,
    mapping: THREE.EquirectangularReflectionMapping,
    name: `${sceneDef.id}-hdr`
  });

  loadCubeTextureAsset(cubeId, sceneDef.environment.cubemap.files, {
    path: sceneDef.environment.cubemap.path,
    colorSpace: THREE.SRGBColorSpace,
    name: `${sceneDef.id}-cube`,
    crossOrigin: 'anonymous'
  });

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
  await applySceneBackground(sceneDef, cubeId, token);

  await applyAlphaTexture(sceneDef, token);
  await applyInnerSphereSettings(sceneDef, environmentTexture, token);
  await applyKidTextures(sceneDef, environmentTexture, token);
  applyUITheme(sceneDef.ui);

  activeSceneId = sceneDef.id;
  const endTime = performance.now();
  console.log(`Scene '${sceneId}' loaded in ${((endTime - startTime) / 1000).toFixed(2)} seconds.`);
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
  if (target.isMaterial) {
    target.envMap = texture;
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

function applyBackgroundFallback(color) {
  const fallback = new THREE.Color(color ?? '#050505');
  sharedContext.scene.background = fallback;
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
    const cubeTexture = await waitForAsset(cubeId);
    if (token === activeSceneToken && cubeTexture) {
      sharedContext.scene.background = cubeTexture;
      return;
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
