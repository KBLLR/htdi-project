import * as THREE from 'three';

import { ParticleSystem } from '@modules/Particles.js';

import { BloomEffect, DepthOfFieldEffect, EffectComposer, EffectPass, RenderPass, FXAAEffect } from 'postprocessing';

import { loadVideoTextureAsset, setKTX2Loader, loadTextureAtlasImage, loadTextureAtlasJson, loadFBXAsset, loadGLTFAsset } from '@modules/assetRegistry.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { registerEnvironmentTarget, registerKidMaterialAccessor, updateCurrentScene, setEnvironment, setEnvironmentIntensity, getEnvironmentIntensity, saveScenePreset, getCurrentSceneState } from './sceneManager.js';

import { createScene } from '@three/core/createScene.js';
import { createCamera, animateCameraPreset, setDepthOfFieldPreset, stopCameraTween, stopDofTween, animateDepthOfField } from '@three/core/createCamera.js';
import { createRenderer } from '@three/core/createRenderer.js';
import { createControls, applyControlsState } from '@three/core/createControls.js';
import { attachLightsToScene } from '@three/lighting/createLights.js';
import { createAlphaMaterial, createInnerSphereMaterial, createKidMaterial, createGroundMaterial, loadMaterialsFromJson } from '@three/materials/createDefaultMaterials.js';
import { goboAssets, getGoboById } from '@config/assetCatalog.js';
import { createWaterAndGround } from '@three/materials/createWaterGround.js';

const FOG_DEFAULTS = {
  enabled: false,
  type: 'exp2',
  color: '#1a2430',
  density: 0.02,
  near: 2,
  far: 60
};

const SPOTLIGHT_DEFAULTS = {
  color: '#ffffff',
  intensity: 2.5,
  angle: Math.PI / 5,
  penumbra: 0.4,
  decay: 1,
  distance: 35,
  position: [2.5, 5.5, 2.5],
  target: [0, 0.6, 0],
  gobo: null
};

function cloneState(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function toVectorArray(value, fallback) {
  if (Array.isArray(value) && value.length === 3) {
    return value.map((component, index) => {
      const parsed = Number(component);
      return Number.isFinite(parsed) ? parsed : fallback[index] ?? 0;
    });
  }
  if (value && typeof value === 'object') {
    return ['x', 'y', 'z'].map((key, index) => {
      const parsed = Number(value[key]);
      return Number.isFinite(parsed) ? parsed : fallback[index] ?? 0;
    });
  }
  return [...fallback];
}

function normaliseFogState(input = {}) {
  const state = {
    ...FOG_DEFAULTS,
    ...(cloneState(input) ?? {})
  };
  state.enabled = Boolean(state.enabled);
  state.type = state.type === 'linear' ? 'linear' : 'exp2';
  state.color = state.color ?? FOG_DEFAULTS.color;
  state.density = Number.isFinite(Number(state.density)) ? Number(state.density) : FOG_DEFAULTS.density;
  state.near = Number.isFinite(Number(state.near)) ? Number(state.near) : FOG_DEFAULTS.near;
  state.far = Number.isFinite(Number(state.far)) ? Number(state.far) : FOG_DEFAULTS.far;
  return state;
}

function serialiseFogState(state) {
  return cloneState(normaliseFogState(state));
}

function normaliseSpotlightState(input = {}) {
  const state = {
    ...SPOTLIGHT_DEFAULTS,
    ...(cloneState(input) ?? {})
  };
  state.color = state.color ?? SPOTLIGHT_DEFAULTS.color;
  state.intensity = Number.isFinite(Number(state.intensity)) ? Number(state.intensity) : SPOTLIGHT_DEFAULTS.intensity;
  state.angle = Number.isFinite(Number(state.angle)) ? Number(state.angle) : SPOTLIGHT_DEFAULTS.angle;
  state.penumbra = Number.isFinite(Number(state.penumbra)) ? Number(state.penumbra) : SPOTLIGHT_DEFAULTS.penumbra;
  state.decay = Number.isFinite(Number(state.decay)) ? Number(state.decay) : SPOTLIGHT_DEFAULTS.decay;
  state.distance = Number.isFinite(Number(state.distance)) ? Number(state.distance) : SPOTLIGHT_DEFAULTS.distance;
  state.position = toVectorArray(state.position, SPOTLIGHT_DEFAULTS.position);
  state.target = toVectorArray(state.target, SPOTLIGHT_DEFAULTS.target);
  const goboId = typeof state.gobo === 'string' ? state.gobo : state.gobo?.id ?? null;
  state.gobo = goboId ? { id: goboId } : null;
  return state;
}

function serialiseSpotlightState(state) {
  const normalised = normaliseSpotlightState(state);
  const serialised = cloneState(normalised);
  serialised.gobo = serialised.gobo?.id ?? null;
  return serialised;
}

function formatColorIfAvailable(color) {
  if (!color) return null;
  if (typeof color === 'string') return color;
  if (typeof color === 'number') {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
  if (color.isColor || color instanceof THREE.Color) {
    const instance = color.isColor ? color : new THREE.Color(color);
    return `#${instance.getHexString().padStart(6, '0')}`;
  }
  return null;
}
import { SceneRegistry } from '@three/registry/SceneRegistry.js';
import { setupResize } from '@three/utils/resize.js';
import { startLoop } from '@three/core/loop.js';

export async function createExperience() {
  const canvas = document.querySelector('canvas.webgl');
  const sceneRegistry = new SceneRegistry();
  const register = sceneRegistry.register.bind(sceneRegistry);
  window.sceneRegistry = sceneRegistry.getAll(); // Expose for debugging

  const scene = createScene();
  register('scene', 'main', { ref: scene });

  const fogState = normaliseFogState(FOG_DEFAULTS);
  const defaultSpotlightGobo = goboAssets[0]?.id ?? null;
  const spotlightState = normaliseSpotlightState({
    ...SPOTLIGHT_DEFAULTS,
    gobo: defaultSpotlightGobo ? { id: defaultSpotlightGobo } : null
  });

  const camera = createCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000, new THREE.Vector3(0.5, 0.5, 0.5));
  scene.add(camera);
  register('cameras', 'main', { ref: camera, type: 'PerspectiveCamera', fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, position: camera.position.toArray() });

  const renderer = createRenderer(canvas);
  register('renderer', 'main', { ref: renderer, config: { useLegacyLights: renderer.useLegacyLights, outputColorSpace: 'SRGBColorSpace', toneMapping: 'ACESFilmicToneMapping', toneMappingExposure: renderer.toneMappingExposure, shadowMap: { enabled: renderer.shadowMap.enabled, type: 'PCFSoftShadowMap' }, clearColor: 0x000000 } });

  // KTX2 Loader setup
  const ktx2Loader = new KTX2Loader();
  ktx2Loader.setTranscoderPath('/basis/'); // Path to the copied basis files
  ktx2Loader.detectSupport(renderer); // Pass your WebGLRenderer instance
  setKTX2Loader(ktx2Loader);

  // Load texture atlases
  const goboAtlasTexture = loadTextureAtlasImage('texture:goboAtlas', '/textureAtlas.webp');
  const goboAtlasJson = await loadTextureAtlasJson('json:goboAtlas', '/textureAtlas.json');
  const particleAtlasTexture = loadTextureAtlasImage('texture:particleAtlas', '/particleAtlas.webp');
  const particleAtlasJson = await loadTextureAtlasJson('json:particleAtlas', '/particleAtlas.json');

  const controls = createControls(camera, canvas);
  controls.maxDistance = 12.0;
  register('controls', 'orbit', { enabled: controls.enabled, enableDamping: controls.enableDamping, dampingFactor: controls.dampingFactor, autoRotate: controls.autoRotate, autoRotateSpeed: controls.autoRotateSpeed, enableZoom: controls.enableZoom, minDistance: controls.minDistance, maxDistance: controls.maxDistance, minPolarAngle: controls.minPolarAngle, maxPolarAngle: controls.maxPolarAngle, target: controls.target.toArray() });

  setupResize(camera, renderer);

  // Lights
  const { directional, rotatingPoints, update: updateRotatingLights } = attachLightsToScene(scene);
  directional.visible = false; // Set directional light to off by default
  register('lights', 'directional', { ref: directional });
  register('lights', 'rotatingPoints', { ref: rotatingPoints });

  const spotlight = new THREE.SpotLight(
    spotlightState.color,
    spotlightState.intensity,
    spotlightState.distance,
    spotlightState.angle,
    spotlightState.penumbra,
    spotlightState.decay
  );
  spotlight.castShadow = true;
  spotlight.shadow.mapSize.set(1024, 1024);
  spotlight.shadow.bias = -0.001;
  spotlight.position.fromArray(spotlightState.position);
  const spotlightTarget = new THREE.Object3D();
  spotlightTarget.position.fromArray(spotlightState.target);
  scene.add(spotlightTarget);
  spotlight.target = spotlightTarget;
  scene.add(spotlight);

  // Materials from JSON
  const loadedMaterials = await loadMaterialsFromJson('/materials.json');
  Object.entries(loadedMaterials).forEach(([name, material]) => {
    register('materials', name, { ref: material });
  });

  // Video Texture Eye (must be loaded before innerSphereMaterial)
  const videoEyeAsset = loadVideoTextureAsset('video:eye', {
    src: '/vid/eye.webm',
    autoplay: true,
    muted: true,
    loop: true,
    playsInline: true,
    appendTo: document.body
  });
  const videoEye = videoEyeAsset.element;
  const webmEye = videoEyeAsset.texture;

  // Hide the video element (it should only be used as a texture)
  videoEye.style.cssText = 'position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';

  webmEye.minFilter = THREE.LinearFilter;
  webmEye.magFilter = THREE.LinearFilter;
  webmEye.format = THREE.RGBAFormat;
  webmEye.colorSpace = THREE.SRGBColorSpace;
  webmEye.offset.y = 0.03;
  webmEye.repeat.set(0.94, 0.94);
  register('videos', 'eye', { assetId: 'video:eye', element: videoEye, src: videoEye.src, texture: webmEye });

  // Default materials (if not overridden by JSON)
  const alphaMat = createAlphaMaterial();
  register('materials', 'alphaMat', { ref: alphaMat });

  const innerSphereMaterial = createInnerSphereMaterial({ map: webmEye });
  register('materials', 'innerSphereMaterial', { ref: innerSphereMaterial });

  let kidMaterial = createKidMaterial();
  registerKidMaterialAccessor(() => kidMaterial);
  register('materials', 'kidMaterial', { ref: kidMaterial });

  const groundMaterial = createGroundMaterial();
  registerEnvironmentTarget(groundMaterial);
  register('materials', 'groundMaterial', { ref: groundMaterial });

  // Objects
  const groupKid = new THREE.Group();
  scene.add(groupKid);
  groupKid.position.set(0, 0, 0);
  groupKid.scale.set(0.3, 0.3, 0.3);
  register('groups', 'groupKid', { ref: groupKid, position: groupKid.position.toArray(), scale: groupKid.scale.toArray() });

  // Outer Mesh
  let radiusAM = 0.15;
  let segmentsAM = 104;
  let ringsAM = 104;
  const alphaGeo = new THREE.SphereGeometry(radiusAM, segmentsAM, ringsAM);
  const outer_Mesh = new THREE.Mesh(alphaGeo, alphaMat);
  outer_Mesh.visible = false;
  outer_Mesh.scale.set(100, 100, 100);
  outer_Mesh.rotation.x = -Math.PI / 4;
  outer_Mesh.position.y = 0.1;
  outer_Mesh.receiveShadow = true;
  outer_Mesh.castShadow = true;
  groupKid.add(outer_Mesh);
  register('meshes', 'outerMesh', { ref: outer_Mesh, geometry: { type: 'SphereGeometry', radius: radiusAM, segments: segmentsAM, rings: ringsAM }, position: outer_Mesh.position.toArray(), rotation: [outer_Mesh.rotation.x, outer_Mesh.rotation.y, outer_Mesh.rotation.z] });

  // Animation Mixers (mutable object so loop can access them after async loading)
  const mixers = {
    kid: null,
    piya: null,
    alien: null,
    cFlow: null,
    kid2: null
  };

  const characterGroup = groupKid;
  const characterEntries = new Map();
  let currentCharacterId = null;

  const CHARACTER_DEFS = {
    kid: { label: 'Curious Kid', loader: loadKidCharacter },
    piya: { label: 'Piya', loader: loadPiyaCharacter },
    alien: { label: 'Alien', loader: loadAlienCharacter }
  };

  const availableCharacters = Object.entries(CHARACTER_DEFS).map(([id, def]) => ({
    id,
    label: def.label
  }));

  const frameMonitors = [];

  function normalizeCharacterModel(object, options = {}) {
    const targetHeight = options.targetHeight ?? 0.35;
    const baseY = options.baseY ?? -0.005;
    const workingBox = new THREE.Box3().setFromObject(object);
    const size = workingBox.getSize(new THREE.Vector3());
    if (!size.y) {
      return;
    }
    const scale = targetHeight / size.y;
    object.scale.multiplyScalar(scale);
    object.updateMatrixWorld(true);
    workingBox.setFromObject(object);
    const center = workingBox.getCenter(new THREE.Vector3());
    object.position.sub(center);
    object.updateMatrixWorld(true);
    workingBox.setFromObject(object);
    const min = workingBox.min;
    object.position.y -= min.y;
    object.position.y += baseY;
    object.updateMatrixWorld(true);
  }

  async function loadKidCharacter() {
    const kidObject = await loadFBXAsset('fbx:kid.walking', 'models/fbx/curiousKid/animations/Walking.fbx');
    kidObject.visible = false;

    let kidAnimation = null;
    mixers.kid = new THREE.AnimationMixer(kidObject);
    if (kidObject.animations && kidObject.animations.length > 0) {
      kidAnimation = mixers.kid.clipAction(kidObject.animations[0]);
      kidAnimation.play();
      kidAnimation.paused = true;
    } else {
      console.warn('Kid FBX asset has no animations.', kidObject);
    }

    kidObject.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = kidMaterial;
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    kidObject.scale.set(0.20, 0.20, 0.20);
    kidObject.position.set(0, 0.007, 0);
    kidObject.rotation.set(0, 0, 0);
    kidObject.addEventListener('click', (event) => {
      event.target.material.color.set(0xff0000);
      document.body.style.cursor = 'pointer';
    });

    register('mixers', 'kidMixer', { ref: mixers.kid, clips: kidObject.animations?.length ?? 0 });
    register('meshes', 'kid', {
      ref: kidObject,
      scale: kidObject.scale.toArray(),
      position: kidObject.position.toArray(),
      rotation: kidObject.rotation.toArray()
    });
    register('characters', 'kid', { ref: kidObject, label: CHARACTER_DEFS.kid.label });

    return {
      id: 'kid',
      label: CHARACTER_DEFS.kid.label,
      object: kidObject,
      mixer: mixers.kid,
      onActivate: () => {
        if (kidAnimation) {
          kidAnimation.reset();
          kidAnimation.paused = false;
          kidAnimation.play();
        }
      },
      onDeactivate: () => {
        if (kidAnimation) {
          kidAnimation.paused = true;
        }
      }
    };
  }

  async function loadPiyaCharacter() {
    const piyaObject = await loadFBXAsset('fbx:piya.base', 'models/fbx/piya/PIYA.fbx');
    piyaObject.visible = false;
    piyaObject.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.material.needsUpdate = true;
      }
    });
    normalizeCharacterModel(piyaObject, { targetHeight: 0.36, baseY: -0.005 });
    piyaObject.rotation.set(0, 0, 0);
    registerEnvironmentTarget(piyaObject);
    register('meshes', 'piya', {
      ref: piyaObject,
      scale: piyaObject.scale.toArray(),
      position: piyaObject.position.toArray(),
      rotation: piyaObject.rotation.toArray()
    });
    register('characters', 'piya', { ref: piyaObject, label: CHARACTER_DEFS.piya.label });
    return {
      id: 'piya',
      label: CHARACTER_DEFS.piya.label,
      object: piyaObject
    };
  }

  async function loadAlienCharacter() {
    const alienObject = await loadFBXAsset('fbx:alien.base', 'models/fbx/alien.fbx');
    alienObject.visible = false;
    alienObject.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    normalizeCharacterModel(alienObject, { targetHeight: 0.38, baseY: -0.005 });
    alienObject.rotation.set(0, 0, 0);
    registerEnvironmentTarget(alienObject);
    register('meshes', 'alien', {
      ref: alienObject,
      scale: alienObject.scale.toArray(),
      position: alienObject.position.toArray(),
      rotation: alienObject.rotation.toArray()
    });
    register('characters', 'alien', { ref: alienObject, label: CHARACTER_DEFS.alien.label });
    return {
      id: 'alien',
      label: CHARACTER_DEFS.alien.label,
      object: alienObject
    };
  }

  async function ensureCharacterLoaded(id) {
    if (characterEntries.has(id)) {
      return characterEntries.get(id);
    }
    const definition = CHARACTER_DEFS[id];
    if (!definition) {
      throw new Error(`Unknown character "${id}"`);
    }
    const entry = await definition.loader();
    entry.object.visible = false;
    characterGroup.add(entry.object);
    characterEntries.set(id, entry);
    return entry;
  }

  async function setCharacter(id) {
    if (!CHARACTER_DEFS[id]) {
      console.warn(`Character "${id}" is not defined.`);
      return null;
    }
    const nextEntry = await ensureCharacterLoaded(id);
    if (currentCharacterId && currentCharacterId !== id) {
      const previousEntry = characterEntries.get(currentCharacterId);
      if (previousEntry) {
        previousEntry.onDeactivate?.();
        previousEntry.object.visible = false;
      }
    }
    nextEntry.object.visible = true;
    nextEntry.onActivate?.();
    currentCharacterId = id;
    register('characters', 'active', { id, ref: nextEntry.object });
    updateCurrentScene({ character: { id } });
    return nextEntry;
  }

  // Kick off initial character load (non-blocking to preserve start-up parity)
  setCharacter('kid').catch((error) => {
    console.error('Failed to load default character "kid"', error);
  });

  // Creative Flow Model
  let creativeFlow;
  loadGLTFAsset('gltf:cFlow4', 'models/glb/flow4/cFlow4.glb')
    .then((gltf) => {
      creativeFlow = gltf.scene;
      creativeFlow.visible = false;
      creativeFlow.scale.set(0.002, 0.002, 0.002);
      creativeFlow.position.set(0, 0.24, 0.);
      creativeFlow.rotation.set(0, 0, 0);
      scene.add(creativeFlow);

      creativeFlow.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      registerEnvironmentTarget(creativeFlow);

      mixers.cFlow = new THREE.AnimationMixer(gltf.scene);
      const cFlowAction = mixers.cFlow.clipAction(gltf.animations[0]);
      cFlowAction.play();
      register('mixers', 'cFlowMixer', { ref: mixers.cFlow, clips: gltf.animations.length });
      register('meshes', 'creativeFlow', { ref: creativeFlow, scale: creativeFlow.scale.toArray(), position: creativeFlow.position.toArray(), rotation: creativeFlow.rotation.toArray() });
    })
    .catch((error) => {
      console.error('Failed to load creative flow GLTF', error);
    });

  // Water + Ground
  const waterRadius = 16;
  const waterSegments = 128;
  const waterGeometry = new THREE.CircleGeometry(waterRadius, waterSegments);
  const groundGeometry = new THREE.CircleGeometry(waterRadius, waterSegments);
  const waterOptions = {
    waterColor: 0x2580c0,
    sunDirection: new THREE.Vector3(0.48, 0.78, 0.36),
    sunColor: 0xe9f6ff,
    distortionScale: 1.9,
    scale: 3.2,
    alpha: 0.82,
    timeSpeed: 0.14,
    normalTextureSize: 256,
    normalAmplitude: 0.5,
    anisotropy: renderer.capabilities?.getMaxAnisotropy?.() ?? 4,
    reflectionIntensity: 0.4,
  };

  const {
    water,
    ground,
    groundMaterial: sharedGroundMaterial,
    frameMonitor: waterFrameMonitor,
  } = createWaterAndGround({
    waterGeometry,
    waterRadius,
    waterSegments,
    groundGeometry,
    groundRadius: waterRadius,
    groundSegments: waterSegments,
    groundMaterial,
    waterOptions,
    sceneFog: Boolean(scene.fog),
  });

  if (waterFrameMonitor) {
    frameMonitors.push(waterFrameMonitor);
  }

  ground.position.set(0, 0, 0);
  water.position.set(0, 0.01, 0);

  groupKid.add(ground);
  groupKid.add(water);

  register('meshes', 'ground', {
    ref: ground,
    geometry: { type: 'CircleGeometry', radius: waterRadius, segments: waterSegments },
    material: { type: sharedGroundMaterial.type ?? 'MeshStandardMaterial' }
  });
  register('materials', 'groundMaterial', { ref: sharedGroundMaterial });
  registerEnvironmentTarget(sharedGroundMaterial);

  const waterUniforms = water.material?.uniforms ?? {};
  register('meshes', 'water', {
    ref: water,
    params: {
      waterColor:
        formatColorIfAvailable(waterUniforms.waterColor?.value) ??
        formatColorIfAvailable(waterOptions.waterColor),
      sunColor: formatColorIfAvailable(waterUniforms.sunColor?.value) ?? formatColorIfAvailable(waterOptions.sunColor),
      sunDirection: waterUniforms.sunDirection?.value?.toArray?.() ?? waterOptions.sunDirection.toArray(),
      distortionScale: waterUniforms.distortionScale?.value ?? waterOptions.distortionScale,
      size: waterUniforms.size?.value ?? waterOptions.scale,
      alpha: waterUniforms.alpha?.value ?? waterOptions.alpha,
      timeSpeed: waterOptions.timeSpeed,
      reflectionIntensity: waterOptions.reflectionIntensity ?? 0,
    }
  });
  register('materials', 'waterMaterial', { ref: water.material });
  registerEnvironmentTarget(water.material);

  function resolveGoboTexture(goboId) {
    if (!goboId) return null;

    const goboAtlas = goboAtlasTexture;
    const goboAtlasData = goboAtlasJson;

    if (!goboAtlas || !goboAtlasData || !goboAtlasData.frames) {
      console.warn('Gobo atlas or data not loaded.');
      return null;
    }

    const entry = getGoboById(goboId) ?? goboAssets.find((asset) => asset.id === goboId);
    if (!entry) {
      return null;
    }

    const frameKey = entry.source ?? entry.file ?? entry.path ?? entry.id;
    const frame = goboAtlasData.frames[frameKey];

    if (!frame) {
      console.warn(`Gobo frame not found in atlas: ${frameKey}`);
      return null;
    }

    const texture = goboAtlas.clone();
    texture.needsUpdate = true;

    // Apply UV transformation
    const { u0, v0, u1, v1 } = frame.uv;
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
    spotlightTarget.updateMatrixWorld();

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
    updateCurrentScene({ lighting: { spotlight: serialiseSpotlightState(spotlightState) } });
  }

  function setSpotlightState(newState) {
    const merged = newState
      ? { ...SPOTLIGHT_DEFAULTS, ...cloneState(newState) }
      : { ...SPOTLIGHT_DEFAULTS };
    Object.assign(spotlightState, normaliseSpotlightState(merged));
    applySpotlightState();
    return serialiseSpotlightState(spotlightState);
  }

  function getSpotlightState() {
    return serialiseSpotlightState(spotlightState);
  }

  function applyFogState() {
    if (!fogState.enabled) {
      scene.fog = null;
    } else if (fogState.type === 'linear') {
      scene.fog = new THREE.Fog(fogState.color, fogState.near, fogState.far);
    } else {
      scene.fog = new THREE.FogExp2(fogState.color, fogState.density);
    }
    if (scene.fog) {
      scene.fog.color.set(fogState.color);
    }
    if (water?.material?.uniforms?.fog) {
      water.material.uniforms.fog.value = fogState.enabled ? 1 : 0;
    }

    register('environment', 'fog', {
      ref: scene.fog,
      state: serialiseFogState(fogState)
    });
    updateCurrentScene({ fog: serialiseFogState(fogState) });
  }

  function setFog(newState) {
    const merged = newState
      ? { ...FOG_DEFAULTS, ...cloneState(newState) }
      : { ...FOG_DEFAULTS };
    Object.assign(fogState, normaliseFogState(merged));
    applyFogState();
    return serialiseFogState(fogState);
  }

  function getFogState() {
    return serialiseFogState(fogState);
  }

  setFog(serialiseFogState(fogState));
  setSpotlightState(serialiseSpotlightState(spotlightState));

  // Particles
  const particles = new ParticleSystem({
    particleAtlasTexture,
    particleAtlasJson,
  });
  particles.visible = false; // Set particles to off by default
  scene.add(particles);
  register('particles', 'main', { ref: particles });

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomEffect = new BloomEffect({
    intensity: 0.1, // Lower default intensity
  });
  bloomEffect.enabled = false; // Set bloom effect to off by default
  const depthOfFieldEffect = new DepthOfFieldEffect(camera, {
    focusDistance: 0.2,
    focalLength: 0.018,
    bokehScale: 1.0 // Lower default bokehScale
  });
  depthOfFieldEffect.enabled = false; // Set depth of field effect to off by default

  const fxaaEffect = new FXAAEffect();
  fxaaEffect.enabled = false; // Set FXAA to off by default

  composer.addPass(new EffectPass(camera, bloomEffect, depthOfFieldEffect, fxaaEffect));
  register('postprocessing', 'bloomEffect', { ref: bloomEffect });
  register('postprocessing', 'depthOfFieldEffect', { ref: depthOfFieldEffect });
  register('postprocessing', 'fxaaEffect', { ref: fxaaEffect });
  register('postprocessing', 'composer', { ref: composer });

  const loopControls = startLoop({
    renderer,
    scene,
    camera,
    controls,
    composer,
    outerMesh: outer_Mesh,
    updateRotatingLights,
    mixers,
    particles,
    frameMonitors,
  });

  function activateCameraPreset(presetName, options = {}) {
    const cameraOptions = options.camera ?? options;
    const dofOptions = options.dof ?? options;
    applyControlsState(controls, presetName);
    animateCameraPreset(camera, controls, presetName, cameraOptions);
    animateDepthOfField(depthOfFieldEffect, presetName, dofOptions);
  }

  return {
    canvas,
    scene,
    renderer,
    camera,
    controls,
    composer,
    alphaMaterial: alphaMat,
    innerSphereMaterial: innerSphereMaterial,
    register: sceneRegistry.register.bind(sceneRegistry),
    applyControlsState: applyControlsState.bind(null, controls),
    animateCameraPreset: animateCameraPreset.bind(null, camera, controls),
    animateDepthOfField: animateDepthOfField.bind(null, depthOfFieldEffect),
    activateCameraPreset,
    setDepthOfFieldPreset: setDepthOfFieldPreset.bind(null, depthOfFieldEffect),
    stopCameraTween,
    stopDofTween,
    start: () => { /* The loop is already started by startLoop, this can be a no-op or re-initiate if needed */ },
    stop: () => { loopControls?.stop?.(); },
    addFrameMonitor: loopControls?.addFrameMonitor ?? (() => () => {}),
    removeFrameMonitor: loopControls?.removeFrameMonitor ?? (() => false),
    setEnvironment,
    setEnvironmentIntensity,
    getEnvironmentIntensity,
    setFog,
    getFogState,
    setSpotlightState,
    getSpotlightState,
    setCharacter,
    availableCharacters,
    currentCharacter: () => currentCharacterId,
    saveScenePreset,
    updateSceneState: updateCurrentScene,
    getCurrentSceneState,
    get depthOfFieldEffect() {
      return depthOfFieldEffect;
    },
    videoEyeAsset,
    sceneRegistry: sceneRegistry.getAll(),
    sceneRegistryApi: sceneRegistry
  };
}
