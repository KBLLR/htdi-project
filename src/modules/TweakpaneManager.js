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
    } catch {
      // Essentials is optional; fallback handled below where used
    }

    if (import.meta?.hot) {
      import.meta.hot.dispose(() => {
        try {
          pane.dispose();
        } catch { }
      });
    }

    this.#camera();
    this.#controls();
    this.#lights();
    this.#materials();
    this.#perf();
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

  #lights() {
    const f = this.#folder('Lights');
    const reg = this.experience.sceneRegistry?.lights;

    if (!reg) {
      this.#msg(f, 'sceneRegistry.lights missing');
      return;
    }

    // Directional
    const d = reg.directional?.ref;
    if (d) {
      const df = this.#folder('Directional', false);
      this.#bind(df, d, 'intensity', { label: 'Intensity', min: 0, max: 5, step: 0.01 });
      if (d.color) {
        ['r', 'g', 'b'].forEach((c) => this.#bind(df, d.color, c, { label: `Color ${c.toUpperCase()}`, min: 0, max: 1, step: 0.001 }));
      }
      ['x', 'y', 'z'].forEach((c) => this.#bind(df, d.position, c, { label: `Pos ${c.toUpperCase()}` }));
    }

    // Rotating points
    const rp = Array.isArray(reg.rotatingPoints) ? reg.rotatingPoints : [];
    rp.forEach((item, i) => {
      const l = item?.ref;
      if (!l) return;
      const pf = this.#folder(`Point ${i + 1}`, false);
      this.#bind(pf, l, 'intensity', { label: 'Intensity', min: 0, max: 20, step: 0.01 });
      this.#bind(pf, l, 'distance', { label: 'Distance', min: 0, max: 1000, step: 1 });
      this.#bind(pf, l, 'decay', { label: 'Decay', min: 0, max: 2, step: 0.01 });
      if (l.color) {
        ['r', 'g', 'b'].forEach((c) => this.#bind(pf, l.color, c, { label: `Color ${c.toUpperCase()}`, min: 0, max: 1, step: 0.001 }));
      }
      ['x', 'y', 'z'].forEach((c) => this.#bind(pf, l.position, c, { label: `Pos ${c.toUpperCase()}` }));
    });
  }

  #materials() {
    const f = this.#folder('Materials');
    const mats = this.experience.sceneRegistry?.materials;

    if (!mats) {
      this.#msg(f, 'sceneRegistry.materials missing');
      return;
    }

    const add = (mat, title) => {
      if (!mat) return;
      const mf = this.#folder(title, false);

      const bind = (k, opts) => (k in mat) && this.#bind(mf, mat, k, opts);

      bind('transparent', { label: 'Transparent' });
      bind('wireframe', { label: 'Wireframe' });
      bind('opacity', { label: 'Opacity', min: 0, max: 1, step: 0.01 });
      bind('roughness', { label: 'Roughness', min: 0, max: 1, step: 0.01 });
      bind('metalness', { label: 'Metalness', min: 0, max: 1, step: 0.01 });
      bind('emissiveIntensity', { label: 'Emissive Int', min: 0, max: 10, step: 0.1 });

      if (mat.emissive) {
        ['r', 'g', 'b'].forEach((c) => this.#bind(mf, mat.emissive, c, { label: `Emissive ${c.toUpperCase()}`, min: 0, max: 1, step: 0.001 }));
      }
      if (mat.color) {
        ['r', 'g', 'b'].forEach((c) => this.#bind(mf, mat.color, c, { label: `Color ${c.toUpperCase()}`, min: 0, max: 1, step: 0.001 }));
      }

      bind('envMapIntensity', { label: 'EnvMap Int', min: 0, max: 10, step: 0.1 });
      bind('alphaTest', { label: 'Alpha Test', min: 0, max: 1, step: 0.01 });
      bind('ior', { label: 'IOR', min: 1, max: 2.33, step: 0.01 });
      bind('thickness', { label: 'Thickness', min: 0, max: 1, step: 0.01 });
      bind('specularIntensity', { label: 'Spec Int', min: 0, max: 10, step: 0.1 });

      if (mat.specularColor) {
        ['r', 'g', 'b'].forEach((c) => this.#bind(mf, mat.specularColor, c, { label: `Specular ${c.toUpperCase()}`, min: 0, max: 1, step: 0.001 }));
      }
    };

    add(mats.alphaMat?.ref, 'Outer Mesh');
    add(mats.innerSphereMaterial?.ref, 'Inner Sphere');
    add(mats.kidMaterial?.ref, 'Kid');
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
