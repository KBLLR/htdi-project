import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Vector3 } from 'three';

/**
 * @typedef {object} ControlPresets
 * @property {boolean} autoRotate
 * @property {boolean} enableZoom
 * @property {boolean} [enablePan]
 * @property {boolean} [enableDamping]
 * @property {number} minDistance
 * @property {number} maxDistance
 * @property {number} dampingFactor
 */

/** @type {ControlPresets} */
const DEFAULT_CONTROLS_STATE = {
  autoRotate: true,
  enableZoom: true,
  enablePan: true,
  enableDamping: true,
  minDistance: 0.01,
  maxDistance: 3,
  dampingFactor: 0.05
};

/** @type {ControlPresets} */
const FOCUS_CONTROLS_STATE = {
  autoRotate: false,
  enableZoom: false,
  enablePan: false,
  enableDamping: true,
  minDistance: 0.01,
  maxDistance: 1.1,
  dampingFactor: 0.08
};

/** @type {Object.<string, ControlPresets>} */
const CONTROL_PRESETS = {
  overview: DEFAULT_CONTROLS_STATE,
  focus: FOCUS_CONTROLS_STATE,
  maxZoomOut: {
    autoRotate: true,
    enableZoom: true,
    enablePan: true,
    enableDamping: true,
    minDistance: 12.0,
    maxDistance: 12.0,
    dampingFactor: 0.05
  }
}; // ✅ close the object here

/**
 * Creates and configures OrbitControls for the given camera and DOM element.
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 * @param {object} [options={}]
 * @returns {OrbitControls}
 */
export function createControls(camera, domElement, options = {}) {
  const controls = new OrbitControls(camera, domElement);

  Object.assign(controls, DEFAULT_CONTROLS_STATE, options);

  controls.enableDamping = options.enableDamping ?? true;
  controls.autoRotateSpeed = options.autoRotateSpeed ?? 0.5;
  controls.minPolarAngle = options.minPolarAngle ?? -4;
  controls.maxPolarAngle = options.maxPolarAngle ?? Math.PI / 2.1;
  controls.target.copy(options.target ?? new Vector3(0, 0.05, 0));

  controls.update();
  return controls;
}

/**
 * Applies a predefined control state preset to the OrbitControls.
 * @param {OrbitControls} controls
 * @param {string} presetName
 */
export function applyControlsState(controls, presetName) {
  const preset = CONTROL_PRESETS[presetName];
  if (!preset) return;

  if (typeof preset.autoRotate === 'boolean') controls.autoRotate = preset.autoRotate;
  if (typeof preset.enableZoom === 'boolean') controls.enableZoom = preset.enableZoom;
  if (typeof preset.enablePan === 'boolean' && 'enablePan' in controls)
    controls.enablePan = preset.enablePan;
  if (typeof preset.enableDamping === 'boolean') controls.enableDamping = preset.enableDamping;
  if (typeof preset.minDistance === 'number') controls.minDistance = preset.minDistance;
  if (typeof preset.maxDistance === 'number') controls.maxDistance = preset.maxDistance;
  if (typeof preset.dampingFactor === 'number') controls.dampingFactor = preset.dampingFactor;
  controls.update();
}
