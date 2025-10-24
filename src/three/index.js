import * as THREE from 'three';
import { Easing } from '@tweenjs/tween.js';

import { EventBus } from '@shared/EventBus.js';

import { enableOverlay, installConsoleTap, devlog } from '@modules/devlog.js';

// Show overlay and mirror console into it
installConsoleTap({ level: 'debug' });
enableOverlay();

devlog.info('Booting…');

// Feature modules (aliased)
import { initialiseDeploymentTimeline } from '@modules/deploymentTimelineUI.js';
import { getScenes, applyScene, setSceneContext, setEnvironment } from '@three/sceneManager.js';
import { initialiseScenePicker } from '@modules/scenePickerUI.js';
import { initDeploymentViewer } from '@modules/deploymentViewer.js';
import { initialiseMusicPlayer } from '@modules/musicPlayerUI.js';

// Actions Bar: manager + concrete action initializers
import { ActionsBarManager } from '@modules/actionsBar/ActionsBarManager.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { BloomEffect, DepthOfFieldEffect, EffectComposer, EffectPass, RenderPass, FXAAEffect } from 'postprocessing';

import { loadVideoTextureAsset, loadTextureAsset, loadGLTFAsset, loadFBXAsset, waitForAsset } from '@modules/assetRegistry.js';
import { registerEnvironmentTarget, registerKidMaterialAccessor } from './sceneManager.js';

import { createScene } from '@three/core/createScene.js';
import { createCamera, animateCameraPreset, setDepthOfFieldPreset, stopCameraTween, stopDofTween, animateDepthOfField } from '@three/core/createCamera.js';
import { createRenderer } from '@three/core/createRenderer.js';
import { createControls, applyControlsState } from '@three/core/createControls.js';
import { attachLightsToScene } from '@three/lighting/createLights.js';
import { createAlphaMaterial, createInnerSphereMaterial, createKidMaterial, createGroundMaterial, loadMaterialsFromJson } from '@three/materials/createDefaultMaterials.js';
import { ParticleSystem } from '@modules/Particles.js';
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

  const camera = createCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000);
  scene.add(camera);
  register('cameras', 'main', { ref: camera, type: 'PerspectiveCamera', fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far, position: camera.position.toArray() });

  const renderer = createRenderer(canvas);
  register('renderer', 'main', { ref: renderer, config: { useLegacyLights: renderer.useLegacyLights, outputColorSpace: 'SRGBColorSpace', toneMapping: 'ACESFilmicToneMapping', toneMappingExposure: renderer.toneMappingExposure, shadowMap: { enabled: renderer.shadowMap.enabled, type: 'PCFSoftShadowMap' }, clearColor: 0x000000 } });

  const controls = createControls(camera, canvas);
  register('controls', 'orbit', { enabled: controls.enabled, enableDamping: controls.enableDamping, dampingFactor: controls.dampingFactor, autoRotate: controls.autoRotate, autoRotateSpeed: controls.autoRotateSpeed, enableZoom: controls.enableZoom, minDistance: controls.minDistance, maxDistance: controls.maxDistance, minPolarAngle: controls.minPolarAngle, maxPolarAngle: controls.maxPolarAngle, target: controls.target.toArray() });

  setupResize(camera, renderer);

  // VR Button
  const vrButtonElement = VRButton.createButton(renderer);
  vrButtonElement.textContent = 'VR';
  vrButtonElement.classList.add('glass-footer__btn', 'glass-footer__btn--vr');
  vrButtonElement.setAttribute('data-tippy-content', 'Enter VR');
  const connectGroup = document.querySelector('.glass-footer__group[data-label="Connect"]');
  if (connectGroup) {
    connectGroup.appendChild(vrButtonElement);
  } else {
    document.body.appendChild(vrButtonElement);
  }

  // Lights
  const { directional, rotatingPoints, update: updateRotatingLights } = attachLightsToScene(scene);
  directional.visible = false; // Set directional light to off by default
  register('lights', 'directional', directional);
  register('lights', 'rotatingPoints', rotatingPoints);

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
  outer_Mesh.rotation.x = -Math.PI / 4;
  outer_Mesh.position.y = 0.1;
  outer_Mesh.receiveShadow = true;
  outer_Mesh.castShadow = true;
  groupKid.add(outer_Mesh);
  register('meshes', 'outerMesh', { ref: outer_Mesh, geometry: { type: 'SphereGeometry', radius: radiusAM, segments: segmentsAM, rings: ringsAM }, position: outer_Mesh.position.toArray(), rotation: [outer_Mesh.rotation.x, outer_Mesh.rotation.y, outer_Mesh.rotation.z] });

  // Inner World
  const radius = 0.48;
  const segments = 104;
  const rings = 104;
  const geometry = new THREE.SphereGeometry(radius, segments, rings);
  const inner_World = new THREE.Mesh(geometry, innerSphereMaterial);
  inner_World.position.y = -0.70;
  scene.add(inner_World);
  register('meshes', 'innerWorld', { ref: inner_World, geometry: { type: 'SphereGeometry', radius, segments, rings }, material: { type: 'MeshLambertMaterial', transparent: true, opacity: innerSphereMaterial.opacity, emissive: innerSphereMaterial.emissive, emissiveIntensity: innerSphereMaterial.emissiveIntensity, blending: 'AdditiveBlending', envMap: 'HDR equirectangular' }, position: inner_World.position.toArray() });

  // Animation Mixers (mutable object so loop can access them after async loading)
  const mixers = {
    kid: null,
    cFlow: null,
    kid2: null
  };

  // Kid Model
  let kid;
  loadFBXAsset('fbx:kid.walking', 'models/fbx/curiousKid/animations/Walking.fbx')
    .then((object) => {
      kid = object;
      console.log('Kid FBX object loaded:', kid);
      console.log('Kid animations:', kid.animations);
      if (kid.animations && kid.animations.length > 0) {
        mixers.kid = new THREE.AnimationMixer(kid);
        const action = mixers.kid.clipAction(kid.animations[0]);
        console.log('Kid animation action:', action);
        action.play();
      } else {
        console.warn('Kid FBX asset has no animations.', kid);
      }

      kid.traverse((obj) => {
        if (obj.isMesh) {
          obj.material = kidMaterial;
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      groupKid.add(kid);
      kid.scale.set(.0014, .0014, .0014);
      kid.position.set(0, -0.005, 0);
      kid.rotation.set(0, 0, 0);
      kid.addEventListener("click", (event) => {
        event.target.material.color.set(0xff0000);
        document.body.style.cursor = "pointer";
      });
      register('mixers', 'kidMixer', { ref: mixers.kid, clips: kid.animations.length });
      register('meshes', 'kid', { ref: kid, scale: kid.scale.toArray(), position: kid.position.toArray(), rotation: kid.rotation.toArray() });
    })
    .catch((error) => {
      console.error('Failed to load kid FBX asset', error);
    });

  // Creative Flow Model
  let creativeFlow;
  loadGLTFAsset('gltf:cFlow4', 'models/glb/flow4/cFlow4.glb')
    .then((gltf) => {
      creativeFlow = gltf.scene;
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

  // Platform Model
  let platformScene;
  const platformContainer = new THREE.Group();
  scene.add(platformContainer);
  platformContainer.position.set(0, -0.52, 0.55);
  platformContainer.rotation.set(0, 0, 0);

  loadGLTFAsset('gltf:platform', 'models/glb/platform/gltf/platform.gltf')
    .then((gltf) => {
      platformScene = gltf.scene;
      platformScene.scale.setScalar(2.2);

      const box = new THREE.Box3().setFromObject(platformScene);
      const center = box.getCenter(new THREE.Vector3());
      platformScene.position.sub(center);
      platformScene.rotation.x = 0;

      platformContainer.add(platformScene);

      platformScene.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = false;
          object.receiveShadow = true;
        }
      });
      registerEnvironmentTarget(platformScene);

      const PLATFORM_TEXTURE_IDS = {
        base: 'texture:platform:001:base',
        metallic: 'texture:platform:001:metallic',
        roughness: 'texture:platform:001:roughness',
        opacity: 'texture:platform:001:opacity',
        translucence: 'texture:platform:001:translucence'
      };

      Promise.all([
        waitForAsset(PLATFORM_TEXTURE_IDS.base),
        waitForAsset(PLATFORM_TEXTURE_IDS.metallic),
        waitForAsset(PLATFORM_TEXTURE_IDS.roughness),
        waitForAsset(PLATFORM_TEXTURE_IDS.opacity),
        waitForAsset(PLATFORM_TEXTURE_IDS.translucence)
      ]).then(([baseTexture, metallicTexture, roughnessTexture, opacityTexture, translucenceTexture]) => {
        platformScene.traverse((object) => {
          if (!object.isMesh) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (!(material && material.isMeshStandardMaterial)) return;
            material.side = THREE.DoubleSide;
            if (baseTexture) {
              material.map = baseTexture;
              material.needsUpdate = true;
            }
            if (metallicTexture) {
              material.metalnessMap = metallicTexture;
              material.metalness = 1;
            }
            if (roughnessTexture) {
              material.roughnessMap = roughnessTexture;
              material.roughness = 1;
            }
            if (opacityTexture) {
              material.alphaMap = opacityTexture;
              material.transparent = true;
            }
            if (translucenceTexture && 'emissiveMap' in material) {
              material.emissiveMap = translucenceTexture;
              material.emissiveIntensity = material.emissiveIntensity ?? 1;
            }
            material.color.set('#ffffff');
            material.needsUpdate = true;
          });
        });
      }).catch((error) => {
        console.warn('Failed to apply platform textures', error);
      });
      register('meshes', 'platform', { ref: platformScene, scale: platformScene.scale.toArray(), position: platformContainer.position.toArray(), rotation: platformContainer.rotation.toArray() });
    })
    .catch((error) => {
      console.error('Failed to load platform GLTF', error);
    });

  // Water
  const waterGeometry = new THREE.CircleGeometry(0.1, 80);
  const groundGeometry = new THREE.CircleGeometry(0.1, 80);

  const waterNormalMap = loadTextureAsset('texture:water:normal:2', '/textures/water/Water_2_M_Normal.jpg', {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = Math.PI * -0.5;
  ground.side = THREE.DoubleSide;
  groupKid.add(ground);
  register('meshes', 'ground', { ref: ground, geometry: 'CircleGeometry(0.1, 80)' });
  registerEnvironmentTarget(groundMaterial);

  const water = new Water(waterGeometry, {
    color: 0xFFDEAD,
    side: THREE.DoubleSide,
    scale: 0.5,
    flowDirection: new THREE.Vector2(-1, 1),
    textureWidth: 1024,
    textureHeight: 1024,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    anisotropy: 16,
    needsUpdate: true,
    normalMap: waterNormalMap.resource // Assign the loaded normal map here
  });
  registerEnvironmentTarget(water.material);

  water.position.set(0, 0.001, 0);
  water.rotation.x = Math.PI * -0.5;

  groupKid.add(water);
  register('meshes', 'water', { ref: water, params: { color: 0xFFDEAD, side: 'DoubleSide', scale: 0.5, flowDirection: [-1, 1], textureSize: [1024, 1024] } });

  // Particles
  const particles = new ParticleSystem({
    count: 500,
    color: '#31FF9C',
    size: 0.2,
    textureName: 'star_0.png',
    velocityFactor: 1,
    emissionRate: 10,
    maxAge: 5,
    areaSize: 10,
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

  const _stopLoop = startLoop({
    renderer,
    scene,
    camera,
    controls,
    composer,
    outerMesh: outer_Mesh,
    updateRotatingLights,
    mixers,
    particles,
  });

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
    setDepthOfFieldPreset: setDepthOfFieldPreset.bind(null, depthOfFieldEffect),
    stopCameraTween,
    stopDofTween,
    start: () => { /* The loop is already started by startLoop, this can be a no-op or re-initiate if needed */ },
    stop: () => { if (_stopLoop) _stopLoop(); },
    setEnvironment,
    get depthOfFieldEffect() {
      return depthOfFieldEffect;
    },
    sceneRegistry: sceneRegistry.getAll()
  };
}
