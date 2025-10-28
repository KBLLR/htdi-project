const DEFAULTS = {
  color: '#D7FF00',
  borderWidth: 2,
  size: 18,
  hoverScale: 1.8,
  pressScale: 3,
  idleOpacity: 0,
  activeOpacity: 1,
};

const noopControls = {
  enable: () => {},
  disable: () => {},
  dispose: () => {},
  element: null,
};

export function createCustomCursor(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return noopControls;
  }

  if (window.__HTDI_CUSTOM_CURSOR__) {
    return window.__HTDI_CUSTOM_CURSOR__;
  }

  const settings = { ...DEFAULTS, ...options };
  const root = document.documentElement;
  const host = document.body ?? root;
  const cursor = document.createElement('div');
  const sizePx = `${settings.size}px`;
  const borderWidthPx = `${settings.borderWidth}px`;

  cursor.className = 'htdi-custom-cursor';
  cursor.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: ${sizePx};
    height: ${sizePx};
    border-radius: 50%;
    border: ${borderWidthPx} solid ${settings.color};
    pointer-events: none;
    transform: translate(-100px, -100px);
    transition: transform 0.08s ease, opacity 0.12s ease, background 0.12s ease;
    background: rgba(215,255,0,0.18);
    box-shadow: 0 0 14px rgba(215, 255, 0, 0.45);
    z-index: 12000;
    opacity: ${settings.idleOpacity};
  `;

  let enabled = false;
  let rafId = null;
  let lastPointerEvent = null;

  const setOpacity = (value) => {
    cursor.style.opacity = `${value}`;
  };

  const updatePosition = (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  };

  const scheduleUpdate = (event) => {
    lastPointerEvent = event;
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      if (lastPointerEvent) {
        updatePosition(lastPointerEvent);
        setOpacity(settings.activeOpacity);
      }
      rafId = null;
    });
  };

  const handleMouseDown = (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) scale(${settings.pressScale})`;
    cursor.style.background = 'rgba(215,255,0,0.32)';
  };

  const handleMouseUp = (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) scale(${settings.hoverScale})`;
    cursor.style.background = 'rgba(215,255,0,0.18)';
  };

  const handleMouseEnter = () => {
    setOpacity(settings.activeOpacity);
  };

  const handleMouseLeave = () => {
    setOpacity(settings.idleOpacity);
  };

  const addListeners = () => {
    root.addEventListener('mousemove', scheduleUpdate, { passive: true });
    root.addEventListener('mousedown', handleMouseDown, { passive: true });
    root.addEventListener('mouseup', handleMouseUp, { passive: true });
    root.addEventListener('mouseenter', handleMouseEnter, { passive: true });
    root.addEventListener('mouseleave', handleMouseLeave, { passive: true });
  };

  const removeListeners = () => {
    root.removeEventListener('mousemove', scheduleUpdate);
    root.removeEventListener('mousedown', handleMouseDown);
    root.removeEventListener('mouseup', handleMouseUp);
    root.removeEventListener('mouseenter', handleMouseEnter);
    root.removeEventListener('mouseleave', handleMouseLeave);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const enable = () => {
    if (enabled) return;
    enabled = true;
    if (!cursor.isConnected) {
      host.appendChild(cursor);
    }
    root.style.cursor = 'none';
    addListeners();
  };

  const disable = () => {
    if (!enabled) return;
    enabled = false;
    removeListeners();
    setOpacity(settings.idleOpacity);
    cursor.style.transform = 'translate(-100px, -100px)';
    root.style.cursor = '';
  };

  const dispose = () => {
    disable();
    cursor.remove();
    window.__HTDI_CUSTOM_CURSOR__ = null;
  };

  enable();

  const controls = { enable, disable, dispose, element: cursor };
  window.__HTDI_CUSTOM_CURSOR__ = controls;
  return controls;
}
