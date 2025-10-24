// src/main.js
import 'css/index.css';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';
import 'tippy.js/themes/translucent.css';

import tippy, { animateFill } from 'tippy.js';
import { Easing } from '@tweenjs/tween.js';
import { initialiseDeploymentTimeline } from 'modules/deploymentTimelineUI.js';
import { getScenes, applyScene, setSceneContext } from 'modules/sceneManager.js';
import { initialiseScenePicker } from 'modules/scenePickerUI.js';
import { initDeploymentViewer } from 'modules/deploymentViewer.js';
import { initialiseMusicPlayer } from 'modules/musicPlayerUI.js';
import { createExperience } from './app/experience.js';
import { wireModalButtons } from 'modules/wireModalButtons.js';

// ✧ Tweakpane (v4.0.5) — JSON driven
import TweakpaneManager from 'modules/TweakpaneManager.js';

const experience = createExperience();

const modalRegistry = {
  changelog: document.getElementById('modal-changelog'),
  tasks: document.getElementById('modal-tasks'),
  scenes: document.getElementById('modal-scenes'),
  deployments: document.getElementById('modal-deployments'),
  music: document.getElementById('modal-music')
};

let activeModalId = null;

////////////////////////////////////////////////////////////////////
// ✧ GLOBAL VARIABLES
///////////////

////////////////////////////////////////////////////////////////////
// ✧ Custom cursor
///////////////////////////////////////////////////////////////////
const CURSOR_COLOR = '#D7FF00';
const customCursor = document.createElement("div");

customCursor.setAttribute(
  "style",
  `border: 2px solid ${CURSOR_COLOR};
   width: 18px;
   height: 18px;
   border-radius: 50%;
   position: fixed;
   left: 0;
   top: 0;
   pointer-events: none;
   transition: transform 0.06s ease, opacity 0.12s ease;
   background: rgba(215, 255, 0, 0.18);
   box-shadow: 0 0 14px rgba(215, 255, 0, 0.45);`
    .replace('CUROR_COLOR', CURSOR_COLOR)
);

const root = document.documentElement;
root.style.cursor = "none";
root.appendChild(customCursor);

root.addEventListener("mouseleave", () => {
  customCursor.style.opacity = "1";
});

const handlePos = (e) => {
  customCursor.style.borderColor = CURSOR_COLOR;
  customCursor.style.backgroundColor = "rgba(215, 255, 0, 0.18)";
  customCursor.style.transform = `translateY(${e.clientY}px) translateX(${e.clientX}px)`;
  customCursor.style.opacity = "1";
};

root.addEventListener("mousemove", handlePos);
root.addEventListener("mouseover", handlePos);

root.addEventListener("mousedown", (e) => {
  customCursor.style.borderColor = CURSOR_COLOR;
  customCursor.style.backgroundColor = "rgba(215, 255, 0, 0.32)";
  customCursor.style.transform = `
  translateY(${e.clientY}px)
  translateX(${e.clientX}px)
  scale(3)
  `;
});

root.addEventListener("mouseup", (e) => {
  customCursor.style.borderColor = CURSOR_COLOR;
  customCursor.style.backgroundColor = "rgba(215, 255, 0, 0.18)";
  customCursor.style.zIndex = "1000000";
  customCursor.style.transform = `translateY(${e.clientY}px) translateX(${e.clientX}px) scale(1.8)`;
});

////////////////////////////////////////////////////////////////////
// Tool Tips
///////////////////////////////////////////////////////////////////////////
const tooltipInstances = tippy('[data-tippy-content]', {
  animation: 'scale',
  theme: 'translucent',
  duration: 0,
  arrow: true,
  delay: [400, 200],
  animateFill: true,
  inertia: true,
  plugins: [animateFill]
});

const tooltipMap = new Map();
tooltipInstances.forEach((instance) => {
  if (instance?.reference instanceof HTMLElement) {
    tooltipMap.set(instance.reference, instance);
  }
});

const updateTooltipContent = (element, content) => {
  if (!element) return;
  element.setAttribute('data-tippy-content', content);
  const instance = tooltipMap.get(element);
  instance?.setContent(content);
};

////////////////////////////////////////////////////////////////////
// SHOW MODAL INFO
///////////////////////////////////////////////////////////////////////////
const soundBtn = document.getElementById('sound-btn');

const defaultSoundTooltip = soundBtn?.getAttribute('data-tippy-content') ?? 'Sound Player';
const defaultSoundLabel = soundBtn?.getAttribute('aria-label') ?? 'Open sound player';

const reflectSoundButtonState = (isPlaying) => {
  if (!soundBtn) return;
  soundBtn.classList.toggle('is-playing', Boolean(isPlaying));
  if (isPlaying) {
    soundBtn.setAttribute('data-playing', 'true');
  } else {
    soundBtn.removeAttribute('data-playing');
  }
};

const updateSoundButtonMetadata = (track) => {
  if (!soundBtn) return;
  const tooltip = track ? `Now playing · ${track.title}` : defaultSoundTooltip;
  updateTooltipContent(soundBtn, tooltip);
  const label = track ? `Sound player — Now playing ${track.title}` : defaultSoundLabel;
  soundBtn.setAttribute('aria-label', label);
  if (track?.id) {
    soundBtn.dataset.activeTrack = track.id;
  } else {
    soundBtn.removeAttribute('data-active-track');
  }
};

const musicPlayer = initialiseMusicPlayer({
  onTrackChange: (track) => {
    updateSoundButtonMetadata(track);
  },
  onPlaybackStateChange: (state, track) => {
    reflectSoundButtonState(state === 'playing');
    if (!track) updateSoundButtonMetadata(null);
  }
});

const ensureMusicLibraryLoaded = ({ autoSelectFirst = false } = {}) => {
  musicPlayer.loadTracks({ autoSelectFirst }).catch((error) => {
    console.error('Failed to prepare music library', error);
  });
};

const {
  scene,
  renderer,
  camera,
  controls,
  alphaMaterial,
  innerSphereMaterial,
  applyControlsState,
  animateCameraPreset,
  animateDepthOfField,
  setDepthOfFieldPreset,
  stopCameraTween,
  stopDofTween,
  start: startExperience,
  // NOTE: sceneRegistry must exist here if you want Lights/Materials panels to populate
  sceneRegistry,
} = experience;

// Single TP instance (HMR-safe)
if (!window.__tpManager) {
  window.__tpManager = new TweakpaneManager(experience, { title: 'HTDI Controls', expanded: true });
}
if (import.meta?.hot) {
  window.__reloadTP = () => import.meta.hot.send?.('tweakpane:reload'); // optional
}



////////////////////////////////////////////////////////////////////
// Camera helpers used by modals (safe: experience now exists)
///////////////////////////////////////////////////////////////////////////
const focusCameraOnModal = () => {
  applyControlsState('focus');
  animateCameraPreset('focus', { duration: 1800, easing: Easing.Cubic.InOut });
  animateDepthOfField('focus', { duration: 1500 });
};

const resetCameraFromModal = () => {
  applyControlsState('overview');
  animateCameraPreset('overview', { duration: 1600, easing: Easing.Cubic.InOut });
  animateDepthOfField('overview', { duration: 1400 });
};

////////////////////////////////////////////////////////////////////
// Modal glue
///////////////////////////////////////////////////////////////////////////
function openModal(modalId, options = {}) {
  const modal = modalRegistry[modalId];
  if (!modal) return;

  const { focusTarget } = options;

  if (activeModalId && activeModalId !== modalId) {
    closeModal();
  }
  activeModalId = modalId;

  if (!modal.classList.contains('visible')) {
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    focusCameraOnModal();
    document.body.classList.add('modal-open');
    const surface = modal.querySelector('.modal__surface');
    surface?.focus({ preventScroll: true });
  }

  if (focusTarget) {
    requestAnimationFrame(() => {
      modal.querySelector(focusTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function closeModal() {
  if (!activeModalId) return;
  const modal = modalRegistry[activeModalId];
  if (modal) {
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
  }
  activeModalId = null;
  document.body.classList.remove('modal-open');
  resetCameraFromModal();
}

Object.entries(modalRegistry).forEach(([id, modal]) => {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (activeModalId === id) {
        closeModal();
      } else {
        modal.classList.remove('visible');
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  });
  modal.addEventListener('pointerdown', (event) => {
    if (event.target === modal && activeModalId === id) closeModal();
  });
});


