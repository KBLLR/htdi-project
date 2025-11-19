// src/world/postprocessing/pipelines/webglPipeline.js
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  DepthOfFieldEffect,
  FXAAEffect
} from 'postprocessing';

export class WebGLPipeline {
  constructor({ renderer, scene, camera }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.composer = null;
    this.bloomEffect = null;
    this.dofEffect = null;
    this.fxaaEffect = null;

    this.settings = {
      bloom: { enabled: true, intensity: 0.9 },
      dof: { enabled: false, focusDistance: 0.02, focalLength: 0.048, bokehScale: 2.0 },
      fxaa: { enabled: true }
    };
  }

  async init() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const effects = [];

    if (this.settings.bloom.enabled) {
      this.bloomEffect = new BloomEffect({
        intensity: this.settings.bloom.intensity
      });
      effects.push(this.bloomEffect);
    }

    if (this.settings.dof.enabled) {
      this.dofEffect = new DepthOfFieldEffect(this.camera, {
        focusDistance: this.settings.dof.focusDistance,
        focalLength: this.settings.dof.focalLength,
        bokehScale: this.settings.dof.bokehScale
      });
      effects.push(this.dofEffect);
    }

    if (this.settings.fxaa.enabled) {
      this.fxaaEffect = new FXAAEffect();
      effects.push(this.fxaaEffect);
    }

    if (effects.length > 0) {
      const effectPass = new EffectPass(this.camera, ...effects);
      this.composer.addPass(effectPass);
    }

    console.log('[WebGLPipeline] Initialized with effects:', {
      bloom: this.settings.bloom.enabled,
      dof: this.settings.dof.enabled,
      fxaa: this.settings.fxaa.enabled
    });
  }

  render(delta) {
    if (!this.composer) return;
    this.composer.render(delta);
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };

    // Update bloom effect if it exists
    if (this.bloomEffect && settings.bloom) {
      if (settings.bloom.intensity !== undefined) {
        this.bloomEffect.intensity = settings.bloom.intensity;
      }
    }

    // Update DOF effect if it exists
    if (this.dofEffect && settings.dof) {
      if (settings.dof.focusDistance !== undefined) {
        this.dofEffect.circleOfConfusionMaterial.uniforms.focusDistance.value = settings.dof.focusDistance;
      }
      if (settings.dof.focalLength !== undefined) {
        this.dofEffect.circleOfConfusionMaterial.uniforms.focalLength.value = settings.dof.focalLength;
      }
      if (settings.dof.bokehScale !== undefined) {
        this.dofEffect.bokehScale = settings.dof.bokehScale;
      }
    }

    console.log('[WebGLPipeline] Settings updated:', this.settings);
  }

  resize(width, height) {
    if (!this.composer) return;
    this.composer.setSize(width, height);
  }

  dispose() {
    if (!this.composer) return;
    this.composer.dispose();
    this.composer = null;
    this.bloomEffect = null;
    this.dofEffect = null;
    this.fxaaEffect = null;
  }
}
