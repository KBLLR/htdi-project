// src/modules/TweakpaneManager.js
// v4.0.5 ONLY — no v3 shims. Removes all 'text' blades (which require a plugin),
// and uses pluginless placeholders instead (folders) to avoid "No matching view" errors.

import { Pane } from 'tweakpane';
import * as Essentials from '@tweakpane/plugin-essentials'; // optional but recommended (fpsgraph)

export default class TweakpaneManager {
  /**
   * @param {object} experience - expects { camera?, controls?, sceneRegistry? }
   * @param {{title?:string, expanded?:boolean}} [opts]
   */
  constructor(experience, opts = {}) {
    if (!experience) throw new Error('TweakpaneManager: experience is required');
    this.experience = experience;

    const { title = 'HTDI Controls', expanded = true } = opts;
    const pane = (this.pane = new Pane({ title, expanded }));

    if (typeof pane.addBinding !== 'function') {
      throw new Error('TweakpaneManager: v4 API not found. Install tweakpane@4.0.5.');
    }

    try {
      pane.registerPlugin(Essentials); // provides fpsgraph, etc.
    } catch (e) {
      // Essentials is optional; fallback handled below where used
      console.warn('Failed to register Tweakpane Essentials plugin', e);
    }

    if (import.meta?.hot) {
      import.meta.hot.dispose(() => {
        try {
          pane.dispose();
        } catch (e) {
          // Ignore dispose errors during HMR
          console.warn('Failed to dispose Tweakpane during HMR', e);
        }
      });
    }

    this.#camera();
    this.#controls();
    this.#sceneSettings();
    this.#postprocessing();
    this.#models();
    this.#perf();
  }

  // ---------- panels ----------

  #sceneSettings() {
    const f = this.#folder('Scene Settings');
    const envFolder = this.#folder('Environment', false);
    f.add(envFolder);

    const scene = this.experience.scene;
    const renderer = this.experience.renderer;
    const materials = this.experience.sceneRegistry?.materials;

    if (scene) {
      // Skybox (using renderer.toneMappingExposure for overall environment brightness)
      const skyboxFolder = this.#folder('Skybox', false);
      envFolder.add(skyboxFolder);
      this.#bind(skyboxFolder, renderer, 'toneMappingExposure', { label: 'Intensity', min: 0, max: 5, step: 0.01 });
      // Note: Direct texture change is complex for Tweakpane, skipping for now.

      // Ground
      const groundFolder = this.#folder('Ground', false);
      envFolder.add(groundFolder);
      const groundMaterial = materials?.groundMaterial?.ref;
      if (groundMaterial && groundMaterial.color) {
        this.#bind(groundFolder, groundMaterial.color, 'r', { label: 'Color R', min: 0, max: 1, step: 0.001 });
        this.#bind(groundFolder, groundMaterial.color, 'g', { label: 'Color G', min: 0, max: 1, step: 0.001 });
        this.#bind(groundFolder, groundMaterial.color, 'b', { label: 'Color B', min: 0, max: 1, step: 0.001 });
      } else {
        this.#msg(groundFolder, 'Ground material not found');
      }
    } else {
      this.#msg(envFolder, 'Scene not found');
    }

    const lightingFolder = this.#folder('Lighting', false);
    f.add(lightingFolder);
    const lights = this.experience.sceneRegistry?.lights;

    if (lights) {
      // Ambient Light (assuming a global ambient light or adding a placeholder)
      // For now, let's assume there's no explicit ambient light and add a placeholder.
      const ambientFolder = this.#folder('Ambient', false);
      lightingFolder.add(ambientFolder);
      this.#msg(ambientFolder, 'Ambient light not directly controllable via registry');

      // Directional Light
      const directionalLight = lights.directional?.ref;
      if (directionalLight) {
        const directionalFolder = this.#folder('Directional', false);
        lightingFolder.add(directionalFolder);
        this.#bind(directionalFolder, directionalLight.color, 'r', { label: 'Color R', min: 0, max: 1, step: 0.001 });
        this.#bind(directionalFolder, directionalLight.color, 'g', { label: 'Color G', min: 0, max: 1, step: 0.001 });
        this.#bind(directionalFolder, directionalLight.color, 'b', { label: 'Color B', min: 0, max: 1, step: 0.001 });
        this.#bind(directionalFolder, directionalLight, 'intensity', { label: 'Intensity', min: 0, max: 5, step: 0.01 });
        this.#bind(directionalFolder, directionalLight.position, 'x', { label: 'Position X' });
        this.#bind(directionalFolder, directionalLight.position, 'y', { label: 'Position Y' });
        this.#bind(directionalFolder, directionalLight.position, 'z', { label: 'Position Z' });
      } else {
        this.#msg(lightingFolder, 'Directional light not found');
      }
    } else {
      this.#msg(lightingFolder, 'Lights not found in registry');
    }
  }

  #postprocessing() {
    const f = this.#folder('Post-processing');
    const effectsFolder = this.#folder('Effects', false);
    f.add(effectsFolder);

    const pp = this.experience.sceneRegistry?.postprocessing;

    if (!pp) {
      this.#msg(effectsFolder, 'Post-processing effects missing');
      return;
    }

    // Bloom
    const bloom = pp.bloomEffect?.ref;
    if (bloom) {
      const bloomFolder = this.#folder('Bloom', false);
      effectsFolder.add(bloomFolder);
      this.#bind(bloomFolder, bloom, 'luminanceThreshold', { label: 'Threshold', min: 0, max: 1, step: 0.01 });
      this.#bind(bloomFolder, bloom, 'intensity', { label: 'Strength', min: 0, max: 5, step: 0.01 });
      this.#bind(bloomFolder, bloom, 'luminanceSmoothing', { label: 'Radius', min: 0, max: 1, step: 0.01 });
    } else {
      this.#msg(effectsFolder, 'Bloom effect not found');
    }

    // Depth of Field
    const dof = pp.depthOfFieldEffect?.ref;
    if (dof) {
      const dofFolder = this.#folder('DOF', false);
      effectsFolder.add(dofFolder);
      this.#bind(dofFolder, dof, 'focusDistance', { label: 'Focus', min: 0, max: 1, step: 0.01 });
      this.#bind(dofFolder, dof, 'bokehScale', { label: 'Aperture', min: 0, max: 10, step: 0.1 });
      // MaxBlur is not a direct property, bokehScale controls the blur amount.
      this.#msg(dofFolder, 'MaxBlur controlled by Aperture (Bokeh Scale)');
    } else {
      this.#msg(effectsFolder, 'Depth of Field effect not found');
    }
  }

  #models() {
    const f = this.#folder('Models');
    const meshes = this.experience.sceneRegistry?.meshes;

    if (!meshes) {
      this.#msg(f, 'Models not found in registry');
      return;
    }

    const modelNames = ['kid', 'creativeFlow', 'platform']; // Add other model names as needed

    modelNames.forEach(name => {
      const model = meshes[name]?.ref;
      if (model) {
        const modelFolder = this.#folder(name, false);
        f.add(modelFolder);

        // Position
        const posFolder = this.#folder('Position', false);
        modelFolder.add(posFolder);
        this.#bind(posFolder, model.position, 'x', { label: 'X' });
        this.#bind(posFolder, model.position, 'y', { label: 'Y' });
        this.#bind(posFolder, model.position, 'z', { label: 'Z' });

        // Rotation
        const rotFolder = this.#folder('Rotation', false);
        modelFolder.add(rotFolder);
        this.#bind(rotFolder, model.rotation, 'x', { label: 'X', min: -Math.PI, max: Math.PI, step: 0.01 });
        this.#bind(rotFolder, model.rotation, 'y', { label: 'Y', min: -Math.PI, max: Math.PI, step: 0.01 });
        this.#bind(rotFolder, model.rotation, 'z', { label: 'Z', min: -Math.PI, max: Math.PI, step: 0.01 });

        // Scale
        const scaleFolder = this.#folder('Scale', false);
        modelFolder.add(scaleFolder);
        this.#bind(scaleFolder, model.scale, 'x', { label: 'X', min: 0.0001, max: 10, step: 0.0001 });
        this.#bind(scaleFolder, model.scale, 'y', { label: 'Y', min: 0.0001, max: 10, step: 0.0001 });
        this.#bind(scaleFolder, model.scale, 'z', { label: 'Z', min: 0.0001, max: 10, step: 0.0001 });
      }
    });
  }

  // ---------- helpers ----------
  #folder(title, expanded = true) {
    return this.pane.addFolder({ title, expanded });
  }

  // Pluginless placeholder (instead of addBlade({view:'text'}))
  #msg(container, text) {
    return container.addFolder({ title: `⚠ ${text}`, expanded: false });
  }

  #bind(container, obj, key, opts = {}) {
    if (!obj || !(key in obj)) {
      return this.#msg(container, opts.label ?? key ?? 'missing binding');
    }
    return container.addBinding(obj, key, opts);
  }

  // ---------- panels ----------
  #camera() {
    const cam = this.experience.camera;
    const f = this.#folder('Camera');

    if (!cam) {
      this.#msg(f, 'camera not found');
      return;
    }

    this.#bind(f, cam.position, 'x', { label: 'Pos X' });
    this.#bind(f, cam.position, 'y', { label: 'Pos Y' });
    this.#bind(f, cam.position, 'z', { label: 'Pos Z' });

    const fov = this.#bind(f, cam, 'fov', { label: 'FOV', min: 10, max: 150, step: 1 });
    fov?.on?.('change', () => cam.updateProjectionMatrix());

    const p = this.#folder('Presets', false);
    p.addButton({ title: 'Overview' }).on('click', () => this.experience?.animateCameraPreset?.('overview'));
    p.addButton({ title: 'Focus' }).on('click', () => this.experience?.animateCameraPreset?.('focus'));
  }

  #controls() {
    const c = this.experience.controls;
    const f = this.#folder('Controls');

    if (!c) {
      this.#msg(f, 'controls missing');
      return;
    }

    this.#bind(f, c, 'enabled', { label: 'Enabled' });
    this.#bind(f, c, 'autoRotate', { label: 'Auto Rotate' });
    this.#bind(f, c, 'autoRotateSpeed', { label: 'AutoRot Speed', min: -10, max: 10, step: 0.1 });
    this.#bind(f, c, 'enableDamping', { label: 'Damping On' });
    this.#bind(f, c, 'dampingFactor', { label: 'Damping', min: 0.01, max: 0.25, step: 0.005 });
    this.#bind(f, c, 'minDistance', { label: 'Min Dist', min: 0.01, max: 20, step: 0.01 });
    this.#bind(f, c, 'maxDistance', { label: 'Max Dist', min: 0.1, max: 100, step: 0.1 });

    if (c.target) {
      const t = this.#folder('Target', false);
      this.#bind(t, c.target, 'x', { label: 'Target X' });
      this.#bind(t, c.target, 'y', { label: 'Target Y' });
      this.#bind(t, c.target, 'z', { label: 'Target Z' });
    }
  }

  #perf() {
    const f = this.#folder('Perf', false);
    try {
      f.addBlade({ view: 'fpsgraph', label: 'FPS' });
    } catch {
      this.#msg(f, 'install @tweakpane/plugin-essentials for fpsgraph');
    }
  }
}
