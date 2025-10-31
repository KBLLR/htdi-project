import { Easing } from '@tweenjs/tween.js';

import { EventBus } from '@shared/EventBus.js';

import { initialiseDeploymentTimeline } from '@modules/deploymentTimelineUI.js';
import { initDeploymentViewer } from '@modules/deploymentViewer.js';
import { initialiseMusicPlayer } from '@modules/musicPlayerUI.js';
import { setupSoundButton } from '@modules/soundButtonUI.js';
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
import { initModalService } from '@modules/modalService.js';
import { initialiseScenePicker } from '@modules/scenePickerUI.js';

import { getScenes, applyScene, setSceneContext, getActiveSceneId } from '@world/sceneManager.js';

import actionsSpec from '@config/actions.json';

function registerActions({ actions, musicPlayer, ensureMusicLibraryLoaded, toggleDeploymentTimeline }) {
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

  const modules = Array.isArray(actionsSpec?.modules) ? actionsSpec.modules : [];
  modules.forEach((spec) => {
    const init = ACTION_INITS[spec.id];
    if (typeof init === 'function') {
      init(actions, spec);
    } else {
      console.warn('[actions] Unknown action id in config:', spec.id, spec);
    }
  });
}

function setupInitialScene({ experience, scenePicker, preferredSceneId }) {
  const initialScenes = getScenes();
  const defaultSceneId =
    initialScenes.find((sceneDef) => sceneDef.id === preferredSceneId)?.id ?? initialScenes[0]?.id;

  if (!defaultSceneId) return;

  applyScene(defaultSceneId)
    .then((sceneDef) => {
      scenePicker.setActive(defaultSceneId);
      if (sceneDef?.character?.id && typeof experience.setCharacter === 'function') {
        experience.setCharacter(sceneDef.character.id);
      }
    })
    .catch((error) => console.error('Failed to load default scene', error));
}

export function bootstrapApp({ experience, updateTooltipContent, customCursor }) {
  if (!experience) {
    throw new Error('bootstrapApp requires an experience object');
  }

  console.log('Experience object after creation:', experience);

  const {
    scene,
    renderer,
    alphaMaterial,
    innerSphereMaterial,
    activateCameraPreset,
  } = experience;

  const actionsBarTarget = document.querySelector('.glass-footer');
  if (!actionsBarTarget) {
    console.warn('[bootstrap] Actions bar target not found');
    return {
      experience,
    };
  }

  // Reveal the footer once the experience is ready.
  actionsBarTarget.classList.add('is-ready');

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

  if (import.meta.env.DEV) {
    import('@modules/TweakpaneManager.js')
      .then(({ default: TweakpaneManager }) => {
        if (!window.__tpManager) {
          window.__tpManager = new TweakpaneManager(experience, { title: 'HTDI Controls', expanded: false });
          window.__tpManager.hidePane?.();
        } else {
          window.__tpManager.hidePane?.();
        }

        window.dispatchEvent(
          new CustomEvent('htdi:tweakpane-ready', { detail: { manager: window.__tpManager } }),
        );

        const dataButton = document.getElementById('data-btn');
        if (dataButton) {
          dataButton.classList.remove('is-active');
          dataButton.setAttribute('aria-pressed', 'false');
        }

        if (import.meta?.hot) {
          window.__reloadTP = () => import.meta.hot.send?.('tweakpane:reload');
          import.meta.hot.accept();
        }
      })
      .catch((error) => console.error('Failed to initialise TweakpaneManager', error));

    document.addEventListener('keydown', (event) => {
      if (event.altKey && (event.key === 'r' || event.key === 'R')) window.__reloadTP?.();
    });
  }

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

  const ensureMusicLibraryLoaded = ({ autoSelectFirst = false } = {}) =>
    musicPlayer.loadTracks({ autoSelectFirst }).catch((error) => console.error('[music] load failed', error));

  updateSoundButtonMetadata(musicPlayer.getCurrentTrack());
  reflectSoundButtonState(false);

  const eventBus = new EventBus();
  const actions = new ActionsBarManager({ target: actionsBarTarget, eventBus });
  let toggleDeploymentTimeline = () => {};

  const deploymentViewer = initDeploymentViewer();
  const deploymentTimelineOverlay = initDeploymentTimelineOverlay({
    onOpen: () => customCursor?.disable?.(),
    onClose: () => customCursor?.enable?.(),
  });

  toggleDeploymentTimeline = deploymentTimelineOverlay.toggle;

  registerActions({
    actions,
    musicPlayer,
    ensureMusicLibraryLoaded,
    toggleDeploymentTimeline,
  });

  setSceneContext({ scene, renderer, alphaMaterial, innerSphereMaterial });

  const handleSceneSelect = (sceneId) => {
    if (!sceneId) return;
    applyScene(sceneId)
      .then((sceneDef) => {
        scenePicker.setActive(sceneId);
        if (sceneDef?.character?.id && typeof experience.setCharacter === 'function') {
          experience.setCharacter(sceneDef.character.id);
        }
      })
      .catch((error) => console.error('Failed to apply scene', error));
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

  setupInitialScene({
    experience,
    scenePicker,
    preferredSceneId: 'omega',
  });

  window.addEventListener('htdi:scenes-changed', (event) => {
    const detail = event.detail ?? {};
    const active = detail.scene?.id ?? getActiveSceneId();
    rebuildScenePicker(active);
  });

  initialiseDeploymentTimeline({
    onOpenDeployment: (url) => deploymentViewer.open(url),
  });

  wireModalButtons({
    openModal: modalService.openModal,
    toggleDeploymentTimeline: deploymentTimelineOverlay.toggle,
    musicPlayer,
    ensureMusicLibraryLoaded,
  });

  return {
    actions,
    eventBus,
    modalService,
    musicPlayer,
    ensureMusicLibraryLoaded,
    deploymentViewer,
    deploymentTimelineOverlay,
    scenePicker,
  };
}
