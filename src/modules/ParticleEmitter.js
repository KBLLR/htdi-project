import * as THREE from 'three';

export class ParticleEmitter extends THREE.Points {
  constructor(options = {}) {
    const {
      count = 500,
      color = '#31FF9C',
      size = 0.2,
      velocity = 0.05, // Max initial velocity
      lifespan = 5, // Max age
      emissionRate = 10, // Particles per second
      areaSize = 10, // Emitter area size (for box shape)
      emitterShape = 'box', // 'box', 'sphere', 'point'
      emitterPosition = new THREE.Vector3(0, 0, 0),
      textureName = 'star_0.png',
      particleAtlasTexture,
      particleAtlasJson,
    } = options;

    if (!particleAtlasTexture || !particleAtlasJson) {
      throw new Error('ParticleEmitter requires particleAtlasTexture and particleAtlasJson.');
    }

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: size,
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

    this.count = count;
    this.particleSize = size;
    this.particleColor = new THREE.Color(color);
    this.velocityRange = velocity;
    this.lifespan = lifespan;
    this.emissionRate = emissionRate;
    this.areaSize = areaSize;
    this.emitterShape = emitterShape;
    this.emitterPosition = emitterPosition;
    this.textureName = textureName;
    this.particleAtlasJson = particleAtlasJson;

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.ages = new Float32Array(this.count);
    this.colors = new Float32Array(this.count * 3); // For individual particle colors if needed

    this.initializeAttributes();
    this.updateParticleTextureUVs(this.textureName);

    this.frustumCulled = false; // Important for particle systems
  }

  initializeAttributes() {
    for (let i = 0; i < this.count; i++) {
      this.resetParticle(i);
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('age', new THREE.BufferAttribute(this.ages, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  resetParticle(index) {
    const i3 = index * 3;

    // Position based on emitter shape
    if (this.emitterShape === 'box') {
      this.positions[i3] = this.emitterPosition.x + (Math.random() - 0.5) * this.areaSize;
      this.positions[i3 + 1] = this.emitterPosition.y + (Math.random() - 0.5) * this.areaSize;
      this.positions[i3 + 2] = this.emitterPosition.z + (Math.random() - 0.5) * this.areaSize;
    } else if (this.emitterShape === 'sphere') {
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const r = (Math.random() * 0.5 + 0.5) * this.areaSize / 2; // Emit from surface of a sphere
      this.positions[i3] = this.emitterPosition.x + r * Math.sin(theta) * Math.cos(phi);
      this.positions[i3 + 1] = this.emitterPosition.y + r * Math.sin(theta) * Math.sin(phi);
      this.positions[i3 + 2] = this.emitterPosition.z + r * Math.cos(theta);
    } else { // 'point'
      this.positions[i3] = this.emitterPosition.x;
      this.positions[i3 + 1] = this.emitterPosition.y;
      this.positions[i3 + 2] = this.emitterPosition.z;
    }

    // Velocity
    this.velocities[i3] = (Math.random() - 0.5) * this.velocityRange;
    this.velocities[i3 + 1] = (Math.random() - 0.5) * this.velocityRange;
    this.velocities[i3 + 2] = (Math.random() - 0.5) * this.velocityRange;

    // Age
    this.ages[index] = Math.random() * this.lifespan;

    // Color
    this.colors[i3] = this.particleColor.r;
    this.colors[i3 + 1] = this.particleColor.g;
    this.colors[i3 + 2] = this.particleColor.b;
  }

  updateParticleTextureUVs(textureName) {
    if (!this.particleAtlasJson || !this.particleAtlasJson.frames) {
      console.warn('Particle atlas JSON data not available.');
      return;
    }

    const frameKey = `public/particles/${textureName}`;
    const frame = this.particleAtlasJson.frames[frameKey];

    if (!frame) {
      console.warn(`Particle texture frame not found in atlas: ${frameKey}`);
      return;
    }

    const { u0, v0, u1, v1 } = frame.uv;
    this.material.map.repeat.set(u1 - u0, v1 - v0);
    this.material.map.offset.set(u0, v0);
    this.material.alphaMap.repeat.set(u1 - u0, v1 - v0);
    this.material.alphaMap.offset.set(u0, v0);
    this.material.map.needsUpdate = true;
    this.material.alphaMap.needsUpdate = true;
  }

  update(deltaTime) {
    const positions = this.geometry.attributes.position.array;
    const velocities = this.geometry.attributes.velocity.array;
    const ages = this.geometry.attributes.age.array;
    const colors = this.geometry.attributes.color.array;

    const particlesToReset = Math.ceil(this.emissionRate * deltaTime);
    let resetCount = 0;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      ages[i] -= deltaTime;

      if (ages[i] <= 0 && resetCount < particlesToReset) {
        this.resetParticle(i);
        resetCount++;
      }

      // Apply velocity
      positions[i3] += velocities[i3] * deltaTime;
      positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
      positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

      // Fade out particles based on age
      const lifeRatio = ages[i] / this.lifespan;
      this.material.color.set(this.particleColor).convertSRGBToLinear();
      this.material.opacity = lifeRatio; // Simple fade out
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.age.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true; // If individual colors are used
  }

  // Cleanup method for memory management
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) this.material.map.dispose();
    if (this.material.alphaMap) this.material.alphaMap.dispose();
  }
}
