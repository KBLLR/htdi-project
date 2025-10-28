import * as THREE from 'three';

export class ParticleSystem extends THREE.Points {
  static PRESETS = {
    default: {
      count: 500,
      color: '#31FF9C',
      size: 0.2,
      textureName: 'star_0.png', // Keep textureName for lookup in atlas
      velocityFactor: 1,
      emissionRate: 10,
      maxAge: 5,
      areaSize: 10,
    },
    sparkle: {
      count: 1000,
      color: '#FFD700',
      size: 0.1,
      textureName: 'star_01.png', // Keep textureName for lookup in atlas
      velocityFactor: 2,
      emissionRate: 20,
      maxAge: 3,
      areaSize: 5,
    },
    smoke: {
      count: 300,
      color: '#A9A9A9',
      size: 0.5,
      textureName: 'star_07.png', // Keep textureName for lookup in atlas
      velocityFactor: 0.5,
      emissionRate: 5,
      maxAge: 8,
      areaSize: 15,
    },
  };

  constructor(options = {}) {
    const { 
      count = 500, 
      color = '#31FF9C', 
      size = 0.2, 
      velocityFactor = 1,
      emissionRate = 10,
      maxAge = 5,
      areaSize = 10,
      particleAtlasTexture,
      particleAtlasJson,
    } = options;

    if (!particleAtlasTexture || !particleAtlasJson) {
      throw new Error('ParticleSystem requires particleAtlasTexture and particleAtlasJson.');
    }

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesMaterial = new THREE.PointsMaterial({
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

    super(particlesGeometry, particlesMaterial);

    this.count = count;
    this.particleSize = size;
    this.particleColor = new THREE.Color(color);
    this.particleOpacity = 1.0;
    this.velocityFactor = velocityFactor;
    this.emissionRate = emissionRate;
    this.maxAge = maxAge;
    this.areaSize = areaSize;
    this.particleAtlasTexture = particleAtlasTexture;
    this.particleAtlasJson = particleAtlasJson;

    this.velocities = new Float32Array(this.count * 3);
    this.ages = new Float32Array(this.count);
    this.initialPositions = new Float32Array(this.count * 3);

    this.initializeAttributes();
    this.updateParticleTextureUVs(ParticleSystem.PRESETS.default.textureName);
  }

  applyPreset(presetName) {
    const preset = ParticleSystem.PRESETS[presetName];
    if (!preset) {
      console.warn(`Unknown particle preset: ${presetName}`);
      return;
    }

    this.count = preset.count;
    this.particleSize = preset.size;
    this.particleColor.set(preset.color);
    this.velocityFactor = preset.velocityFactor;
    this.emissionRate = preset.emissionRate;
    this.maxAge = preset.maxAge;
    this.areaSize = preset.areaSize;
    this.textureName = preset.textureName; // Store textureName for UV lookup

    // Reinitialize attributes and update texture UVs based on new preset
    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.velocities = new Float32Array(this.count * 3);
    this.ages = new Float32Array(this.count);
    this.initialPositions = new Float32Array(this.count * 3);
    this.initializeAttributes();
    this.updateParticleTextureUVs(this.textureName);

    this.material.size = this.particleSize;
    this.material.color.copy(this.particleColor).convertSRGBToLinear();
    this.material.needsUpdate = true;
  }

  updateParticleTextureUVs(textureName) {
    if (!this.particleAtlasJson || !this.particleAtlasJson.frames) {
      console.warn('Particle atlas JSON data not available.');
      return;
    }

    const frameKey = `/public/particles/${textureName}`;
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

  initializeAttributes() {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      // Positions
      this.initialPositions[i3] = positions[i3] = (Math.random() - 0.5) * this.areaSize;
      this.initialPositions[i3 + 1] = positions[i3 + 1] = (Math.random() - 0.5) * this.areaSize;
      this.initialPositions[i3 + 2] = positions[i3 + 2] = (Math.random() - 0.5) * this.areaSize;

      // Velocities
      this.velocities[i3] = (Math.random() - 0.5) * 0.05; // Reduced initial velocity range
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.05;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;

      // Colors
      colors[i3] = this.particleColor.r;
      colors[i3 + 1] = this.particleColor.g;
      colors[i3 + 2] = this.particleColor.b;

      // Ages
      this.ages[i] = Math.random() * this.maxAge;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('age', new THREE.BufferAttribute(this.ages, 1));
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
        // Reset particle position and velocity
        positions[i3] = (Math.random() - 0.5) * this.areaSize;
        positions[i3 + 1] = (Math.random() - 0.5) * this.areaSize;
        positions[i3 + 2] = (Math.random() - 0.5) * this.areaSize;

        // Introduce slight random perturbation to velocity
        velocities[i3] = (Math.random() - 0.5) * 0.05 + (Math.random() - 0.5) * 0.01;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.05 + (Math.random() - 0.5) * 0.01;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.05 + (Math.random() - 0.5) * 0.01;

        ages[i] = this.maxAge;

        // Apply current color to new particle
        colors[i3] = this.particleColor.r;
        colors[i3 + 1] = this.particleColor.g;
        colors[i3 + 2] = this.particleColor.b;
        resetCount++;
      }

      // Apply velocity
      positions[i3] += velocities[i3] * deltaTime * this.velocityFactor;
      positions[i3 + 1] += velocities[i3 + 1] * deltaTime * this.velocityFactor;
      positions[i3 + 2] += velocities[i3 + 2] * deltaTime * this.velocityFactor;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.age.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    this.material.size = this.particleSize;
    this.material.color.copy(this.particleColor).convertSRGBToLinear();
    this.material.opacity = this.particleOpacity; // Set base opacity
  }

  // Cleanup method for memory management
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) this.material.map.dispose();
    if (this.material.alphaMap) this.material.alphaMap.dispose();
  }
}
