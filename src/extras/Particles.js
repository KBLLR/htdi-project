// src/extras/Particles.js
import * as THREE from 'three';
import { ParticleEmitter } from './ParticleEmitter.js';

export class ParticleSystem extends THREE.Group {
  /**
   * You can add more presets here. Just make sure the textureName
   * matches something in public/particles/*.png from your atlas JSON.
   */
  static EMITTER_TYPES = {
    default: {
      label: 'Default Particles',
      options: {
        count: 500,
        color: '#31FF9C',
        size: 0.25,
        textureName: 'p_010.png',
        velocity: 0.05,
        lifespan: 5,
        emissionRate: 10,
        areaSize: 10,
        emitterShape: 'box',
        emitterPosition: new THREE.Vector3(0, 0, 0),
      },
    },
    sparkle: {
      label: 'Sparkle Effect',
      options: {
        count: 900,
        color: '#FFD700',
        size: 0.18,
        textureName: 'p_013.png',
        velocity: 0.12,
        lifespan: 3,
        emissionRate: 28,
        areaSize: 4,
        emitterShape: 'point',
        emitterPosition: new THREE.Vector3(0, 0.8, 0),
      },
    },
    smoke: {
      label: 'Smoke Plume',
      options: {
        count: 350,
        color: '#A9A9A9',
        size: 0.55,
        textureName: 'p_008.png',
        velocity: 0.025,
        lifespan: 8,
        emissionRate: 6,
        areaSize: 15,
        emitterShape: 'sphere',
        emitterPosition: new THREE.Vector3(0, 0, 0),
      },
    },
  };

  constructor(options = {}) {
    super();

    const { particleAtlasTexture, particleAtlasJson } = options;
    if (!particleAtlasTexture || !particleAtlasJson) {
      throw new Error('[ParticleSystem] particleAtlasTexture and particleAtlasJson are required.');
    }

    this.particleAtlasTexture = particleAtlasTexture;
    this.particleAtlasJson = particleAtlasJson;

    /** @type {Map<string, ParticleEmitter>} */
    this.emitters = new Map();
    this.activeEmitterId = null;

    Object.entries(ParticleSystem.EMITTER_TYPES).forEach(([id, def]) => {
      this.addEmitter(id, def.options);
    });

    this.setActiveEmitter('default');
  }

  addEmitter(id, emitterOptions = {}) {
    if (this.emitters.has(id)) {
      this.removeEmitter(id);
    }

    const emitter = new ParticleEmitter({
      ...emitterOptions,
      particleAtlasTexture: this.particleAtlasTexture,
      particleAtlasJson: this.particleAtlasJson,
    });

    emitter.visible = false;
    this.emitters.set(id, emitter);
    this.add(emitter);

    return emitter;
  }

  removeEmitter(id) {
    const emitter = this.emitters.get(id);
    if (!emitter) return false;

    emitter.dispose();
    this.remove(emitter);
    this.emitters.delete(id);

    if (this.activeEmitterId === id) {
      this.activeEmitterId = null;
    }

    return true;
  }

  setActiveEmitter(id) {
    if (!this.emitters.has(id)) {
      console.warn(`[ParticleSystem] Emitter "${id}" not found.`);
      return false;
    }

    if (this.activeEmitterId) {
      const current = this.emitters.get(this.activeEmitterId);
      if (current) current.visible = false;
    }

    const next = this.emitters.get(id);
    next.visible = true;
    this.activeEmitterId = id;

    return true;
  }

  getActiveEmitter() {
    return this.activeEmitterId ? this.emitters.get(this.activeEmitterId) : null;
  }

  update(deltaTime) {
    if (!this.visible) return;
    const active = this.getActiveEmitter();
    if (active) active.update(deltaTime);
  }

  dispose() {
    this.emitters.forEach((emitter) => {
      emitter.dispose();
      this.remove(emitter);
    });
    this.emitters.clear();
    this.activeEmitterId = null;
  }
}

export default ParticleSystem;
