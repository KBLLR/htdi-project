const DEFAULT_CUBEMAP_FILES = ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'];

function normalisePathSegment(segment) {
  if (!segment) return '';
  let value = segment.trim();
  value = value.replace(/^\/*/, '').replace(/\/*$/, '');
  return value ? `${value}/` : '';
}

function ensureArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [...fallback];
  return [value];
}

export function createScene(config) {
  if (!config?.id) {
    throw new Error('createScene: "id" is required to define a scene.');
  }

  return {
    id: config.id,
    name: config.name ?? config.id,
    description: config.description ?? '',
    environment: buildEnvironment(config.environment ?? {}),
    alpha: buildAlpha(config.alpha ?? {}),
    kid: buildKid(config.kid ?? {}),
    innerSphere: buildInnerSphere(config.innerSphere ?? {}),
    ui: buildUI(config.ui ?? {}),
    fog: buildFog(config.fog ?? {}),
    lighting: buildLighting(config.lighting ?? {}),
    character: buildCharacter(config.character ?? null),
    metadata: config.metadata ? { ...config.metadata } : {}
  };
}

function buildEnvironment(environment) {
  const hdrFile = environment?.hdr?.file ?? 'default.hdr';
  const hdrPath =
    environment?.hdr?.path ??
    environment?.hdr?.directory ??
    '/pbrmaps/equirectangular/';

  const cubemapDirectory =
    environment?.cubemap?.path ??
    environment?.cubemap?.directory ??
    (environment?.cubemap?.folder ? `cubes/${environment.cubemap.folder}` : 'cubes');

  const cubemapFiles =
    ensureArray(environment?.cubemap?.files, DEFAULT_CUBEMAP_FILES);

  const background = environment?.background ?? null;
  const backgroundConfig = background
    ? {
        texture: background.texture ?? background.file ?? null,
        path: background.path ?? background.directory ?? null,
        color: background.color ?? null
      }
    : null;

  return {
    hdr: {
      file: hdrFile,
      path: normalisePathSegment(hdrPath)
    },
    cubemap: {
      path: normalisePathSegment(cubemapDirectory),
      files: cubemapFiles
    },
    fallback: environment?.fallback ?? '#000000',
    background: backgroundConfig
  };
}

function buildAlpha(alpha) {
  const src = alpha?.src ?? '/alphamaps/alpha-001.png';
  return {
    src,
    settings: {
      magFilter: alpha?.settings?.magFilter ?? 'NearestFilter',
      wrapS: alpha?.settings?.wrapS,
      wrapT: alpha?.settings?.wrapT ?? 'RepeatWrapping',
      repeat: alpha?.settings?.repeat ?? { x: 1, y: 1 }
    }
  };
}

function buildKid(kid) {
  return {
    baseColor: {
      src: kid?.baseColor?.src ?? '',
      colorSpace: kid?.baseColor?.colorSpace ?? 'SRGBColorSpace'
    },
    roughness: {
      src: kid?.roughness?.src ?? kid?.roughness ?? ''
    },
    normal: {
      src: kid?.normal?.src ?? kid?.normal ?? ''
    },
    color: kid?.color ?? '#ffffff'
  };
}

function buildInnerSphere(innerSphere) {
  return {
    emissive: innerSphere?.emissive ?? '#ffffff',
    emissiveIntensity: innerSphere?.emissiveIntensity ?? 2.5,
    opacity: innerSphere?.opacity ?? 0.6
  };
}

function buildUI(ui) {
  return {
    surfaceBg: ui?.surfaceBg ?? 'rgba(8, 12, 18, 0.9)',
    surfaceBorder: ui?.surfaceBorder ?? 'rgba(164, 210, 255, 0.12)',
    cardBg: ui?.cardBg ?? 'rgba(13, 24, 33, 0.9)',
    cardBorder: ui?.cardBorder ?? 'rgba(132, 197, 255, 0.18)',
    accent: ui?.accent ?? '#D5FF7E',
    textPrimary: ui?.textPrimary ?? '#F4FBFF',
    textSecondary: ui?.textSecondary ?? '#96A3B3'
  };
}

function buildCharacter(character) {
  if (!character) return null;
  if (typeof character === 'string') {
    return { id: character };
  }
  if (character && typeof character === 'object') {
    return {
      id: character.id ?? null,
      label: character.label ?? null
    };
  }
  return null;
}

function buildFog(fog) {
  const enabled = Boolean(fog?.enabled);
  const type = fog?.type === 'linear' ? 'linear' : 'exp2';
  return {
    enabled,
    type,
    color: fog?.color ?? '#1a2430',
    density: fog?.density ?? 0.02,
    near: fog?.near ?? 2,
    far: fog?.far ?? 60
  };
}

function buildLighting(lighting) {
  const spotlightConfig = lighting?.spotlight ?? lighting;
  return {
    spotlight: buildSpotlight(spotlightConfig)
  };
}

function buildSpotlight(spotlight) {
  if (!spotlight) return null;
  return {
    color: spotlight.color ?? '#ffffff',
    intensity: spotlight.intensity ?? 2.5,
    angle: spotlight.angle ?? Math.PI / 5,
    penumbra: spotlight.penumbra ?? 0.4,
    decay: spotlight.decay ?? 1,
    distance: spotlight.distance ?? 35,
    position: toArray(spotlight.position, [2.5, 5.5, 2.5]),
    target: toArray(spotlight.target, [0, 0.6, 0]),
    gobo: buildGobo(spotlight.gobo ?? null)
  };
}

function buildGobo(gobo) {
  if (!gobo) return null;
  if (typeof gobo === 'string') return { id: gobo };
  if (gobo?.id) return { id: gobo.id };
  return null;
}

function toArray(value, fallback = []) {
  if (Array.isArray(value) && value.length === 3) {
    return value.map((component, index) => {
      const parsed = Number(component);
      return Number.isFinite(parsed) ? parsed : fallback[index] ?? 0;
    });
  }
  return [...fallback];
}
