import * as THREE from 'three';

export class ParticleSystem extends THREE.Points {
  static PRESETS = {
    default: {
      count: 500,
      color: '#31FF9C',
      size: 0.2,
      textureName: 'star_0.png',
      velocityFactor: 1,
      emissionRate: 10,
      maxAge: 5,
      areaSize: 10,
    },
    sparkle: {
      count: 1000,
      color: '#FFD700',
      size: 0.1,
      textureName: 'star_01.png',
      velocityFactor: 2,
      emissionRate: 20,
      maxAge: 3,
      areaSize: 5,
    },
    smoke: {
      count: 300,
      color: '#A9A9A9',
      size: 0.5,
      textureName: 'star_07.png',
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
      textureName = 'star_0.png',
      velocityFactor = 1,
      emissionRate = 10,
      maxAge = 5,
      areaSize = 10,
    } = options;

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesMaterial = new THREE.PointsMaterial({
      size: size,
      sizeAttenuation: true,
      color: new THREE.Color(color).convertSRGBToLinear(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
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
    this.textureName = textureName;

    this.velocities = new Float32Array(this.count * 3);
    this.ages = new Float32Array(this.count);
    this.initialPositions = new Float32Array(this.count * 3);

    this.initializeAttributes();
    this.loadTexture(this.textureName);

    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float age;
        attribute vec3 velocity;
        varying float vAge;
        ${shader.vertexShader}
      `;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          #include <begin_vertex>
          vAge = age;
        `
      );
      shader.fragmentShader = `
        varying float vAge;
        ${shader.fragmentShader}
      `;
      shader.fragmentShader = shader.fragmentShader.replace(
        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
        `
          gl_FragColor = vec4( outgoingLight, diffuseColor.a * (1.0 - vAge / ${this.maxAge}.0) );
        `
      );
    };
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
    this.textureName = preset.textureName;

    // Reinitialize attributes and reload texture based on new preset
    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.velocities = new Float32Array(this.count * 3);
    this.ages = new Float32Array(this.count);
    this.initialPositions = new Float32Array(this.count * 3);
    this.initializeAttributes();
    this.loadTexture(this.textureName);

    this.material.size = this.particleSize;
    this.material.color.copy(this.particleColor).convertSRGBToLinear();
    this.material.needsUpdate = true;
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

  async loadTexture(textureName) {
    try {
      const textureLoader = new THREE.TextureLoader();
      const particleTexture = await new Promise((resolve, reject) => {
        textureLoader.load(
          `/particles/${textureName}`,
          resolve,
          undefined,
          reject
        );
      });

      this.material.map = particleTexture;
      this.material.alphaMap = particleTexture;
      this.material.needsUpdate = true;
    } catch (error) {
      console.warn('Could not load particle texture:', error);
    }
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
