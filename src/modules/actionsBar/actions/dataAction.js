const READY_EVENT = 'htdi:tweakpane-ready';
const TOGGLE_EVENT = 'htdi:tweakpane-toggle';

function getPaneManager() {
  return window.__tpManager ?? null;
}

function isPaneVisible(manager) {
  return manager?.isPaneVisible?.() ?? false;
}

function togglePane(manager) {
  if (!manager || typeof manager.togglePaneVisibility !== 'function') return null;
  return manager.togglePaneVisibility();
}

function broadcastToggle(visible) {
  window.dispatchEvent(new CustomEvent(TOGGLE_EVENT, { detail: { visible } }));
}

export function initDataAction(manager, { buttonId }) {
  const button = document.getElementById(buttonId);
  if (!button) {
    console.warn(`[DataAction] Button '${buttonId}' not found.`);
    return;
  }

  const syncButtonState = (visible) => {
    button.classList.toggle('is-active', Boolean(visible));
    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
  };

  const updateFromManager = () => {
    const managerInstance = getPaneManager();
    syncButtonState(isPaneVisible(managerInstance));
  };

  updateFromManager();

  const readyListener = () => updateFromManager();
  const toggleListener = (event) => syncButtonState(event?.detail?.visible);

  window.addEventListener(READY_EVENT, readyListener);
  window.addEventListener(TOGGLE_EVENT, toggleListener);

  manager.registerAction(buttonId, () => {
    const managerInstance = getPaneManager();
    const result = togglePane(managerInstance);
    if (result === null) {
      console.warn('[DataAction] Tweakpane manager not available.');
      return;
    }
    syncButtonState(result);
    broadcastToggle(result);
  });

  manager.onDestroy?.(() => {
    window.removeEventListener(READY_EVENT, readyListener);
    window.removeEventListener(TOGGLE_EVENT, toggleListener);
  });
}
