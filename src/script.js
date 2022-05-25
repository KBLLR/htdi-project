console.clear();

import './css/style.css'
import './css/nodeCursor.css'
import './js/cursor.js'
import './js/pointer.js'
import * as THREE from 'three'
import { WebGLRenderer } from "three";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { Pane } from 'tweakpane';
import Stats from 'stats.js'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min'
import gsap from "gsap";
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';
import { SobelOperatorShader } from 'three/examples/jsm/shaders/SobelOperatorShader.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { CinematicCamera } from 'three/examples/jsm/cameras/CinematicCamera.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { Water } from 'three/examples/jsm/objects/Water2.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';


////////////////////////////////////////////////////////////////////
// Audio
///////////////

window.onload = () => {
  const audioTrack = document.getElementById('music');
  const play = document.getElementById('play');
  const pause = document.getElementById('pause');
  const soundWave = document.getElementById('soundWave')

  play.addEventListener('click', function() {
    audioTrack.play()
    play.style.display = "none";
    pause.style.display = "block";
  });

  pause.addEventListener('click', function() {
    audioTrack.pause();
    pause.style.display = "none";
    play.style.display = "block";
  });

  audioTrack.volume = 0.5;
}

soundWave.onmousemove = (e) => {
  const hues = [
    'mintcream',
    'dodgerblue',
    'aqua',
    'chartreuse',
    'coral',
    'goldenRod',
    'ghostwhite',
    'darksalmon',
    'darkturquoise',
    'hotpink',
    'mediumspringgreen',
    'peachpuff',
    'teal'
  ]
  const random = () => hues[Math.floor(Math.random() * hues.length)];
  document.documentElement.style.cssText = ` --hue: ${random()}; `
}

////////////////////////////////////////////////////////////////////
// POINTER-CURSOR
///////////////

class EyeIcon {
  constructor() {
    this.$eyeconBtn = document.querySelector('#eyecon-btn');
    this.$eyeFollow = this.$eyeconBtn.querySelector('circle');
    this.onResize();
    window.addEventListener('resize', () => {
      this.onResize();
    });
    this.moveBall();
  }
  onResize() {
    this.btnRect = this.$eyeconBtn.getBoundingClientRect();
    this.btnWidth = this.btnRect.width;
    this.btnHeight = this.btnRect.height;
    this.btnLeft = this.btnRect.left + this.btnWidth / 2;
    this.btnTop = this.btnRect.top + this.btnHeight / 2;
  }
  moveBall() {
    window.addEventListener('mousemove', (e) => {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const radian = Math.atan2( clientY - this.btnTop, clientX - this.btnLeft );
      // console.log(this.btnTop);
      // console.log('radian: ' + radian, 'degree: ' + radian * ( 180 / Math.PI ) );
      gsap.to(this.$eyeFollow, {
        duration: 0.6,
        ease: 'power2.out',
        x: Math.cos(radian) * 5,
        y: Math.sin(radian) * 5
      });
    });
  }
}

new EyeIcon()

const eyeconBtn = document.querySelector('#eyecon-btn');
const eyeFollow = eyeconBtn.querySelector('circle');

const onResize = () => {
  const btnRect = eyeconBtn.getBoundingClientRect();
  const btnWidth = btnRect.width;
  const btnHeight = btnRect.height;
  const btnLeft = btnRect.left + btnWidth / 2;
  const btnTop = btnRect.top + btnHeight / 2;
  }

const moveBall = () => {
    window.addEventListener('mousemove', (e) => {
      const clientX = e.clientX;
      const clientY = e.clientY;
      const radian = Math.atan2( clientY - eye.btnTop, clientX - eyeconBtn.btnLeft );
      // console.log(this.btnTop);
      // console.log('radian: ' + radian, 'degree: ' + radian * ( 180 / Math.PI ) );
      gsap.to(eyeFollow, {
        duration: 0.6,
        ease: 'power2.out',
        x: Math.cos(radian) * 5,
        y: Math.sin(radian) * 5
      });
    });
  }



////////////////////////////////////////////////////////////////////
// SHOW MODAL INFO
///////////////

const modalContainer = document.getElementsByClassName('modal')[0];
const showBtn = document.getElementById('show-btn');
const modalBtn = modalContainer.querySelector('button');


const toggleModal = () => {
  modalContainer.classList.toggle('visible');
};

showBtn.addEventListener('click', toggleModal);
modalBtn.addEventListener('click', toggleModal);


////////////////////////////////////////////////////////////////////
// WEBGL-THREEJS -->CANVAS -->EXPERIENCE
////////////////////////////////////////////////////////////////////

const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
const paramRender = {
  canvas: canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",

}
const renderer = new WebGLRenderer(paramRender);


const textureLoader = new THREE.TextureLoader()
const eyeGroup = new THREE.Group();
const eyeRadius = 0.03;
const eyeBallTexture = textureLoader.load('../assets/img/eyeball.png');
const eyeAddonGeometry = new THREE.SphereGeometry( eyeRadius, 32, 32);
const eyeAddonMaterial = new THREE.MeshPhongMaterial({
        opacity: 0.05,
        shininess: 1,
        transparent: true,
        map: eyeBallTexture
});
const eyeAddon = new THREE.Mesh(eyeAddonGeometry, eyeAddonMaterial);
eyeGroup.add(eyeAddon);

let config = {
    zoomLevel: 0,
    zoomLevelBounds: [ 10, 10 ],
    shrink: 0,
    fstBaseColor: 0xA9A9A9,
    scdBaseColor: 0x696969,
    midColor: 0xD2691E,
    vignette: .55,
    brightness: .1,
    darkness: .1,
};
const eyeGeometry = new THREE.SphereGeometry(eyeRadius, 32, 32);
const eyeShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_shrink: { type: 'f', value: config.shrink },
            u_base_color_1: { type: 'v3', value: new THREE.Color(config.fstBaseColor) },
            u_base_color_2: { type: 'v3', value: new THREE.Color(config.scdBaseColor) },
            u_mid_color: { type: 'v3', value: new THREE.Color(config.midColor) },
            u_vignette: { type: 'f', value: config.vignette },
            u_brightness: { type: 'f', value: config.brightness },
            u_darkness: { type: 'f', value: config.darkness },
        },
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
    });
  const eye = new THREE.Mesh(eyeGeometry, eyeShaderMaterial);
  eye.rotation.y = -Math.PI / 2;
  eyeGroup.add(eye);
  eyeGroup.position.set(0.1, 0.03, 0.1)
  eyeGroup.rotation.set(0, 48, 0)

  scene.add(eyeGroup);

//*//
// CAMERA
//*//

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(-5, 0, 5);

scene.add(camera)

////////////////////////////////////////////////////////////////////
// CONTROLS 
///////////////

const controls = new OrbitControls(camera, canvas)
controls.enable = true
controls.enableDamping = true
controls.dampingFactor = 0.05;
controls.autoRotate = true
controls.enableZoom = false
controls.autoRotateSpeed = 1.5
controls.minDistance = 0.3;
controls.maxDistance = 5;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2.1
controls.target.set(0, 0, 0);

////////////////////////////////////////////////////////////////////
// RESET CAMERA - Enter / Leave Room
///////////////
const resetBtn = document.getElementById('reset-btn')
const exitBtn = document.getElementById('exit-btn')

resetBtn.addEventListener("click", function() {
  camera.position.set(0.42, 0.1, 0);
  controls.target.set(0, 0.3, 0);
  controls.update();
});

exitBtn.addEventListener("click", function() {
  camera.position.set(2, 0.2, 4);
  controls.target.set(0, 0, 0);
  controls.update();
});

  
//*//
// WINDOW SIZES + ASPECT
//*//

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
// LIGHTS 
///////////////

// ROTATING LIGHT POINTS

const light1 = new THREE.PointLight('dodgerblue', 10.0, 100, 0.5);
const light2 = new THREE.PointLight('aqua', 10.0, 100, 0.5);
const light3 = new THREE.PointLight('chartreuse', 10.0, 100, 0.5);
const light4 = new THREE.PointLight('ghostwhite', 10.0, 100, 0.5);
scene.add(light1, light2, light3, light4);

//////////////////////////////////////////////////////////// Lightning Scene Space Launcher


//==================================================
//https://threejs.org/docs/#api/en/constants/Textures
//===================================================
// EQUIRECTANGULAR HDR
//===================================================

const textureLoad = new RGBELoader()

textureLoad.setPath('textures/equirectangular/')
const textureCube = textureLoad.load('mayoris.hdr', function(texture) {
  textureCube.mapping = THREE.EquirectangularRefractionMapping;
})

// prefilter the equirectangular environment map for irradiance
function equirectangularToPMREMCube(textureCube, renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()

  const cubeRenderTarget = pmremGenerator.fromEquirectangular(textureCube)

  pmremGenerator.dispose() // dispose PMREMGenerator
  texture.dispose() // dispose original texture
  texture.image.data = null // remove image reference

  return cubeRenderTarget.textureCube
}

scene.environment = textureCube;
scene.fog = new THREE.FogExp2( 0xC0C0C0, 0.35 );
// scene.background = new THREE.Color( 0x9400D3 );

////////////////////////////////////////////////////////////////////
// MODEL LOADERS
///////////////

const fbxLoader = new FBXLoader()
const gltfLoader = new GLTFLoader()

/////////////////////////////////////////////////////////////////////////////
// VIDEO TEXTURE TV - VIDEO TEXTURE TV - VIDEO TEXTURE TV  - VIDEO TEXTURE TV 
////////////////////////////////////////////////////////////////////////////

const videoWebm = document.getElementById('video2');
const webmTex = new THREE.VideoTexture(videoWebm);

webmTex.minFilter = THREE.LinearFilter;
webmTex.magFilter = THREE.LinearFilter;
webmTex.format = THREE.RGBAFormat;

const paramWebm = {
  side: THREE.DoubleSide,
  emissive: 0x9ACD32,
  emissiveIntensity: 0.25,
  transparent: true,
  opacity: 0.8,
  alphaTest: 0.5,
  map: webmTex,
};

const materialWebm = new THREE.MeshStandardMaterial(paramWebm);
materialWebm.emissive.convertSRGBToLinear()


const startVideoBtn = document.getElementById('start-btn');
startVideoBtn.addEventListener('click', function() { videoWebm.play(); });


/////////////////////////////////////////////////////////////////////////////
// VIDEO TEXTURE 👁- VIDEO TEXTURE 👁 - VIDEO TEXTURE 👁  - VIDEO TEXTURE 👁
////////////////////////////////////////////////////////////////////////////


// const videoEye = document.getElementById('eye')
// const webmEye = new THREE.VideoTexture(videoEye)

// webmEye.minFilter = THREE.LinearFilter;
// webmEye.magFilter = THREE.LinearFilter;
// webmEye.offsetY = 0.030
// webmEye.repeat = 0.940
// webmEye.envMapIntensity = 0.1

// webmEye.format = THREE.RGBAFormat

const paramEye = {
  side: THREE.DoubleSide,
  emissive: 0xEE82EE,
  emissiveIntensity: .05,
  transparent: true,
  opacity:0.95,
  precision: "highp",
  // map: webmEye,
  fog: true,
  envMap: textureCube,
  // blending: THREE.SubtractiveBlending,
  blending: THREE.MultiplyBlending,
  
};

const materialEye = new THREE.MeshLambertMaterial(paramEye);
materialEye.emissive.convertSRGBToLinear()


/*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/
//> SPACE_SHIP: ORBITEYE
//*/*//*/*//*/*//*/*//*/*//*/*/*/*//*/*//*/*//*/*//*/*/

const radius = 0.7
const segments = 104
const rings = 104

const geometry = new THREE.SphereGeometry(radius, segments, rings)
const orbitEye = new THREE.Mesh(geometry, materialEye);
scene.add(orbitEye);

/*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/
//> CURIOUS_KID
//*/*//*/*//*/*//*/*//*/*//*/*/*/*//*/*//*/*//*/*//*/*/

let kidMixer;
let kidMaterial;

fbxLoader.load(
  'models/fbx/curiousKid/animations/Petting.fbx', (object) => {
    kidMixer = new THREE.AnimationMixer(object);
    const action = kidMixer.clipAction(object.animations[0]);
    action.play();

    kidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xDA70D6,//0xFAFAD2,lightgoldenrodyellow 0xC71585, mediumVioletRed
      transmission: 0.3,
      opacity: 1.0,
      metalnessMap: textureLoader.load("models/fbx/curiousKid/tex/skin000/metalnessMap.png"),
      metalness: 0.8,
      roughnessMap: textureLoader.load("models/fbx/curiousKid/tex/skin004/roughness.png"),
      roughness: 0.1,
      ior: 1.5,
      thickness:4,
      specularIntensity: 10,
      specularColor: 0xB0C4DE,
      envMap: textureCube,
      envMapIntensity: 1.5, 
      map: textureLoader.load("models/fbx/curiousKid/tex/skin004/map.png")
    })
    kidMaterial.color.convertSRGBToLinear()

    object.traverse(function(object) {
      if (object.isMesh) {
        object.material = kidMaterial;
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    scene.add(object)

    object.scale.set(.0014, .0014, .0014)
    // object.position.set(-0.07, 0.11, -0.11)
    object.position.set(-0.07, 0, -0.11)
    object.rotation.set(0, 45, 0)
  });


/*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/
//> LONE_WOLF
//*/*//*/*//*/*//*/*//*/*//*/*/*/*//*/*//*/*//*/*//*/*/

let loneWolfMixer = null
let loneWolf;
let wolfSkin;

gltfLoader.load('/models/glTF/loneWolf/glTF-Embedded/loneWolf.gltf', (gltf) => {
  loneWolf = gltf.scene
  loneWolf.scale.set(0.0019, 0.0019, 0.0019)
  // loneWolf.position.set(0, 0.11, -0.08)
  loneWolf.position.set(0, 0, -0.08)
  loneWolf.rotation.set(0, 0, 0)
 
 wolfSkin = new THREE.MeshStandardMaterial({
   metalness: 1.1,
   roughness: 0.16
   })
  loneWolf.traverse(function(object) {
    if (object.isMesh) {
      object.material = wolfSkin
      object.castShadow = false;
      object.receiveShadow = false;
    }
  })
  scene.add(loneWolf)

  loneWolfMixer = new THREE.AnimationMixer(gltf.scene)
  const loneWolfAction = loneWolfMixer.clipAction(gltf.animations[0])
  loneWolfAction.play()
})
 

/*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/
//> CREATIVE_FLOW
//*/*//*/*//*/*//*/*//*/*//*/*/*/*//*/*//*/*//*/*//*/*/

let creativeFlow;
let cFlowMixer = null

gltfLoader.load('models/glTF/cFlow/cFlow4.glb', (gltf) => {
  creativeFlow = gltf.scene
  creativeFlow.scale.set(0.002, 0.002, 0.002)
  creativeFlow.position.set(0.05, 0.25, 0.05)
  creativeFlow.rotation.set(0, 0, 0)
  scene.add(creativeFlow)

  creativeFlow.traverse(function(object) {
    if (object.isMesh) {
      object.material.envMap = textureCube;
      object.castShadow = false;
      object.receiveShadow = true;
    }
  });

  cFlowMixer = new THREE.AnimationMixer(gltf.scene)
  const cFlowAction = cFlowMixer.clipAction(gltf.animations[0])
  cFlowAction.play()
})

/*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/
//> App ICON
//*/*//*/*//*/*//*/*//*/*//*/*/*/*//*/*//*/*//*/*//*/*/

let icon;


gltfLoader.load('models/glTF/Anja-icon/icon-Anja.gltf', (gltf) => {
  icon = gltf.scene
  icon.scale.set(2, 1, 0.5)
  icon.position.set(0, 0.15, 0.25)
  icon.lookAt(0, 0.11, 0)

  icon.traverse(function(object) {
    if (object.isMesh) {
      object.material = materialWebm;
      object.castShadow = false;
      object.receiveShadow = true;
    }
  });

  scene.add(icon)
})



/*/*/
/*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/
//> ATREZZO: PODIUM
//*/*//*/*//*/*//*/*//*/*//*/*/*/*//*/*//*/*//*/*//*/*/

// let podium;

// gltfLoader.load('models/glTF/podium/podium.gltf', (gltf) => {
//   podium = gltf.scene
//   podium.scale.set(0.4, 0.4, 0.4)
//   podium.position.set(0, 0, -0.1)
//   podium.rotation.set(0, 0, 0)

//   podium.traverse(function(o) {
//     if (o.isMesh) {
//       o.castShadow = false;
//       o.receiveShadow = true;
//     }
//   });
//   scene.add(podium)
// })


/*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/ /*/*/
//> NATURAL_ELEMENTS: WATER
//*/*//*/*//*/*//*/*//*/*//*/*/*/*//*/*//*/*//*/*//*/*/

const waterGeometry = new THREE.CircleGeometry(0.5, 80);
const groundGeometry = new THREE.CircleGeometry(0.5, 64);

const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x4682B4,
  roughness: 0.05,
  metalness: 0.1,
  normalMap: textureLoader.load('/textures/water/Water_2_M_Normal.jpg'),
  normalScale: new THREE.Vector2(3, 3),
});
groundMaterial.color.convertSRGBToLinear()

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI * -0.5;
scene.add(ground);

const water = new Water(waterGeometry, {
  color: 0xDDA0DD,
  scale: 0.5,
  flowDirection: new THREE.Vector2(-1, 0.6),
  textureWidth: 1024,
  textureHeight: 1024,
  wrapS: THREE.RepeatWrapping,
  wrapT: THREE.RepeatWrapping,
  anisotropy: 16,
  needsUpdate: true,
});
water.position.y = 0.01
water.rotation.x = Math.PI * -0.5

scene.add(water)


////////////////////////////////////////////////////////////////////
// Renderer
///////////////

renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.LinearEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.100
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setClearColor( 0xFAEBD7, 0.1)
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

////////////////////////////////////////////////////////////////////
// FX COMPOSSER - POST-PRODUCTION
///////////////

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new EffectPass(camera, new BloomEffect()));

/////////////////////////////////////////////////////////////////////// strength, Radius, Threshold
// const bloomPass = new UnrealBloomPass(new THREE.Vector2(sizes.width, sizes.height), 0.8, 0.5, 0.03)
// composer.addPass(new EffectPass(camera, bloomPass))

// const effectGrayScale = new ShaderPass( LuminosityShader );
// composer.addPass( effectGrayScale );


// const effectFXAA = new ShaderPass(FXAAShader)
// effectFXAA.uniforms['resolution'].value.set(1 / sizes.width, 1 / sizes.height)

// const glitchPass = new GlitchPass();
// composer.addPass( glitchPass );

////////////////////////////////////////////////////////////////////
// TWEAK PANE
///////////////////////////////////////////////////////////////////

// DEBUGGING
///////////////

// const stats = new Stats()
// stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
// stats.showPanel(1) // 0: fps, 1: ms, 2: mb, 3+: custom
// stats.showPanel(2) // 0: fps, 1: ms, 2: mb, 3+: custom

// //stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild(stats.dom)

//console.log(renderer.info)

// const axisHelp = new THREE.AxesHelper()
// scene.add( axisHelp )

////////////////////////////////////////////////////////////////////
// ANIMATION 
///////////////

const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
  // stats.begin()
  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - previousTime
  previousTime = elapsedTime

  // Update controls
  controls.update()

  // LIGHT ANIMATIONS
  light1.position.x = Math.sin(elapsedTime * 0.7) * 30
  light1.position.y = Math.cos(elapsedTime * 0.9) * 40;
  light1.position.z = Math.cos(elapsedTime * 0.3) * 30;

  light2.position.x = Math.cos(elapsedTime * 0.9) * 30;
  light2.position.y = Math.sin(elapsedTime * 0.5) * 40;
  light2.position.z = Math.sin(elapsedTime * 0.7) * 30;

  light3.position.x = Math.sin(elapsedTime * 0.7) * 30;
  light3.position.y = Math.cos(elapsedTime * 0.3) * 40;
  light3.position.z = Math.sin(elapsedTime * 0.9) * 30;

  light4.position.x = Math.sin(elapsedTime * 0.3) * 30;
  light4.position.y = Math.cos(elapsedTime * 0.7) * 40;
  light4.position.z = Math.sin(elapsedTime * 0.9) * 30;


  // Update Animation Mixers
  if (loneWolfMixer) { loneWolfMixer.update(deltaTime) }
  if (cFlowMixer) { cFlowMixer.update(deltaTime) }
  if (kidMixer) { kidMixer.update(deltaTime) };

  // Render
composer.render( scene, camera );
// Observer for Chrome's Extension
if (typeof __THREE_DEVTOOLS__ !== 'undefined') {
  __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent('observe', { detail: scene }));
  __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent('observe', { detail: renderer }));
}

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)

  // stats.end()
}

tick()
