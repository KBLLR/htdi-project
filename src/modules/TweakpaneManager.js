// src/modules/TweakpaneManager.js
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import * as Essentials from '@tweakpane/plugin-essentials';
import { get } from 'lodash';
import TweakpaneConfig from '../config/tweakpane-config';
import { ParticleSystem } from '@modules/Particles.js';
import { loadTextureAsset } from '@modules/assetRegistry.js';
import { initialisePaneShell, hidePaneElement, showPaneElement } from '@modules/tweakpane/paneVisibility.js';
import {
  hdrAssets,
  cubemapAssets,
  kidSkinVariants,
  textureAssets,
  goboAssets,
  pbrMaterialSets,
  toOptions,
  getHdrById,
  getCubemapById,
  getKidSkinVariantById,
  getTextureById,
  getPbrMaterialSetById,
} from '@config/assetCatalog.js';
import { loadPbrMaterial, applyPbrParameters, applyMaterialToObject } from '@modules/pbr/pbrMaterialLoader.js';

const DEFAULT_ALPHA_SRC = '/alphamaps/alpha-001.png';

const DEFAULT_FOG_STATE = {
  enabled: false,
  type: 'exp2',
  color: '#1a2430',
  density: 0.02,
  near: 2,
  far: 60
};

const DEFAULT_SPOTLIGHT_STATE = {
  intensity: 2.5,
  angle: Math.PI / 5,
  penumbra: 0.4,
  decay: 1,
  distance: 35,
  color: '#ffffff',
  position: [2.5, 5.5, 2.5],
  target: [0, 0.6, 0],
  gobo: null
};

function slugifyId(value) {
  if (!value) return 'scene';
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'scene';
}

function formatColor(color) {
  if (!color) return '#ffffff';
  if (typeof color === 'string') return color;
  if (color.isColor) {
    return `#${color.getHexString().padStart(6, '0')}`;
  }
  if (color instanceof THREE.Color) {
    return `#${color.getHexString().padStart(6, '0')}`;
  }
  return '#ffffff';
}

function prettifyLabel(value) {
  if (!value) return 'Item';
  return value
    .toString()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const clone = (value) => {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

export default class TweakpaneManager {
  constructor(experience, opts = {}) {
    if (!experience) throw new Error('TweakpaneManager: experience is required');
    this.experience = experience;
    this.cleanups = [];
    this.modelFolders = new Map();
    this.modelsFolder = null;
    this.environmentState = null;
    this.initialSceneState = this.experience.getCurrentSceneState?.() ?? {};
    this.characterState = {
      character: this.experience.currentCharacter?.() ?? this.experience.availableCharacters?.[0]?.id ?? 'kid'
    };
    const initialKidVariant = this.initialSceneState.metadata?.kidSkinVariant;
    this.kidSkinState = { variant: kidSkinVariants[0]?.id ?? null };
    if (initialKidVariant && kidSkinVariants.some((entry) => entry.id === initialKidVariant)) {
      this.kidSkinState.variant = initialKidVariant;
    }
    this.textureState = { texture: textureAssets[0]?.id ?? null, target: null };
    this.fogState = this.normaliseFogState(
      this.experience.getFogState?.() ?? this.initialSceneState.fog ?? DEFAULT_FOG_STATE
    );
    this.spotlightState = this.normaliseSpotlightState(
      this.experience.getSpotlightState?.() ?? this.initialSceneState.lighting?.spotlight ?? DEFAULT_SPOTLIGHT_STATE
    );
    this.goboBindingState = null;
    this.spotlightPositionState = null;
    this.spotlightTargetState = null;
    this.fpsMonitorCleanup = null;
    this.updatePbrMapInfo = () => { };
    this.pbrMaterialState = {
      setId: pbrMaterialSets[0]?.id ?? null,
      target: 'character:active',
      metalness: 1,
      roughness: 1,
      envMapIntensity: 1,
      clearcoat: 0,
      clearcoatRoughness: 0.25,
      normalScale: 1,
      displacementScale: 0,
      bumpScale: 1,
      ior: 1.5,
      transmission: 0,
      thickness: 0,
      attenuationDistance: 0,
      attenuationColor: '#ffffff',
      emissiveColor: '#000000',
      emissiveIntensity: 0,
      opacity: 1,
      transparent: false,
      sheen: 0,
      sheenRoughness: 1,
      specularIntensity: 1,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessMin: 100,
      iridescenceThicknessMax: 400,
    };
    this.activePbrMaterial = null;
    this.pbrAssignments = new Set();
    this.hidden = true;

    const { title = TweakpaneConfig.title, expanded = TweakpaneConfig.expanded } = opts;
    const pane = (this.pane = new Pane({ title, expanded, container: document.body }));
    initialisePaneShell(pane.element, { hidden: true });

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
        if (Array.isArray(this.cleanups)) {
          this.cleanups.forEach((cleanup) => {
            try {
              cleanup?.();
            } catch (error) {
              console.warn('Tweakpane cleanup failed', error);
            }
          });
        }
        try {
          pane.dispose();
        } catch (e) {
          console.warn('Failed to dispose Tweakpane during HMR', e);
        }
      });
    }

    this.handleSceneApplied = this.handleSceneApplied.bind(this);
    window.addEventListener('htdi:scene-applied', this.handleSceneApplied);
    this.cleanups.push(() => window.removeEventListener('htdi:scene-applied', this.handleSceneApplied));

    const unregisterCharacters = this.experience.sceneRegistryApi?.onRegisterCategory?.('characters', ({ name } = {}) => {
      const key = this.normalisePbrTarget(`character:${name}`);
      if (this.pbrAssignments.has(key)) {
        this.applyPbrMaterialToTarget(key, { material: this.activePbrMaterial }).catch((error) => {
          console.warn('[pbr] failed to reapply material to character', error);
        });
      }
      if (name === 'active' && this.pbrAssignments.has('character:active')) {
        this.applyPbrMaterialToTarget('character:active', { material: this.activePbrMaterial }).catch((error) => {
          console.warn('[pbr] failed to reapply material to active character', error);
        });
      }
    });
    if (typeof unregisterCharacters === 'function') {
      this.cleanups.push(unregisterCharacters);
    }

    const unregisterMeshes = this.experience.sceneRegistryApi?.onRegisterCategory?.('meshes', ({ name } = {}) => {
      const key = this.normalisePbrTarget(`mesh:${name}`);
      if (this.pbrAssignments.has(key)) {
        this.applyPbrMaterialToTarget(key, { material: this.activePbrMaterial }).catch((error) => {
          console.warn('[pbr] failed to reapply material to mesh', error);
        });
      }
    });
    if (typeof unregisterMeshes === 'function') {
      this.cleanups.push(unregisterMeshes);
    }

    const unregisterMaterials = this.experience.sceneRegistryApi?.onRegisterCategory?.('materials', ({ name } = {}) => {
      const key = this.normalisePbrTarget(`material:${name}`);
      if (this.pbrAssignments.has(key)) {
        this.applyPbrMaterialToTarget(key, { material: this.activePbrMaterial }).catch((error) => {
          console.warn('[pbr] failed to reapply material to material target', error);
        });
      }
    });
    if (typeof unregisterMaterials === 'function') {
      this.cleanups.push(unregisterMaterials);
    }

    this.buildPaneFromConfig(TweakpaneConfig.children, this.pane);
    this.addEnvironmentControls();
    this.addLightingControls();
    this.addModels();
    this.addCharacters();
    this.addMaterials();
    this.addKidSkins();
    this.addTextures();
    this.addParticles();
    this.addPbrMaterials();
    this.addVideoControls();
    // Track expanded state visually
    pane.on('fold', () => {
      pane.element.classList.remove('expanded');
    });

    pane.on('unfold', () => {
      pane.element.classList.add('expanded');
      if (!this.hidden) {
        showPaneElement(pane.element);
      }
    });

    const dataButton = document.getElementById('data-btn');
    if (dataButton) {
      dataButton.classList.remove('is-active');
      dataButton.setAttribute('aria-pressed', 'false');
    }
  }

  buildPaneFromConfig(children, container) {
    children.forEach((child) => {
      switch (child.type) {
        case 'folder': {
          const folder = container.addFolder({ title: child.title, expanded: child.expanded });
          if (child.children) {
            this.buildPaneFromConfig(child.children, folder);
          }
          break;
        }
        case 'binding':
          this.addBinding(container, child);
          break;
        case 'button':
          this.addButton(container, child);
          break;
        case 'fpsgraph':
          this.addFpsGraph(container, child);
          break;
        default:
          console.warn(`Unknown Tweakpane control type: ${child.type}`);
      }
    });
  }

  addBinding(container, { path, label, min, max, step, onChange }) {
    if (path?.startsWith('sceneRegistry.')) {
      this.addSceneRegistryBinding(container, { path, label, min, max, step, onChange });
      return;
    }
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

  addSceneRegistryBinding(container, config) {
    const { path, label, min, max, step, onChange } = config;
    const parts = path.split('.');
    if (parts.length < 4) {
      this.addMessage(container, `Invalid registry path: ${path}`);
      return;
    }

    const [, category, name, ...propSegments] = parts;
    if (!category || !name || !propSegments.length) {
      this.addMessage(container, `Invalid registry path: ${path}`);
      return;
    }

    const key = propSegments.pop();
    const getTarget = () => {
      const registryApi = this.experience.sceneRegistryApi;
      let entry = registryApi?.get?.(category, name);
      if (!entry) {
        entry = this.experience.sceneRegistry?.[category]?.[name];
      }
      if (!entry) return null;
      let target = entry;
      for (const segment of propSegments) {
        target = target?.[segment];
        if (target == null) return null;
      }
      return target ?? null;
    };

    const attemptBinding = () => {
      const target = getTarget();
      if (!target || !(key in target)) return false;
      const binding = container.addBinding(target, key, { label, min, max, step });
      if (onChange) {
        binding.on('change', () => onChange(target));
      }
      return true;
    };

    if (attemptBinding()) {
      return;
    }

    const registryApi = this.experience.sceneRegistryApi;
    if (registryApi?.onRegisterCategory) {
      const unsubscribe = registryApi.onRegisterCategory(category, ({ name: registeredName }) => {
        if (registeredName !== name) return;
        if (attemptBinding()) {
          unsubscribe?.();
          const idx = this.cleanups.indexOf(unsubscribe);
          if (idx !== -1) this.cleanups.splice(idx, 1);
        }
      });
      if (typeof unsubscribe === 'function') {
        this.cleanups.push(unsubscribe);
      }
    } else {
      this.addMessage(container, `Waiting for ${category}.${name}`);
    }
  }

  addModels() {
    this.modelsFolder = this.getFolder(['Assets', 'Models']);
    if (!this.modelsFolder) return;
    const meshes = this.experience.sceneRegistry?.meshes;
    if (!meshes) {
      this.addMessage(this.modelsFolder, 'Models not found in registry');
    } else {
      Object.entries(meshes).forEach(([name, entry]) => {
        this.createModelControls(name, entry?.ref);
      });
    }

    const api = this.experience.sceneRegistryApi;
    if (api?.onRegisterCategory) {
      const unsubscribe = api.onRegisterCategory('meshes', ({ name, data }) => {
        this.createModelControls(name, data?.ref);
      });
      if (unsubscribe) {
        this.cleanups.push(unsubscribe);
      }
    }
  }

  addCharacters() {
    const charactersFolder = this.getFolder(['Assets', 'Characters']);
    if (!charactersFolder) return;

    const characters = this.experience.availableCharacters ?? [];
    if (!characters.length) {
      this.addMessage(charactersFolder, 'No characters available');
      return;
    }

    if (!this.characterState) {
      this.characterState = { character: characters[0].id };
    } else if (!this.characterState.character) {
      this.characterState.character = characters[0].id;
    }

    const options = characters.map(({ id, label }) => ({ text: label, value: id }));
    charactersFolder.addBinding(this.characterState, 'character', { label: 'Active', options }).on('change', (ev) => {
      this.characterState.character = ev.value;
      Promise.resolve(this.experience.setCharacter?.(ev.value))
        .then(() => {
          this.experience.updateSceneState?.({ character: { id: ev.value } });
        })
        .catch((error) => {
          console.warn('Failed to set character from Tweakpane change', error);
        });
    });

    charactersFolder.addButton({ title: 'Apply Character' }).on('click', () => {
      if (!this.characterState?.character) return;
      Promise.resolve(this.experience.setCharacter?.(this.characterState.character))
        .then(() => {
          this.experience.updateSceneState?.({ character: { id: this.characterState.character } });
        })
        .catch((error) => {
          console.warn('Failed to set character from Tweakpane button', error);
        });
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

  addKidSkins() {
    const kidSkinsFolder = this.getFolder(['Assets', 'Kid Skins']);
    if (!kidSkinsFolder) return;

    if (!kidSkinVariants.length) {
      this.addMessage(kidSkinsFolder, 'No kid skins found in manifest');
      return;
    }

    const options = toOptions(kidSkinVariants);
    if (!this.kidSkinState.variant && options.length) {
      this.kidSkinState.variant = options[0].value;
    }

    kidSkinsFolder.addBinding(this.kidSkinState, 'variant', { label: 'Variant', options }).on('change', (ev) => {
      this.kidSkinState.variant = ev.value;
      this.applyKidSkin(ev.value);
    });

    kidSkinsFolder.addButton({ title: 'Reapply Variant' }).on('click', () => {
      this.applyKidSkin(this.kidSkinState.variant);
    });

    const api = this.experience.sceneRegistryApi;
    if (api?.onRegisterCategory) {
      const unsubscribe = api.onRegisterCategory('materials', ({ name }) => {
        if (name === 'kidMaterial') {
          this.applyKidSkin(this.kidSkinState.variant);
        }
      });
      if (typeof unsubscribe === 'function') {
        this.cleanups.push(unsubscribe);
      }
    }

    // Attempt an initial application when the material is already available.
    this.applyKidSkin(this.kidSkinState.variant);
  }

  addTextures() {
    const texturesFolder = this.getFolder(['Assets', 'Textures']);
    if (!texturesFolder) return;

    if (!textureAssets.length) {
      this.addMessage(texturesFolder, 'No textures found in manifest');
      return;
    }

    const textureOptions = toOptions(textureAssets);
    if (!this.textureState.texture && textureOptions.length) {
      this.textureState.texture = textureOptions[0].value;
    }

    const materialEntries = this.experience.sceneRegistry?.materials ?? {};
    const materialNames = Object.keys(materialEntries);
    const materialOptions = materialNames.map((name) => ({ text: name, value: name }));
    if (!this.textureState.target && materialOptions.length) {
      this.textureState.target = materialOptions[0].value;
    }

    texturesFolder.addBinding(this.textureState, 'texture', { label: 'Texture', options: textureOptions }).on('change', (ev) => {
      this.textureState.texture = ev.value;
    });

    if (materialOptions.length) {
      texturesFolder.addBinding(this.textureState, 'target', { label: 'Target Material', options: materialOptions }).on('change', (ev) => {
        this.textureState.target = ev.value;
      });
    } else {
      this.addMessage(texturesFolder, 'No materials available to apply textures');
    }

    texturesFolder.addButton({ title: 'Apply To Map' }).on('click', () => {
      this.applyTextureToMaterial(this.textureState.texture, this.textureState.target);
    });
  }

  addPbrMaterials() {
    const libraryFolder = this.getFolder(['Assets', 'Material Library']);
    if (!libraryFolder) return;

    if (!pbrMaterialSets.length) {
      this.addMessage(libraryFolder, 'No PBR material sets found');
      return;
    }

    const pbrFolder = libraryFolder.addFolder({ title: 'PBR Materials', expanded: false });
    const setOptions = pbrMaterialSets.map((set) => ({ text: set.label, value: set.id }));
    if (!this.pbrMaterialState.setId && setOptions.length) {
      this.pbrMaterialState.setId = setOptions[0].value;
    }

    const targetOptions = this.getPbrTargetOptions();
    if (!targetOptions.find((opt) => opt.value === this.pbrMaterialState.target) && targetOptions.length) {
      this.pbrMaterialState.target = this.normalisePbrTarget(targetOptions[0].value);
    }

    pbrFolder
      .addBinding(this.pbrMaterialState, 'setId', { label: 'Preset', options: setOptions })
      .on('change', (ev) => {
        this.pbrMaterialState.setId = ev.value;
        this.loadCurrentPbrMaterial({ force: true }).catch((error) => {
          console.warn('[pbr] failed to load material', error);
        });
        this.updatePbrMapInfo?.();
      });

    pbrFolder
      .addBinding(this.pbrMaterialState, 'target', { label: 'Target', options: targetOptions })
      .on('change', (ev) => {
        this.pbrMaterialState.target = this.normalisePbrTarget(ev.value);
      });

    pbrFolder.addButton({ title: 'Apply PBR Material' }).on('click', () => {
      this.applyPbrMaterialToTarget(this.pbrMaterialState.target).catch((error) => {
        console.error('[pbr] failed to apply material', error);
      });
    });

    const slider = (prop, label, min, max, step) =>
      pbrFolder
        .addBinding(this.pbrMaterialState, prop, { label, min, max, step })
        .on('change', (ev) => {
          this.updateActivePbrMaterial({ [prop]: ev.value });
        });

    slider('metalness', 'Metalness', 0, 1, 0.01);
    slider('roughness', 'Roughness', 0, 1, 0.01);
    slider('envMapIntensity', 'Env Intensity', 0, 8, 0.05);
    slider('clearcoat', 'Clearcoat', 0, 1, 0.01);
    slider('clearcoatRoughness', 'Coat Rough', 0, 1, 0.01);
    slider('normalScale', 'Normal Scale', 0, 4, 0.05);
    slider('displacementScale', 'Displacement', 0, 0.2, 0.001);
    slider('bumpScale', 'Bump Scale', 0, 3, 0.05);
    slider('ior', 'IOR', 1, 2.5, 0.01);
    slider('transmission', 'Transmission', 0, 1, 0.01);
    slider('thickness', 'Thickness', 0, 5, 0.01);
    slider('attenuationDistance', 'Atten Dist', 0, 10, 0.05);
    slider('specularIntensity', 'Specular', 0, 2, 0.01);
    slider('sheen', 'Sheen', 0, 1, 0.01);
    slider('sheenRoughness', 'Sheen Rough', 0, 1, 0.01);
    slider('opacity', 'Opacity', 0, 1, 0.01);
    slider('emissiveIntensity', 'Emissive Int.', 0, 10, 0.05);
    slider('iridescence', 'Iridescence', 0, 1, 0.01);
    slider('iridescenceIOR', 'Iridescence IOR', 1, 3, 0.01);
    slider('iridescenceThicknessMin', 'Iridescence Min', 0, 2000, 1);
    slider('iridescenceThicknessMax', 'Iridescence Max', 0, 2000, 1);

    pbrFolder
      .addBinding(this.pbrMaterialState, 'attenuationColor', { label: 'Atten Color', view: 'color' })
      .on('change', (ev) => {
        this.updateActivePbrMaterial({ attenuationColor: ev.value });
      });

    pbrFolder
      .addBinding(this.pbrMaterialState, 'emissiveColor', { label: 'Emissive Color', view: 'color' })
      .on('change', (ev) => {
        this.updateActivePbrMaterial({ emissiveColor: ev.value });
      });

    pbrFolder
      .addBinding(this.pbrMaterialState, 'transparent', { label: 'Force Transparent' })
      .on('change', (ev) => {
        this.updateActivePbrMaterial({ transparent: ev.value });
      });

    const mapsFolder = pbrFolder.addFolder({ title: 'Maps', expanded: false });
    const mapRoles = [
      { role: 'albedo', label: 'Albedo' },
      { role: 'normal', label: 'Normal' },
      { role: 'roughness', label: 'Roughness' },
      { role: 'metallic', label: 'Metallic' },
      { role: 'ao', label: 'AO' },
      { role: 'emissive', label: 'Emissive' },
      { role: 'displacement', label: 'Displacement' },
      { role: 'bump', label: 'Bump' },
      { role: 'iridescence', label: 'Iridescence' },
    ];
    const mapBlades = mapRoles.map(({ label }) =>
      mapsFolder.addBlade({ view: 'text', label, content: '—' })
    );
    const updateMapInfo = () => {
      const set = getPbrMaterialSetById(this.pbrMaterialState.setId);
      mapRoles.forEach(({ role }, index) => {
        const blade = mapBlades[index];
        if (!blade) return;
        const entry = set?.maps?.[role];
        blade.value = entry?.file ?? '—';
      });
    };
    updateMapInfo();
    this.updatePbrMapInfo = updateMapInfo;
  }

  applyKidSkin(variantId) {
    if (!variantId) return;
    const variant = getKidSkinVariantById(variantId) ?? kidSkinVariants.find((entry) => entry.id === variantId);
    if (!variant) {
      console.warn(`[kidSkin] unknown variant '${variantId}'`);
      return;
    }

    const material = this.getKidMaterial();
    if (!material) {
      console.warn('[kidSkin] kid material not available');
      return;
    }

    const applyMap = (prop, fileEntry, type, options = {}) => {
      if (!fileEntry) {
        if (prop in material) {
          material[prop] = null;
        }
        return null;
      }
      const texture = this.loadTextureResource(`kid-skin:${variant.id}:${type}`, fileEntry, options);
      if (texture) {
        material[prop] = texture;
        texture.needsUpdate = true;
        return texture;
      }
      if (prop in material) {
        material[prop] = null;
      }
      return null;
    };

    const baseEntry = variant.files?.base ?? variant.files?.baseAlt ?? variant.primaryBase ?? null;
    applyMap('map', baseEntry, 'base', { colorSpace: THREE.SRGBColorSpace });
    const roughTexture = applyMap('roughnessMap', variant.files?.roughness, 'roughness');
    if (roughTexture) {
      material.roughness = material.roughness ?? 1;
    } else if ('roughnessMap' in material) {
      material.roughnessMap = null;
    }
    const metalTexture = applyMap('metalnessMap', variant.files?.metalness, 'metalness');
    if (metalTexture) {
      material.metalness = material.metalness ?? 1;
    } else if ('metalnessMap' in material) {
      material.metalnessMap = null;
    }
    applyMap('normalMap', variant.files?.normal, 'normal');
    const opacityTexture = applyMap('alphaMap', variant.files?.opacity, 'opacity');
    material.transparent = Boolean(opacityTexture);
    applyMap('emissiveMap', variant.files?.translucence, 'translucence');
    applyMap('aoMap', variant.files?.ao, 'ao');
    applyMap('displacementMap', variant.files?.displacement, 'displacement');

    if (material.color?.isColor) {
      material.color.set('#ffffff');
    }

    material.needsUpdate = true;
    const kidConfig = this.buildKidConfigFromVariant(variant, material);
    if (kidConfig) {
      this.experience.updateSceneState?.({
        kid: kidConfig,
        metadata: { kidSkinVariant: variant.id ?? variantId }
      });
    }
    console.log(`[kidSkin] applied '${variant.label}'`);
  }

  normalisePathForCompare(path) {
    if (!path) return '';
    let value = path.trim().replace(/\\/g, '/');
    if (!value.startsWith('/')) value = `/${value}`;
    value = value.replace(/\/+$/, '');
    return value;
  }

  normaliseFogState(state) {
    const next = {
      ...DEFAULT_FOG_STATE,
      ...(clone(state) ?? {})
    };
    next.enabled = Boolean(next.enabled);
    next.type = next.type === 'linear' ? 'linear' : 'exp2';
    next.color = next.color ?? DEFAULT_FOG_STATE.color;
    next.density = typeof next.density === 'number' ? next.density : DEFAULT_FOG_STATE.density;
    next.near = typeof next.near === 'number' ? next.near : DEFAULT_FOG_STATE.near;
    next.far = typeof next.far === 'number' ? next.far : DEFAULT_FOG_STATE.far;
    return next;
  }

  normaliseSpotlightState(state) {
    const toVector = (value, fallback) => {
      if (Array.isArray(value) && value.length === 3) {
        return value.map((component, index) => {
          const parsed = Number(component);
          return Number.isFinite(parsed) ? parsed : fallback[index] ?? 0;
        });
      }
      if (value && typeof value === 'object') {
        const components = ['x', 'y', 'z'].map((key, index) => {
          const parsed = Number(value[key]);
          return Number.isFinite(parsed) ? parsed : fallback[index] ?? 0;
        });
        return components;
      }
      return [...fallback];
    };

    const next = {
      ...DEFAULT_SPOTLIGHT_STATE,
      ...(clone(state) ?? {})
    };
    next.intensity = typeof next.intensity === 'number' ? next.intensity : DEFAULT_SPOTLIGHT_STATE.intensity;
    next.angle = typeof next.angle === 'number' ? next.angle : DEFAULT_SPOTLIGHT_STATE.angle;
    next.penumbra = typeof next.penumbra === 'number' ? next.penumbra : DEFAULT_SPOTLIGHT_STATE.penumbra;
    next.decay = typeof next.decay === 'number' ? next.decay : DEFAULT_SPOTLIGHT_STATE.decay;
    next.distance = typeof next.distance === 'number' ? next.distance : DEFAULT_SPOTLIGHT_STATE.distance;
    next.color = next.color ?? DEFAULT_SPOTLIGHT_STATE.color;
    next.position = toVector(next.position, DEFAULT_SPOTLIGHT_STATE.position);
    next.target = toVector(next.target, DEFAULT_SPOTLIGHT_STATE.target);
    if (typeof next.gobo === 'object' && next.gobo !== null) {
      next.gobo = next.gobo.id ?? null;
    }
    if (next.gobo === 'none') next.gobo = null;
    next.gobo = next.gobo ?? DEFAULT_SPOTLIGHT_STATE.gobo;
    return next;
  }

  findHdrIdFromConfig(hdrConfig) {
    if (!hdrConfig) return null;
    const targetFile = hdrConfig.file ?? hdrConfig.name ?? hdrConfig.src;
    if (!targetFile) return null;
    const targetPath = this.normalisePathForCompare(hdrConfig.path ?? hdrConfig.directory ?? '');
    const match = hdrAssets.find((entry) => {
      const entryPath = this.normalisePathForCompare(entry.path ?? '');
      return entry.file === targetFile && entryPath === targetPath;
    });
    return match?.id ?? null;
  }

  findCubemapIdFromConfig(cubemapConfig) {
    if (!cubemapConfig?.files?.length) return null;
    const targetPath = this.normalisePathForCompare(cubemapConfig.path ?? cubemapConfig.directory ?? '');
    const targetFiles = cubemapConfig.files.map((file) => file.toLowerCase());
    const match = cubemapAssets.find((entry) => {
      const entryPath = this.normalisePathForCompare(entry.path ?? '');
      if (entryPath !== targetPath) return false;
      const entryFiles = entry.files.map((file) => file.toLowerCase());
      if (entryFiles.length !== targetFiles.length) return false;
      return entryFiles.every((file, idx) => file === targetFiles[idx]);
    });
    return match?.id ?? null;
  }

  buildKidConfigFromVariant(variant, material, fallback = {}) {
    const baseFallback = fallback?.baseColor ?? {};
    const roughFallback = fallback?.roughness ?? {};
    const normalFallback = fallback?.normal ?? {};

    if (!variant) {
      return clone({
        baseColor: baseFallback,
        roughness: roughFallback,
        normal: normalFallback,
        color: fallback?.color ?? '#ffffff'
      });
    }

    const baseEntry = variant.files?.base ?? variant.files?.baseAlt ?? variant.primaryBase ?? null;
    const roughEntry = variant.files?.roughness ?? null;
    const normalEntry = variant.files?.normal ?? null;

    const color = material?.color?.isColor
      ? formatColor(material.color)
      : fallback?.color ?? '#ffffff';

    return {
      baseColor: {
        src: baseEntry?.source ?? baseFallback.src ?? '',
        colorSpace: baseEntry?.colorSpace ?? baseFallback.colorSpace ?? 'SRGBColorSpace'
      },
      roughness: {
        src: roughEntry?.source ?? roughFallback.src ?? ''
      },
      normal: {
        src: normalEntry?.source ?? normalFallback.src ?? ''
      },
      color
    };
  }

  buildInnerSphereConfig(baseInnerSphere = {}) {
    const material = this.experience.innerSphereMaterial;
    if (!material) return clone(baseInnerSphere);
    return {
      emissive: formatColor(material.emissive ?? baseInnerSphere.emissive),
      emissiveIntensity: material.emissiveIntensity ?? baseInnerSphere.emissiveIntensity ?? 2.5,
      opacity: material.opacity ?? baseInnerSphere.opacity ?? 0.6
    };
  }

  captureUiTheme(baseUi = {}) {
    if (typeof window === 'undefined') return clone(baseUi);
    const style = getComputedStyle(document.documentElement);
    const read = (variable, fallback) => {
      const value = style.getPropertyValue(variable);
      return value ? value.trim() || fallback : fallback;
    };

    return {
      surfaceBg: read('--ui-surface-bg', baseUi.surfaceBg ?? 'rgba(8, 12, 18, 0.9)'),
      surfaceBorder: read('--ui-surface-border', baseUi.surfaceBorder ?? 'rgba(164, 210, 255, 0.12)'),
      cardBg: read('--ui-card-bg', baseUi.cardBg ?? 'rgba(13, 24, 33, 0.9)'),
      cardBorder: read('--ui-card-border', baseUi.cardBorder ?? 'rgba(132, 197, 255, 0.18)'),
      accent: read('--ui-accent', baseUi.accent ?? '#D5FF7E'),
      textPrimary: read('--ui-text-primary', baseUi.textPrimary ?? '#F4FBFF'),
      textSecondary: read('--ui-text-secondary', baseUi.textSecondary ?? '#96A3B3')
    };
  }

  getSceneFallbackColor(baseState = {}) {
    const background = this.experience.scene?.background;
    if (background && (background.isColor || background instanceof THREE.Color)) {
      return formatColor(background);
    }
    return baseState.environment?.fallback ?? '#050505';
  }

  saveScenePreset() {
    if (typeof window === 'undefined') return;
    const name = window.prompt('Scene preset name', 'Custom Scene');
    if (!name) return;

    const baseState = this.experience.getCurrentSceneState?.() ?? {};
    const hdrEntry = getHdrById(this.environmentState.hdr);
    if (!hdrEntry) {
      console.warn('[scene] Cannot save preset without a valid HDR selection.');
      return;
    }

    const environmentConfig = {
      hdr: { file: hdrEntry.file, path: hdrEntry.path },
      fallback: this.getSceneFallbackColor(baseState)
    };

    if (this.environmentState.cubemap && this.environmentState.cubemap !== 'none') {
      const cubeEntry = getCubemapById(this.environmentState.cubemap);
      if (cubeEntry) {
        environmentConfig.cubemap = {
          path: cubeEntry.path,
          files: [...cubeEntry.files]
        };
      }
    } else if (baseState.environment?.cubemap) {
      environmentConfig.cubemap = clone(baseState.environment.cubemap);
    }

    const kidMaterial = this.getKidMaterial();
    const kidVariant = getKidSkinVariantById(this.kidSkinState.variant) ?? null;
    const kidConfig = this.buildKidConfigFromVariant(kidVariant, kidMaterial, baseState.kid);
    const innerSphereConfig = this.buildInnerSphereConfig(baseState.innerSphere);
    const uiConfig = this.captureUiTheme(baseState.ui);
    const alphaConfig = clone(baseState.alpha) ?? { src: DEFAULT_ALPHA_SRC };
    const characterId = this.characterState?.character ?? baseState.character?.id ?? null;
    const fogConfig = this.normaliseFogState(this.experience.getFogState?.() ?? this.fogState);
    const spotlightConfig = this.normaliseSpotlightState(this.experience.getSpotlightState?.() ?? this.spotlightState);

    const sceneInput = {
      id: slugifyId(name),
      name,
      description: `Custom preset saved ${new Date().toLocaleString()}`,
      environment: environmentConfig,
      alpha: alphaConfig,
      kid: kidConfig,
      innerSphere: innerSphereConfig,
      ui: uiConfig,
      character: characterId ? { id: characterId } : null,
      fog: fogConfig,
      lighting: {
        spotlight: { ...spotlightConfig, gobo: spotlightConfig.gobo ?? null }
      },
      metadata: {
        ...(baseState.metadata ?? {}),
        kidSkinVariant: kidVariant?.id ?? baseState.metadata?.kidSkinVariant ?? null,
        source: 'tweakpane'
      }
    };

    try {
      const saved = this.experience.saveScenePreset?.(sceneInput);
      Promise.resolve(saved)
        .then((scene) => {
          if (!scene) return;
          console.log('[scene] saved preset', scene);
          window.dispatchEvent(new CustomEvent('htdi:scenes-changed', { detail: { scene } }));
        })
        .catch((error) => {
          console.error('[scene] failed to save preset', error);
        });
    } catch (error) {
      console.error('[scene] failed to save preset', error);
    }
  }

  applyFogUpdate(partial) {
    const next = this.normaliseFogState({ ...this.fogState, ...(partial ?? {}) });
    Object.assign(this.fogState, next);
    const result = this.experience.setFog?.(clone(this.fogState));
    if (result) {
      Object.assign(this.fogState, this.normaliseFogState(result));
    }
  }

  applySpotlightUpdate(partial) {
    const before = JSON.stringify(this.spotlightState);
    const patch = { ...(partial ?? {}) };
    if (patch.gobo === 'none') patch.gobo = null;
    const next = this.normaliseSpotlightState({ ...this.spotlightState, ...patch });
    Object.assign(this.spotlightState, next);
    const result = this.experience.setSpotlightState?.(clone(this.spotlightState));
    if (result) {
      Object.assign(this.spotlightState, this.normaliseSpotlightState(result));
    }
    if (this.goboBindingState) {
      this.goboBindingState.gobo = this.spotlightState.gobo ?? 'none';
    }
    this.syncSpotlightBindingStates();
    if (before !== JSON.stringify(this.spotlightState)) {
      this.pane.refresh();
    }
  }

  handleSceneApplied(event) {
    const sceneState = event?.detail?.scene ?? this.experience.getCurrentSceneState?.() ?? {};
    const hdrId = this.findHdrIdFromConfig(sceneState.environment?.hdr) ?? this.environmentState.hdr;
    const cubeId = this.findCubemapIdFromConfig(sceneState.environment?.cubemap);
    if (hdrId) this.environmentState.hdr = hdrId;
    this.environmentState.cubemap = cubeId ?? 'none';

    const fog = this.normaliseFogState(this.experience.getFogState?.() ?? sceneState.fog ?? this.fogState);
    Object.assign(this.fogState, fog);

    const spotlight = this.normaliseSpotlightState(this.experience.getSpotlightState?.() ?? sceneState.lighting?.spotlight ?? this.spotlightState);
    Object.assign(this.spotlightState, spotlight);
    this.syncSpotlightBindingStates();

    const kidVariant = sceneState.metadata?.kidSkinVariant;
    if (kidVariant && kidSkinVariants.some((entry) => entry.id === kidVariant)) {
      this.kidSkinState.variant = kidVariant;
    }

    if (sceneState.character?.id) {
      this.characterState.character = sceneState.character.id;
    }

    if (this.pbrAssignments.size) {
      const material = this.activePbrMaterial;
      if (material) {
        for (const target of this.pbrAssignments) {
          this.applyPbrMaterialToTarget(target, { material }).catch((error) => {
            console.warn('[pbr] failed to reapply material after scene change', error);
          });
        }
      }
    }

    this.pane.refresh();
  }

  applyTextureToMaterial(textureId, targetName) {
    if (!textureId) {
      console.warn('[textures] texture not selected');
      return;
    }
    if (!targetName) {
      console.warn('[textures] target material not selected');
      return;
    }

    const textureEntry = getTextureById(textureId) ?? textureAssets.find((entry) => entry.id === textureId);
    if (!textureEntry) {
      console.warn(`[textures] unknown texture '${textureId}'`);
      return;
    }

    const materialEntry = this.getMaterialEntry(targetName);
    const material = materialEntry?.ref;
    if (!material) {
      console.warn(`[textures] target material '${targetName}' not found`);
      return;
    }

    const texture = this.loadTextureResource(`library:${textureEntry.id}`, textureEntry, { colorSpace: THREE.SRGBColorSpace });
    if (!texture) {
      console.warn(`[textures] failed to load '${textureEntry.source}'`);
      return;
    }

    material.map = texture;
    if (material.color?.isColor) {
      material.color.set('#ffffff');
    }
    material.needsUpdate = true;

    console.log(`[textures] applied '${textureEntry.label}' to '${targetName}'`);
  }

  async loadCurrentPbrMaterial({ force = false } = {}) {
    const set = getPbrMaterialSetById(this.pbrMaterialState.setId);
    if (!set) {
      console.warn('[pbr] no set selected');
      return null;
    }
    if (!force && this.activePbrMaterial?.userData?.pbrSetId === set.id) {
      this.updateActivePbrMaterial();
      return this.activePbrMaterial;
    }

    this.updatePbrMapInfo?.();

    const material = await loadPbrMaterial(set, {
      material: this.activePbrMaterial,
      parameters: this.pbrMaterialState,
    });
    this.activePbrMaterial = material;
    this.updateActivePbrMaterial();
    return material;
  }

  updateActivePbrMaterial(partial) {
    if (partial && typeof partial === 'object') {
      if (Object.prototype.hasOwnProperty.call(partial, 'iridescenceThicknessMin')) {
        if (partial.iridescenceThicknessMin > (partial.iridescenceThicknessMax ?? this.pbrMaterialState.iridescenceThicknessMax)) {
          partial.iridescenceThicknessMax = partial.iridescenceThicknessMin;
        }
      }
      if (Object.prototype.hasOwnProperty.call(partial, 'iridescenceThicknessMax')) {
        if ((partial.iridescenceThicknessMin ?? this.pbrMaterialState.iridescenceThicknessMin) > partial.iridescenceThicknessMax) {
          partial.iridescenceThicknessMin = partial.iridescenceThicknessMax;
        }
      }
      Object.assign(this.pbrMaterialState, partial);
    }
    if (!this.activePbrMaterial) return;
    applyPbrParameters(this.activePbrMaterial, this.pbrMaterialState);
    this.refreshPbrMaterialAssignments();
  }

  getCharacterObject(target) {
    const characters = this.experience.sceneRegistry?.characters ?? {};
    if (target === 'character:active') {
      return characters.active?.ref ?? this.experience.sceneRegistryApi?.get?.('characters', 'active')?.ref ?? null;
    }
    if (target.startsWith('character:')) {
      const id = target.split(':')[1];
      return characters[id]?.ref ?? this.experience.sceneRegistryApi?.get?.('characters', id)?.ref ?? null;
    }
    return null;
  }

  getMeshObject(target) {
    if (!target.startsWith('mesh:')) return null;
    const id = target.split(':')[1];
    const meshes = this.experience.sceneRegistry?.meshes ?? {};
    return meshes[id]?.ref ?? this.experience.sceneRegistryApi?.get?.('meshes', id)?.ref ?? null;
  }

  getMaterialTarget(target) {
    if (!target.startsWith('material:')) return null;
    const id = target.split(':')[1];
    const materials = this.experience.sceneRegistry?.materials ?? {};
    return materials[id]?.ref ?? this.experience.sceneRegistryApi?.get?.('materials', id)?.ref ?? null;
  }

  async applyPbrMaterialToTarget(target, { material: overrideMaterial } = {}) {
    const normalisedTarget = this.normalisePbrTarget(target);
    if (target !== normalisedTarget) {
      this.pbrAssignments.delete(target);
    }
    if (!overrideMaterial) {
      this.pbrMaterialState.target = normalisedTarget;
    }
    const material = overrideMaterial ?? (await this.loadCurrentPbrMaterial());
    if (!material) return;

    let applied = false;

    const characterObject = this.getCharacterObject(normalisedTarget);
    if (characterObject) {
      applyMaterialToObject(characterObject, material, { override: true });
      applied = true;
    }

    const meshObject = this.getMeshObject(normalisedTarget);
    if (meshObject) {
      applyMaterialToObject(meshObject, material, { override: true });
      applied = true;
    }

    const materialTarget = this.getMaterialTarget(normalisedTarget);
    if (materialTarget?.isMaterial) {
      materialTarget.copy(material);
      materialTarget.needsUpdate = true;
      applied = true;
    } else if (materialTarget) {
      const registryEntry = this.experience.sceneRegistry?.materials?.[normalisedTarget.split(':')[1]];
      if (registryEntry) registryEntry.ref = material;
      applied = true;
    }

    if (!applied) {
      console.warn(`[pbr] target '${normalisedTarget}' not available`);
      return;
    }

    this.pbrAssignments.add(normalisedTarget);
  }

  refreshPbrMaterialAssignments() {
    if (!this.activePbrMaterial || !this.pbrAssignments.size) return;
    const material = this.activePbrMaterial;
    for (const target of this.pbrAssignments) {
      if (target.startsWith('material:')) {
        const materialTarget = this.getMaterialTarget(target);
        if (materialTarget?.isMaterial) {
          materialTarget.copy(material);
          materialTarget.needsUpdate = true;
        }
      }
    }
  }

  loadTextureResource(cacheKey, fileEntry, { colorSpace } = {}) {
    if (!fileEntry) return null;
    const options = {
      path: fileEntry.path ?? '',
    };
    if (colorSpace) {
      options.colorSpace = colorSpace;
    }

    try {
      return loadTextureAsset(`tweakpane:${cacheKey}`, fileEntry.file, options);
    } catch (error) {
      console.warn(`[textures] failed to load resource '${fileEntry.source}'`, error);
      return null;
    }
  }

  getKidMaterial() {
    return this.experience.sceneRegistry?.materials?.kidMaterial?.ref ?? null;
  }

  getMaterialEntry(name) {
    if (!name) return null;
    return this.experience.sceneRegistry?.materials?.[name] ?? null;
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
  }

  addEnvironmentControls() {
    const envFolder = this.getFolder(['Scene', 'Environment']);
    if (!envFolder) return;

    if (!hdrAssets.length) {
      this.addMessage(envFolder, 'No HDR assets configured');
      return;
    }

    if (typeof this.experience.setEnvironment !== 'function') {
      this.addMessage(envFolder, 'Environment setter unavailable');
      return;
    }

    const hdrOptions = toOptions(hdrAssets);
    const cubemapOptions = cubemapAssets.length
      ? [{ text: 'None', value: 'none' }, ...toOptions(cubemapAssets)]
      : [{ text: 'None', value: 'none' }];

    const currentState = this.experience.getCurrentSceneState?.() ?? this.initialSceneState ?? {};
    const currentHdrId = this.findHdrIdFromConfig(currentState.environment?.hdr) ?? this.environmentState?.hdr;
    const currentCubeId = this.findCubemapIdFromConfig(currentState.environment?.cubemap) ?? this.environmentState?.cubemap;

    const currentIntensity = typeof this.experience.getEnvironmentIntensity === 'function'
      ? this.experience.getEnvironmentIntensity()
      : currentState.environment?.intensity ?? 1;

    const state = (this.environmentState = {
      hdr: currentHdrId ?? hdrOptions[0]?.value ?? null,
      cubemap: currentCubeId ?? cubemapOptions[0]?.value ?? 'none',
      intensity: currentIntensity,
    });

    const applyEnvironment = () => {
      const hdr = getHdrById(state.hdr);
      if (!hdr) return;
      const config = {
        id: hdr.id,
        hdr: {
          file: hdr.file,
          path: hdr.path,
        },
        fallback: '#050505',
        intensity: state.intensity,
      };

      if (state.cubemap && state.cubemap !== 'none') {
        const cube = getCubemapById(state.cubemap);
        if (cube) {
          config.id = `${hdr.id}-${cube.id}`;
          config.cubemap = {
            files: cube.files,
            path: cube.path,
          };
        }
      }

      this.experience.setEnvironment(config);
    };

    envFolder.addBinding(state, 'hdr', { label: 'HDR', options: hdrOptions }).on('change', (ev) => {
      state.hdr = ev.value;
      applyEnvironment();
    });

    if (cubemapOptions.length > 1) {
      envFolder
        .addBinding(state, 'cubemap', { label: 'Cubemap', options: cubemapOptions })
        .on('change', (ev) => {
          state.cubemap = ev.value;
          applyEnvironment();
        });
    }

    envFolder
      .addBinding(state, 'intensity', { label: 'Intensity', min: 0, max: 3, step: 0.05 })
      .on('change', (ev) => {
        state.intensity = ev.value;
        if (typeof this.experience.setEnvironmentIntensity === 'function') {
          this.experience.setEnvironmentIntensity(ev.value);
        }
      });

    const fogFolder = envFolder.addFolder({ title: 'Fog', expanded: false });
    const fogState = (this.fogState = this.normaliseFogState(this.fogState));
    const fogTypeOptions = [
      { text: 'Exponential', value: 'exp2' },
      { text: 'Linear', value: 'linear' }
    ];

    fogFolder.addBinding(fogState, 'enabled', { label: 'Enabled' }).on('change', (ev) => {
      this.applyFogUpdate({ enabled: ev.value });
    });

    fogFolder.addBinding(fogState, 'type', { label: 'Type', options: fogTypeOptions }).on('change', (ev) => {
      this.applyFogUpdate({ type: ev.value });
    });

    fogFolder.addBinding(fogState, 'color', { label: 'Color', view: 'color' }).on('change', (ev) => {
      this.applyFogUpdate({ color: ev.value });
    });

    fogFolder.addBinding(fogState, 'density', { label: 'Density', min: 0, max: 0.2, step: 0.001 }).on('change', (ev) => {
      this.applyFogUpdate({ density: ev.value });
    });

    fogFolder.addBinding(fogState, 'near', { label: 'Near', min: 0.1, max: 300, step: 0.1 }).on('change', (ev) => {
      this.applyFogUpdate({ near: ev.value });
    });

    fogFolder.addBinding(fogState, 'far', { label: 'Far', min: 1, max: 500, step: 1 }).on('change', (ev) => {
      this.applyFogUpdate({ far: ev.value });
    });

    envFolder.addButton({ title: 'Save Scene Preset' }).on('click', () => {
      this.saveScenePreset();
    });
  }

  addLightingControls() {
    const lightsFolder = this.getFolder(['Scene', 'Lights']);
    if (!lightsFolder) return;

    this.spotlightState = this.normaliseSpotlightState(this.spotlightState);
    const state = this.spotlightState;
    const goboOptions = [{ text: 'None', value: 'none' }, ...toOptions(goboAssets)];

    const goboBindingState = { gobo: state.gobo ?? 'none' };
    const [px, py, pz] = state.position ?? DEFAULT_SPOTLIGHT_STATE.position;
    const [tx, ty, tz] = state.target ?? DEFAULT_SPOTLIGHT_STATE.target;
    const positionState = { x: px, y: py, z: pz };
    const targetState = { x: tx, y: ty, z: tz };
    this.spotlightPositionState = positionState;
    this.spotlightTargetState = targetState;

    const updateVectorComponent = (key, axis) => (ev) => {
      const indexMap = { x: 0, y: 1, z: 2 };
      const index = indexMap[axis];
      if (index === undefined) return;
      const vector = Array.isArray(this.spotlightState[key]) ? [...this.spotlightState[key]] : [0, 0, 0];
      vector[index] = Number(ev.value);
      this.applySpotlightUpdate({ [key]: vector });
    };

    lightsFolder.addBinding(state, 'intensity', {
      label: 'Spot Intensity',
      min: 0,
      max: 15,
      step: 0.05
    }).on('change', (ev) => {
      this.applySpotlightUpdate({ intensity: ev.value });
    });

    lightsFolder.addBinding(state, 'angle', {
      label: 'Spot Angle',
      min: 0.05,
      max: 1.6,
      step: 0.01
    }).on('change', (ev) => {
      this.applySpotlightUpdate({ angle: ev.value });
    });

    lightsFolder.addBinding(state, 'penumbra', {
      label: 'Spot Penumbra',
      min: 0,
      max: 1,
      step: 0.01
    }).on('change', (ev) => {
      this.applySpotlightUpdate({ penumbra: ev.value });
    });

    lightsFolder.addBinding(state, 'distance', {
      label: 'Spot Distance',
      min: 0,
      max: 200,
      step: 0.1
    }).on('change', (ev) => {
      this.applySpotlightUpdate({ distance: ev.value });
    });

    lightsFolder.addBinding(state, 'decay', {
      label: 'Spot Decay',
      min: 0,
      max: 4,
      step: 0.05
    }).on('change', (ev) => {
      this.applySpotlightUpdate({ decay: ev.value });
    });

    lightsFolder.addBinding(state, 'color', { label: 'Spot Color', view: 'color' }).on('change', (ev) => {
      this.applySpotlightUpdate({ color: ev.value });
    });

    lightsFolder.addBinding(goboBindingState, 'gobo', { label: 'Gobo', options: goboOptions }).on('change', (ev) => {
      this.applySpotlightUpdate({ gobo: ev.value });
      goboBindingState.gobo = this.spotlightState.gobo ?? 'none';
      state.gobo = this.spotlightState.gobo;
    });

    this.goboBindingState = goboBindingState;

    const positionFolder = lightsFolder.addFolder({ title: 'Spot Position', expanded: false });
    positionFolder.addBinding(positionState, 'x', {
      label: 'X',
      min: -50,
      max: 50,
      step: 0.01
    }).on('change', updateVectorComponent('position', 'x'));
    positionFolder.addBinding(positionState, 'y', {
      label: 'Y',
      min: -50,
      max: 50,
      step: 0.01
    }).on('change', updateVectorComponent('position', 'y'));
    positionFolder.addBinding(positionState, 'z', {
      label: 'Z',
      min: -50,
      max: 50,
      step: 0.01
    }).on('change', updateVectorComponent('position', 'z'));

    const targetFolder = lightsFolder.addFolder({ title: 'Spot Target', expanded: false });
    targetFolder.addBinding(targetState, 'x', {
      label: 'X',
      min: -50,
      max: 50,
      step: 0.01
    }).on('change', updateVectorComponent('target', 'x'));
    targetFolder.addBinding(targetState, 'y', {
      label: 'Y',
      min: -50,
      max: 50,
      step: 0.01
    }).on('change', updateVectorComponent('target', 'y'));
    targetFolder.addBinding(targetState, 'z', {
      label: 'Z',
      min: -50,
      max: 50,
      step: 0.01
    }).on('change', updateVectorComponent('target', 'z'));
  }

  syncSpotlightBindingStates() {
    const [px = 0, py = 0, pz = 0] = this.spotlightState.position ?? DEFAULT_SPOTLIGHT_STATE.position;
    const [tx = 0, ty = 0, tz = 0] = this.spotlightState.target ?? DEFAULT_SPOTLIGHT_STATE.target;
    if (this.spotlightPositionState) {
      this.spotlightPositionState.x = px;
      this.spotlightPositionState.y = py;
      this.spotlightPositionState.z = pz;
    }
    if (this.spotlightTargetState) {
      this.spotlightTargetState.x = tx;
      this.spotlightTargetState.y = ty;
      this.spotlightTargetState.z = tz;
    }
    if (this.goboBindingState) {
      this.goboBindingState.gobo = this.spotlightState.gobo ?? 'none';
    }
  }

  addMessage(container, text) {
    container.addFolder({ title: `⚠ ${text}`, expanded: false });
  }

  addFpsGraph(container, child) {
    if (this.fpsMonitorCleanup) {
      try {
        this.fpsMonitorCleanup();
      } catch (error) {
        console.warn('Failed to cleanup previous FPS monitor', error);
      }
      this.fpsMonitorCleanup = null;
    }

    const blade = container.addBlade({
      view: 'fpsgraph',
      label: child.label ?? 'FPS',
      lineCount: child.lineCount ?? 2,
    });

    const register = this.experience.addFrameMonitor;
    if (typeof register === 'function') {
      const monitor = {
        begin: () => blade?.begin?.(),
        end: () => blade?.end?.(),
      };

      const cleanup = register(monitor);
      if (typeof cleanup === 'function') {
        const release = () => {
          try {
            cleanup();
          } catch (error) {
            console.warn('FPS monitor cleanup failed', error);
          }
          this.fpsMonitorCleanup = null;
        };
        this.fpsMonitorCleanup = release;
        this.cleanups.push(release);
      } else if (typeof this.experience.removeFrameMonitor === 'function') {
        const release = () => {
          try {
            this.experience.removeFrameMonitor(monitor);
          } catch (error) {
            console.warn('FPS monitor removal failed', error);
          }
          this.fpsMonitorCleanup = null;
        };
        this.fpsMonitorCleanup = release;
        this.cleanups.push(release);
      }
    }
  }

  normalisePbrTarget(target) {
    if (!target) return '';
    if (target === 'active') return 'character:active';
    if (target.startsWith('character:') || target.startsWith('mesh:') || target.startsWith('material:')) {
      return target;
    }
    return target;
  }

  getPbrTargetOptions() {
    const options = [];
    options.push({ text: 'Active Character', value: 'character:active' });

    const characters = this.experience.availableCharacters ?? [];
    characters.forEach((entry) => {
      options.push({ text: `Character · ${entry.label}`, value: `character:${entry.id}` });
    });

    const meshes = this.experience.sceneRegistry?.meshes ?? {};
    Object.entries(meshes).forEach(([name, entry]) => {
      if (entry?.ref?.isObject3D) {
        options.push({ text: `Mesh · ${prettifyLabel(name)}`, value: `mesh:${name}` });
      }
    });

    const materials = this.experience.sceneRegistry?.materials ?? {};
    Object.entries(materials).forEach(([name, entry]) => {
      if (entry?.ref?.isMaterial) {
        options.push({ text: `Material · ${prettifyLabel(name)}`, value: `material:${name}` });
      }
    });

    return options;
  }

  showPane() {
    if (!this.pane?.element || !this.hidden) return false;
    this.hidden = false;
    showPaneElement(this.pane.element);
    window.dispatchEvent(new CustomEvent('htdi:tweakpane-toggle', { detail: { visible: true } }));
    return true;
  }

  hidePane() {
    if (!this.pane?.element || this.hidden) return false;
    this.hidden = true;
    hidePaneElement(this.pane.element);
    window.dispatchEvent(new CustomEvent('htdi:tweakpane-toggle', { detail: { visible: false } }));
    return true;
  }

  togglePaneVisibility(force) {
    if (typeof force === 'boolean') {
      return force ? (this.showPane(), true) : (this.hidePane(), false);
    }
    if (this.hidden) {
      this.showPane();
    } else {
      this.hidePane();
    }
    return !this.hidden;
  }

  isPaneVisible() {
    return !this.hidden;
  }

  getFolder(path) {
    if (!Array.isArray(path) || !path.length) return null;
    let current = { children: this.pane.children };
    for (const title of path) {
      const next = current.children?.find?.((child) => child.title === title);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  createModelControls(name, modelRef) {
    if (!this.modelsFolder) return;
    const existing = this.modelFolders.get(name);
    if (existing) {
      if (existing.object === (modelRef?.ref ?? modelRef)) {
        return;
      }
      // Skip creating duplicate folders when re-registering the same name.
      return;
    }

    const model = modelRef?.ref ?? modelRef;
    if (!model || !model.isObject3D) return;

    const folder = this.modelsFolder.addFolder({ title: name, expanded: false });
    this.modelFolders.set(name, { folder, object: model });

    folder.addBinding(model.position, 'x', { label: 'Position X' });
    folder.addBinding(model.position, 'y', { label: 'Position Y' });
    folder.addBinding(model.position, 'z', { label: 'Position Z' });
    folder.addBinding(model.rotation, 'x', { label: 'Rotation X', min: -Math.PI, max: Math.PI, step: 0.01 });
    folder.addBinding(model.rotation, 'y', { label: 'Rotation Y', min: -Math.PI, max: Math.PI, step: 0.01 });
    folder.addBinding(model.rotation, 'z', { label: 'Rotation Z', min: -Math.PI, max: Math.PI, step: 0.01 });
    folder.addBinding(model.scale, 'x', { label: 'Scale X', min: 0.0001, max: 10, step: 0.0001 });
    folder.addBinding(model.scale, 'y', { label: 'Scale Y', min: 0.0001, max: 10, step: 0.0001 });
    folder.addBinding(model.scale, 'z', { label: 'Scale Z', min: 0.0001, max: 10, step: 0.0001 });

    const materialsFolder = folder.addFolder({ title: 'Materials', expanded: false });
    const uniqueMaterials = new Map();
    model.traverse?.((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (!uniqueMaterials.has(material.uuid)) {
            uniqueMaterials.set(material.uuid, material);
          }
        });
      }
    });

    uniqueMaterials.forEach((material) => {
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

  addVideoControls() {
    const videoAsset = this.experience.videoEyeAsset;
    if (!videoAsset || !videoAsset.element) {
      this.addMessage(this.pane, 'Video asset (video:eye) not found');
      return;
    }

    const video = videoAsset.element;
    const videoFolder = this.pane.addFolder({ title: 'Video Playback', expanded: false });

    const videoState = {
      playing: !video.paused,
      status: video.paused ? 'Paused' : 'Playing',
    };

    const playPauseButton = videoFolder.addButton({
      title: videoState.playing ? 'Pause Video' : 'Play Video',
    }).on('click', () => {
      if (video.paused) {
        video.play().catch(error => console.error('Failed to play video:', error));
      } else {
        video.pause();
      }
    });

    const statusMonitor = videoFolder.addBinding(videoState, 'status', {
      readonly: true, // Make it a read-only monitor
      label: 'Status',
    });

    const updateVideoState = () => {
      videoState.playing = !video.paused;
      videoState.status = video.paused ? 'Paused' : 'Playing';
      playPauseButton.title = videoState.playing ? 'Pause Video' : 'Play Video';
      statusMonitor.value = videoState.status; // Update the blade's value
    };

    video.addEventListener('play', updateVideoState);
    video.addEventListener('pause', updateVideoState);
    video.addEventListener('ended', updateVideoState);

    this.cleanups.push(() => {
      video.removeEventListener('play', updateVideoState);
      video.removeEventListener('pause', updateVideoState);
      video.removeEventListener('ended', updateVideoState);
    });

    // Initial update
    updateVideoState();
  }

  resolvePath(path) {
    const parts = path.split('.');
    const key = parts.pop();
    if (parts[0] === 'sceneRegistry') {
      const result = this.resolveSceneRegistryTarget(parts, key);
      if (!result) {
        return { target: null, key };
      }
      const { target, key: adjustedKey } = result;
      return { target, key: adjustedKey ?? key };
    }
    const targetPath = parts.join('.');
    const target = get(this.experience, targetPath);
    return { target, key };
  }

  resolveSceneRegistryTarget(parts, key) {
    if (!parts || parts.length < 2) return null;
    const [, category, name, ...rest] = parts;
    if (!category) return null;

    const registryApi = this.experience.sceneRegistryApi;
    let entry = null;
    if (registryApi?.get) {
      entry = registryApi.get(category, name);
    }

    if (!entry) {
      entry = this.experience.sceneRegistry?.[category]?.[name];
    }

    if (!entry) return null;

    let target = entry;

    if (rest.length) {
      for (const segment of rest) {
        if (target == null) return null;
        target = target[segment];
      }
    }

    if (!target) return null;

    if (category === 'postprocessing' && name === 'bloomEffect' && target.luminanceMaterial) {
      if (key === 'luminanceThreshold') {
        target = target.luminanceMaterial;
        return { target, key: 'threshold' };
      }
      if (key === 'luminanceSmoothing') {
        target = target.luminanceMaterial;
        return { target, key: 'smoothing' };
      }
    }

    if (category === 'postprocessing' && name === 'depthOfFieldEffect') {
      const coc = target.cocMaterial ?? target.circleOfConfusionMaterial;
      if (coc && (key === 'focusDistance' || key === 'focusRange' || key === 'focalLength')) {
        return { target: coc, key };
      }
    }

    return { target };
  }
}
