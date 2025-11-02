// src/modules/tweakpane/paneVisibility.js

/**
 * Apply baseline layout styles so the Tweakpane shell starts centered and can be
 * moved around freely. This keeps layout logic in one place instead of
 * scattering inline Object.assign calls throughout the manager.
 *
 * @param {HTMLElement} element
 * @param {{ hidden?: boolean }} [options]
 */
export function initialisePaneShell(element, { hidden = true } = {}) {
  if (!element) return;

  element.style.position = element.style.position || 'fixed';
  element.style.top = element.style.top || '50%';
  element.style.left = element.style.left || '50%';
  element.style.right = 'auto';
  element.style.bottom = 'auto';
  element.style.width = element.style.width || 'min(360px, calc(100vw - 32px))';
  element.style.maxHeight = 'calc(100vh - 32px)';
  element.style.transformOrigin = 'center';
  element.style.display = element.style.display || 'flex';
  element.style.flexDirection = 'column';
  element.style.overflow = element.style.overflow || 'hidden';
  element.dataset.dragged = element.dataset.dragged ?? '0';

  if (element.dataset.dragged !== '1') {
    element.style.transform = 'translate(-50%, -50%)';
  }

  if (hidden) {
    hidePaneElement(element);
  } else {
    showPaneElement(element);
  }
}

/**
 * Hide the pane and remove it from pointer focus.
 * @param {HTMLElement} element
 */
export function hidePaneElement(element) {
  if (!element) return;
  element.classList.add('is-hidden');
  element.setAttribute('aria-hidden', 'true');
  element.style.opacity = '0';
  element.style.pointerEvents = 'none';
  element.style.visibility = 'hidden';
  if ((element.dataset.dragged ?? '0') !== '1') {
    element.style.transform = 'translate(-50%, -50%)';
  }
}

/**
 * Show the pane again and restore pointer interaction.
 * @param {HTMLElement} element
 */
export function showPaneElement(element) {
  if (!element) return;
  element.classList.remove('is-hidden');
  element.setAttribute('aria-hidden', 'false');
  element.style.opacity = '1';
  element.style.pointerEvents = 'auto';
  element.style.visibility = 'visible';
  if ((element.dataset.dragged ?? '0') !== '1') {
    element.style.transform = 'translate(-50%, -50%)';
  }
}

/**
 * Make the pane draggable. Returns a cleanup function.
 * @param {HTMLElement} element
 * @param {{ handle?: HTMLElement }} [options]
 * @returns {() => void}
 */
export function enablePaneDragging(element, { handle } = {}) {
  if (!element) return () => {};

  const dragHandle = handle ?? element.querySelector('.tp-rotv_t');
  if (!dragHandle) {
    return () => {};
  }

  dragHandle.style.cursor = 'grab';

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  const onPointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    pointerId = event.pointerId ?? null;
    startX = event.clientX;
    startY = event.clientY;

    const rect = element.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;

    element.dataset.dragged = '1';
    element.style.transform = 'translate(0, 0)';
    element.style.left = `${originLeft}px`;
    element.style.top = `${originTop}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';

    dragHandle.style.cursor = 'grabbing';
    if (pointerId !== null && dragHandle.setPointerCapture) {
      try {
        dragHandle.setPointerCapture(pointerId);
      } catch {
        // Ignore if pointer capture isn't supported for this event.
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    element.style.left = `${Math.round(originLeft + dx)}px`;
    element.style.top = `${Math.round(originTop + dy)}px`;
  };

  const onPointerUp = (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) return;

    if (pointerId !== null && dragHandle.releasePointerCapture) {
      try {
        dragHandle.releasePointerCapture(pointerId);
      } catch {
        // Ignore
      }
    }
    pointerId = null;
    dragHandle.style.cursor = 'grab';

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  dragHandle.addEventListener('pointerdown', onPointerDown);

  return () => {
    dragHandle.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    dragHandle.style.cursor = '';
  };
}
