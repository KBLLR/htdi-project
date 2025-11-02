// src/world/core/createRenderer.js
import {
  WebGLRenderer,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  ColorManagement,
} from 'three';

const FALLBACK_SELECTORS = ['canvas.webgl', '#container', '#app canvas', '.webgl'];

/**
 * Creates and configures a WebGLRenderer. Accepts either the legacy signature
 * `createRenderer(canvasElement)` or an options object.
 * @param {HTMLCanvasElement|object} input
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(input = {}) {
  let options = input;
  if (input instanceof HTMLCanvasElement || input?.nodeType === 1) {
    options = { canvas: input };
  }

  const {
    canvas,
    canvasSelector,
    parent = typeof document !== 'undefined' ? document.body : null,
    antialias = true,
    alpha = false,
    powerPreference = 'high-performance',
    width = typeof window !== 'undefined' ? window.innerWidth : 1024,
    height = typeof window !== 'undefined' ? window.innerHeight : 768,
    toneMapping = ACESFilmicToneMapping,
    toneMappingExposure = 1.0,
    clearColor = 0x000000,
    clearAlpha = 0,
    enableShadows = true,
    maxPixelRatio = 2,
  } = options;

  let target = canvas ?? null;
  if (!target && canvasSelector && typeof document !== 'undefined') {
    target = document.querySelector(canvasSelector);
  }
  if (!target && typeof document !== 'undefined') {
    for (const selector of FALLBACK_SELECTORS) {
      const candidate = document.querySelector(selector);
      if (candidate) {
        target = candidate;
        break;
      }
    }
  }
  if (!target && typeof document !== 'undefined') {
    target = document.createElement('canvas');
    target.className = 'webgl';
    parent?.appendChild(target);
  }

  const renderer = new WebGLRenderer({
    canvas: target ?? undefined,
    antialias,
    alpha,
    powerPreference,
  });

  ColorManagement.enabled = true;
  renderer.useLegacyLights = false;
  renderer.physicallyCorrectLights = true;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = toneMapping;
  renderer.toneMappingExposure = toneMappingExposure;

  if (enableShadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
  }

  renderer.setClearColor(clearColor, clearAlpha);
  renderer.setSize(width, height, false);

  const pixelRatio =
    typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, maxPixelRatio)
      : 1;
  renderer.setPixelRatio(pixelRatio);

  const resize = (w, h, desiredPixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)) => {
    const clamped = Math.min(desiredPixelRatio, maxPixelRatio);
    renderer.setPixelRatio(clamped);
    renderer.setSize(w, h, false);
  };

  renderer.htdi = {
    canvas: target ?? renderer.domElement,
    resize,
    dispose: () => renderer.dispose?.(),
  };

  return renderer;
}
