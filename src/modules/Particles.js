import * as THREE from 'three';

export class ParticleSystem extends THREE.Points {
  constructor(count = 590, color = '#31FF9C', size = 0.2) {
    // Create geometry and material
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesMaterial = new THREE.PointsMaterial({
      size: size,
      sizeAttenuation: true,
      color: new THREE.Color(color).convertSRGBToLinear(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    super(particlesGeometry, particlesMaterial);

    this.count = count;
    this.initializeAttributes();
    this.loadTexture();
  }

  async initializeAttributes() {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);

    // Initialize positions and colors
    for (let i = 0; i < this.count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
      colors[i] = Math.random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  async loadTexture() {
    try {
      // Using Vite's public directory for static assets
      const textureLoader = new THREE.TextureLoader();
      const particleTexture = await new Promise((resolve, reject) => {
        textureLoader.load(
          '/textures/particles/stars/star_0.png',
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

  update(elapsedTime) {
    // Rotation
    this.rotation.y = elapsedTime * 0.024;
    this.rotation.x = elapsedTime * 0.008;
    this.rotation.z = elapsedTime * 0.048;

    // Position animation
    const positions = this.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      positions[i3 + 1] = Math.sin(elapsedTime + x); // Update Y position based on X and time
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  // Cleanup method for memory management
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    if (this.material.map) this.material.map.dispose();
    if (this.material.alphaMap) this.material.alphaMap.dispose();
  }
}

// Usage example in your main app:
/*
import { ParticleSystem } from './ParticleSystem.js';

const particles = new ParticleSystem();
scene.add(particles);

// In your animation loop:
function animate(time) {
  const elapsedTime = time * 0.001; // Convert to seconds
  particles.update(elapsedTime);
}
*/
