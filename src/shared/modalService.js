export function initModalService(eventBus, { focusCameraOnModal, resetCameraFromModal, registry } = {}) {
  const modals = registry ?? {
    changelog: document.getElementById('modal-changelog'),
    tasks: document.getElementById('modal-tasks'),
    scenes: document.getElementById('modal-scenes'),
    music: document.getElementById('modal-music'),
    ai: document.getElementById('modal-ai'),
    data: document.getElementById('modal-data'),
  };
  let active = null;

  function openModal(id, { focusTarget } = {}) {
    const el = modals[id]; if (!el) return;
    if (active && active !== id) closeModal();
    active = id;
    el.classList.add('visible');
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    focusCameraOnModal?.();
    el.querySelector('.modal__surface')?.focus({ preventScroll: true });
    if (focusTarget) requestAnimationFrame(() => {
      el.querySelector(focusTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function closeModal() {
    if (!active) return;
    const el = modals[active];
    el?.classList.remove('visible');
    el?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    active = null;
    resetCameraFromModal?.();
  }

  Object.entries(modals).forEach(([id, el]) => {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    el.querySelectorAll('[data-modal-close]').forEach((btn) =>
      btn.addEventListener('click', () => (active === id ? closeModal() : null), { passive: true })
    );
    el.addEventListener('pointerdown', (e) => { if (e.target === el && active === id) closeModal(); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) closeModal(); });

  const offOpen = eventBus.on('modal:open', (p) => openModal(p?.id, p));
  const offClose = eventBus.on('modal:close', closeModal);
  return { openModal, closeModal, dispose: () => { offOpen(); offClose(); } };
}
