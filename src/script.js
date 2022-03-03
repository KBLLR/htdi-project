import './css/style.css'

// Main Libraries
import $ from "jquery";
import * as THREE from 'three'
import * as PIXI from "pixi.js"
import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js'
import gsap from 'gsap'
import { easePack } from 'gsap'
import { WebGLRenderer } from "three";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Proton from "proton-engine";
import { ParallaxBarrierEffect } from 'three/examples/jsm/effects/ParallaxBarrierEffect.js';
// POST-PROCESSING
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';
import { SobelOperatorShader } from 'three/examples/jsm/shaders/SobelOperatorShader.js';

import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { CinematicCamera } from 'three/examples/jsm/cameras/CinematicCamera.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh.js';
import { InteractiveGroup } from 'three/examples/jsm/interactive/InteractiveGroup.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { KawaseBlurFilter } from "@pixi/filter-kawase-blur";
import SimplexNoise from "simplex-noise";
import hsl from "hsl-to-hex";
import debounce from "debounce";


////////////////////////////////////////////////////////////////////
// svg / Pixie 
///////////////

// Create PixiJS app
const pixieApp = new PIXI.Application({
// render to <canvas class="orb-canvas"></canvas>
view: document.querySelector(".orb-canvas"),
// auto adjust size to fit the current window
resizeTo: window,
// transparent background, we will be creating a gradient background later using CSS
transparent: true
});

pixieApp.stage.filters = [new KawaseBlurFilter(30, 10, true)];

// UTILITY JS FUNCTIONS
// return a random number within a range
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// map a number from 1 range to another
function map(n, start1, end1, start2, end2) {
  return ((n - start1) / (end1 - start1)) * (end2 - start2) + start2;
}

// Create a new simplex noise instance
const simplex = new SimplexNoise();

// Orb class
class Orb {
  // Pixi takes hex colors as hexidecimal literals (0x rather than a string with '#')
  constructor(fill = 0x000000) {
    // bounds = the area an orb is "allowed" to move within
    this.bounds = this.setBounds();
    // initialise the orb's { x, y } values to a random point within it's bounds
    this.x = random(this.bounds["x"].min, this.bounds["x"].max);
    this.y = random(this.bounds["y"].min, this.bounds["y"].max);

    // how large the orb is vs it's original radius (this will modulate over time)
    this.scale = 1;

    // what color is the orb?
    this.fill = fill;

    // the original radius of the orb, set relative to window height
    this.radius = random(window.innerHeight / 1, window.innerHeight / 1);

    // starting points in "time" for the noise/self similar random values
    this.xOff = random(0, 1000);
    this.yOff = random(0, 1000);
    // how quickly the noise/self similar random values step through time
    this.inc = 0.002;

    // PIXI.Graphics is used to draw 2d primitives (in this case a circle) to the canvas
    this.graphics = new PIXI.Graphics();
    this.graphics.alpha = 0.6;

    // 250ms after the last window resize event, recalculate orb positions.
    window.addEventListener(
      "resize",
      debounce(() => {
        this.bounds = this.setBounds();
      }, 250)
    );
  }
  setBounds() {
    // how far from the { x, y } origin can each orb move
    const maxDist =
        window.innerWidth < 1000 ? window.innerWidth / 4 : window.innerWidth / 4;
    // the { x, y } origin for each orb (the bottom right of the screen)
    const originX = window.innerWidth / 4;
    const originY =
        window.innerWidth < 1000
        ? window.innerHeight
        : window.innerHeight / 8;

    // allow each orb to move x distance away from it's { x, y }origin
    return {
        x: {
        min: originX - maxDist,
        max: originX + maxDist
        },
        y: {
        min: originY - maxDist,
        max: originY + maxDist
        }
    };
  }
  update() {
    // self similar "psuedo-random" or noise values at a given point in "time"
    const xNoise = simplex.noise2D(this.xOff, this.xOff);
    const yNoise = simplex.noise2D(this.yOff, this.yOff);
    const scaleNoise = simplex.noise2D(this.xOff, this.yOff);

    // map the xNoise/yNoise values (between -1 and 1) to a point within the orb's bounds
    this.x = map(xNoise, -1, 1, this.bounds["x"].min, this.bounds["x"].max);
    this.y = map(yNoise, -1, 1, this.bounds["y"].min, this.bounds["y"].max);
    // map scaleNoise (between -1 and 1) to a scale value somewhere between half of the orb's original size, and 100% of it's original size
    this.scale = map(scaleNoise, -1, 1, 0, 1);

    // step through "time"
    this.xOff += this.inc;
    this.yOff += this.inc;
  }
  render() {
    // update the PIXI.Graphics position and scale values
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this.graphics.scale.set(this.scale);

    // clear anything currently drawn to graphics
    this.graphics.clear();

    // tell graphics to fill any shapes drawn after this with the orb's fill color
    this.graphics.beginFill(this.fill);
    // draw a circle at { 0, 0 } with it's size set by this.radius
    this.graphics.drawCircle(0, 0, this.radius);
    // let graphics know we won't be filling in any more shapes
    this.graphics.endFill();
  }
}

class ColorPalette {
  constructor() {
    this.setColors();
    this.setCustomProperties();
  }

  setColors() {
    // pick a random hue somewhere between 220 and 360
    this.hue = ~~random(0, 660);
    this.complimentaryHue1 = this.hue + 30;
    this.complimentaryHue2 = this.hue + 60;
    // define a fixed saturation and lightness
    this.saturation = 80;
    this.lightness = 50;

    // define a base color
    this.baseColor = hsl(this.hue, this.saturation, this.lightness);
    // define a complimentary color, 30 degress away from the base
    this.complimentaryColor1 = hsl(
      this.complimentaryHue1,
      this.saturation,
      this.lightness
    );
    // define a second complimentary color, 60 degrees away from the base
    this.complimentaryColor2 = hsl(
      this.complimentaryHue2,
      this.saturation,
      this.lightness
    );

    // store the color choices in an array so that a random one can be picked later
    this.colorChoices = [
      this.baseColor,
      this.complimentaryColor1,
      this.complimentaryColor2
    ];
  }

  randomColor() {
    // pick a random color
    return this.colorChoices[~~random(0, this.colorChoices.length)].replace(
      "#",
      "0x"
    );
  }

  setCustomProperties() {
    // set CSS custom properties so that the colors defined here can be used throughout the UI
    document.documentElement.style.setProperty("--hue", this.hue);
    document.documentElement.style.setProperty(
      "--hue-complimentary1",
      this.complimentaryHue1
    );
    document.documentElement.style.setProperty(
      "--hue-complimentary2",
      this.complimentaryHue2
    );
  }
}

const colorPalette = new ColorPalette();

// Create orbs
const orbs = [];

for (let i = 0; i < 60; i++) {
  // each orb will be black, just for now
  const orb = new Orb(colorPalette.randomColor());
  pixieApp.stage.addChild(orb.graphics);

  orbs.push(orb);
}

// Animate!
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  pixieApp.ticker.add(() => {
    // update and render each orb, each frame. app.ticker attempts to run at 60fps
    orbs.forEach((orb) => {
      orb.update();
      orb.render();
    });
  });
} else {
  // perform one update and render per orb, do not animate
  orbs.forEach((orb) => {
    orb.update();
    orb.render();
  });
}

////////////////////////////////////////////////////////////////////
// DEBUGGER 
///////////////
// const params = { enable: true; };
// // const debugObject = {}

// const gui = new dat.GUI()
// gui.add(params, 'enable')
// gui.open()


////////////////////////////////////////////////////////////////////
// Canvas & UI
///////////////

const canvas = document.querySelector('canvas.webgl')

////////////////////////////////////////////////////////////////////
// Audio
///////////////

window.onload = function(){

   var audioElement = document.getElementById('music');
   var play = document.getElementById('play');
   var pause = document.getElementById('pause');
   var loading = document.getElementById('loading');

   function displayControls() {
      loading.style.display = "none";
   }

   // check that the media is ready before displaying the controls
   if (audioElement.paused) {
      displayControls();
   } else {
      // not ready yet - wait for canplay event
      audioElement.addEventListener('canplay', function() {
         displayControls();
      });
   }

   play.addEventListener('click', function() {
      audioElement.play();
      play.style.display = "none";
      pause.style.display = "block";
   });

   pause.addEventListener('click', function() {
      audioElement.pause();
      pause.style.display = "none";
      play.style.display = "block";
   });

   audioElement.volume = 0.3;
}



////////////////////////////////////////////////////////////////////
// SCENE & CONSTS
///////////////

const scene = new THREE.Scene()

////////////////////////////////////////////////////////////////////
// LIGHTS 
///////////////

// Common Lights Between Scenes

RectAreaLightUniformsLib.init(); // Initiator Rect Area Lights

// Lights Inside Glass Bubble 

const light1 = new THREE.PointLight( 0xff0040, 2, 500 );
scene.add( light1 );
const light2 = new THREE.PointLight( 0x0040ff, 2, 500 );
scene.add( light2 );
const light3 = new THREE.PointLight( 0x80ff80, 2, 500 );
scene.add( light3 );
const light4 = new THREE.PointLight( 0xffaa00, 2, 500 );
scene.add( light4 );


//////////////////////////////////////////////////////////// Lightning Scene Space Launcher

// const ambientLight = new THREE.AmbientLight( 0x18FEFE, 1.2)

// const rectLight2 = new THREE.RectAreaLight( 0x18FEFE, 1.2 );
// rectLight2.position.set( 1, 0, -1 );
// rectLight2.rotation.set( 0, 360 ,0 )
// scene.add( rectLight2 );

// const rectLight4 = new THREE.RectAreaLight( 0xffffff , 1.2 );
// rectLight4.position.set( -1, 0, 1 );
// rectLight4.rotation.set( 0, 0 ,0 )
// scene.add( rectLight4 );

///////////////////////////////////////////////////////////// Lightning Scene Gold Dreams

const ambientLight = new THREE.AmbientLight( 0xD6B201, 5.6)

const rectLight2 = new THREE.RectAreaLight( 0xD6B201 , 1.2 );
rectLight2.position.set( 1, 0, -1 );
rectLight2.rotation.set( 0, 360 ,0 )
scene.add( rectLight2 );

const rectLight4 = new THREE.RectAreaLight( 0xffffff , 1.2, 56, 56);
rectLight4.position.set( -1, 0, 1 );
rectLight4.rotation.set( 0, 0 ,0 )
scene.add( rectLight4 );

// scene.add( new RectAreaLightHelper( rectLight1 ) );
// scene.add( new RectAreaLightHelper( rectLight2 ) );

const directionaLight = new THREE.DirectionalLight( 0xD6B201, 2.2 );
directionaLight.position.set( 0, 0.5, -1 );
directionaLight.castShadow = true;
directionaLight.shadow.mapSize.width = 2048;
directionaLight.shadow.mapSize.height = 2048;

const d = 10;

directionaLight.shadow.camera.left = - d;
directionaLight.shadow.camera.right = d;
directionaLight.shadow.camera.top = d;
directionaLight.shadow.camera.bottom = - d;
directionaLight.shadow.camera.far = 2000;
scene.add( directionaLight );

////////////////////////////////////////////////////////////////////
// PARTICLES 
///////////////

// Geometry base for the particles
const particlesGeometry = new THREE.BufferGeometry()
const count = 777

const particlesMaterial = new THREE.PointsMaterial()
particlesMaterial.size = 2.2
particlesMaterial.sizeAttenuation = true
particlesMaterial.color = new THREE.Color('#31FF9C') //#31FF9C Green Particles

const particles = new THREE.Points(particlesGeometry, particlesMaterial)
scene.add(particles)

const positions = new Float32Array(count * 3) // Multiply by 3 because each position is composed of 3 values (x, y, z)
const colors = new Float32Array(count * 3)

particlesMaterial.size = 0.2

for(let i = 0; i < count * 3; i++) // Multiply by 3 for same reason
{
    positions[i] = (Math.random() - 0.5) * 10 // Math.random() - 0.5 to have a random value between -0.5 and +0.5
    // colors[i] = Math.random()
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)) // Create the Three.js BufferAttribute and specify that each information is composed of 3 values
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors))

const textureLoader = new THREE.TextureLoader()
const particleTexture = textureLoader.load('/textures/particles/stars/star_07.png')

particlesMaterial.map = particleTexture

particlesMaterial.transparent = true
particlesMaterial.alphaMap = particleTexture
// particlesMaterial.alphaTest = 0.001
// particlesMaterial.depthTest = false
particlesMaterial.depthWrite = false
particlesMaterial.blending = THREE.AdditiveBlending
// particlesMaterial.vertexColors = true



////////////////////////////////////////////////////////////////////
// Enviroment Cube
///////////////

const cubeTextureLoader = new THREE.CubeTextureLoader()
cubeTextureLoader.setPath('textures/environmentMap/level-3/');
const environmentMap = cubeTextureLoader.load(['px.png','nx.png','py.png','ny.png','pz.png','nz.png']);
environmentMap.encoding = THREE.sRGBEncoding;
environmentMap.mapping = THREE.CubeRefractionMapping
environmentMap.envMapIntensity = 10.0

scene.environment = environmentMap
scene.background = environmentMap

// scene.fog = new THREE.FogExp2( 0xfafafa, 0.72);

////////////////////////////////////////////////////////////////////
// MESHES + LOADERS
///////////////

const geometry = new THREE.IcosahedronGeometry(1, 24);
const glassmaterial = new THREE.MeshPhysicalMaterial(
    { 
      side: THREE.DoubleSide,
      precision: "highp",
      alphaTest: 1.0,
      color: 0xeaeaea,
      fog: false,
      transmission: 1,
      opacity: 1,
      metalness: 0,
      roughness: 0,
      ior: 2.0,
      thickness: 0.01,
      specularIntensity: 1,
      specularColor: 0xffffff,
      envMap: environmentMap,
      envMapIntensity: 2.0
});

// const geoFloor = new THREE.BoxGeometry( 1, 0.01, 1 );
// const matStdFloor = new THREE.MeshStandardMaterial( { 
//     color: 0x000000, 
//     roughness: 0, 
//     metalness: 0,
//     opacity: 0.5,
//     envMap: environmentMap,
//     envMapIntensity: 1.0
// });
// const mshStdFloor = new THREE.Mesh( geoFloor, matStdFloor );
// mshStdFloor.position.set(0, -0.79, 0)
// scene.add( mshStdFloor );


const glassphere = new THREE.Mesh(geometry, glassmaterial);
glassphere.position.set(0, 0.05, 0.05)
glassphere.scale.set(0.6, 0.35, 0.6)
scene.add(glassphere);


/*** Load Fox model **/
const gltfLoader = new GLTFLoader()


let foxMixer = null

gltfLoader.load('/models/Fox/glTF/Fox.gltf', (gltf) =>
    {
        // Model
        const fox = gltf.scene
        fox.scale.set(0.0019, 0.0019, 0.0019)
        fox.position.set(0, -0.1, 0)
        fox.rotation.set(0, 0,  0)

        fox.traverse( function ( object ) {
            if ( object.isMesh ) {
                object.material.envMap = environmentMap;
                object.castShadow = true;
            }
        } );
        scene.add( fox)

        // Animation
        foxMixer = new THREE.AnimationMixer(gltf.scene)
        const foxAction = foxMixer.clipAction(gltf.animations[0])
        foxAction.play()
    }
)

// /*** Load HTDI Logo model **/
gltfLoader.load('models/logo/glTF/logo.gltf', (gltf) =>
    {
        // Model

        gltf.scene.scale.set(0.0015, 0.0015, 0.0015)
        gltf.scene.position.set(0, -0.8, 0.4)
        gltf.scene.rotation.set(0, 0,  0)
        scene.add(gltf.scene)

        let logo = gltf.scene;
        let logoMaterial= new THREE.MeshPhysicalMaterial( 
        { 
        side: THREE.DoubleSide,    
        color: 0xffffff,
        //wireframe: true,
        transmission: 1,
        vertexColors: true,
        // opacity: 0.55,
        metalness: 0,
        roughness: 0,
        ior: 4.0,
        thickness: 0,
        specularIntensity: 1,
        specularColor: 0xffffff,
        envMap: environmentMap,
        envMapIntensity: 0.7
        });

        logo.traverse((o) => {
          if (o.isMesh) o.material = logoMaterial;
        });
    }
)

gltfLoader.load('models/HTDI/glTF/HTDI-SINGLE2.gltf', (gltf) =>
    {
        // Model BIG SIZE
        // gltf.scene.scale.set(0.0055, 0.0055, 0.0055)
        const htdi = gltf.scene
        htdi.scale.set(0.0005, 0.0005, 0.0005)
        htdi.position.set(0, 0, 0.9)
        htdi.rotation.set(0, 0,  0)
        scene.add(htdi)

    
        let singleMaterial= new THREE.MeshLambertMaterial( 
        { 
          side: THREE.DoubleSide, 
          refractionRatio: 0.985,
          reflectivity: 0.9,
          reflectivity: 0.2,
          refractionRatio: 2,
          envMap: environmentMap,
          envMapIntensity: 1.0
        });

        htdi.traverse((o) => {
          if (o.isMesh) o.material = singleMaterial;
        });

        // Animations

        gsap.to( htdi.rotation, {
            duration: 100, 
            ease: "none", 
            y: "+=180",
            repeat: -1});

    }
)

// const loader = new THREE.ObjectLoader();

// loader.load(
//     // resource URL
//     "static/models/json/model.json",

//     // onLoad callback
//     // Here the loaded data is assumed to be an object
//     function ( obj ) {
//         // Add the loaded object to the scene
//         scene.add( obj );
//     },

//     // onProgress callback
//     function ( xhr ) {
//         console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
//     },

//     // onError callback
//     function ( err ) {
//         console.error( 'An error happened' );
//     }
// );


// // Alternatively, to parse a previously loaded JSON structure
// const object = loader.parse( a_json_object );
// object.position.set(0, 0, 0)

// scene.add( object );


////////////////////////////////////////////////////////////////////
// WINDOW SIZES + ASPECT
///////////////

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Sobel Effect
    // effectSobel.uniforms[ 'resolution' ].value.x = window.innerWidth * window.devicePixelRatio;
    // effectSobel.uniforms[ 'resolution' ].value.y = window.innerHeight * window.devicePixelRatio;
})

////////////////////////////////////////////////////////////////////
// CAMERA
///////////////

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.2, 1000)
camera.position.set( 2, 2, 4)

scene.add(camera)

////////////////////////////////////////////////////////////////////
// CONTROLS 
///////////////

const controls = new OrbitControls(camera, canvas)
controls.enable = false
controls.enableDamping = true
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.autoRotate= true
controls.enableZoom = true
controls.autoRotateSpeed = 1
controls.minDistance = 1;
controls.maxDistance = 16;
controls.target.set( 0, 0, 0 );

////////////////////////////////////////////////////////////////////
// Renderer
///////////////

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true})
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.CineonToneMapping
renderer.toneMappingExposure = 0.3
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// renderer.domElement.style.touchAction = 'none';
// renderer.domElement.addEventListener( 'pointermove', onPointerMove );
renderer.setClearColor('#211d20')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

////////////////////////////////////////////////////////////////////
// EFFECT COMPOSER -> POST-PRODUCTION
///////////////

const finalComposer = new EffectComposer( renderer );
const renderScene = new RenderPass( scene, camera );
finalComposer.addPass( renderScene );

/////////////////////////////////////////////////////////////////////////////////// strength, Radius, Threshold
const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 2.9 , 1.4, 0.6 );
finalComposer.addPass( bloomPass );


// const effectGrayScale = new ShaderPass( LuminosityShader );
// finalComposer.addPass( effectGrayScale );

// let effectSobel = new ShaderPass( SobelOperatorShader );
// effectSobel.uniforms[ 'resolution' ].value.x = window.innerWidth * window.devicePixelRatio;
// effectSobel.uniforms[ 'resolution' ].value.y = window.innerHeight * window.devicePixelRatio;
// finalComposer.addPass( effectSobel );

// const bloomPass = new BloomPass(
//     1,    // strength
//     25,   // kernel size
//     4,    // sigma ?
//     256,  // blur render target resolution
// );
// composer.addPass(bloomPass);

// const outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
// outlinePass.edgeStrength= 8.0
// outlinePass.edgeGlow= 2.5
// outlinePass.edgeThickness= 1.0
// outlinePass.pulsePeriod= 0.2
// outlinePass.rotate= true
// outlinePass.usePatternTexture= false

// finalComposer.addPass( outlinePass );

// const patternTexture = textureLoader.load( 'textures/pattern-outliner.png', texture)

// outlinePass.patternTexture = texture;
// texture.wrapS = THREE.RepeatWrapping;
// texture.wrapT = THREE.RepeatWrapping;


const effectFXAA = new ShaderPass( FXAAShader );
effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
finalComposer.addPass( effectFXAA );

// const glitchPass = new GlitchPass();
// finalComposer.addPass( glitchPass );

////////////////////////////////////////////////////////////////////
// RAYCASTER + MOUSE
///////////////////////////////////////////////////////////////////
// const mouse = new THREE.Vector2();
// const raycaster = new THREE.Raycaster();
// raycaster.setFromCamera( mouse, camera );



// let selectedObjects = [];

// function checkIntersection() {

//     const intersects = raycaster.intersectObject( scene, true );
//     const selectedObject = intersects[ 0 ].object;
//     selectedObjects.push( selectedObject );
//     outlinePass.selectedObject = addSelectedObjects;

// }

// function onPointerMove( event ) {

//     if ( event.isPrimary === false ) return;

//     mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
//     mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

//     checkIntersection();

// }


////////////////////////////////////////////////////////////////////
// ANIMATION 
///////////////

const clock = new THREE.Clock()
let previousTime = 0


const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update controls
    controls.update()

    // Update Particles
    // particles.scale.x = elapsedTime * 0.01
    // particles.scale.Y = elapsedTime * 0.1
    // particles.scale.Z = elapsedTime * 0.001
    particles.rotation.y = elapsedTime * 0.024
    particles.rotation.x = elapsedTime * 0.008
    particles.rotation.z = elapsedTime * 0.048

    for(let i = 0; i < count; i++)
       {
           let i3 = i * 1

            const x = particlesGeometry.attributes.position.array[i3]
            particlesGeometry.attributes.position.array[i3 + 0.01] = Math.sin(elapsedTime + x)

       }
       particlesGeometry.attributes.position.needsUpdate = true 

    // LIGHT ANIMATIONS
    light1.position.x = Math.sin( elapsedTime * 0.7 ) * 30
    light1.position.y = Math.cos( elapsedTime * 0.5 ) * 40;
    light1.position.z = Math.cos( elapsedTime * 0.3 ) * 30;

    light2.position.x = Math.cos( elapsedTime * 0.3 ) * 30;
    light2.position.y = Math.sin( elapsedTime * 0.5 ) * 40;
    light2.position.z = Math.sin( elapsedTime * 0.7 ) * 30;

    light3.position.x = Math.sin( elapsedTime * 0.7 ) * 30;
    light3.position.y = Math.cos( elapsedTime * 0.3 ) * 40;
    light3.position.z = Math.sin( elapsedTime * 0.5 ) * 30;

    light4.position.x = Math.sin( elapsedTime * 0.3 ) * 30;
    light4.position.y = Math.cos( elapsedTime * 0.7 ) * 40;
    light4.position.z = Math.sin( elapsedTime * 0.5 ) * 30;


    // Fox animation
    if(foxMixer)
    {
        foxMixer.update(deltaTime)
    }
    // Render
    finalComposer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()



////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
///////////////