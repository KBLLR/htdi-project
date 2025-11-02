// src/world/core/loop.js
import { Clock } from 'three';
import { createRenderLoop } from './createRenderLoop.js';

export function startLoop({
  renderer,
  scene,
  camera,
  controls = null,
  composer = null,
  postprocessRender = null,
  outerMesh = null,
  updateRotatingLights = null,
  mixers = null,
  particles = null,
  frameMonitors = [],
} = {}) {
  const clock = new Clock();
  const monitorList = Array.isArray(frameMonitors) ? frameMonitors : [];

  const render = () => {
    const dt = clock.getDelta();

    // controls
    if (controls && controls.enabled !== false && typeof controls.update === 'function') {
      controls.update();
    }

    // lights
    if (typeof updateRotatingLights === 'function') {
      updateRotatingLights(dt);
    }

    // mixers
    if (mixers && typeof mixers === 'object') {
      for (const key in mixers) {
        const mixer = mixers[key];
        if (mixer && typeof mixer.update === 'function') {
          mixer.update(dt);
        }
      }
    }

    // particles
    if (particles && typeof particles.update === 'function') {
      particles.update(dt);
    }

    // frame monitors (water, FBOs…)
    for (const monitor of monitorList) {
      if (typeof monitor === 'function') {
        monitor(dt);
      } else if (monitor && typeof monitor.update === 'function') {
        monitor.update(dt);
      }
    }

    // render / postprocess
    if (typeof postprocessRender === 'function') {
      postprocessRender(dt);
    } else if (composer) {
      composer.render(dt);
    } else if (renderer) {
      renderer.render(scene, camera);
    }

    // optional eye candy
    if (outerMesh) {
      outerMesh.rotation.y += dt * 0.1;
    }
  };

  const loop = createRenderLoop({
    render,
    autoStart: true,
  });

  const addFrameMonitor = (fn) => {
    if (!fn) return () => {};
    monitorList.push(fn);
    return () => {
      const idx = monitorList.indexOf(fn);
      if (idx >= 0) monitorList.splice(idx, 1);
    };
  };

  const removeFrameMonitor = (fn) => {
    const idx = monitorList.indexOf(fn);
    if (idx >= 0) {
      monitorList.splice(idx, 1);
      return true;
    }
    return false;
  };

  return {
    start: loop.start,
    stop: loop.stop,
    addFrameMonitor,
    removeFrameMonitor,
  };
}
