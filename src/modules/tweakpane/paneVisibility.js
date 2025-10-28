// src/modules/tweakpane/paneVisibility.js

/**
 * Apply baseline layout styles so the Tweakpane shell lives on the right edge
 * and obeys the viewport height. This keeps layout logic in one place instead of
 * scattering inline Object.assign calls throughout the manager.
 *
 * @param {HTMLElement} element
 * @param {{ hidden?: boolean }} [options]
 */
export function initialisePaneShell(element, { hidden = false } = {}) {
  if (!element) return;

  element.style.position = element.style.position || 'fixed';
  element.style.top = '8px';
  element.style.right = '8px';
  element.style.left = 'auto';
  element.style.bottom = '8px';
  element.style.width = 'min(360px, calc(100vw - 16px))';
  element.style.maxHeight = 'calc(100vh - 16px)';
  element.style.transformOrigin = 'center right';
  element.style.display = 'flex';
  element.style.flexDirection = 'column';

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
  element.style.transform = 'translate3d(calc(100% + 32px), 0, 0)';
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
  element.style.transform = 'translate3d(0, 0, 0)';
}
