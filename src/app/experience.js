import * as THREE from 'three';
import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  PointLight,
  DirectionalLight,
  MeshStandardMaterial,
  SphereGeometry,
  LinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  MeshLambertMaterial,
  Group,
  Box3,
  Vector3,
  CircleGeometry,
  RepeatWrapping,
  Vector2,
  Clock,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
  DoubleSide,
  AdditiveBlending
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water2.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { BloomEffect, DepthOfFieldEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { Tween, Easing, update as tweenUpdate } from '@tweenjs/tween.js';

import {
  loadVideoTextureAsset,
  loadTextureAsset,
  loadGLTFAsset,
  loadFBXAsset,
  waitForAsset
} from '@modules/assetRegistry.js';
import { registerEnvironmentTarget, registerKidMaterialAccessor } from '@three/sceneManager.js';

export function createExperience() {
  const canvas = document.querySelector('canvas.webgl')

  const scene = new Scene()

  // Scene registry for debugging/inspection
  const sceneRegistry = {
    renderer: {},
    cameras: {},
    controls: {},
    lights: {},
    groups: {},
    meshes: {},
    materials: {},
    textures: {},
    loaders: {},
    mixers: {},
    videos: {}
  }
  const register = (category, name, data) => {
    if (!sceneRegistry[category]) sceneRegistry[category] = {}
    sceneRegistry[category][name] = data
  }
  window.sceneRegistry = sceneRegistry
  const renderParams = {
    canvas: canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  }

  const renderer = new WebGLRenderer(renderParams);


  ////////////////////////////////////////////////////////////////////
  // PERSPECTIVE CAMERA
  ///////////////////////////////////////////////////////////////////////////

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000);
  camera.position.set(3, -3, 3);

  scene.add(camera)
  register('cameras', 'main', {
    ref: camera,
    type: 'PerspectiveCamera',
    fov: 50,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 1000,
    position: camera.position.toArray()
  })

  ////////////////////////////////////////////////////////////////////
  // FUNCTION: RESET CAMERA - Enter / Leave Room
  ///////////////////////////////////////////////////////////////////////////////

  // const loaderIdea = () => {
  // document.addEventListener("click", function() {
  //   camera.position.set(0, 0, 0);
  //   controls.target.set(0, 0, 0);
  //   controls.update();
  // });

  ////////////////////////////////////////////////////////////////////
  // ORBIT CONTROLS
  ///////////////////////////////////////////////////////////////////////////

  const controls = new OrbitControls(camera, canvas1)
  controls.enabled = true
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = true
  controls.enableZoom = true
  controls.autoRotateSpeed = 0.5
  controls.minDistance = 0.1
  controls.maxDistance = 3
  controls.minPolarAngle = -4
  controls.maxPolarAngle = Math.PI / 2.1
  controls.target.set(0, 0.05, 0)
  register('controls', 'orbit', {
    enabled: controls.enabled,
    enableDamping: controls.enableDamping,
    dampingFactor: controls.dampingFactor,
    autoRotate: controls.autoRotate,
    autoRotateSpeed: controls.autoRotateSpeed,
    enableZoom: controls.enableZoom,
    minDistance: controls.minDistance,
    maxDistance: controls.maxDistance,
    minPolarAngle: controls.minPolarAngle,
    maxPolarAngle: controls.maxPolarAngle,
    target: controls.target.toArray()
  })

  const BASE_CAMERA_FOV = camera.fov;
  const CAMERA_PRESETS = {
    overview: {
      position: { x: 3, y: -3, z: 3 },
      target: { x: 0, y: 0.05, z: 0 },
      fov: BASE_CAMERA_FOV
    },
    focus: {
      position: { x: 0.022, y: 0.072, z: 0.034 },
      target: { x: 0, y: 0.11, z: 0.008 },
      fov: 110
    }
  };

  const DEFAULT_CONTROLS_STATE = {
    autoRotate: controls.autoRotate,
    enableZoom: controls.enableZoom,
    enablePan: 'enablePan' in controls ? controls.enablePan : undefined,
    minDistance: controls.minDistance,
    maxDistance: controls.maxDistance,
    dampingFactor: controls.dampingFactor
  };

  const FOCUS_CONTROLS_STATE = {
    autoRotate: false,
    enableZoom: false,
    enablePan: false,
    minDistance: 0.05,
    maxDistance: 1.1,
    dampingFactor: 0.08
  };

  const CONTROL_PRESETS = {
    overview: DEFAULT_CONTROLS_STATE,
    focus: FOCUS_CONTROLS_STATE
  };

  let cameraTween = null;
  let dofTween = null;

  const DOF_PRESETS = {
    overview: {
      focusDistance: 0.22,
      focalLength: 0.016,
      bokehScale: 2.2
    },
    focus: {
      focusDistance: 0.016,
      focalLength: 0.06,
      bokehScale: 8.0
    }
  };

  function stopCameraTween() {
    if (cameraTween) {
      cameraTween.stop();
      cameraTween = null;
    }
  }

  function applyControlsState(presetName) {
    const preset = CONTROL_PRESETS[presetName];
    if (!preset) return;
    if (typeof preset.autoRotate === 'boolean') controls.autoRotate = preset.autoRotate;
    if (typeof preset.enableZoom === 'boolean') controls.enableZoom = preset.enableZoom;
    if (typeof preset.enablePan === 'boolean' && 'enablePan' in controls) controls.enablePan = preset.enablePan;
    if (typeof preset.minDistance === 'number') controls.minDistance = preset.minDistance;
    if (typeof preset.maxDistance === 'number') controls.maxDistance = preset.maxDistance;
    if (typeof preset.dampingFactor === 'number') controls.dampingFactor = preset.dampingFactor;
    controls.update();
  }

  function animateCameraPreset(presetName, options = {}) {
    const preset = CAMERA_PRESETS[presetName];
    if (!preset) return;

    stopCameraTween();

    const state = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      tx: controls.target.x,
      ty: controls.target.y,
      tz: controls.target.z,
      fov: camera.fov
    };

    const targetState = {
      x: preset.position.x,
      y: preset.position.y,
      z: preset.position.z,
      tx: preset.target.x,
      ty: preset.target.y,
      tz: preset.target.z,
      fov: preset.fov
    };

    cameraTween = new Tween(state)
      .to(targetState, options.duration ?? 1600)
      .easing(options.easing ?? Easing.Cubic.InOut)
      .onStart(() => {
        options.onStart?.();
      })
      .onUpdate((value) => {
        camera.position.set(value.x, value.y, value.z);
        controls.target.set(value.tx, value.ty, value.tz);
        controls.update();
        camera.fov = value.fov;
        camera.updateProjectionMatrix();
      })
      .onComplete(() => {
        cameraTween = null;
        options.onComplete?.();
      })
      .start();
  }

  function stopDofTween() {
    if (dofTween) {
      dofTween.stop();
      dofTween = null;
    }
  }

  function setDepthOfFieldPreset(presetName) {
    const preset = DOF_PRESETS[presetName];
    if (!preset) return;
    stopDofTween();
    depthOfFieldEffect.focusDistance = preset.focusDistance;
    depthOfFieldEffect.focalLength = preset.focalLength;
    depthOfFieldEffect.bokehScale = preset.bokehScale;
  }

  function animateDepthOfField(presetName, options = {}) {
    const preset = DOF_PRESETS[presetName];
    if (!preset) return;

    stopDofTween();

    const state = {
      focusDistance: depthOfFieldEffect.focusDistance,
      focalLength: depthOfFieldEffect.focalLength,
      bokehScale: depthOfFieldEffect.bokehScale
    };

    dofTween = new Tween(state)
      .to(preset, options.duration ?? 1400)
      .easing(options.easing ?? Easing.Cubic.InOut)
      .onUpdate((value) => {
        depthOfFieldEffect.focusDistance = value.focusDistance;
        depthOfFieldEffect.focalLength = value.focalLength;
        depthOfFieldEffect.bokehScale = value.bokehScale;
      })
      .onComplete(() => {
        dofTween = null;
      })
      .start();
  }

  ////////////////////////////////////////////////////////////////////
  // INTERACTIVITY
  ///////////////////////////////////////////////////////////////////////////

  // const interactionManager = new InteractionManager(
  //   renderer,
  //   camera,
  //   renderer.domElement
  // );

  ////////////////////////////////////////////////////////////////////
  // ✧ VR
  ///////////////

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

  //scene.fog = new THREE.FogExp2( 0x000, 0.5 )

  ////////////////////////////////////////////////////////////////////
  // Resize Window
  ///////////////////////////////////////////////////////////////////////////

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })

  ////////////////////////////////////////////////////////////////////
  // GLSL SHADER CONTEXT CANVAS
  ////////////////////////////////////////////////////////////////////

  // var canvas = document.getElementById("noiseContainer");

  // canvas.width = window.innerWidth;
  // canvas.height = window.innerHeight;

  // // Initialize the GL context
  // var gl = canvas.getContext('webgl');
  // if(!gl){
  //   console.error("Unable to initialize WebGL.");
  // }

  // //Time
  // var time = 8.8;

  // //************** Shader sources **************

  // var vertexSource = `
  // attribute vec2 position;
  // void main() {
  //   gl_Position = vec4(position, 0.0, 1.0);
  // }
  // `;

  // var fragmentSource = `
  // precision highp float;

  // uniform float width;
  // uniform float height;
  // vec2 resolution = vec2(width, height);

  // uniform float time;

  // // See https://www.shadertoy.com/view/3s3GDn for comments on the glow
  // float getWaveGlow(vec2 pos, float radius, float intensity, float speed, float amplitude, float frequency, float shift){

  //   float dist = abs(pos.y + amplitude * sin(shift + speed * time + pos.x * frequency));
  //   dist = 0.02/dist;
  //   dist *= radius;
  //   dist = pow(dist, intensity);
  //   return dist;
  // }

  // void main(){

  //   vec2 uv = gl_FragCoord.xy/resolution.xy;
  //   float widthHeightRatio = resolution.x/resolution.y;
  //   vec2 centre = vec2(0.5, 0.5);
  //   vec2 pos = centre - uv;
  //   pos.y /= widthHeightRatio;

  //   float intensity = 0.5;
  //   float radius = 0.1;

  //   vec3 col = vec3(0.1);
  //   float dist = 0.0;

  //   //Use time varying colours from the basic template
  //   //Add it to vec3(0.1) to always have a bright core
  //   dist = getWaveGlow(pos, radius,intensity, 9.0, 0.018, 3.7, 0.0);
  //   col += dist * (vec3(0.1) + 0.1 + 0.5*cos(3.14+time+vec3(0,2,4)));

  //   dist = getWaveGlow(pos, radius, intensity, 4.0, 0.018, 6.0, 2.0);
  //   col += dist * (vec3(0.1) + 0.5 + 0.5*cos(1.57+time+vec3(0,2,4)));

  //   dist = getWaveGlow(pos, radius*0.5, intensity, -5.0, 0.018, 4.0, 1.0);
  //   col += dist * (vec3(0.1) + 0.5 + 0.5*cos(time+vec3(0,2,4)));

  //   //Tone mapping function to stop the sharp cutoff of values above 1, leading to smooth uniform fade
  //   col = 1.0 - exp(-col);

  //   //Gamma
  //   col = pow(col, vec3(1));

  //   // Output to screen
  //   gl_FragColor = vec4(col, 1.0);
  // }
  // `;

  // //************** Utility functions **************


  // window.addEventListener( 'resize', onWindowResize, false );

  // function onWindowResize(){
  //   canvas.width  = window.innerWidth;
  //   canvas.height = window.innerHeight;
  //   gl.viewport(0, 0, canvas.width, canvas.height);
  //   gl.uniform1f(widthHandle, window.innerWidth);
  //   gl.uniform1f(heightHandle, window.innerHeight);
  // }


  // //Compile shader and combine with source
  // function compileShader(shaderSource, shaderType){
  //   var shader = gl.createShader(shaderType);
  //   gl.shaderSource(shader, shaderSource);
  //   gl.compileShader(shader);
  //   if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
  //     throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
  //   }
  //   return shader;
  // }

  // //From https://codepen.io/jlfwong/pen/GqmroZ
  // //Utility to complain loudly if we fail to find the attribute/uniform
  // function getAttribLocation(program, name) {
  //   var attributeLocation = gl.getAttribLocation(program, name);
  //   if (attributeLocation === -1) {
  //     throw 'Cannot find attribute ' + name + '.';
  //   }
  //   return attributeLocation;
  // }

  // function getUniformLocation(program, name) {
  //   var attributeLocation = gl.getUniformLocation(program, name);
  //   if (attributeLocation === -1) {
  //     throw 'Cannot find uniform ' + name + '.';
  //   }
  //   return attributeLocation;
  // }

  // //************** Create shaders **************

  // //Create vertex and fragment shaders
  // var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
  // var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

  // //Create shader programs
  // var program = gl.createProgram();
  // gl.attachShader(program, vertexShader);
  // gl.attachShader(program, fragmentShader);
  // gl.linkProgram(program);

  // gl.useProgram(program);

  // //Set up rectangle covering entire canvas
  // var vertexData = new Float32Array([
  //   -1.0,  1.0,   // top left
  //   -1.0, -1.0,   // bottom left
  //    1.0,  1.0,   // top right
  //    1.0, -1.0,   // bottom right
  // ]);

  // //Create vertex buffer
  // var vertexDataBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  // // Layout of our data in the vertex buffer
  // var positionHandle = getAttribLocation(program, 'position');

  // gl.enableVertexAttribArray(positionHandle);
  // gl.vertexAttribPointer(positionHandle,
  //   2,        // position is a vec2 (2 values per component)
  //   gl.FLOAT, // each component is a float
  //   false,    // don't normalize values
  //   2 * 4,    // two 4 byte float components per vertex (32 bit float is 4 bytes)
  //   0         // how many bytes inside the buffer to start from
  //   );

  // //Set uniform handle
  // var timeHandle = getUniformLocation(program, 'time');
  // var widthHandle = getUniformLocation(program, 'width');
  // var heightHandle = getUniformLocation(program, 'height');

  // gl.uniform1f(widthHandle, window.innerWidth);
  // gl.uniform1f(heightHandle, window.innerHeight);

  // var lastFrame = Date.now();
  // var thisFrame;

  // function draw(){

  //   //Update time
  //   thisFrame = Date.now();
  //   time += (thisFrame - lastFrame)/3000;
  //   lastFrame = thisFrame;

  //   //Send uniforms to program
  //   gl.uniform1f(timeHandle, time);
  //   //Draw a triangle strip connecting vertices 0-4
  //   gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  //   requestAnimationFrame(draw);
  // }
  // draw();

  ////////////////////////////////////////////////////////////////////
  // LIGHTS
  //////////////////////////////////////////////////////////////////////

  const groupKid = new THREE.Group()

  ////////////////////////////////////////////////////////////////////
  // LIGHTS
  ///////////////////////////////////////////////////////////////////////////

  // ROTATING LIGHT POINTS
  const light1 = new THREE.PointLight(0x32CD32, 10.0, 1000, 0.8);
  const light2 = new THREE.PointLight(0xEE82EE, 10.0, 1000, 0.8);
  const light3 = new THREE.PointLight(0xC0C0C0, 10.0, 1000, 0.8);
  const light4 = new THREE.PointLight(0x87CEEB, 10.0, 1000, 0.8);
  scene.add(light1, light2, light3, light4);
  register('lights', 'rotatingPoints', [light1, light2, light3, light4].map(l => ({
    ref: l,
    color: l.color.getHexString(),
    intensity: l.intensity,
    distance: l.distance,
    decay: l.decay
  })))

  const directLight = new THREE.DirectionalLight(0xF5F5F5, 2.5);
  directLight.position.set(0, 0.04, 0)
  directLight.castShadow = true;
  //Set up shadow properties for the light
  directLight.shadow.mapSize.width = 1024; // default
  directLight.shadow.mapSize.height = 1024; // default
  directLight.shadow.camera.near = 0.1; // default
  directLight.shadow.camera.far = 500; // default
  groupKid.add(directLight)
  register('lights', 'directional', {
    ref: directLight,
    color: directLight.color.getHexString(),
    intensity: directLight.intensity,
    position: directLight.position.toArray(),
    shadow: {
      mapSize: [directLight.shadow.mapSize.width, directLight.shadow.mapSize.height],
      near: directLight.shadow.camera.near,
      far: directLight.shadow.camera.far
    }
  })


  // const helper = new THREE.CameraHelper( directLight.shadow.camera );
  // scene.add( helper);


  ////////////////////////////////////////////////////////////////////
  // MATERIALS > ALPHA Outer_WORLD 🌎 - Outer_WORLD 🌎 - Outer_WORLD 🌎
  ///////////////////////////////////////////////////////////////////

  let alphaMat = new THREE.MeshStandardMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    roughness: 8,
    wireframe: true,
    fog: false,
  });
  register('materials', 'alphaMat', {
    ref: alphaMat,
    params: {
      transparent: true,
      side: 'DoubleSide',
      alphaTest: 0.5,
      roughness: 8,
      wireframe: true,
      alphaMap: 'alphamaps/alpha-001.png'
    }
  })

  let radiusAM = 0.15
  let segmentsAM = 104
  let ringsAM = 104

  const alphaGeo = new THREE.SphereGeometry(radiusAM, segmentsAM, ringsAM)
  const outer_Mesh = new THREE.Mesh(alphaGeo, alphaMat);
  outer_Mesh.rotation.x = -Math.PI / 4;
  outer_Mesh.position.y = 0.1
  outer_Mesh.receiveShadow = true;
  outer_Mesh.castShadow = true;

  groupKid.add(outer_Mesh)
  register('meshes', 'outerMesh', {
    ref: outer_Mesh,
    geometry: { type: 'SphereGeometry', radius: radiusAM, segments: segmentsAM, rings: ringsAM },
    position: outer_Mesh.position.toArray(),
    rotation: [outer_Mesh.rotation.x, outer_Mesh.rotation.y, outer_Mesh.rotation.z]
  })


  /////////////////////////////////////////////////////////////////////////////
  //VIDEO TEXTURE 👁 - VIDEO TEXTURE 👁  - VIDEO TEXTURE 👁
  ////////////////////////////////////////////////////////////////////////////
  const videoEyeAsset = loadVideoTextureAsset('video:eye', {
    src: '/vid/eye.webm',
    autoplay: true,
    muted: true,
    loop: true,
    playsInline: true,
    hidden: true,
    appendTo: document.body
  });

  const videoEye = videoEyeAsset.element;
  const webmEye = videoEyeAsset.texture;
  webmEye.minFilter = THREE.LinearFilter
  webmEye.magFilter = THREE.LinearFilter
  webmEye.format = THREE.RGBAFormat
  webmEye.colorSpace = THREE.SRGBColorSpace
  // Adapted for three r180: use Vector2 for offset/repeat
  webmEye.offset.y = 0.03
  webmEye.repeat.set(0.94, 0.94)
  register('videos', 'eye', {
    assetId: 'video:eye',
    element: videoEye,
    src: videoEye.src,
    texture: webmEye
  })

  const PLATFORM_TEXTURE_IDS = {
    base: 'texture:platform:001:base',
    metallic: 'texture:platform:001:metallic',
    roughness: 'texture:platform:001:roughness',
    opacity: 'texture:platform:001:opacity',
    translucence: 'texture:platform:001:translucence'
  };

  loadTextureAsset(PLATFORM_TEXTURE_IDS.base, 'models/glb/platform/plat-skins/001/platform_baseColor.png', {
    colorSpace: THREE.SRGBColorSpace
  });
  loadTextureAsset(PLATFORM_TEXTURE_IDS.metallic, 'models/glb/platform/plat-skins/001/platform_metallic.png');
  loadTextureAsset(PLATFORM_TEXTURE_IDS.roughness, 'models/glb/platform/plat-skins/001/platform_roughness.png');
  loadTextureAsset(PLATFORM_TEXTURE_IDS.opacity, 'models/glb/platform/plat-skins/001/platform_opacity.png');
  loadTextureAsset(PLATFORM_TEXTURE_IDS.translucence, 'models/glb/platform/plat-skins/001/platform_translucence.png');

  /////////////////////////////////////////////////////////////////////////////
  // Inner_WORLD 🌎 Inner_WORLD 🌎 Inner_WORLD 🌎  Inner_WORLD 🌎
  ////////////////////////////////////////////////////////////////////////////

  const params_Sphere = {
    side: THREE.DoubleSide,
    emissive: 0xffffff,
    emissiveIntensity: 3.4,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    precision: "highp",
    map: webmEye,
    fog: false,
    envMap: null
  }

  const material_Sphere = new THREE.MeshLambertMaterial(params_Sphere);

  const radius = 0.48
  const segments = 104
  const rings = 104
  const geometry = new THREE.SphereGeometry(radius, segments, rings)
  const inner_World = new THREE.Mesh(geometry, material_Sphere);
  inner_World.position.y = -0.70
  scene.add(inner_World)

  register('meshes', 'innerWorld', {
    ref: inner_World,
    geometry: { type: 'SphereGeometry', radius, segments, rings },
    material: {
      type: 'MeshLambertMaterial',
      transparent: true,
      opacity: params_Sphere.opacity,
      emissive: params_Sphere.emissive,
      emissiveIntensity: params_Sphere.emissiveIntensity,
      blending: 'AdditiveBlending',
      envMap: 'HDR equirectangular'
    },
    position: inner_World.position.toArray()
  })

  /////////////////////////////////////////////////////////////////////////////
  // Inner_KID 👦🏽 * Inner_KID 👦🏽 * Inner_KID 👦🏽 * Inner_KID 👦🏽
  ////////////////////////////////////////////////////////////////////////////

  let kidMixer;
  let kid2Mixer;
  let kidMaterial;
  let kid;

  loadFBXAsset('fbx:kid.walking', 'models/fbx/curiousKid/animations/Walking.fbx')
    .then((object) => {
      kid = object;
      kidMixer = new THREE.AnimationMixer(kid);
      const action = kidMixer.clipAction(kid.animations[0]);
      action.play();

      kidMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFDEAD, //0xFAFAD2,lightgoldenrodyellow 0xC71585, mediumVioletRed
        // emissive: 0x32CD32,
        // emissiveIntensity: 0.6,
        // transmission: 1,
        transparent: false,
        opacity: 0.98,
        metalness: 0.1,
        roughness: 1.5,
        normalScale: new THREE.Vector2(2, 2),
        ior: 1.2,
        thickness: 0.1,
        specularIntensity: 5.9,
        specularColor: 0xBC8F8F,
        envMapIntensity: 2.5,
      })
      registerKidMaterialAccessor(() => kidMaterial);
      register('materials', 'kidMaterial', {
        ref: kidMaterial,
        params: {
          color: 0xFFDEAD,
          transparent: true,
          opacity: 0.98,
          metalness: 0.1,
          roughness: 1.5,
          ior: 1.2,
          thickness: 0.1,
          specularIntensity: 5.9,
          specularColor: 0xBC8F8F,
          envMapIntensity: 2.5
        }
      })

      kid.traverse((object) => {
        if (object.isMesh) {
          object.material = kidMaterial;
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      groupKid.add(kid)

      kid.scale.set(.0014, .0014, .0014)
      kid.position.set(0, -0.005, 0)
      kid.rotation.set(0, 0, 0)
      kid.addEventListener("click", (event) => {
        event.target.material.color.set(0xff0000);
        document.body.style.cursor = "pointer";
      });
    })
    .catch((error) => {
      console.error('Failed to load kid FBX asset', error);
    });


  /////////////////////////////////////////////////////////////////////////////
  // Creative_motor 🧿 * Creative_motor 🧿 * Creative_motor 🧿 * Creative_motor
  ////////////////////////////////////////////////////////////////////////////

  let creativeFlow;
  let cFlowMixer = null

  loadGLTFAsset('gltf:cFlow4', 'models/glb/flow4/cFlow4.glb')
    .then((gltf) => {
      creativeFlow = gltf.scene
      creativeFlow.scale.set(0.002, 0.002, 0.002)
      creativeFlow.position.set(0, 0.24, 0.)
      creativeFlow.rotation.set(0, 0, 0)
      scene.add(creativeFlow)

      creativeFlow.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      registerEnvironmentTarget(creativeFlow);

      cFlowMixer = new THREE.AnimationMixer(gltf.scene)
      const cFlowAction = cFlowMixer.clipAction(gltf.animations[0])
      cFlowAction.play()
      register('mixers', 'cFlowMixer', { ref: cFlowMixer, clips: gltf.animations.length })
    })
    .catch((error) => {
      console.error('Failed to load creative flow GLTF', error);
    });

  /////////////////////////////////////////////////////////////////////////////
  // EYE-INTUITION - EYE-INTUITION   - EYE-INTUITION
  ////////////////////////////////////////////////////////////////////////////

  let platformScene;
  const platformContainer = new THREE.Group();
  scene.add(platformContainer);
  platformContainer.position.set(0, -0.52, 0.55);
  platformContainer.rotation.set(0, 0, 0);

  loadGLTFAsset('gltf:platform', 'models/glb/platform/gltf/platform.gltf')
    .then((gltf) => {
      platformScene = gltf.scene
      platformScene.scale.setScalar(2.2)

      const box = new THREE.Box3().setFromObject(platformScene);
      const center = box.getCenter(new THREE.Vector3());
      platformScene.position.sub(center);
      platformScene.rotation.x = 0;

      platformContainer.add(platformScene)

      platformScene.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = false;
          object.receiveShadow = true;
        }
      });
      registerEnvironmentTarget(platformScene);

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
    })
    .catch((error) => {
      console.error('Failed to load platform GLTF', error);
    });

  // var geoEye = new THREE.IcosahedronGeometry(0.02, 64);
  // let eyeMat = new THREE.MeshStandardMaterial({
  //     side: THREE.DoubleSide,
  //     map: textureLoader.load("models/glTF/eye/scleraColor.png"),
  //     emissiveMap: textureLoader.load("models/glTF/eye/irisbump.png"),
  //     emissiveIntensity: 2,
  //     displacementMap: textureLoader.load("models/glTF/eye/iriscolor.png"),
  //     displacementScale: 0.01,
  //     displacementBias: 0.05,
  //     normalMap: textureLoader.load("models/glTF/eye/cornea_normal.png"),
  //     normalScale: new THREE.Vector2(2, 2),
  //     bumpMap: textureLoader.load("models/glTF/eye/scleraBump.png"),
  //     bumpScale: 0.5,
  //   })


  // let eyeNtuition = new THREE.Mesh( geoEye, eyeMat)
  // eyeNtuition.position.y = 0.1
  // eyeNtuition.position.x = 0.1
  // scene.add(eyeNtuition)

  /////////////////////////////////////////////////////////////////////////////
  // Natural_element - Water  Natural_element - Water  Natural_element - Water
  ////////////////////////////////////////////////////////////////////////////


  const waterGeometry = new THREE.CircleGeometry(0.1, 80);
  const groundGeometry = new THREE.CircleGeometry(0.1, 80);

  const waterNormalMap = loadTextureAsset('texture:water:normal:2', '/textures/water/Water_2_M_Normal.jpg', {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping
  });

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x6495ED, //0xFF7F50
    roughness: 0.05,
    metalness: 0.1,
    normalMap: waterNormalMap,
    normalScale: new THREE.Vector2(3, 3),
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = Math.PI * -0.5;
  ground.side = THREE.DoubleSide
  groupKid.add(ground)
  register('meshes', 'ground', { ref: ground, geometry: 'CircleGeometry(0.1, 80)' })
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
  });
  registerEnvironmentTarget(water.material);

  water.position.set(0, 0.001, 0)
  water.rotation.x = Math.PI * -0.5

  groupKid.add(water)
  register('meshes', 'water', {
    ref: water,
    params: {
      color: 0xFFDEAD,
      side: 'DoubleSide',
      scale: 0.5,
      flowDirection: [-1, 1],
      textureSize: [1024, 1024]
    }
  })

  ////////////////////////////////////////////////////////////////////
  // GROUP#1: groupKid (directLight + kid + water + alphaBall)
  ///////////////////////////////////////////////////////////////////////////

  scene.add(groupKid)
  groupKid.position.set(0, 0, 0)
  groupKid.scale.set(0.3, 0.3, 0.3)
  register('groups', 'groupKid', {
    ref: groupKid,
    position: groupKid.position.toArray(),
    scale: groupKid.scale.toArray()
  })
  ////////////////////////////////////////////////////////////////////
  // Renderer
  ///////////////

  renderer.useLegacyLights = false
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x000000, 0)
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  register('renderer', 'main', {
    ref: renderer,
    config: {
      useLegacyLights: renderer.useLegacyLights,
      outputColorSpace: 'SRGBColorSpace',
      toneMapping: 'ACESFilmicToneMapping',
      toneMappingExposure: renderer.toneMappingExposure,
      shadowMap: { enabled: renderer.shadowMap.enabled, type: 'PCFSoftShadowMap' },
      clearColor: 0x000000
    }
  })

  ////////////////////////////////////////////////////////////////////
  // FX COMPOSSER - POST-PRODUCTION
  ///////////////

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloomEffect = new BloomEffect()
  const depthOfFieldEffect = new DepthOfFieldEffect(camera, {
    focusDistance: 0.2,
    focalLength: 0.018,
    bokehScale: 2.5
  })

  composer.addPass(new EffectPass(camera, bloomEffect, depthOfFieldEffect));

  let animationFrameId = null;

  const clock = new THREE.Clock()
  let previousTime = 0

  const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update controls

    controls.update()

    // Update tweens (if any active)
    tweenUpdate()

    // offset the texture

    outer_Mesh.rotation.y = Math.sin(elapsedTime * 0.01) * 20;
    outer_Mesh.rotation.x += 0.005;
    // outer_Mesh.rotation.y += 0.01;
    // outer_Mesh.rotation.z += 0.01;



    // LIGHT ANIMATIONS

    light1.position.x = Math.sin(elapsedTime * 0.1) * 30
    light1.position.y = Math.cos(elapsedTime * 0.1) * 40;
    light1.position.z = Math.cos(elapsedTime * 0.3) * 30;

    light2.position.x = Math.cos(elapsedTime * 0.9) * 30;
    light2.position.y = Math.sin(elapsedTime * 0.5) * 40;
    light2.position.z = Math.sin(elapsedTime * 0.7) * 30;

    light3.position.x = Math.sin(elapsedTime * 0.7) * 30;
    light3.position.y = Math.cos(elapsedTime * 0.3) * 40;
    light3.position.z = Math.sin(elapsedTime * 0.5) * 30;

    light4.position.x = Math.sin(elapsedTime * 0.3) * 30;
    light4.position.y = Math.cos(elapsedTime * 0.7) * 40;
    light4.position.z = Math.sin(elapsedTime * 0.5) * 30;


    // Update Animation Mixers

    // if (loneWolfMixer) { loneWolfMixer.update(deltaTime) }
    if (cFlowMixer) { cFlowMixer.update(deltaTime) }
    if (kidMixer) { kidMixer.update(deltaTime) };
    if (kid2Mixer) { kid2Mixer.update(deltaTime) };

    // Render

    // interactionManager.update();
    composer.render(scene, camera);

    // Update PARAMS


    // Call tick again on the next frame
    animationFrameId = requestAnimationFrame(tick)

  }


  const start = () => {
    if (animationFrameId === null) {
      tick();
    }
  };

  return {
    canvas: canvas1,
    scene,
    renderer,
    camera,
    controls,
    composer,
    alphaMaterial: alphaMat,
    innerSphereMaterial: material_Sphere,
    register,
    applyControlsState,
    animateCameraPreset,
    animateDepthOfField,
    setDepthOfFieldPreset,
    stopCameraTween,
    stopDofTween,
    start,
    get depthOfFieldEffect() {
      return depthOfFieldEffect;
    }
  };
}
