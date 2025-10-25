// src/modules/TweakpaneManager.js
import { Pane } from 'tweakpane';
import * as Essentials from '@tweakpane/plugin-essentials';
import { get } from 'lodash';
import TweakpaneConfig from '../config/tweakpane-config';
import { ParticleSystem } from '@modules/Particles.js';

export default class TweakpaneManager {
  constructor(experience, opts = {}) {
    if (!experience) throw new Error('TweakpaneManager: experience is required');
    this.experience = experience;

    const { title = TweakpaneConfig.title, expanded = TweakpaneConfig.expanded } = opts;
    const pane = (this.pane = new Pane({ title, expanded, container: document.body }));

    // Add logo to Tweakpane header
    const titleElement = pane.element.querySelector('.tp-rotv_t');
    if (titleElement) {
      const logoImg = document.createElement('img');
      logoImg.src = '/cursor/logo.svg'; // Path to your logo
      logoImg.alt = 'Logo';
      logoImg.style.cssText = 'height: 1.5em; margin-right: 0.5em; vertical-align: middle;';
      titleElement.prepend(logoImg);
    }

    // Get canvas element from experience object
    this.canvas = experience.canvas; // Assuming experience object has a canvas property

    // Add expanded class to the pane element itself (not parent)
    if (expanded) {
      pane.element.classList.add('expanded');
      if (this.canvas) {
        this.canvas.style.pointerEvents = 'none';
      }
    }

    if (typeof pane.addBinding !== 'function') {
      throw new Error('TweakpaneManager: v4 API not found. Install tweakpane@4.0.5.');
    }

    try {
      pane.registerPlugin(Essentials);
    } catch (e) {
      console.warn('Failed to register Tweakpane Essentials plugin', e);
    }

    if (import.meta?.hot) {
      import.meta.hot.dispose(() => {
        try {
          pane.dispose();
        } catch (e) {
          console.warn('Failed to dispose Tweakpane during HMR', e);
        }
      });
    }

    this.buildPaneFromConfig(TweakpaneConfig.children, this.pane);
    this.addModels();
    this.addMaterials();
    this.addParticles();
    // Toggle canvas pointer events based on Tweakpane expanded state
    pane.on('fold', () => {
      if (this.canvas) {
        this.canvas.style.pointerEvents = 'auto';
      }
      pane.element.classList.remove('expanded');
    });

    pane.on('unfold', () => {
      if (this.canvas) {
        this.canvas.style.pointerEvents = 'none';
      }
      pane.element.classList.add('expanded');
    });
  }

  buildPaneFromConfig(children, container) {
    children.forEach((child) => {
      switch (child.type) {
        case 'folder':
          const folder = container.addFolder({ title: child.title, expanded: child.expanded });
          if (child.children) {
            this.buildPaneFromConfig(child.children, folder);
          }
          break;
        case 'binding':
          this.addBinding(container, child);
          break;
        case 'button':
          this.addButton(container, child);
          break;
        case 'fpsgraph':
          container.addBlade({ view: 'fpsgraph', label: child.label });
          break;
        default:
          console.warn(`Unknown Tweakpane control type: ${child.type}`);
      }
    });
  }

  addBinding(container, { path, label, min, max, step, onChange }) {
    const { target, key } = this.resolvePath(path);
    if (target && key in target) {
      const binding = container.addBinding(target, key, { label, min, max, step });
      if (onChange) {
        binding.on('change', () => onChange(target));
      }
    } else {
      this.addMessage(container, `Invalid binding path: ${path}`);
    }
  }

  addButton(container, { title, handler, args }) {
    const button = container.addButton({ title });
    button.on('click', () => {
      if (typeof this.experience[handler] === 'function') {
        this.experience[handler](...args);
      } else {
        console.warn(`Handler function '${handler}' not found on experience object.`);
      }
    });
  }

  addModels() {
    const modelsFolder = this.pane.children.find((child) => child.title === 'Assets')?.children.find((child) => child.title === 'Models');
    if (!modelsFolder) return;

    const meshes = this.experience.sceneRegistry?.meshes;
    if (!meshes) {
      this.addMessage(modelsFolder, 'Models not found in registry');
      return;
    }

    Object.keys(meshes).forEach((name) => {
      const model = meshes[name]?.ref;
      if (model) {
        const modelFolder = modelsFolder.addFolder({ title: name, expanded: false });
        modelFolder.addBinding(model.position, 'x', { label: 'Position X' });
        modelFolder.addBinding(model.position, 'y', { label: 'Position Y' });
        modelFolder.addBinding(model.position, 'z', { label: 'Position Z' });
        modelFolder.addBinding(model.rotation, 'x', { label: 'Rotation X', min: -Math.PI, max: Math.PI, step: 0.01 });
        modelFolder.addBinding(model.rotation, 'y', { label: 'Rotation Y', min: -Math.PI, max: Math.PI, step: 0.01 });
        modelFolder.addBinding(model.rotation, 'z', { label: 'Rotation Z', min: -Math.PI, max: Math.PI, step: 0.01 });
        modelFolder.addBinding(model.scale, 'x', { label: 'Scale X', min: 0.0001, max: 10, step: 0.0001 });
        modelFolder.addBinding(model.scale, 'y', { label: 'Scale Y', min: 0.0001, max: 10, step: 0.0001 });
        modelFolder.addBinding(model.scale, 'z', { label: 'Scale Z', min: 0.0001, max: 10, step: 0.0001 });

        const materialsFolder = modelFolder.addFolder({ title: 'Materials', expanded: false });
        const uniqueMaterials = new Map();
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
              if (!uniqueMaterials.has(material.uuid)) {
                uniqueMaterials.set(material.uuid, material);
              }
            });
          }
        });

        uniqueMaterials.forEach(material => {
          const matFolder = materialsFolder.addFolder({ title: material.name || 'Unnamed Material', expanded: false });
          if (material.color) {
            matFolder.addBinding(material, 'color', { label: 'Color' });
          }
          if (material.metalness !== undefined) {
            matFolder.addBinding(material, 'metalness', { label: 'Metalness', min: 0, max: 1, step: 0.01 });
          }
          if (material.roughness !== undefined) {
            matFolder.addBinding(material, 'roughness', { label: 'Roughness', min: 0, max: 1, step: 0.01 });
          }
        });
      }
    });
  }

  addMaterials() {
    const materialsFolder = this.pane.children.find((child) => child.title === 'Assets')?.children.find((child) => child.title === 'Material Library');
    if (!materialsFolder) return;

    const materials = this.experience.sceneRegistry?.materials;
    if (!materials) {
      this.addMessage(materialsFolder, 'Material library not found');
      return;
    }

    const materialNames = Object.keys(materials);
    const state = { preset: materialNames[0], target: 'alphaMat' };
    const targets = Object.keys(materials).map(name => ({ text: name, value: name }));

    const toOptions = (names) => names.map(n => ({ text: n, value: n }));

    materialsFolder.addBinding(state, 'preset', { label: 'Preset', options: toOptions(materialNames) });
    materialsFolder.addBinding(state, 'target', { label: 'Target', options: targets });

    materialsFolder.addButton({ title: 'Apply' }).on('click', () => {
      const targetMaterial = materials[state.target]?.ref;
      const presetMaterial = materials[state.preset]?.ref;

      if (targetMaterial && presetMaterial) {
        targetMaterial.copy(presetMaterial);
        targetMaterial.needsUpdate = true;
        console.log(`[materials] applied '${state.preset}' to '${state.target}'`);
      } else {
        console.warn('[materials] apply failed:', state);
      }
    });
  }

  addParticles() {
    const particlesFolder = this.pane.children.find((child) => child.title === 'Assets')?.children.find((child) => child.title === 'Particles');
    if (!particlesFolder) return;

    const particles = this.experience.sceneRegistry?.particles?.main?.ref;
    if (!particles) {
      this.addMessage(particlesFolder, 'ParticleSystem not found');
      return;
    }

    const presetNames = Object.keys(ParticleSystem.PRESETS);
    const presetOptions = presetNames.map((name) => ({ text: name, value: name }));
    particlesFolder.addBinding({ preset: 'default' }, 'preset', { label: 'Preset', options: presetOptions }).on('change', (ev) => {
      particles.applyPreset(ev.value);
    });

    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.visible', label: 'Visible' });
    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.particleSize', label: 'Size', min: 0.01, max: 1, step: 0.01 });
    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.particleColor', label: 'Color' });
    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.particleOpacity', label: 'Opacity', min: 0, max: 1, step: 0.01 });
    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.velocityFactor', label: 'Velocity Factor', min: 0, max: 5, step: 0.1 });
    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.emissionRate', label: 'Emission Rate', min: 1, max: 100, step: 1 });
    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.maxAge', label: 'Max Age', min: 1, max: 20, step: 1 });
    this.addBinding(particlesFolder, { path: 'sceneRegistry.particles.main.ref.areaSize', label: 'Area Size', min: 1, max: 50, step: 1 });

    const textureNames = ['star_0.png', 'star_01.png', 'star_02.png', 'star_03.png', 'star_07.png'];
    const textureOptions = textureNames.map((name) => ({ text: name, value: name }));
    particlesFolder.addBinding(particles, 'textureName', { label: 'Texture', options: textureOptions }).on('change', (ev) => {
      particles.loadTexture(ev.value);
    });
  }

  addEnvironmentControls() {
    const envFolder = this.pane.children.find((child) => child.title === 'Scene')?.children.find((child) => child.title === 'Environment');
    if (!envFolder) return;

    const envs = ['era-7.hdr', 'mayoris.hdr', 'OMEGA.hdr', 'softbox.hdr'];
    const options = envs.map(env => ({ text: env, value: env }));
    const state = { environment: envs[0] };

    envFolder.addBinding(state, 'environment', { label: 'Environment', options }).on('change', (ev) => {
      this.experience.setEnvironment(ev.value);
    });
  }

  addMessage(container, text) {
    container.addFolder({ title: `⚠ ${text}`, expanded: false });
  }

  resolvePath(path) {
    const parts = path.split('.');
    const key = parts.pop();
    const targetPath = parts.join('.');
    const target = get(this.experience, targetPath);
    return { target, key };
  }
}