// src/world/lighting/spotlightGobo.js
import * as THREE from 'three';

/**
 * SpotlightGobo
 * Spotlight with gobo (projected texture).
 * Works in WebGL; for WebGPU we may need a TSL material path.
 */
export class SpotlightGobo {
  constructor({
    goboTexture,
    color = 0xffffff,
    intensity = 3,
    distance = 20,
    angle = Math.PI / 6,
    penumbra = 0.4,
    decay = 1
  } = {}) {
    this.light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);

    this.goboTexture = goboTexture || null;
    if (this.goboTexture) {
      this.light.map = this.goboTexture;
      this.light.map.flipY = false;
    }

    this._state = {
      intensity,
      angle,
      distance,
      penumbra,
      decay
    };
  }

  addToScene(scene) {
    scene.add(this.light);
    scene.add(this.light.target);
  }

  setPosition(x, y, z) {
    this.light.position.set(x, y, z);
  }

  lookAt(x, y, z) {
    this.light.target.position.set(x, y, z);
    this.light.target.updateMatrixWorld();
  }

  setGobo(texture) {
    this.goboTexture = texture;
    this.light.map = texture;
    if (this.light.map) {
      this.light.map.flipY = false;
    }
  }

  applyState(partialState) {
    this._state = { ...this._state, ...partialState };
    const { intensity, angle, distance, penumbra, decay } = this._state;
    this.light.intensity = intensity;
    this.light.angle = angle;
    this.light.distance = distance;
    this.light.penumbra = penumbra;
    this.light.decay = decay;
  }

  getState() {
    return { ...this._state };
  }

  getLight() {
    return this.light;
  }

  dispose() {
    if (this.goboTexture && this.goboTexture.dispose) {
      this.goboTexture.dispose();
    }
    // Note: scene.remove should be handled externally
  }
}
