// src/world/core/rendererFactory.js
import * as THREE from 'three';
import WebGPU from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';

/**
 * RendererFactory
 * - Creates WebGPU renderer when available
 * - Falls back to WebGL renderer
 * - Exposes a common interface for the rest of the app
 */
export class RendererFactory {
  constructor({ canvas, antialias = true, alpha = true } = {}) {
    if (!canvas) {
      throw new Error('[RendererFactory] canvas is required');
    }
    this.canvas = canvas;
    this.antialias = antialias;
    this.alpha = alpha;

    /** @type {THREE.WebGLRenderer | WebGPURenderer | null} */
    this.renderer = null;
    this.backend = null; // 'webgpu' | 'webgl'
  }

  async init() {
    const isWebGPUAvailable = await WebGPU.isAvailable();

    if (isWebGPUAvailable) {
      this.renderer = new WebGPURenderer({
        canvas: this.canvas,
        antialias: this.antialias,
        alpha: this.alpha
      });
      await this.renderer.init();
      this.backend = 'webgpu';
      console.log('[RendererFactory] WebGPU renderer initialized');
      // WebGPU expects linear color space by default
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    } else {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: this.antialias,
        alpha: this.alpha
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.backend = 'webgl';
      console.log('[RendererFactory] WebGL renderer initialized (WebGPU not available)');
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    return this;
  }

  setSize(width, height) {
    if (!this.renderer) return;
    this.renderer.setSize(width, height, false);
  }

  render(scene, camera) {
    if (!this.renderer) return;
    this.renderer.render(scene, camera);
  }

  getBackend() {
    return this.backend;
  }

  getRenderer() {
    return /** @type {any} */ (this.renderer);
  }

  dispose() {
    if (this.renderer && this.renderer.dispose) {
      this.renderer.dispose();
    }
    this.renderer = null;
  }
}
