// src/modules/ParticleEmitter.js
import * as THREE from 'three';

export class ParticleEmitter extends THREE.Points {
  constructor(options = {}) {
    const {
      count = 500,
      color = '#31FF9C',
      size = 0.2,
      velocity = 0.05,
      lifespan = 5,
      emissionRate = 10,
      areaSize = 10,
      emitterShape = 'box', // 'box' | 'sphere' | 'point'
      emitterPosition = new THREE.Vector3(0, 0, 0),
      textureName = 'p_010.png',
      particleAtlasTexture,
      particleAtlasJson,
    } = options;

    if (!particleAtlasTexture || !particleAtlasJson) {
      throw new Error('[ParticleEmitter] particleAtlasTexture and particleAtlasJson are required.');
    }

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size,
      sizeAttenuation: true,
      color: new THREE.Color(color).convertSRGBToLinear(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: particleAtlasTexture,
      alphaMap: particleAtlasTexture,
    });

    super(geometry, material);

    // core props
    this.count = count;
    this.particleSize = size;
    this.particleColor = new THREE.Color(color).convertSRGBToLinear();
    this.velocityRange = velocity;
    this.lifespan = lifespan;
    this.emissionRate = emissionRate;
    this.areaSize = areaSize;
    this.emitterShape = emitterShape;
    this.emitterPosition = emitterPosition.clone();
    this.textureName = textureName;
    this.particleAtlasJson = particleAtlasJson;
    this.particleAtlasTexture = particleAtlasTexture;

    // buffers
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.ages = new Float32Array(this.count);
    this.colors = new Float32Array(this.count * 3);

    // UV pending state (when texture isn’t ready yet)
    this._pendingUV = null;

    this.initializeAttributes();
    this.applyTextureFromAtlas(this.textureName);

    // don’t frustumCull particles
    this.frustumCulled = false;
  }

  // --- public API -----------------------------------------------------------
  setTexture(textureName) {
    this.textureName = textureName;
    this.applyTextureFromAtlas(textureName);
  }

  // --- init -----------------------------------------------------------------
  initializeAttributes() {
    for (let i = 0; i < this.count; i++) {
      this.resetParticle(i);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    // velocity / age are NOT used by the GPU material directly, but we keep them for logic
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('age', new THREE.BufferAttribute(this.ages, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  resetParticle(index) {
    const i3 = index * 3;

    // position
    if (this.emitterShape === 'box') {
      this.positions[i3] =
        this.emitterPosition.x + (Math.random() - 0.5) * this.areaSize;
      this.positions[i3 + 1] =
        this.emitterPosition.y + (Math.random() - 0.5) * this.areaSize;
      this.positions[i3 + 2] =
        this.emitterPosition.z + (Math.random() - 0.5) * this.areaSize;
    } else if (this.emitterShape === 'sphere') {
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const radius = (Math.random() * 0.5 + 0.5) * (this.areaSize * 0.5);
      this.positions[i3] = this.emitterPosition.x + radius * Math.sin(theta) * Math.cos(phi);
      this.positions[i3 + 1] = this.emitterPosition.y + radius * Math.sin(theta) * Math.sin(phi);
      this.positions[i3 + 2] = this.emitterPosition.z + radius * Math.cos(theta);
    } else {
      // point
      this.positions[i3] = this.emitterPosition.x;
      this.positions[i3 + 1] = this.emitterPosition.y;
      this.positions[i3 + 2] = this.emitterPosition.z;
    }

    // velocity
    this.velocities[i3] = (Math.random() - 0.5) * this.velocityRange;
    this.velocities[i3 + 1] = (Math.random() - 0.5) * this.velocityRange;
    this.velocities[i3 + 2] = (Math.random() - 0.5) * this.velocityRange;

    // age (randomize so they don’t all respawn at once)
    this.ages[index] = Math.random() * this.lifespan;

    // color
    this.colors[i3] = this.particleColor.r;
    this.colors[i3 + 1] = this.particleColor.g;
    this.colors[i3 + 2] = this.particleColor.b;
  }

  // --- atlas handling -------------------------------------------------------
  /**
   * Accepts:
   * - "public/particles/p_010.png"
   * - "p_010.png"
   * - "p_010" (will auto-add .png)
   */
  resolveAtlasKey(name) {
    const frames = this.particleAtlasJson?.frames;
    if (!frames) return null;

    // exact key
    if (frames[name]) return name;

    // strip leading slash
    if (name.startsWith('/')) {
      const noSlash = name.slice(1);
      if (frames[noSlash]) return noSlash;
    }

    // if just "p_010"
    if (!name.endsWith('.png')) {
      const withPng = `${name}.png`;
      if (frames[withPng]) return withPng;
      const publicPng = `public/particles/${withPng}`;
      if (frames[publicPng]) return publicPng;
    }

    // try prefixing path
    const publicKey = `public/particles/${name}`;
    if (frames[publicKey]) return publicKey;

    return null;
  }

  applyTextureFromAtlas(textureName) {
    if (!this.particleAtlasJson || !this.particleAtlasJson.frames) {
      console.warn('[ParticleEmitter] particle atlas JSON has no frames');
      return;
    }

    const frameKey = this.resolveAtlasKey(textureName);
    const frame = frameKey ? this.particleAtlasJson.frames[frameKey] : null;

    if (!frame || !frame.uv) {
      console.warn(
        `[ParticleEmitter] frame not found in atlas: "${textureName}". Available keys:`,
        Object.keys(this.particleAtlasJson.frames)
      );
      return;
    }

    const { u0, v0, u1, v1 } = frame.uv;
    this.setUVOnMaterial(u0, v0, u1, v1);
  }

  setUVOnMaterial(u0, v0, u1, v1) {
    const map = this.material.map;
    const alphaMap = this.material.alphaMap;

    // if texture is not loaded yet, delay
    if (!map || !map.image) {
      this._pendingUV = { u0, v0, u1, v1 };
      return;
    }

    const repeatX = u1 - u0;
    const repeatY = v1 - v0;

    map.repeat.set(repeatX, repeatY);
    map.offset.set(u0, v0);
    map.needsUpdate = true;

    if (alphaMap) {
      alphaMap.repeat.set(repeatX, repeatY);
      alphaMap.offset.set(u0, v0);
      alphaMap.needsUpdate = true;
    }

    this._pendingUV = null;
  }

  // --- update loop ----------------------------------------------------------
  update(deltaTime) {
    const positions = this.geometry.attributes.position.array;
    const velocities = this.geometry.attributes.velocity.array;
    const ages = this.geometry.attributes.age.array;

    // apply pending UV when texture finally loads
    if (this._pendingUV && this.material?.map?.image) {
      const { u0, v0, u1, v1 } = this._pendingUV;
      this.setUVOnMaterial(u0, v0, u1, v1);
    }

    const toRespawn = Math.ceil(this.emissionRate * deltaTime);
    let respawned = 0;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      ages[i] -= deltaTime;

      if (ages[i] <= 0 && respawned < toRespawn) {
        this.resetParticle(i);
        respawned++;
      }

      // integrate velocity
      positions[i3] += velocities[i3] * deltaTime;
      positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
      positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.age.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  // --- dispose --------------------------------------------------------------
  dispose() {
    this.geometry.dispose();
    if (this.material.map === this.particleAtlasTexture) {
      // shared texture → don’t dispose here
      this.material.dispose();
    } else {
      this.material.map?.dispose();
      this.material.alphaMap?.dispose();
      this.material.dispose();
    }
  }
}

export default ParticleEmitter;
