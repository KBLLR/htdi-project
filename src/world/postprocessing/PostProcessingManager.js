// src/world/postprocessing/PostProcessingManager.js
import { WebGLPipeline } from './pipelines/webglPipeline.js';
import { WebGPUPipeline } from './pipelines/webgpuPipeline.js';

/**
 * PostProcessingManager
 * Wraps both WebGL and WebGPU pipelines behind a common API.
 */
export class PostProcessingManager {
  constructor({ backend, renderer, scene, camera }) {
    this.backend = backend;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.pipeline = null;
  }

  async init() {
    if (this.backend === 'webgpu') {
      this.pipeline = new WebGPUPipeline({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera
      });
    } else {
      this.pipeline = new WebGLPipeline({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera
      });
    }

    await this.pipeline.init();
    console.log(`[PostProcessingManager] Initialized ${this.backend} pipeline`);
  }

  render(delta) {
    if (!this.pipeline) return;
    this.pipeline.render(delta);
  }

  updateSettings(settings) {
    if (!this.pipeline || !settings) return;
    this.pipeline.updateSettings(settings);
  }

  resize(width, height) {
    if (!this.pipeline) return;
    this.pipeline.resize(width, height);
  }

  dispose() {
    if (this.pipeline) {
      this.pipeline.dispose();
      this.pipeline = null;
    }
  }

  getBackend() {
    return this.backend;
  }

  getPipeline() {
    return this.pipeline;
  }
}
