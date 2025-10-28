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
import { getScenes, applyScene, setSceneContext, getActiveSceneId } from '@three/sceneManager.js';
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
import { initDeploymentTimelineOverlay } from '@modules/deploymentTimelineOverlay.js';
import { wireModalButtons } from '@modules/wireModalButtons.js';
import { createCustomCursor } from '@modules/customCursor.js';

// Sound button helper (no globals; HMR-safe)
import { setupSoundButton } from '@modules/soundButtonUI.js';

// Modal service (EventBus-driven)
import { initModalService } from '@shared/modalService.js';

// Tweakpane v4.0.5


// Three (refactored domain)
import { createExperience } from '@three/index.js';

// Actions config (JSON-driven registration)
import actionsSpec from '@config/actions.json';

const customCursor = createCustomCursor({
  color: '#D7FF00',
  size: 18,
  borderWidth: 2,
  hoverScale: 1.8,
  pressScale: 3,
});

/* ──────────────────────────────────────────────────────────────────────────
   Tooltips (with a small registry so we can update titles dynamically)
────────────────────────────────────────────────────────────────────────── */
const tips = tippy('[data-tippy-content]', {
  animation: 'scale',
  theme: 'translucent',
  duration: 0,
  arrow: true,
  delay: [400, 200],
  placement: 'right',
  offset: [0, 12],
  moveTransition: 'transform 0.2s ease-out',
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
  const eventBus = new EventBus();
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
    activateCameraPreset,
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
  const modalService = initModalService(eventBus, {
    focusCameraOnModal: () => {
      activateCameraPreset('focus', {
        camera: { duration: 1800, easing: Easing.Cubic.InOut },
        dof: { duration: 1500 },
      });
    },
    resetCameraFromModal: () => {
      activateCameraPreset('overview', {
        camera: { duration: 1600, easing: Easing.Cubic.InOut },
        dof: { duration: 1400 },
      });
    },
  });

  /* ──────────────────────────────────────────────────────────────────────────
     Tweakpane v4.0.5 (JSON + dynamic Materials)
  ────────────────────────────────────────────────────────────────────────── */
  if (import.meta.env.DEV) {
    import('@modules/TweakpaneManager.js').then(({ default: TweakpaneManager }) => {
      if (!window.__tpManager) {
        window.__tpManager = new TweakpaneManager(experience, { title: 'HTDI Controls', expanded: false });
        window.__tpManager.hidePane?.();
      } else {
        window.__tpManager.hidePane?.();
      }

      window.dispatchEvent(new CustomEvent('htdi:tweakpane-ready', { detail: { manager: window.__tpManager } }));

      const dataButton = document.getElementById('data-btn');
      if (dataButton) {
        dataButton.classList.remove('is-active');
        dataButton.setAttribute('aria-pressed', 'false');
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
  const actions = new ActionsBarManager({ target: actionsBarTarget, eventBus });
  let toggleDeploymentTimeline = () => { };
  // Map action id -> initializer
  const ACTION_INITS = {
    devlog: (mgr, spec) => initDevlogAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
    tasks: (mgr, spec) => initTasksAction(mgr, { buttonId: spec.buttonId, ...spec.params }),
    deployments: (mgr, spec) =>
      initDeploymentsAction(mgr, {
        buttonId: spec.buttonId,
        toggleTimeline: () => toggleDeploymentTimeline?.(),
        ...spec.params,
      }),
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
  const deploymentTimelineOverlay = initDeploymentTimelineOverlay({
    onOpen: () => customCursor.disable?.(),
    onClose: () => customCursor.enable?.(),
  });
  toggleDeploymentTimeline = deploymentTimelineOverlay.toggle;

  const handleSceneSelect = (sceneId) => {
    if (!sceneId) return;
    applyScene(sceneId)
      .then((sceneDef) => {
        scenePicker.setActive(sceneId);
        if (sceneDef?.character?.id && typeof experience.setCharacter === 'function') {
          experience.setCharacter(sceneDef.character.id);
        }
      })
      .catch((e) => console.error('Failed to apply scene', e));
  };

  let scenePicker = initialiseScenePicker({
    scenes: getScenes(),
    onSelect: handleSceneSelect,
  });

  const rebuildScenePicker = (activeScene) => {
    scenePicker = initialiseScenePicker({
      scenes: getScenes(),
      onSelect: handleSceneSelect,
    });
    if (activeScene) {
      scenePicker.setActive(activeScene);
    }
  };

  const PREFERRED_START_SCENE = 'omega';
  const initialScenes = getScenes();
  const defaultSceneId =
    initialScenes.find((s) => s.id === PREFERRED_START_SCENE)?.id ??
    initialScenes[0]?.id;

  if (defaultSceneId) {
    applyScene(defaultSceneId)
      .then((sceneDef) => {
        scenePicker.setActive(defaultSceneId);
        if (sceneDef?.character?.id && typeof experience.setCharacter === 'function') {
          experience.setCharacter(sceneDef.character.id);
        }
      })
      .catch((e) => console.error('Failed to load default scene', e));
  }

  window.addEventListener('htdi:scenes-changed', (event) => {
    const detail = event.detail ?? {};
    const active = detail.scene?.id ?? getActiveSceneId();
    rebuildScenePicker(active);
  });

  initialiseDeploymentTimeline({
    onOpenDeployment: (url) => deploymentViewer.open(url),
  });

  // Wire up modal buttons
  wireModalButtons({
    openModal: modalService.openModal,
    toggleDeploymentTimeline: deploymentTimelineOverlay.toggle,
    musicPlayer,
    ensureMusicLibraryLoaded,
  });
});
