// src/main.js
import '@css/index.css';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';
import 'tippy.js/themes/translucent.css';

import tippy, { animateFill } from 'tippy.js';
import { Easing } from '@tweenjs/tween.js';

import { EventBus } from '@shared/EventBus.js';

import { enableOverlay, installConsoleTap, devlog } from '@modules/devlog.js';

// Show overlay and mirror console into it
installConsoleTap({ level: 'debug' });
enableOverlay();

devlog.info('Booting…');

// Feature modules (aliased)
import { initialiseDeploymentTimeline } from '@modules/deploymentTimelineUI.js';
import { getScenes, applyScene, setSceneContext } from '@three/sceneManager.js';
import { initialiseScenePicker } from '@modules/scenePickerUI.js';
import { initDeploymentViewer } from '@modules/deploymentViewer.js';
import { initialiseMusicPlayer } from '@modules/musicPlayerUI.js';

// Actions Bar: manager + concrete action initializers
import { ActionsBarManager } from '@modules/actionsBar/ActionsBarManager.js';
import { initDevlogAction } from '@modules/actionsBar/actions/devlogAction.js';
import { initTasksAction } from '@modules/actionsBar/actions/tasksAction.js';
import { initDeploymentsAction } from '@modules/actionsBar/actions/deploymentsAction.js';
import { initMusicAction } from '@modules/actionsBar/actions/musicAction.js';
import { initSceneGeneratorAction } from '@modules/actionsBar/actions/sceneGeneratorAction.js';
import { initAIAction } from '@modules/actionsBar/actions/aiAction.js';
import { initDataAction } from '@modules/actionsBar/actions/dataAction.js';
import { wireModalButtons } from '@modules/wireModalButtons.js';

// Sound button helper (no globals; HMR-safe)
import { setupSoundButton } from '@modules/soundButtonUI.js';

// Modal service (EventBus-driven)
import { initModalService } from '@modules/modalService.js';

// Tweakpane v4.0.5


// Three (refactored domain)
import { createExperience } from '@three/index.js';

// Actions config (JSON-driven registration)
import actionsSpec from '@config/actions.json';

/* ──────────────────────────────────────────────────────────────────────────
   Custom cursor (minimal)
────────────────────────────────────────────────────────────────────────── */
{
  const CURSOR_COLOR = '#D7FF00';
  const cur = document.createElement('div');
  cur.style.cssText = `
    border: 2px solid ${CURSOR_COLOR};
    width: 18px; height: 18px; border-radius: 50%;
    position: fixed; left: 0; top: 0; pointer-events: none;
    transition: transform .06s ease, opacity .12s ease;
    background: rgba(215,255,0,.18);
    box-shadow: 0 0 14px rgba(215,255,0,.45);
  `;
  const root = document.documentElement;
  root.style.cursor = 'none';
  root.appendChild(cur);

  const move = (e) => {
    cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    cur.style.opacity = '1';
  };
  root.addEventListener('mousemove', move, { passive: true });
  root.addEventListener(
    'mousedown',
    (e) => {
      cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px) scale(3)`;
      cur.style.background = 'rgba(215,255,0,.32)';
    },
    { passive: true }
  );
  root.addEventListener(
    'mouseup',
    (e) => {
      cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px) scale(1.8)`;
      cur.style.background = 'rgba(215,255,0,.18)';
    },
    { passive: true }
  );
  root.addEventListener('mouseleave', () => { cur.style.opacity = '0'; }, { passive: true });
}

/* ──────────────────────────────────────────────────────────────────────────
   Tooltips (with a small registry so we can update titles dynamically)
────────────────────────────────────────────────────────────────────────── */
const tips = tippy('[data-tippy-content]', {
  animation: 'scale',
  theme: 'translucent',
  duration: 0,
  arrow: true,
  delay: [400, 200],
  animateFill: true,
  inertia: true,
  plugins: [animateFill],
});
const tipMap = new Map();
tips.forEach((inst) => { if (inst?.reference instanceof HTMLElement) tipMap.set(inst.reference, inst); });
const updateTooltipContent = (el, content) => {
  if (!el) return;
  el.setAttribute('data-tippy-content', content);
  tipMap.get(el)?.setContent(content);
};

/* ──────────────────────────────────────────────────────────────────────────
   Three Experience
────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const experience = await createExperience();
  console.log('Experience object after creation:', experience);
  const {
    scene,
    renderer,
    // camera,
    // controls,
    // sceneRegistry,
    alphaMaterial,
    innerSphereMaterial,
    // materialLibrary,
    // applyMaterialPreset,
    applyControlsState,
    animateCameraPreset,
    animateDepthOfField,
    // setDepthOfFieldPreset,
    // stopCameraTween,
    // stopDofTween,
    // start: startExperience, // Removed as loop is started internally
  } = experience;

  // Actions Bar
  const actionsBarTarget = document.querySelector('.glass-footer');
  console.log('Actions Bar Target:', actionsBarTarget);

  // Make the actions bar visible and clickable after the experience is ready
  actionsBarTarget.classList.add('is-ready');

  /* ──────────────────────────────────────────────────────────────────────────
     Modal service hooks
  ────────────────────────────────────────────────────────────────────────── */
  initModalService({
    focusCameraOnModal: () => {
      applyControlsState('focus');
      animateCameraPreset('focus', { duration: 1800, easing: Easing.Cubic.InOut });
      animateDepthOfField('focus', { duration: 1500 });
    },
    resetCameraFromModal: () => {
      applyControlsState('overview');
      animateCameraPreset('overview', { duration: 1600, easing: Easing.Cubic.InOut });
      animateDepthOfField('overview', { duration: 1400 });
    },
  });

  /* ──────────────────────────────────────────────────────────────────────────
     Tweakpane v4.0.5 (JSON + dynamic Materials)
  ────────────────────────────────────────────────────────────────────────── */
  if (import.meta.env.DEV) {
    import('@modules/TweakpaneManager.js').then(({ default: TweakpaneManager }) => {
      if (!window.__tpManager) {
        window.__tpManager = new TweakpaneManager(experience, { title: 'HTDI Controls', expanded: true });
      }

      if (import.meta?.hot) {
        window.__reloadTP = () => import.meta.hot.send?.('tweakpane:reload');
        import.meta.hot.accept();
      }
      document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'r' || e.key === 'R')) window.__reloadTP?.();
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────────────────
     Music player + sound button (FIXED)
  ────────────────────────────────────────────────────────────────────────── */
  const { reflectSoundButtonState, updateSoundButtonMetadata } = setupSoundButton({
    updateTooltipContent,
    buttonId: 'sound-btn',
  });

  const musicPlayer = initialiseMusicPlayer({
    onTrackChange: (track) => updateSoundButtonMetadata(track),
    onPlaybackStateChange: (state, track) => {
      reflectSoundButtonState(state === 'playing');
      if (!track) updateSoundButtonMetadata(null);
    },
  });

  // ✅ FIXED: this was previously broken (the call lived outside the function)
  const ensureMusicLibraryLoaded = ({ autoSelectFirst = false } = {}) =>
    musicPlayer
      .loadTracks({ autoSelectFirst })
      .catch((err) => console.error('[music] load failed', err));

  updateSoundButtonMetadata(musicPlayer.getCurrentTrack());
  reflectSoundButtonState(false);

  /* ──────────────────────────────────────────────────────────────────────────
     Actions Bar — JSON-driven registration (config/actions/actions.json)
  ────────────────────────────────────────────────────────────────────────── */
  const eventBus = new EventBus();
  const actions = new ActionsBarManager({ target: actionsBarTarget, eventBus });
  // Map action id -> initializer
  const ACTION_INITS = {
    devlog: (mgr, spec) => initDevlogAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
    tasks: (mgr, spec) => initTasksAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
    deployments: (mgr, spec) => initDeploymentsAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
    music: (mgr, spec) =>
      initMusicAction(mgr, {
        buttonId: spec.buttonId,
        ensureMusicLibraryLoaded,
        getCurrentTrack: () => musicPlayer.getCurrentTrack(),
        ...spec.params,
      }),
    sceneGenerator: (mgr, spec) => initSceneGeneratorAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
    ai: (mgr, spec) => initAIAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
    data: (mgr, spec) => initDataAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
  };

  // Register what the JSON says to expose
  try {
    const modules = Array.isArray(actionsSpec?.modules) ? actionsSpec.modules : [];
    modules.forEach((spec) => {
      const init = ACTION_INITS[spec.id];
      if (typeof init === 'function') {
        init(actions, spec);
      } else {
        console.warn('[actions] Unknown action id in config:', spec.id, spec);
      }
    });
  } catch (e) {
    console.error('[actions] Failed to register from actions.json', e);
  }

  /* ──────────────────────────────────────────────────────────────────────────
     Scenes & Deployments
  ────────────────────────────────────────────────────────────────────────── */
  console.log('Debugging scene context:');
  console.log('scene:', scene);
  console.log('renderer:', renderer);
  console.log('alphaMaterial:', alphaMaterial);
  console.log('innerSphereMaterial:', innerSphereMaterial);
  setSceneContext({ scene, renderer, alphaMaterial, innerSphereMaterial });

  const deploymentViewer = initDeploymentViewer();

  const availableScenes = getScenes();
  const scenePicker = initialiseScenePicker({
    scenes: availableScenes,
    onSelect: (sceneId) => {
      if (!sceneId) return;
      applyScene(sceneId)
        .then(() => scenePicker.setActive(sceneId))
        .catch((e) => console.error('Failed to apply scene', e));
    },
  });

  const PREFERRED_START_SCENE = 'omega';
  const defaultSceneId =
    availableScenes.find((s) => s.id === PREFERRED_START_SCENE)?.id ??
    availableScenes[0]?.id;

  if (defaultSceneId) {
    applyScene(defaultSceneId)
      .then(() => scenePicker.setActive(defaultSceneId))
      .catch((e) => console.error('Failed to load default scene', e));
  }

  initialiseDeploymentTimeline({
    onOpenDeployment: (url) => deploymentViewer.open(url),
  });

  // Wire up modal buttons
  wireModalButtons({
    openModal: initModalService({}).openModal, // Assuming initModalService returns an object with openModal
    musicPlayer,
    ensureMusicLibraryLoaded,
  });
});
