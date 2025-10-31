import { Clock } from 'three';
import { Group } from '@tweenjs/tween.js';

const tweenGroup = new Group();

/**
 * Initializes and starts the animation loop for the Three.js experience.
 * @param {object} options - Options for the animation loop.
 * @param {THREE.WebGLRenderer} options.renderer - The Three.js renderer.
 * @param {THREE.Scene} options.scene - The Three.js scene.
 * @param {THREE.Camera} options.camera - The Three.js camera.
 * @param {import('three/examples/jsm/controls/OrbitControls.js').OrbitControls} options.controls - The OrbitControls instance.
 * @param {import('postprocessing').EffectComposer} options.composer - The Postprocessing EffectComposer.
 * @param {THREE.Mesh} options.outerMesh - The outer mesh object to animate.
 * @param {function(number): void} options.updateRotatingLights - Function to update rotating lights.
 * @param {object} options.mixers - Object containing animation mixers (kid, cFlow, kid2).
 */
export function startLoop({
  scene,
  camera,
  controls,
  composer,
  outerMesh,
  updateRotatingLights,
  mixers,
  particles,
  frameMonitors: initialFrameMonitors = [],
}) {
  const clock = new Clock();
  let previousTime = 0;
  let animationFrameId = null;
  const frameMonitors = new Set(initialFrameMonitors.filter(Boolean));

  const addFrameMonitor = (monitor) => {
    if (!monitor) return () => {};
    frameMonitors.add(monitor);
    return () => frameMonitors.delete(monitor);
  };

  const removeFrameMonitor = (monitor) => frameMonitors.delete(monitor);

  const callMonitors = (method, payload) => {
    for (const monitor of frameMonitors) {
      try {
        monitor?.[method]?.(payload);
      } catch (error) {
        console.warn(`Frame monitor ${method} failed`, error);
      }
    }
  };

  const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    callMonitors('begin', { elapsedTime, deltaTime });

    // Update controls
    controls.update();

    // Update tweens (if any active)
    tweenGroup.update();

    // Animate outer mesh
    if (outerMesh) {
      outerMesh.rotation.y = Math.sin(elapsedTime * 0.01) * 20;
      outerMesh.rotation.x += 0.005;
    }

    // Update rotating lights
    updateRotatingLights(deltaTime);

    // Update Animation Mixers
    Object.values(mixers ?? {}).forEach((mixerInstance) => {
      if (mixerInstance && typeof mixerInstance.update === 'function') {
        mixerInstance.update(deltaTime);
      }
    });

    // Update particles
    if (particles) {
      particles.update(elapsedTime);
    }

    // Render
    composer.render(scene, camera);

    callMonitors('end', { elapsedTime, deltaTime });

    // Call tick again on the next frame
    animationFrameId = requestAnimationFrame(tick);
  };

  // Start the loop
  if (animationFrameId === null) {
    tick();
  }

  const stop = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    frameMonitors.clear();
  };

  return {
    stop,
    addFrameMonitor,
    removeFrameMonitor,
  };
}
