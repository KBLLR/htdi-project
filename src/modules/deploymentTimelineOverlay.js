const BODY_OPEN_CLASS = 'deployment-timeline-overlay-open';

function noop() {}

export function initDeploymentTimelineOverlay({ onOpen = noop, onClose = noop } = {}) {
  const overlay = document.getElementById('deployment-timeline-overlay');
  if (!overlay) {
    return {
      show: noop,
      hide: noop,
      toggle: noop,
      dispose: noop,
    };
  }

  if (overlay.__timelineOverlayControls) {
    return overlay.__timelineOverlayControls;
  }

  const panel = overlay.querySelector('.deployment-timeline-overlay__panel');
  const closeButtons = Array.from(overlay.querySelectorAll('[data-overlay-close]'));

  let isVisible = false;
  overlay.setAttribute('aria-hidden', 'true');

  const setVisible = (nextVisible) => {
    if (isVisible === nextVisible) return;
    isVisible = nextVisible;
    overlay.classList.toggle('is-visible', isVisible);
    overlay.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    document.body.classList.toggle(BODY_OPEN_CLASS, isVisible);
    console.log('[TimelineOverlay]', isVisible ? 'opened' : 'closed');
    if (isVisible) {
      panel?.focus?.({ preventScroll: true });
      onOpen();
    } else {
      onClose();
    }
  };

  const show = () => setVisible(true);
  const hide = () => setVisible(false);
  const toggle = () => setVisible(!isVisible);

  const handleBackdropClick = (event) => {
    if (
      event.target === overlay ||
      event.target.classList.contains('deployment-timeline-overlay__backdrop')
    ) {
      hide();
    }
  };

  const handleKeydown = (event) => {
    if (!isVisible) return;
    if (event.key === 'Escape') {
      hide();
    }
  };

  closeButtons.forEach((button) => button.addEventListener('click', hide));
  overlay.addEventListener('click', handleBackdropClick);
  window.addEventListener('keydown', handleKeydown);

  const dispose = () => {
    closeButtons.forEach((button) => button.removeEventListener('click', hide));
    overlay.removeEventListener('click', handleBackdropClick);
    window.removeEventListener('keydown', handleKeydown);
    overlay.__timelineOverlayControls = undefined;
  };

  const controls = { show, hide, toggle, dispose };
  overlay.__timelineOverlayControls = controls;
  return controls;
}
