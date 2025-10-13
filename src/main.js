console.clear();

import './css/style.css'
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';
import 'tippy.js/themes/translucent.css';
import { normalizeWheel } from './js/normalize-wheel/normalizeWheel.js'
import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js'
import * as THREE from 'three'
import { WebGLRenderer } from "three";
import { Canvas } from 'glsl-canvas-js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import SimplexNoise from 'simplex-noise';
import tippy, { animateFill } from 'tippy.js';
import { InteractionManager } from "three.interactive";
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Pane } from 'tweakpane';
// import * as TweakpaneImagePlugin from 'tweakpane/dist/tweakpane-image-plugin.min.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import Stats from 'stats.js'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min'
import gsap from "gsap";
// import { normalizeWheel } from './js/normalize-wheel/normalizewheel.js'
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
// ✧ GLOBAL VARIABLES
///////////////

let vertexShaderSource, fragmentShaderSource;

let program, positionAttributeLocation;

let resolutionUniformLocation, timeUniformLocation, mouseUniformLocation;

let mouseX, mouseY; mouseX=mouseY=0;

//-- Mouse Position

document.addEventListener('mousemove', mousemoveHandler);
function mousemoveHandler(e) {
  e = e || window.event;
  mouseX = e.pageX;
  mouseY = e.pageY;
}

////////////////////////////////////////////////////////////////////
// ✧ VR
///////////////

// document.body.appendChild( VRButton.createButton( renderer ) );

////////////////////////////////////////////////////////////////////
// ✧ Custom cursor
///////////////////////////////////////////////////////////////////

const customCursor = document.createElement("div");
customCursor.setAttribute(
  "style",
  "border: 1px solid #fff; width: 16px; height: 16px; border-radius: 100%; position: fixed; left: 0; top: 0; transition: 0.01s"
);

const root = document.documentElement;
root.style.cursor = "none";
root.appendChild(customCursor);

root.addEventListener("mouseleave", e => {
  customCursor.style.opacity = "1";
});

function handlePos(e) {
  customCursor.style.transform = `translateY(${e.clientY}px) translateX(${
    e.clientX
  }px)`;
  customCursor.style.opacity = "1";
}

root.addEventListener("mousemove", e => {
  handlePos(e);
});
root.addEventListener("mousover", e => {
  handlePos(e);
});

root.addEventListener("mousedown", e => {
  customCursor.style.borderColor = "whitesmoke";
  customCursor.style.backgroundColor = "transparent";
  customCursor.style.transform = `
  translateY(${e.clientY}px) 
  translateX(${e.clientX}px) 
  scale(3)
  `;
});

root.addEventListener("mouseup", e => {
  customCursor.style.borderColor = "whitesmoke";
  customCursor.style.backgroundColor = "transparent";
  customCursor.style.zIndex = "1000000";
  customCursor.style.transform = `translateY(${e.clientY}px) translateX(${
    e.clientX
  }px) scale(1.8)`;
});

 
////////////////////////////////////////////////////////////////////
// ✧ NORMALISED WHEEL (MOUSE)
///////////////////////////////////////////////////////////////////

// document.addEventListener('mousewheel', function (event) {
//     const normalized = normalizeWheel(event);

//     console.log(normalized.pixelX, normalized.pixelY);
// });

// addEventListener('input', e => {
//  let _t = e.target;

//   _t.parentNode.parentNode.style.setProperty(`--${_t.id}val`, +_t.value);
// });

////////////////////////////////////////////////////////////////////
// FUNCTION: TOGGLE
///////////////////////////////////////////////////////////////////////////

const toggleMenu = document.querySelector(".menu-toggle");
toggleMenu.addEventListener('click', (e) => {
  e.currentTarget.classList.toggle('close');
});

////////////////////////////////////////////////////////////////////
// Audio
///////////////////////////////////////////////////////////////////////////

// window.onload = () => {
//   const audioTrack = document.getElementById('music');
//   const play = document.getElementById('play');
//   const pause = document.getElementById('pause');

//   play.addEventListener('click', function() {
//     audioTrack.play()
//     play.style.display = "none";
//     pause.style.display = "block";
//   });

//   pause.addEventListener('click', function() {
//     audioTrack.pause();
//     pause.style.display = "none";
//     play.style.display = "block";
//   });

//   audioTrack.volume = 0.5;
// }

////////////////////////////////////////////////////////////////////
// Tool Tips
///////////////////////////////////////////////////////////////////////////

tippy('li',{
  animation: 'scale',
  theme: 'translucent',
  duration: 0,
  arrow: true,
  delay: [400, 200],
  animateFill: true,
  inertia: true,
  plugins: [animateFill],
}); 

////////////////////////////////////////////////////////////////////
// COLOR CHANGER ON HOVERING / MOUSE ENTER
///////////////////////////////////////////////////////////////////////////

// const kbllr = document.getElementById('KBLLR')
// kbllr.onmousemove = (e) => {
//   const hues = [
//     'mintcream',
//     'dodgerblue',
//     'aqua',
//     'chartreuse',
//     'coral',
//     'goldenRod',
//     'ghostwhite',
//     'darksalmon',
//     'darkturquoise',
//     'hotpink',
//     'mediumspringgreen',
//     'peachpuff',
//     'teal'
//   ]
//   const random = () => hues[Math.floor(Math.random() * hues.length)];
//   document.documentElement.style.cssText = ` --hue: ${random()}; `
// }


////////////////////////////////////////////////////////////////////
// SHOW hamburger menu
///////////////////////////////////////////////////////////////////////////

// const button = document.getElementById("hamburger");

// button.onclick = () => {
//   button.classList.toggle("toggled");
// }

////////////////////////////////////////////////////////////////////
// SHOW MODAL INFO
///////////////////////////////////////////////////////////////////////////

const modalContainer = document.getElementsByClassName('modal')[0];
const showBtn = document.getElementById('info-btn');
const modalBtn = modalContainer.querySelector('button');

const toggleModal = () => {
  modalContainer.classList.toggle('visible');
};
showBtn.addEventListener('click', toggleModal);
modalBtn.addEventListener('click', toggleModal);


/////////////////////////////////////////////////////////////////////////////
// VIDEO TEXTURE TV - VIDEO TEXTURE TV - VIDEO TEXTURE TV  - VIDEO TEXTURE TV 
////////////////////////////////////////////////////////////////////////////

// const startVideoBtn = document.getElementById('play-bg');
// const spinVideo = document.getElementById('spin')
// startVideoBtn.addEventListener('click', function() { spin.play(); });

////////////////////////////////////////////////////////////////////
// WEBGL-THREEJS --> CANVAS --> EXPERIENCE
///////////////////////////////////////////////////////////////////////////////////

const canvas1 = document.querySelector('canvas.webgl')

const scene = new THREE.Scene()
const paramRender = {
  canvas: canvas1,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
}

const renderer = new WebGLRenderer(paramRender);


////////////////////////////////////////////////////////////////////
// PERSPECTIVE CAMERA 
///////////////////////////////////////////////////////////////////////////

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000);
camera.position.set(2, -4, 2);

scene.add(camera)

////////////////////////////////////////////////////////////////////
// FUNCTION: RESET CAMERA - Enter / Leave Room
///////////////////////////////////////////////////////////////////////////////

const toggle = document.getElementsByClassName('toggleButton')[0];
const enterBtn = document.getElementById('enter-circle')
const exitBtn = toggle.querySelector('svg')

enterBtn.addEventListener("click", function() {
  toggle.style.opacity = "1";
  enterBtn.style.opacity = "0";
  camera.position.set(0.3, 0.1, 0.3);
  controls.target.set(0, 0.05, 0);
  controls.update();
});

exitBtn.addEventListener("click", function() {
  toggle.style.opacity = "0";
  enterBtn.style.opacity = "1";
  camera.position.set(3, -3, 3);
  controls.target.set(0, 0.05, 0);
  controls.update();
});

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
controls.enable = true
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

////////////////////////////////////////////////////////////////////
// INTERACTIVITY
///////////////////////////////////////////////////////////////////////////

// const interactionManager = new InteractionManager(
//   renderer,
//   camera,
//   renderer.domElement
// );


//////////////////////////////////////////////////////////// 
// ENVIRONMENT _ BACKGROUND
//////////////////////////////////////////////////////////// 

//==================================================

//https://threejs.org/docs/#api/en/constants/Textures

//===================================================
// EQUIRECTANGULAR HDR
//===================================================

const textureLoader = new THREE.TextureLoader()
const textureLoad = new RGBELoader()

textureLoad.setPath('textures/equirectangular/')

const textureCube = textureLoad.load('era-7.hdr', function(texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
})

// prefilter the equirectangular environment map for irradiance
function equirectangularToPMREMCube(textureCube, renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  pmremGenerator.compileEquirectangularShader()

  const cubeRenderTarget = pmremGenerator.fromEquirectangular(textureCube)

  pmremGenerator.dispose() // dispose PMREMGenerator
  textureCube.dispose() // dispose original texture
  textureCube.image.data = null // remove image reference

  return cubeRenderTarget.textureCube
}

// const cubeTextureLoader = new THREE.CubeTextureLoader();
// const textureBackground = cubeTextureLoader.load([
//     './textures/cube/cube001/nx.png',
//     './textures/cube/cube001/ny.png',
//     './textures/cube/cube001/nz.png',
//     './textures/cube/cube001/px.png',
//     './textures/cube/cube001/py.png',
//     './textures/cube/cube001/pz.png',
// ]);

// scene.background = textureBackground;
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
const light1 = new THREE.PointLight( 0x32CD32, 10.0, 1000, 0.8);
const light2 = new THREE.PointLight( 0xEE82EE, 10.0, 1000, 0.8);
const light3 = new THREE.PointLight( 0xC0C0C0, 10.0, 1000, 0.8);
const light4 = new THREE.PointLight( 0x87CEEB, 10.0, 1000, 0.8);
scene.add(light1, light2, light3, light4);

const directLight = new THREE.DirectionalLight( 0xF5F5F5, 2.5 );
directLight.position.set(0,0.04,0)
directLight.castShadow = true;
//Set up shadow properties for the light
directLight.shadow.mapSize.width = 1024; // default
directLight.shadow.mapSize.height = 1024; // default
directLight.shadow.camera.near = 0.1; // default
directLight.shadow.camera.far = 500; // default
groupKid.add(directLight)


// const helper = new THREE.CameraHelper( directLight.shadow.camera ); 
// scene.add( helper);


////////////////////////////////////////////////////////////////////
// 3D OBJECTS LOADERS
///////////////////////////////////////////////////////////////////

const fbxLoader = new FBXLoader()
const gltfLoader = new GLTFLoader()

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

let alphaMap = textureLoader.load('textures/alpha.png')

alphaMat.alphaMap = alphaMap;
alphaMat.alphaMap.magFilter = THREE.NearestFilter;
alphaMat.alphaMap.wrapT = THREE.RepeatWrapping;
alphaMat.alphaMap.repeat.y = 1;

let radiusAM = 0.15
let segmentsAM = 104
let ringsAM = 104

const alphaGeo = new THREE.SphereGeometry(radiusAM, segmentsAM, ringsAM)
const outer_Mesh = new THREE.Mesh(alphaGeo, alphaMat);
outer_Mesh.rotation.x = -Math.PI/4;
outer_Mesh.position.y = 0.1
outer_Mesh.receiveShadow = true;
outer_Mesh.castShadow = true;

groupKid.add(outer_Mesh)


/////////////////////////////////////////////////////////////////////////////
//VIDEO TEXTURE 👁 - VIDEO TEXTURE 👁  - VIDEO TEXTURE 👁
////////////////////////////////////////////////////////////////////////////

// const videoEye = document.getElementById('eye')
// const webmEye = new THREE.VideoTexture(videoEye)

// webmEye.minFilter = THREE.LinearFilter;
// webmEye.magFilter = THREE.LinearFilter;
// webmEye.offsetY = 0.030
// webmEye.repeat = 0.940
// webmEye.format = THREE.RGBAFormat

/////////////////////////////////////////////////////////////////////////////
// Inner_WORLD 🌎 Inner_WORLD 🌎 Inner_WORLD 🌎  Inner_WORLD 🌎  
////////////////////////////////////////////////////////////////////////////

const params_Sphere = {
  side: THREE.DoubleSide,
  emissive: 0xA9A9A9,
  emissiveIntensity: 8.9,
  transparent: true,
  opacity: 0.4,
  precision: "highp",
  // map: webmEye,
  fog: false,
  envMap: textureCube,
}

const material_Sphere = new THREE.MeshLambertMaterial(params_Sphere);

const radius = 0.48
const segments = 104
const rings = 104
const geometry = new THREE.SphereGeometry(radius, segments, rings)
const inner_World = new THREE.Mesh(geometry, material_Sphere);
inner_World.position.y = -0.70
scene.add(inner_World)

/////////////////////////////////////////////////////////////////////////////
// Inner_KID 👦🏽 * Inner_KID 👦🏽 * Inner_KID 👦🏽 * Inner_KID 👦🏽   
////////////////////////////////////////////////////////////////////////////

let kidMixer;
let kid2Mixer;
let kidMaterial;
let kid;

fbxLoader.load(
  'models/fbx/curiousKid/animations/walking.fbx', (object) => {
    kid = object;
    kidMixer = new THREE.AnimationMixer(kid);
    const action = kidMixer.clipAction(kid.animations[0]);
    action.play();

    kidMaterial = new THREE.MeshPhysicalMaterial({
      map: textureLoader.load("models/fbx/curiousKid/tex/skin004/map02.png"),
      color:0xFFDEAD, //0xFAFAD2,lightgoldenrodyellow 0xC71585, mediumVioletRed
      // emissive: 0x32CD32,
      // emissiveIntensity: 0.6, 
      // transmission: 1,
      transparent: true,
      opacity: 0.98,
      metalness: 0.1,
      roughnessMap: textureLoader.load("models/fbx/curiousKid/tex/skin004/roughness.png"),
      roughness: 1.5,
      normalMap: textureLoader.load("models/fbx/curiousKid/tex/skin004/NormalMap.png"),
      normalScale: new THREE.Vector2(2, 2),
      ior: 1.2,
      thickness: 0.1,
      specularIntensity: 5.9,
      specularColor: 0xBC8F8F,
      envMap: textureCube,
      envMapIntensity: 2.5,
    })

    kid.traverse(function(object) {
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
  });


/////////////////////////////////////////////////////////////////////////////
// Creative_motor 🧿 * Creative_motor 🧿 * Creative_motor 🧿 * Creative_motor    
////////////////////////////////////////////////////////////////////////////

let creativeFlow;
let cFlowMixer = null

gltfLoader.load('models/glTF/cFlow/cFlow4.glb', (gltf) => {
  creativeFlow = gltf.scene
  creativeFlow.scale.set(0.002, 0.002, 0.002)
  creativeFlow.position.set(0, 0.24, 0.)
  creativeFlow.rotation.set(0, 0, 0)
  scene.add(creativeFlow)

  creativeFlow.traverse(function(object) {
    if (object.isMesh) {
      object.material.envMap = textureCube;
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  cFlowMixer = new THREE.AnimationMixer(gltf.scene)
  const cFlowAction = cFlowMixer.clipAction(gltf.animations[0])
  cFlowAction.play()
})

/////////////////////////////////////////////////////////////////////////////
// EYE-INTUITION - EYE-INTUITION   - EYE-INTUITION   
////////////////////////////////////////////////////////////////////////////

let projectCard001;

gltfLoader.load('models/glTF/prjct001/prjct001.gltf', (gltf) => {
  projectCard001 = gltf.scene
  projectCard001.scale.set(8, 8, 8)
  projectCard001.side = THREE.DoubleSide
  projectCard001.position.set(0, -0.67,0.8)
  projectCard001.rotation.x = Math.PI * -0.5;
  scene.add(projectCard001)

  projectCard001.traverse(function(object) {
    if (object.isMesh) {
      object.material.envMap = textureCube;
      object.castShadow = false;
      object.receiveShadow = true;
    }
 });
})

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

const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x6495ED, //0xFF7F50
  roughness: 0.05,
  metalness: 0.1,
  normalMap: textureLoader.load('/textures/water/Water_2_M_Normal.jpg'),
  normalScale: new THREE.Vector2(3, 3),
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI * -0.5;
ground.side = THREE.DoubleSide
groupKid.add(ground)

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

water.position.set(0,0.001,0)
water.rotation.x = Math.PI * -0.5

groupKid.add(water)

////////////////////////////////////////////////////////////////////
// GROUP#1: groupKid (directLight + kid + water + alphaBall)
///////////////////////////////////////////////////////////////////////////

scene.add(groupKid)
groupKid.position.set(0, 0, 0)
groupKid.scale.set(0.3, 0.3, 0.3)
////////////////////////////////////////////////////////////////////
// Renderer
///////////////

renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.LinearEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setClearColor(0x000000, 1)
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

////////////////////////////////////////////////////////////////////
// FX COMPOSSER - POST-PRODUCTION
///////////////

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new EffectPass(camera, new BloomEffect()));


////////////////////////////////////////////////////////////////////
// SVG ANIMATIONS
///////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// CLOCK - UPDATE 
///////////////

const clock = new THREE.Clock()
let previousTime = 0

const tick = () => {
  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - previousTime
  previousTime = elapsedTime

  // Update controls

  controls.update()

  // offset the texture

  outer_Mesh.rotation.y = Math.sin(elapsedTime*0.01)*20;
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
  window.requestAnimationFrame(tick)

}

tick()