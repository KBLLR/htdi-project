const MUSIC_MANIFEST_URL = '/music/playlist.json';

function normaliseTrack(entry, index) {
  if (!entry) return null;

  const id = typeof entry.id === 'string' && entry.id.trim().length
    ? entry.id.trim()
    : `track-${index + 1}`;

  const rawTitle = typeof entry.title === 'string' ? entry.title.trim() : '';
  const title = rawTitle || `Track ${index + 1}`;

  const artist = typeof entry.artist === 'string' ? entry.artist.trim() : '';

  const source = resolveSource(entry);
  if (!source) {
    return null;
  }

  return {
    id,
    title,
    artist,
    url: source,
    description: typeof entry.description === 'string' ? entry.description.trim() : '',
    duration: typeof entry.duration === 'string' ? entry.duration.trim() : null,
    cover: typeof entry.cover === 'string' ? entry.cover.trim() : null
  };
}

function resolveSource(entry) {
  const candidates = [entry.url, entry.file, entry.path];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.trim().length === 0) {
      continue;
    }
    const value = candidate.trim();
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    if (value.startsWith('/')) {
      return value;
    }
    return `/music/${value}`;
  }
  return null;
}

function extractTracks(payload) {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.tracks)) {
    return payload.tracks;
  }
  return [];
}

export async function fetchMusicPlaylist() {
  const response = await fetch(MUSIC_MANIFEST_URL, {
    cache: 'no-cache'
  });

  if (!response.ok) {
    const error = new Error(`Failed to load music manifest (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (parseError) {
    const error = new Error('Music manifest could not be parsed.');
    error.cause = parseError;
    throw error;
  }

  const entries = extractTracks(payload);
  return entries
    .map((entry, index) => normaliseTrack(entry, index))
    .filter(Boolean);
}

export { MUSIC_MANIFEST_URL };
