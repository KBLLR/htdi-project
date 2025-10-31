import { createScene } from '@world/sceneFactory.js';

export const scenes = [
  createScene({
    id: 'era',
    name: 'Era of Reflection',
    description: 'Celestial teal ambience with aurora glass panels.',
    thumbnail: '/thumbnails/era.png',
    environment: {
      hdr: { file: 'era-7.hdr', directory: '/envs' },
      cubemap: { directory: '/cubes/cube005' },
      fallback: '#050505'
    },
    alpha: {
      src: '/alphamaps/alpha-003.png'
    },
    kid: {
      baseColor: {
        src: '/models/fbx/curiousKid/skins/skin004/map02.png'
      },
      roughness: '/models/fbx/curiousKid/skins/skin004/roughness.png',
      normal: '/models/fbx/curiousKid/skins/skin004/NormalMap.png',
      color: '#FFDEAD'
    },
    innerSphere: {
      emissive: '#ffffff',
      emissiveIntensity: 3.4,
      opacity: 0.68
    },
    ui: {
      surfaceBg: 'rgba(8, 12, 18, 0.92)',
      surfaceBorder: 'rgba(164, 210, 255, 0.12)',
      cardBg: 'rgba(13, 24, 33, 0.9)',
      cardBorder: 'rgba(132, 197, 255, 0.18)',
      accent: '#D5FF7E',
      textPrimary: '#F4FBFF',
      textSecondary: '#96A3B3'
    }
  }),
  createScene({
    id: 'omega',
    name: 'Omega Gradient',
    description: 'Iridescent dusk hues with crystalline reflections.',
    thumbnail: '/thumbnails/omega.png',
    environment: {
      hdr: { file: 'OMEGA.hdr', directory: '/envs' },
      cubemap: { directory: '/cubes/cube002' },
      fallback: '#1a0f2b'
    },
    alpha: {
      src: '/alphamaps/alpha-001.png'
    },
    kid: {
      baseColor: {
        src: '/models/fbx/curiousKid/skins/skin003/map.png'
      },
      roughness: '/models/fbx/curiousKid/skins/skin003/roughnessMap.png',
      normal: '/models/fbx/curiousKid/skins/skin004/NormalMap.png',
      color: '#FFC9EC'
    },
    innerSphere: {
      emissive: '#FF94E8',
      emissiveIntensity: 2.8,
      opacity: 0.55
    },
    ui: {
      surfaceBg: 'rgba(22, 10, 30, 0.9)',
      surfaceBorder: 'rgba(255, 170, 255, 0.2)',
      cardBg: 'rgba(33, 15, 60, 0.85)',
      cardBorder: 'rgba(255, 200, 255, 0.25)',
      accent: '#FF9CF6',
      textPrimary: '#FFE9FF',
      textSecondary: '#D7B9F6'
    }
  })
];
