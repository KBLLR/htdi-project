// examples/webgpu-postprocessing-demo.js
// Demo showing WebGPU/WebGL dual pipeline with postprocessing
import * as THREE from 'three';
import { RendererFactory } from '../src/world/core/rendererFactory.js';
import { PostProcessingManager } from '../src/world/postprocessing/PostProcessingManager.js';
import { SpotlightGobo } from '../src/world/lighting/spotlightGobo.js';
import { UIFrameOverlay } from '../src/ui/uiFrame/UIFrameOverlay.js';
import { LeAgentDiaryBridge } from '../src/integrations/leAgentDiaryBridge.js';

/**
 * Demo bootstrap showing the WebGPU postprocessing system
 */
async function bootstrap() {
  const container = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  container.style.position = 'relative';
  container.appendChild(canvas);

  // Initialize renderer with WebGPU/WebGL fallback
  const rendererFactory = new RendererFactory({ canvas });
  await rendererFactory.init();

  const rendererBackend = rendererFactory.getBackend();
  const renderer = rendererFactory.getRenderer();

  console.log(`[Demo] Using ${rendererBackend} backend`);

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  scene.fog = new THREE.Fog(0x050505, 10, 50);

  // Create camera
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(4, 3, 6);
  camera.lookAt(0, 0, 0);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 10, 5);
  dir.castShadow = true;
  scene.add(dir);

  // Spotlight with gobo
  const spotlight = new SpotlightGobo({
    intensity: 2,
    angle: Math.PI / 6,
    penumbra: 0.5
  });
  spotlight.setPosition(0, 8, 4);
  spotlight.lookAt(0, 0, 0);
  spotlight.addToScene(scene);

  // Demo geometry
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x88aaff,
    roughness: 0.3,
    metalness: 0.7
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Ground plane
  const planeGeo = new THREE.PlaneGeometry(20, 20);
  const planeMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.9,
    metalness: 0.1
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  plane.receiveShadow = true;
  scene.add(plane);

  // UI Frame overlay (optional - requires SVG assets)
  // const frameOverlay = new UIFrameOverlay({
  //   container,
  //   svgPath: '/svg/uiframe/001.svg'
  // });
  // frameOverlay.mount();

  // Initialize postprocessing manager
  const ppm = new PostProcessingManager({
    backend: rendererBackend,
    renderer,
    scene,
    camera
  });
  await ppm.init();

  console.log('[Demo] Postprocessing initialized with backend:', rendererBackend);

  // Resize handling
  function resize() {
    const { clientWidth, clientHeight } = container;
    const width = clientWidth || window.innerWidth;
    const height = clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    rendererFactory.setSize(width, height);
    ppm.resize(width, height);
  }

  window.addEventListener('resize', resize);
  resize();

  // Animation loop
  let lastTime = performance.now();

  function loop(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    mesh.rotation.y += delta * 0.5;
    mesh.rotation.x += delta * 0.3;

    ppm.render(delta);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // LeAgentDiary bridge example (requires env vars)
  const leDiaryBridge = new LeAgentDiaryBridge({
    baseUrl: import.meta.env.VITE_LEAGENTDIARY_API_URL || 'https://leagentdiary.example.com',
    apiKey: import.meta.env.VITE_LEAGENTDIARY_API_KEY
  });

  // Export scene to LeAgentDiary format
  async function exportCurrentScene() {
    const sceneJson = {
      id: `stage-demo-${Date.now()}`,
      agentId: 'agent-demo',
      createdAt: new Date().toISOString(),
      environment: {
        fog: { color: '#050505', near: 10, far: 50 }
      },
      camera: {
        preset: 'overview',
        fov: camera.fov,
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [0, 0, 0]
      },
      lighting: {
        directional: {
          intensity: dir.intensity,
          position: [dir.position.x, dir.position.y, dir.position.z]
        },
        rotatingPoints: [],
        spotlightGobo: {
          enabled: true,
          position: [
            spotlight.light.position.x,
            spotlight.light.position.y,
            spotlight.light.position.z
          ],
          target: [0, 0, 0],
          intensity: spotlight.getState().intensity,
          angle: spotlight.getState().angle,
          penumbra: spotlight.getState().penumbra
        }
      },
      materials: {
        outerSphere: {},
        innerSphere: {},
        ground: {},
        character: {}
      },
      ui: {
        palette: 'studio-lite',
        frameSvg: '001.svg',
        actionsBarPreset: 'default'
      },
      postprocessing: {
        backend: rendererBackend,
        bloom: { enabled: true, intensity: 0.9 },
        dof: { enabled: false },
        fxaa: { enabled: true }
      },
      assets: {
        characterModelUrl: '',
        videoTextureUrl: '',
        alphaMapUrl: ''
      }
    };

    try {
      const res = await leDiaryBridge.pushScene(sceneJson);
      console.log('[LeAgentDiary] Scene pushed:', res);
      return res;
    } catch (err) {
      console.error('[LeAgentDiary] Failed to push scene:', err);
      throw err;
    }
  }

  // Expose for debugging
  window.__webgpuDemo = {
    scene,
    camera,
    renderer,
    rendererFactory,
    postProcessingManager: ppm,
    spotlight,
    leDiaryBridge,
    exportCurrentScene,
    backend: rendererBackend
  };

  console.log('[Demo] Available in window.__webgpuDemo');
  console.log('[Demo] Try: window.__webgpuDemo.exportCurrentScene()');
}

// Auto-run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap().catch((err) => {
    console.error('[Demo] Bootstrap failed', err);
  });
}

export { bootstrap };
