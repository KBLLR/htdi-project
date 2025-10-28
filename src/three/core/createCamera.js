import { PerspectiveCamera, Vector3 } from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';

/**
 * @typedef {object} CameraPresets
 * @property {{x: number, y: number, z: number}} position
 * @property {{x: number, y: number, z: number}} target
 * @property {number} fov
 */

/**
 * @typedef {object} DOFPresets
 * @property {number} focusDistance
 * @property {number} focalLength
 * @property {number} bokehScale
 */

const BASE_CAMERA_FOV = 90;

/** @type {Object.<string, CameraPresets>} */
const CAMERA_PRESETS = {
  overview: {
    position: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0.05, z: 0 },
    fov: BASE_CAMERA_FOV
  },
  focus: {
    position: { x: 0.022, y: 0.072, z: 0.034 },
    target: { x: 0, y: 0.11, z: 0.008 },
    fov: 110
  }
};

/** @type {Object.<string, DOFPresets>} */
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

let cameraTween = null;
let dofTween = null;

/**
 * Creates a new PerspectiveCamera.
 * @param {number} fov - Camera frustum vertical field of view.
 * @param {number} aspect - Camera frustum aspect ratio.
 * @param {number} near - Camera frustum near plane.
 * @param {number} far - Camera frustum far plane.
 * @param {Vector3} [position=new Vector3(0, 0, 0)] - Initial camera position.
 * @returns {PerspectiveCamera} The created camera.
 */
export function createCamera(fov, aspect, near, far, position = new Vector3(0, 0, 0)) {
  const camera = new PerspectiveCamera(fov, aspect, near, far);
  camera.position.copy(position);
  return camera;
}

/**
 * Stops any active camera tween animation.
 */
export function stopCameraTween() {
  if (cameraTween) {
    cameraTween.stop();
    cameraTween = null;
  }
}

/**
 * Animates the camera to a predefined preset.
 * @param {PerspectiveCamera} camera - The camera to animate.
 * @param {import('three/examples/jsm/controls/OrbitControls.js').OrbitControls} controls - The OrbitControls instance.
 * @param {string} presetName - The name of the camera preset to apply ('overview' or 'focus').
 * @param {object} [options={}] - Animation options.
 * @param {number} [options.duration=1600] - Duration of the animation in milliseconds.
 * @param {Easing} [options.easing=Easing.Cubic.InOut] - Easing function for the animation.
 * @param {function} [options.onStart] - Callback function to execute when the animation starts.
 * @param {function} [options.onComplete] - Callback function to execute when the animation completes.
 */
export function animateCameraPreset(camera, controls, presetName, options = {}) {
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

/**
 * Stops any active Depth of Field tween animation.
 */
export function stopDofTween() {
  if (dofTween) {
    dofTween.stop();
    dofTween = null;
  }
}

/**
 * Sets the Depth of Field effect parameters to a predefined preset.
 * @param {import('postprocessing').DepthOfFieldEffect} depthOfFieldEffect - The DepthOfFieldEffect instance.
 * @param {string} presetName - The name of the DOF preset to apply ('overview' or 'focus').
 */
export function setDepthOfFieldPreset(depthOfFieldEffect, presetName) {
  const preset = DOF_PRESETS[presetName];
  if (!preset) return;
  stopDofTween();
  depthOfFieldEffect.focusDistance = preset.focusDistance;
  depthOfFieldEffect.focalLength = preset.focalLength;
  depthOfFieldEffect.bokehScale = preset.bokehScale;
}

/**
 * Animates the Depth of Field effect parameters to a predefined preset.
 * @param {import('postprocessing').DepthOfFieldEffect} depthOfFieldEffect - The DepthOfFieldEffect instance.
 * @param {string} presetName - The name of the DOF preset to apply ('overview' or 'focus').
 * @param {object} [options={}] - Animation options.
 * @param {number} [options.duration=1400] - Duration of the animation in milliseconds.
 * @param {Easing} [options.easing=Easing.Cubic.InOut] - Easing function for the animation.
 */
export function animateDepthOfField(depthOfFieldEffect, presetName, options = {}) {
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
