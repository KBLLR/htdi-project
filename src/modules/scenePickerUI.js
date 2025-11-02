// src/ui/scenePicker.js
import {
  loadScenePreset,
  getScenes,
  setSceneThumbnail,
  setSceneMetadata,
  deleteScene,
} from '@world/sceneManager.js';

const MEDIA_VIDEO_PATTERN = /\.(mp4|webm|mov|m4v|ogv)$/i;

function createThumbnailElement(source) {
  if (!source) {
    const placeholder = document.createElement('div');
    placeholder.className = 'scene-card__thumb-placeholder';
    placeholder.textContent = 'Upload thumbnail';
    return placeholder;
  }

  const isVideo =
    source.startsWith('data:video') || MEDIA_VIDEO_PATTERN.test(source);

  if (isVideo) {
    const video = document.createElement('video');
    video.src = source;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.className = 'scene-card__thumb-media';
    return video;
  }

  const img = document.createElement('img');
  img.src = source;
  img.alt = '';
  img.className = 'scene-card__thumb-media';
  return img;
}

export function initialiseScenePicker({ scenes: providedScenes, onSelect } = {}) {
  const container = document.getElementById('scene-picker');
  if (!container) {
    return {
      setActive: () => {},
      dispose: () => {},
    };
  }

  const scenes = providedScenes ?? getScenes();
  container.innerHTML = '';

  const cardMap = new Map();

  const handleSelectScene = async (sceneId) => {
    let handled = false;
    if (typeof onSelect === 'function') {
      try {
        const result = onSelect(sceneId);
        if (result instanceof Promise) {
          await result;
        }
        handled = result !== false;
      } catch (error) {
        console.warn('[scenePicker] onSelect handler failed', error);
      }
    }
    if (!handled) {
      await loadScenePreset(sceneId);
    }
    setActive(sceneId);
  };

  scenes.forEach((scene) => {
    const card = document.createElement('div');
    card.className = 'scene-card';
    card.dataset.sceneId = scene.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', 'false');
    card.title = scene.description || scene.name || scene.id;

    const thumb = document.createElement('div');
    thumb.className = 'scene-card__thumb';
    thumb.setAttribute('aria-hidden', 'true');
    const media = createThumbnailElement(scene.thumbnail);
    thumb.appendChild(media);

    const body = document.createElement('div');
    body.className = 'scene-card__body';
    const title = document.createElement('h2');
    title.className = 'scene-card__title';
    title.textContent = scene.name;
    body.appendChild(title);
    const summary = document.createElement('p');
    summary.className = 'scene-card__summary';
    if (scene.description) {
      summary.textContent = scene.description;
      body.appendChild(summary);
    }

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'scene-card__actions';

    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'scene-card__action scene-card__action--upload';
    uploadButton.setAttribute('aria-label', `Upload thumbnail for ${scene.name}`);
    uploadButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l4 4h-3v6h-2V9H8l4-4zm-7 14h14v2H5v-2z" /></svg>';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'scene-card__action scene-card__action--edit';
    editButton.setAttribute('aria-label', `Edit details for ${scene.name}`);
    editButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-8.04c.39-.39.39-1.02 0-1.41l-2.54-2.54a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.03-1.03z"/></svg>';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'scene-card__action scene-card__action--delete';
    deleteButton.setAttribute('aria-label', `Delete ${scene.name}`);
    deleteButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm3.46-9.12l1.41-1.41L12 10.59l1.12-1.12 1.41 1.41L13.41 12l1.12 1.12-1.41 1.41L12 13.41l-1.12 1.12-1.41-1.41L10.59 12l-1.13-1.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

    actionsWrapper.appendChild(uploadButton);
    actionsWrapper.appendChild(editButton);
    actionsWrapper.appendChild(deleteButton);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*';
    fileInput.style.display = 'none';

    const updateThumbnail = (source) => {
      thumb.innerHTML = '';
      const element = createThumbnailElement(source);
      thumb.appendChild(element);
    };

    uploadButton.addEventListener('click', (event) => {
      event.stopPropagation();
      fileInput.click();
    });

    editButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const draftName = window.prompt('Scene title', scene.name ?? '');
      if (draftName !== null && draftName.trim()) {
        scene.name = draftName.trim();
        title.textContent = scene.name;
      }
      const draftDescription = window.prompt('Scene description', scene.description ?? '');
      if (draftDescription !== null) {
        const trimmed = draftDescription.trim();
        scene.description = trimmed ? trimmed : null;
        if (scene.description) {
          summary.textContent = scene.description;
          if (!summary.parentElement) {
            body.appendChild(summary);
          }
        } else if (summary.parentElement) {
          summary.remove();
        }
      }
      setSceneMetadata(scene.id, {
        name: scene.name,
        description: scene.description ?? null,
      });
    });

    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const confirmed = window.confirm(`Delete scene “${scene.name}”?`);
      if (!confirmed) return;
      const wasActive = card.classList.contains('scene-card--active');
      const deleted = deleteScene(scene.id);
      if (!deleted) {
        console.warn('[scenePicker] failed to delete scene', scene.id);
        return;
      }
      card.remove();
      cardMap.delete(scene.id);
      if (wasActive && cardMap.size > 0) {
        const nextId = Array.from(cardMap.keys())[0];
        handleSelectScene(nextId);
      }
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!/^image\//.test(file.type) && !/^video\//.test(file.type)) {
        console.warn('[scenePicker] unsupported file type', file.type);
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setSceneThumbnail(scene.id, typeof dataUrl === 'string' ? dataUrl : null);
        scene.thumbnail = typeof dataUrl === 'string' ? dataUrl : scene.thumbnail;
        updateThumbnail(scene.thumbnail);
        fileInput.value = '';
      };
      reader.readAsDataURL(file);
    });

    const select = () => handleSelectScene(scene.id);
    card.addEventListener('click', select);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });

    card.appendChild(thumb);
    card.appendChild(body);
    card.appendChild(actionsWrapper);
    card.appendChild(fileInput);
    container.appendChild(card);

    cardMap.set(scene.id, {
      element: card,
      update: (source) => updateThumbnail(source),
    });
  });

  const setActive = (sceneId) => {
    cardMap.forEach((entry, id) => {
      const isActive = id === sceneId;
      entry.element.classList.toggle('scene-card--active', isActive);
      entry.element.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const handleThumbChange = (event) => {
    const { id, thumbnail } = event.detail ?? {};
    if (!id) return;
    const entry = cardMap.get(id);
    if (entry) {
      entry.update(thumbnail);
    }
    const scene = scenes.find((s) => s.id === id);
    if (scene) {
      scene.thumbnail = thumbnail;
    }
  };

  window.addEventListener('htdi:scene-thumbnail-changed', handleThumbChange);

  return {
    setActive,
    dispose: () => {
      window.removeEventListener('htdi:scene-thumbnail-changed', handleThumbChange);
      cardMap.clear();
    },
  };
}
