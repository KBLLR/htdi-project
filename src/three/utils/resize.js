/**
 * Initializes window resize handling for a Three.js experience.
 * Adjusts camera aspect ratio and renderer size on window resize.
 * @param {THREE.Camera} camera - The camera to update.
 * @param {THREE.WebGLRenderer} renderer - The renderer to update.
 */
export function setupResize(camera, renderer) {
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}