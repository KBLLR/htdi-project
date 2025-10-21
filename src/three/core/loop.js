import { Clock } from 'three';
import { update as tweenUpdate } from '@tweenjs/tween.js';

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
 * @param {THREE.AnimationMixer} [options.cFlowMixer] - Animation mixer for creative flow.
 * @param {THREE.AnimationMixer} [options.kidMixer] - Animation mixer for kid model.
 * @param {THREE.AnimationMixer} [options.kid2Mixer] - Animation mixer for second kid model.
 */
export function startLoop({
  renderer,
  scene,
  camera,
  controls,
  composer,
  outerMesh,
  updateRotatingLights,
  cFlowMixer,
  kidMixer,
  kid2Mixer,
}) {
  const clock = new Clock();
  let previousTime = 0;
  let animationFrameId = null;

  const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // Update controls
    controls.update();

    // Update tweens (if any active)
    tweenUpdate();

    // Animate outer mesh
    if (outerMesh) {
      outerMesh.rotation.y = Math.sin(elapsedTime * 0.01) * 20;
      outerMesh.rotation.x += 0.005;
    }

    // Update rotating lights
    updateRotatingLights(deltaTime);

    // Update Animation Mixers
    if (cFlowMixer) { cFlowMixer.update(deltaTime); }
    if (kidMixer) { kidMixer.update(deltaTime); }
    if (kid2Mixer) { kid2Mixer.update(deltaTime); }

    // Render
    composer.render(scene, camera);

    // Call tick again on the next frame
    animationFrameId = requestAnimationFrame(tick);
  };

  // Start the loop
  if (animationFrameId === null) {
    tick();
  }

  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };
}