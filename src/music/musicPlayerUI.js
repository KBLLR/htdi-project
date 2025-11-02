import { fetchMusicPlaylist } from './musicLibrary.js';

const defaultController = {
  async loadTracks() {},
  selectTrack() {
    return null;
  },
  getCurrentTrack() {
    return null;
  },
  getTracks() {
    return [];
  },
  getAudioElement() {
    return null;
  }
};

export function initialiseMusicPlayer({ onTrackChange, onPlaybackStateChange } = {}) {
  const modal = document.getElementById('modal-music');
  if (!modal) {
    return defaultController;
  }

  const audioEl = modal.querySelector('[data-audio-player]');
  const listEl = modal.querySelector('[data-track-list]');
  const statusEl = modal.querySelector('[data-track-status]');
  const nowPlayingText = modal.querySelector('[data-now-playing-text]');

  if (!audioEl || !listEl || !statusEl || !nowPlayingText) {
    return defaultController;
  }

  let tracks = [];
  let currentTrack = null;
  let loadingPromise = null;

  function setStatus(message, { hidden = false } = {}) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = hidden;
  }

  function showList() {
    listEl.hidden = false;
  }

  function hideList() {
    listEl.hidden = true;
  }

  function updateNowPlaying(track) {
    if (!nowPlayingText) return;
    nowPlayingText.textContent = track ? track.title : 'No track selected';
  }

  function setActiveButton(trackId) {
    listEl.querySelectorAll('.music-track').forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      if (button.dataset.trackId === trackId) {
        button.classList.add('music-track--active');
      } else {
        button.classList.remove('music-track--active');
      }
    });
  }

  function buildTrackButton(track) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'music-track';
    button.dataset.trackId = track.id;

    const title = document.createElement('span');
    title.className = 'music-track__title';
    title.textContent = track.title;
    button.appendChild(title);

    const metaParts = [];
    if (track.artist) {
      metaParts.push(track.artist);
    }
    if (track.duration) {
      metaParts.push(track.duration);
    }

    if (metaParts.length > 0) {
      const meta = document.createElement('span');
      meta.className = 'music-track__meta';
      meta.textContent = metaParts.join(' • ');
      button.appendChild(meta);
    }

    button.addEventListener('click', () => {
      selectTrack(track.id, { autoPlay: true });
    });

    item.appendChild(button);
    return item;
  }

  function renderList() {
    listEl.innerHTML = '';
    tracks.forEach((track) => {
      const entry = buildTrackButton(track);
      listEl.appendChild(entry);
    });
    setActiveButton(currentTrack?.id ?? null);
  }

  function selectTrack(trackId, { autoPlay = true } = {}) {
    if (!trackId) return null;
    const track = tracks.find((candidate) => candidate.id === trackId);
    if (!track) return null;

    if (!audioEl.src || audioEl.dataset.trackId !== track.id) {
      audioEl.src = track.url;
      audioEl.dataset.trackId = track.id;
    }

    currentTrack = track;
    updateNowPlaying(track);
    setActiveButton(track.id);

    if (autoPlay) {
      audioEl
        .play()
        .catch((error) => {
          // Autoplay can be blocked by the browser; surface a warning for diagnostics.
          console.warn('Autoplay prevented for track', track, error);
        });
    }

    if (typeof onTrackChange === 'function') {
      onTrackChange(track);
    }

    return track;
  }

  async function loadTracks({ autoSelectFirst = false, refresh = false } = {}) {
    if (!refresh && tracks.length) {
      setStatus('', { hidden: true });
      showList();
      renderList();
      if (autoSelectFirst && !currentTrack && tracks[0]) {
        selectTrack(tracks[0].id, { autoPlay: false });
      }
      return;
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    hideList();
    setStatus('Loading audio library…', { hidden: false });

    loadingPromise = (async () => {
      try {
        tracks = await fetchMusicPlaylist();
        if (!tracks.length) {
          setStatus('No audio tracks available yet.');
          return;
        }
        setStatus('', { hidden: true });
        showList();
        renderList();
        if (autoSelectFirst && tracks[0] && !currentTrack) {
          selectTrack(tracks[0].id, { autoPlay: false });
        }
      } catch (error) {
        console.error('Failed to load music playlist', error);
        setStatus('Unable to load soundtrack.');
        throw error;
      }
    })();

    try {
      await loadingPromise;
    } finally {
      loadingPromise = null;
    }
  }

  if (audioEl) {
    audioEl.addEventListener('play', () => {
      if (typeof onPlaybackStateChange === 'function') {
        onPlaybackStateChange('playing', currentTrack);
      }
    });

    audioEl.addEventListener('pause', () => {
      if (typeof onPlaybackStateChange === 'function') {
        onPlaybackStateChange('paused', currentTrack);
      }
    });

    audioEl.addEventListener('ended', () => {
      if (typeof onPlaybackStateChange === 'function') {
        onPlaybackStateChange('ended', currentTrack);
      }
    });
  }

  return {
    loadTracks,
    selectTrack,
    getCurrentTrack() {
      return currentTrack;
    },
    getTracks() {
      return [...tracks];
    },
    getAudioElement() {
      return audioEl;
    }
  };
}

export { fetchMusicPlaylist };
