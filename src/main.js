console.clear();

import 'css/index.css'
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
);

const root = document.documentElement;
root.style.cursor = "none";
root.appendChild(customCursor);

root.addEventListener("mouseleave", e => {
  customCursor.style.opacity = "1";
});

const handlePos = (e) => {
  customCursor.style.borderColor = CURSOR_COLOR;
  customCursor.style.backgroundColor = "rgba(215, 255, 0, 0.18)";
  customCursor.style.transform = `translateY(${e.clientY}px) translateX(${e.clientX}px)`;
  customCursor.style.opacity = "1";
};

root.addEventListener("mousemove", e => {
  handlePos(e);
});
root.addEventListener("mouseover", e => {
  handlePos(e);
});

root.addEventListener("mousedown", e => {
  customCursor.style.borderColor = CURSOR_COLOR;
  customCursor.style.backgroundColor = "rgba(215, 255, 0, 0.32)";
  customCursor.style.transform = `
  translateY(${e.clientY}px)
  translateX(${e.clientX}px)
  scale(3)
  `;
});

root.addEventListener("mouseup", e => {
  customCursor.style.borderColor = CURSOR_COLOR;
  customCursor.style.backgroundColor = "rgba(215, 255, 0, 0.18)";
  customCursor.style.zIndex = "1000000";
  customCursor.style.transform = `translateY(${e.clientY}px) translateX(${e.clientX
    }px) scale(1.8)`;
});


////////////////////////////////////////////////////////////////////
// FUNCTION: TOGGLE
///////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////
// Audio
///////////////////////////////////////////////////////////////////////////

// window.onload = () => {
//   const audioTrack = document.getElementById('music');
//   const play = document.getElementById('play');
//   const pause = document.getElementById('pause');

//   play.addEventListener('click', function() {
//     audioTrack.play()
//     play.style.display = "none";
//     pause.style.display = "block";
//   });

//   pause.addEventListener('click', function() {
//     audioTrack.pause();
//     pause.style.display = "none";
//     play.style.display = "block";
//   });

//   audioTrack.volume = 0.5;
// }

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
// COLOR CHANGER ON HOVERING / MOUSE ENTER
///////////////////////////////////////////////////////////////////////////

// const kbllr = document.getElementById('KBLLR')
// kbllr.onmousemove = (e) => {
//   const hues = [
//     'mintcream',
//     'dodgerblue',
//     'aqua',
//     'chartreuse',
//     'coral',
//     'goldenRod',
//     'ghostwhite',
//     'darksalmon',
//     'darkturquoise',
//     'hotpink',
//     'mediumspringgreen',
//     'peachpuff',
//     'teal'
//   ]
//   const random = () => hues[Math.floor(Math.random() * hues.length)];
//   document.documentElement.style.cssText = ` --hue: ${random()}; `
// }


////////////////////////////////////////////////////////////////////
// SHOW hamburger menu
///////////////////////////////////////////////////////////////////////////

// const button = document.getElementById("hamburger");

// button.onclick = () => {
//   button.classList.toggle("toggled");
// }

////////////////////////////////////////////////////////////////////
// SHOW MODAL INFO
///////////////////////////////////////////////////////////////////////////

const showBtn = document.getElementById('info-btn');
const tasksBtn = document.getElementById('tasks-btn');
const scenePickerBtn = document.getElementById('scene-picker-btn');
const deploymentsBtn = document.getElementById('deployments-btn');
const soundBtn = document.getElementById('sound-btn');

const modalRegistry = {
  changelog: document.getElementById('modal-changelog'),
  tasks: document.getElementById('modal-tasks'),
  scenes: document.getElementById('modal-scenes'),
  deployments: document.getElementById('modal-deployments'),
  music: document.getElementById('modal-music')
};

let activeModalId = null;

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
  const label = track
    ? `Sound player — Now playing ${track.title}`
    : defaultSoundLabel;
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
    if (state === 'playing') {
      reflectSoundButtonState(true);
    } else {
      reflectSoundButtonState(false);
    }
    if (!track) {
      updateSoundButtonMetadata(null);
    }
  }
});

const ensureMusicLibraryLoaded = ({ autoSelectFirst = false } = {}) => {
  musicPlayer
    .loadTracks({ autoSelectFirst })
    .catch((error) => {
      console.error('Failed to prepare music library', error);
    });
};

updateSoundButtonMetadata(musicPlayer.getCurrentTrack());
reflectSoundButtonState(false);

const focusCameraOnModal = () => {
  applyControlsState('focus');
  animateCameraPreset('focus', {
    duration: 1800,
    easing: Easing.Cubic.InOut
  });
  animateDepthOfField('focus', {
    duration: 1500
  });
};

const resetCameraFromModal = () => {
  applyControlsState('overview');
  animateCameraPreset('overview', {
    duration: 1600,
    easing: Easing.Cubic.InOut
  });
  animateDepthOfField('overview', {
    duration: 1400
  });
};

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
      modal.querySelector(focusTarget)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }
}

function closeModal() {
  if (!activeModalId) {
    return;
  }
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
    if (event.target === modal && activeModalId === id) {
      closeModal();
    }
  });
});

showBtn?.addEventListener('click', () =>
  openModal('changelog', { focusTarget: '#changelog-timeline' })
);
tasksBtn?.addEventListener('click', () =>
  openModal('tasks', { focusTarget: '#tasks-board' })
);
scenePickerBtn?.addEventListener('click', () =>
  openModal('scenes', { focusTarget: '#scene-picker' })
);
deploymentsBtn?.addEventListener('click', () =>
  openModal('deployments', { focusTarget: '#deployment-gallery' })
);
soundBtn?.addEventListener('click', () => {
  const shouldAutoSelect = !musicPlayer.getCurrentTrack();
  ensureMusicLibraryLoaded({ autoSelectFirst: shouldAutoSelect });
  openModal('music', { focusTarget: '#music-player' });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeModalId) {
    closeModal();
  }
});

const taskGeneratorForm = document.getElementById('task-generator');
const taskList = document.getElementById('task-list');
const assistantEntries = new Map();

document.querySelectorAll('#ai-collaborators li').forEach((item) => {
  const handle = item.dataset.handle;
  const name = item.querySelector('.assistant-list__name')?.textContent?.trim() || handle;
  if (handle && name) {
    assistantEntries.set(handle, name);
  }
});

taskGeneratorForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!taskList) return;

  const form = event.currentTarget;
  const promptField = form.querySelector('[name="taskPrompt"]');
  const assigneeField = form.querySelector('[name="taskAssignee"]');
  const prompt = promptField?.value?.trim();
  if (!prompt) {
    return;
  }

  const assigneeHandle = assigneeField?.value?.trim();
  const assigneeName = assigneeHandle ? assistantEntries.get(assigneeHandle) : null;
  const listItem = document.createElement('li');
  listItem.dataset.generated = 'true';

  if (assigneeName) {
    listItem.dataset.assignee = assigneeHandle;
    listItem.textContent = `[ ] ${prompt} — Assigned to ${assigneeName}`;
  } else {
    listItem.textContent = `[ ] ${prompt}`;
  }

  taskList.appendChild(listItem);
  form.reset();
});


/////////////////////////////////////////////////////////////////////////////
// VIDEO TEXTURE TV - VIDEO TEXTURE TV - VIDEO TEXTURE TV  - VIDEO TEXTURE TV
////////////////////////////////////////////////////////////////////////////

//const startVideoBtn = document.getElementById('play-bg');
// const spinVideo = document.getElementById('spin')
// startVideoBtn.addEventListener('click', function() { spin.play(); });

////////////////////////////////////////////////////////////////////
// WEBGL-THREEJS --> CANVAS --> EXPERIENCE
///////////////////////////////////////////////////////////////////////////////////

const experience = createExperience();

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
  start: startExperience
} = experience;



setSceneContext({
  scene,
  renderer,
  alphaMaterial,
  innerSphereMaterial
});

setDepthOfFieldPreset('overview');

const deploymentViewer = initDeploymentViewer();

const availableScenes = getScenes();
const scenePicker = initialiseScenePicker({
  scenes: availableScenes,
  onSelect: (sceneId) => {
    selectScene(sceneId).catch((error) => {
      console.error('Failed to apply scene', error);
    });
  }
});

async function selectScene(sceneId) {
  if (!sceneId) return;
  try {
    await applyScene(sceneId);
    scenePicker.setActive(sceneId);
  } catch (error) {
    throw error;
  }
}

const PREFERRED_START_SCENE = 'omega';
const defaultSceneId =
  availableScenes.find((scene) => scene.id === PREFERRED_START_SCENE)?.id ??
  availableScenes[0]?.id;
if (defaultSceneId) {
  selectScene(defaultSceneId).catch((error) => {
    console.error('Failed to load default scene', error);
  });
}

initialiseDeploymentTimeline({
  onOpenDeployment: (url) => deploymentViewer.open(url)
});

startExperience();
