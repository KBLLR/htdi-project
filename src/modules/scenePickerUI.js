export function initialiseScenePicker({ scenes, onSelect }) {
  const container = document.getElementById('scene-picker');
  if (!container) {
    return {
      setActive: () => {}
    };
  }

  container.innerHTML = '';

  const buttonMap = new Map();

  scenes.forEach((scene) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'scene-card';
    card.dataset.sceneId = scene.id;
    card.title = scene.description ?? scene.name;
    card.innerHTML = `
      <div class="scene-card__thumb" aria-hidden="true">
        ${scene.thumbnail ? `<img src="${scene.thumbnail}" alt="${scene.name} thumbnail" />` : `<div class="scene-card__thumb--placeholder"></div>`}
      </div>
      <div class="scene-card__body">
        <h2 class="scene-card__title">${scene.name}</h2>
        ${
          scene.description
            ? `<p class="scene-card__summary">${scene.description}</p>`
            : ''
        }
      </div>
    `;

    card.addEventListener('click', () => {
      if (typeof onSelect === 'function') {
        onSelect(scene.id);
      }
    });
    container.appendChild(card);
    buttonMap.set(scene.id, card);
  });

  const setActive = (sceneId) => {
    buttonMap.forEach((button, id) => {
      if (!button) return;
      if (id === sceneId) {
        button.classList.add('scene-card--active');
      } else {
        button.classList.remove('scene-card--active');
      }
    });
  };

  return { setActive };
}
