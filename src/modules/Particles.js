import * as THREE from 'three';
import { ParticleEmitter } from './ParticleEmitter.js'; // Import the new emitter class

export class ParticleSystem extends THREE.Group { // Change to extend THREE.Group
  static EMITTER_TYPES = {
    default: {
      label: 'Default Particles',
      options: {
        count: 500,
        color: '#31FF9C',
        size: 0.2,
        textureName: 'star_0.png',
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
        count: 1000,
        color: '#FFD700',
        size: 0.1,
        textureName: 'star_01.png',
        velocity: 0.1,
        lifespan: 3,
        emissionRate: 20,
        areaSize: 5,
        emitterShape: 'point',
        emitterPosition: new THREE.Vector3(0, 0.5, 0),
      },
    },
    smoke: {
      label: 'Smoke Plume',
      options: {
        count: 300,
        color: '#A9A9A9',
        size: 0.5,
        textureName: 'star_07.png',
        velocity: 0.02,
        lifespan: 8,
        emissionRate: 5,
        areaSize: 15,
        emitterShape: 'sphere',
        emitterPosition: new THREE.Vector3(0, 0, 0),
      },
    },
    // Add more particle types here
  };

  constructor(options = {}) {
    super(); // Call THREE.Group constructor

    const {
      particleAtlasTexture,
      particleAtlasJson,
    } = options;

    if (!particleAtlasTexture || !particleAtlasJson) {
      throw new Error('ParticleSystem requires particleAtlasTexture and particleAtlasJson.');
    }

    this.particleAtlasTexture = particleAtlasTexture;
    this.particleAtlasJson = particleAtlasJson;

    /** @type {Map<string, ParticleEmitter>} */
    this.emitters = new Map();
    this.activeEmitterId = null;

    // Initialize default emitters
    for (const id in ParticleSystem.EMITTER_TYPES) {
      this.addEmitter(id, ParticleSystem.EMITTER_TYPES[id].options);
    }

    // Set initial active emitter
    this.setActiveEmitter('default');
  }

  addEmitter(id, options) {
    if (this.emitters.has(id)) {
      console.warn(`Emitter with ID "${id}" already exists. Overwriting.`);
      this.removeEmitter(id);
    }
    const emitter = new ParticleEmitter({
      ...options,
      particleAtlasTexture: this.particleAtlasTexture,
      particleAtlasJson: this.particleAtlasJson,
    });
    emitter.visible = false; // Emitters are hidden by default
    this.emitters.set(id, emitter);
    this.add(emitter); // Add emitter to the group
    return emitter;
  }

  removeEmitter(id) {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.dispose();
      this.remove(emitter);
      this.emitters.delete(id);
      if (this.activeEmitterId === id) {
        this.activeEmitterId = null;
      }
      return true;
    }
    return false;
  }

  setActiveEmitter(id) {
    if (!this.emitters.has(id)) {
      console.warn(`Emitter with ID "${id}" not found.`);
      return false;
    }

    if (this.activeEmitterId) {
      const prevEmitter = this.emitters.get(this.activeEmitterId);
      if (prevEmitter) prevEmitter.visible = false;
    }

    const nextEmitter = this.emitters.get(id);
    if (nextEmitter) {
      nextEmitter.visible = true;
      this.activeEmitterId = id;
      return true;
    }
    return false;
  }

  getActiveEmitter() {
    return this.activeEmitterId ? this.emitters.get(this.activeEmitterId) : null;
  }

  update(deltaTime) {
    const activeEmitter = this.getActiveEmitter();
    if (activeEmitter && this.visible) { // Only update if ParticleSystem is visible
      activeEmitter.update(deltaTime);
    }
  }

  dispose() {
    this.emitters.forEach(emitter => emitter.dispose());
    this.emitters.clear();
    this.activeEmitterId = null;
    // No need to dispose of THREE.Group itself, just its children
  }
}