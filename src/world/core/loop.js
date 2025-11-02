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
  const monitorList = Array.isArray(frameMonitors) ? [...frameMonitors] : [];

  const callMonitors = (method, payload) => {
    for (const monitor of monitorList) {
      if (!monitor) continue;
      try {
        if (typeof monitor === 'function') {
          if (method === 'update') monitor(payload);
        } else if (typeof monitor[method] === 'function') {
          monitor[method](payload);
        } else if (method === 'update' && typeof monitor.update === 'function') {
          monitor.update(payload);
        }
      } catch (error) {
        console.warn(`[loop] frame monitor ${method} failed`, error);
      }
    }
  };

  const render = () => {
    const deltaTime = clock.getDelta();
    const context = {
      deltaTime,
      elapsedTime: clock.elapsedTime,
      renderer,
      scene,
      camera,
    };

    callMonitors('begin', context);

    if (controls && controls.enabled !== false && typeof controls.update === 'function') {
      controls.update();
    }

    if (typeof updateRotatingLights === 'function') {
      updateRotatingLights(deltaTime);
    }

    if (mixers && typeof mixers === 'object') {
      for (const key in mixers) {
        const mixer = mixers[key];
        if (mixer && typeof mixer.update === 'function') {
          mixer.update(deltaTime);
        }
      }
    }

    if (particles && typeof particles.update === 'function') {
      particles.update(deltaTime);
    }

    callMonitors('update', context);

    if (typeof postprocessRender === 'function') {
      postprocessRender(deltaTime);
    } else if (composer) {
      composer.render(deltaTime);
    } else if (renderer) {
      renderer.render(scene, camera);
    }

    if (outerMesh) {
      outerMesh.rotation.y += deltaTime * 0.1;
    }

    callMonitors('end', context);
  };

  const loop = createRenderLoop({
    render,
    autoStart: true,
  });

  const addFrameMonitor = (monitor) => {
    if (!monitor) return () => {};
    monitorList.push(monitor);
    return () => {
      const idx = monitorList.indexOf(monitor);
      if (idx >= 0) monitorList.splice(idx, 1);
    };
  };

  const removeFrameMonitor = (monitor) => {
    const idx = monitorList.indexOf(monitor);
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
