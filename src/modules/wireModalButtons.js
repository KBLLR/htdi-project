// Deduped modal button wiring (no top-level const collisions; HMR-safe)
export function wireModalButtons({
  openModal,
  toggleDeploymentTimeline,
  musicPlayer,
  ensureMusicLibraryLoaded,
}) {
  const $ = (id) => /** @type {HTMLElement|null} */ (document.getElementById(id));

  const infoBtn        = $('info-btn');
  const tasksBtn       = $('tasks-btn');
  const scenePickerBtn = $('scene-picker-btn');
  const deploymentsBtn = $('deployments-btn');
  const soundBtn       = $('sound-btn');

  const wireOnce = (el, type, handler) => {
    if (!el) return;
    const key = `__bound_${type}`;
    if (el[key]) return;
    el.addEventListener(type, handler, { passive: true });
    el[key] = true;
  };

  // wireOnce(showBtn, 'click', () => // Removed
  //   openModal('changelog', { focusTarget: '#changelog-timeline' })
  wireOnce(infoBtn, 'click', () =>
    openModal?.('info', { focusTarget: '#modal-info' })
  );
  wireOnce(tasksBtn, 'click', () =>
    openModal?.('tasks', { focusTarget: '#tasks-board' })
  );
  wireOnce(scenePickerBtn, 'click', () =>
    openModal?.('scenes', { focusTarget: '#scene-picker' })
  );
  if (typeof toggleDeploymentTimeline !== 'function') {
    wireOnce(deploymentsBtn, 'click', () =>
      openModal?.('deployments', { focusTarget: '#deployment-gallery' })
    );
  }
  wireOnce(soundBtn, 'click', () => {
    const shouldAutoSelect = !musicPlayer?.getCurrentTrack?.();
    ensureMusicLibraryLoaded?.({ autoSelectFirst: shouldAutoSelect });
    openModal?.('music', { focusTarget: '#music-player' });
  });
}
