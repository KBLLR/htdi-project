import { WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap } from 'three';

/**
 * Creates and configures a new WebGLRenderer.
 * @param {HTMLCanvasElement} canvas - The canvas element to render to.
 * @param {object} [options={}] - Renderer options.
 * @param {boolean} [options.antialias=true] - Whether to perform antialiasing.
 * @param {boolean} [options.alpha=false] - Whether the canvas has an alpha buffer.
 * @param {string} [options.powerPreference="high-performance"] - A hint to the user agent indicating what configuration of GPU is preferred.
 * @param {number} [options.width=window.innerWidth] - Initial width of the renderer.
 * @param {number} [options.height=window.innerHeight] - Initial height of the renderer.
 * @returns {WebGLRenderer} The created and configured renderer.
 */
export function createRenderer(canvas, options = {}) {
  const antialias = options.antialias ?? true;
  const alpha = options.alpha ?? false;
  const powerPreference = options.powerPreference ?? "high-performance";
  const width = options.width ?? window.innerWidth;
  const height = options.height ?? window.innerHeight;

  const renderer = new WebGLRenderer({
    canvas,
    antialias,
    alpha,
    powerPreference,
  });

  renderer.useLegacyLights = false;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  return renderer;
}