// src/world/postprocessing/createPostprocessing.js
import {
  BloomEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  FXAAEffect,
  RenderPass,
} from 'postprocessing';
import { HalfFloatType, UnsignedByteType, Vector2 } from 'three';

const DEFAULTS = {
  enabled: true,
  bloom: {
    enabled: false,
    intensity: 0.6,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.025,
    mipmapBlur: true,
    radius: 0.7,
    levels: 5,
    resolutionScale: 0.5,
    luminancePass: true,
    blendOpacity: 1,
  },
  dof: {
    enabled: false,
    focusDistance: 0.2,
    focusRange: 0.12,
    focalLength: 0.018,
    bokehScale: 1.25,
    resolutionScale: 1,
    blendOpacity: 1,
  },
  fxaa: {
    enabled: false,
    minEdgeThreshold: 0.0312,
    maxEdgeThreshold: 0.125,
    subpixelQuality: 0.75,
  },
};

const EFFECT_ORDER = ['bloom', 'depthOfField', 'fxaa'];

function supportsHalfFloat(renderer) {
  if (!renderer) return false;
  const caps = renderer.capabilities;
  if (caps?.isWebGL2) return true;
  return Boolean(renderer.extensions?.get?.('EXT_color_buffer_half_float'));
}

function pickFrameBufferType(renderer) {
  return supportsHalfFloat(renderer) ? HalfFloatType : UnsignedByteType;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function setOpacity(blendMode, value) {
  if (!blendMode) return;
  const v = clamp(value ?? 1, 0, 1);
  if (typeof blendMode.setOpacity === 'function') {
    blendMode.setOpacity(v);
  } else if (blendMode.opacity && typeof blendMode.opacity === 'object') {
    blendMode.opacity.value = v;
  }
}

function applyBloom(effect, opts) {
  if (!effect) return;
  const o = { ...DEFAULTS.bloom, ...opts };
  effect.enabled = !!o.enabled;
  effect.intensity = clamp(o.intensity, 0, 5);

  if (effect.luminanceMaterial) {
    effect.luminanceMaterial.threshold = clamp(o.luminanceThreshold, 0, 1);
    effect.luminanceMaterial.smoothing = clamp(o.luminanceSmoothing, 0, 1);
  }

  if (effect.luminancePass) {
    effect.luminancePass.enabled = !!o.luminancePass;
  }

  if (effect.mipmapBlurPass) {
    effect.mipmapBlurPass.enabled = !!o.mipmapBlur;
    effect.mipmapBlurPass.radius = clamp(o.radius, 0, 2);
    effect.mipmapBlurPass.levels = clamp(o.levels, 1, 8);
  }

  if (effect.resolution) {
    effect.resolution.scale = clamp(o.resolutionScale, 0.1, 2);
  }

  setOpacity(effect.blendMode, o.blendOpacity);
}

function applyDof(effect, opts) {
  if (!effect) return;
  const o = { ...DEFAULTS.dof, ...opts };
  effect.enabled = !!o.enabled;
  effect.bokehScale = clamp(o.bokehScale, 0, 10);

  const coc = effect.cocMaterial ?? effect.circleOfConfusionMaterial;
  if (coc) {
    if ('focusDistance' in coc) coc.focusDistance = clamp(o.focusDistance, 0, 1);
    if ('focusRange' in coc) coc.focusRange = clamp(o.focusRange, 0, 1);
    if ('focalLength' in coc) coc.focalLength = clamp(o.focalLength, 0, 1);
  }

  if (effect.resolution) {
    effect.resolution.scale = clamp(o.resolutionScale, 0.1, 2);
  }

  setOpacity(effect.blendMode, o.blendOpacity);
}

function applyFxaa(effect, opts) {
  if (!effect) return;
  const o = { ...DEFAULTS.fxaa, ...opts };
  effect.enabled = !!o.enabled;
  effect.minEdgeThreshold = clamp(o.minEdgeThreshold, 0, 1);
  effect.maxEdgeThreshold = clamp(o.maxEdgeThreshold, effect.minEdgeThreshold, 1);
  effect.subpixelQuality = clamp(o.subpixelQuality, 0, 1);
}

function snapshotBloom(effect) {
  if (!effect) return { ...DEFAULTS.bloom };
  return {
    enabled: !!effect.enabled,
    intensity: effect.intensity,
    luminanceThreshold: effect.luminanceMaterial?.threshold ?? DEFAULTS.bloom.luminanceThreshold,
    luminanceSmoothing: effect.luminanceMaterial?.smoothing ?? DEFAULTS.bloom.luminanceSmoothing,
    mipmapBlur: !!effect.mipmapBlurPass?.enabled,
    radius: effect.mipmapBlurPass?.radius ?? DEFAULTS.bloom.radius,
    levels: effect.mipmapBlurPass?.levels ?? DEFAULTS.bloom.levels,
    resolutionScale: effect.resolution?.scale ?? DEFAULTS.bloom.resolutionScale,
    luminancePass: !!effect.luminancePass?.enabled,
    blendOpacity:
      effect.blendMode?.getOpacity?.() ??
      effect.blendMode?.opacity?.value ??
      DEFAULTS.bloom.blendOpacity,
  };
}

function snapshotDof(effect) {
  if (!effect) return { ...DEFAULTS.dof };
  const coc = effect.cocMaterial ?? effect.circleOfConfusionMaterial;
  return {
    enabled: !!effect.enabled,
    focusDistance: coc?.focusDistance ?? DEFAULTS.dof.focusDistance,
    focusRange: coc?.focusRange ?? DEFAULTS.dof.focusRange,
    focalLength: coc?.focalLength ?? DEFAULTS.dof.focalLength,
    bokehScale: effect.bokehScale ?? DEFAULTS.dof.bokehScale,
    resolutionScale: effect.resolution?.scale ?? DEFAULTS.dof.resolutionScale,
    blendOpacity:
      effect.blendMode?.getOpacity?.() ??
      effect.blendMode?.opacity?.value ??
      DEFAULTS.dof.blendOpacity,
  };
}

function snapshotFxaa(effect) {
  if (!effect) return { ...DEFAULTS.fxaa };
  return {
    enabled: !!effect.enabled,
    minEdgeThreshold: effect.minEdgeThreshold,
    maxEdgeThreshold: effect.maxEdgeThreshold,
    subpixelQuality: effect.subpixelQuality,
  };
}

export function createPostProcessing({
  renderer,
  scene,
  camera,
  register,
  options = {},
} = {}) {
  if (!renderer) throw new Error('createPostProcessing: renderer is required.');
  if (!scene) throw new Error('createPostProcessing: scene is required.');
  if (!camera) throw new Error('createPostProcessing: camera is required.');

  let enabled = options.enabled ?? DEFAULTS.enabled;

  const composer = new EffectComposer(renderer, {
    frameBufferType: pickFrameBufferType(renderer),
    multisampling: renderer.capabilities?.isWebGL2 ? 4 : 0,
  });

  if (composer.renderTarget1?.texture)
    composer.renderTarget1.texture.colorSpace = renderer.outputColorSpace;
  if (composer.renderTarget2?.texture)
    composer.renderTarget2.texture.colorSpace = renderer.outputColorSpace;

  const renderPass = new RenderPass(scene, camera);
  renderPass.renderToScreen = false;
  composer.addPass(renderPass);

  // Bloom
  const bloomEffect = new BloomEffect({
    intensity: 0.8,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.025,
    mipmapBlur: true,
  });
  applyBloom(bloomEffect, options.bloom);

  // DOF (we always create it, worst case we leave it disabled)
  const depthOfFieldEffect = new DepthOfFieldEffect(camera, {
    focusDistance: DEFAULTS.dof.focusDistance,
    focalLength: DEFAULTS.dof.focalLength,
    bokehScale: DEFAULTS.dof.bokehScale,
  });
  applyDof(depthOfFieldEffect, options.dof || options.depthOfField);

  // FXAA
  const fxaaEffect = new FXAAEffect();
  applyFxaa(fxaaEffect, options.fxaa);

  const effectPass = new EffectPass(
    camera,
    bloomEffect,
    depthOfFieldEffect,
    fxaaEffect,
  );
  effectPass.renderToScreen = true;
  effectPass.dithering = true;
  effectPass.enabled = enabled;
  composer.addPass(effectPass);

  const size = new Vector2();
  renderer.getSize(size);
  composer.setSize(size.x, size.y);
  composer.setPixelRatio?.(renderer.getPixelRatio());

  const resize = (w, h, pr = renderer.getPixelRatio()) => {
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    composer.setSize(w, h);
    composer.setPixelRatio?.(pr);
  };

  const setPixelRatio = (pr) => {
    if (!Number.isFinite(pr)) return;
    composer.setPixelRatio?.(pr);
  };

  const render = (dt = 0) => {
    if (!enabled) {
      renderer.render(scene, camera);
      return;
    }
    composer.render(dt);
  };

  const dispose = () => {
    effectPass?.dispose?.();
    bloomEffect?.dispose?.();
    depthOfFieldEffect?.dispose?.();
    fxaaEffect?.dispose?.();
    renderPass?.dispose?.();
    composer?.dispose?.();
  };

  // Final API — expose all names
  const api = {
    composer,
    passes: { render: renderPass, effect: effectPass },
    effects: {
      // preferred
      bloom: bloomEffect,
      depthOfField: depthOfFieldEffect,
      fxaa: fxaaEffect,
      // legacy/safety aliases (your index.js may use any of these)
      bloomEffect,
      depthOfFieldEffect,
      dof: depthOfFieldEffect,
      fxaaEffect,
    },
    resize,
    setPixelRatio,
    render,
    dispose,
    get enabled() {
      return enabled;
    },
    set enabled(v) {
      enabled = !!v;
      effectPass.enabled = enabled;
    },
    get order() {
      return [...EFFECT_ORDER];
    },
    get state() {
      return {
        enabled,
        order: [...EFFECT_ORDER],
        bloom: snapshotBloom(bloomEffect),
        depthOfField: snapshotDof(depthOfFieldEffect),
        depthOfFieldEffect: snapshotDof(depthOfFieldEffect),
        dof: snapshotDof(depthOfFieldEffect),
        fxaa: snapshotFxaa(fxaaEffect),
      };
    },
    applyState(next = {}) {
      if (typeof next.enabled === 'boolean') api.enabled = next.enabled;
      if (next.bloom) applyBloom(bloomEffect, next.bloom);
      if (next.depthOfField) applyDof(depthOfFieldEffect, next.depthOfField);
      if (next.depthOfFieldEffect) applyDof(depthOfFieldEffect, next.depthOfFieldEffect);
      if (next.dof) applyDof(depthOfFieldEffect, next.dof);
      if (next.fxaa) applyFxaa(fxaaEffect, next.fxaa);
    },
  };

  // register for your SceneRegistry
  register?.('postprocessing', 'composer', { ref: composer });
  register?.('postprocessing', 'renderPass', { ref: renderPass });
  register?.('postprocessing', 'effectPass', { ref: effectPass });
  register?.('postprocessing', 'bloom', { ref: bloomEffect });
  register?.('postprocessing', 'bloomEffect', { ref: bloomEffect });
  register?.('postprocessing', 'depthOfField', { ref: depthOfFieldEffect });
  register?.('postprocessing', 'depthOfFieldEffect', { ref: depthOfFieldEffect });
  register?.('postprocessing', 'dof', { ref: depthOfFieldEffect });
  register?.('postprocessing', 'fxaa', { ref: fxaaEffect });
  register?.('postprocessing', 'fxaaEffect', { ref: fxaaEffect });
  register?.('postprocessing', 'controller', { ref: api, order: [...EFFECT_ORDER] });

  return api;
}
