// Encapsulated sound button state for v4 setup.
// No globals; no redeclarations; HMR-safe.

export function setupSoundButton({ updateTooltipContent, buttonId = 'sound-btn' } = {}) {
  const soundBtn = /** @type {HTMLElement|null} */ (document.getElementById(buttonId));
  const defaults = {
    tooltip: soundBtn?.getAttribute('data-tippy-content') ?? 'Sound Player',
    label:   soundBtn?.getAttribute('aria-tippy-content') ?? 'Open sound player',
  };

  const reflectSoundButtonState = (isPlaying) => {
    if (!soundBtn) return;
    soundBtn.classList.toggle('is-playing', !!isPlaying);
    if (isPlaying) soundBtn.setAttribute('data-playing', 'true');
    else soundBtn.removeAttribute('data-playing');
  };

  const updateSoundButtonMetadata = (track) => {
    if (!soundBtn) return;
    const tooltip = track ? `Now playing · ${track.title}` : defaults.tooltip;
    updateTooltipContent?.(soundBtn, tooltip);
    const label = track ? `Sound player — Now playing ${track.title}` : defaults.label;
    soundBtn.setAttribute('aria-label', label);
    if (track?.id) soundBtn.dataset.activeTrack = track.id;
    else soundBtn.removeAttribute('data-active-track');
  };

  if (import.meta?.hot) {
    import.meta.hot.dispose(() => {
      try {
        soundBtn?.classList.remove('is-playing');
        soundBtn?.removeAttribute('data-playing');
        soundBtn?.removeAttribute('data-active-track');
      } catch {}
    });
  }

  return {
    button: soundBtn,
    defaults,
    reflectSoundButtonState,
    updateSoundButtonMetadata,
  };
}