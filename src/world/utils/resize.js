/**
 * Initializes window resize handling for a Three.js experience.
 * Adjusts camera aspect ratio and renderer size on window resize.
 * @param {THREE.Camera} camera - The camera to update.
 * @param {THREE.WebGLRenderer} renderer - The renderer to update.
 * @param {{ onResize?: (width: number, height: number) => void, onPixelRatioChange?: (ratio: number) => void }} [hooks]
 *   Optional callbacks triggered after resize updates.
 */
export function setupResize(camera, renderer, hooks = {}) {
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const { onResize, onPixelRatioChange } = hooks ?? {};

  const applyResize = () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);

    onResize?.(sizes.width, sizes.height);
    onPixelRatioChange?.(pixelRatio);
  };

  window.addEventListener('resize', applyResize);
  applyResize();

  return () => {
    window.removeEventListener('resize', applyResize);
  };
}
