// src/world/core/createRenderLoop.js
// tiny, generic RAF loop so anything in the world layer can reuse it
export function createRenderLoop({ render, autoStart = true } = {}) {
  let running = false;
  let last = 0;
  let raf = null;

  const tick = (now = 0) => {
    if (!running) return;
    const dt = (now - last) / 1000;
    last = now;
    if (typeof render === 'function') {
      render(dt);
    }
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  };

  if (autoStart) start();

  return {
    start,
    stop,
    get running() {
      return running;
    },
  };
}
