// src/three/runtimeScenes.js
import { createScene } from '@three/sceneFactory.js';
import { scenes as defaultScenes } from '@data/scenes.js';

const STORAGE_KEY = 'htdi:runtime-scenes:v1';

let runtimeSceneInputs = [];
let runtimeScenes = [];
let hasHydrated = false;

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function hydrate() {
  if (hasHydrated) return;
  hasHydrated = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      runtimeSceneInputs = [];
      runtimeScenes = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      runtimeSceneInputs = parsed;
      runtimeScenes = parsed.map((input) => {
        try {
          return createScene(input);
        } catch (error) {
          console.warn('[runtimeScenes] Failed to rehydrate scene', input?.id, error);
          return null;
        }
      }).filter(Boolean);
    }
  } catch (error) {
    console.warn('[runtimeScenes] Failed to hydrate runtime scenes', error);
    runtimeSceneInputs = [];
    runtimeScenes = [];
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(runtimeSceneInputs));
  } catch (error) {
    console.warn('[runtimeScenes] Failed to persist runtime scenes', error);
  }
}

export function getRuntimeScenes() {
  hydrate();
  return runtimeScenes.map((scene) => clone(scene));
}

export function getRuntimeSceneIds() {
  hydrate();
  return runtimeScenes.map((scene) => scene.id);
}

export function clearRuntimeScenes() {
  hydrate();
  runtimeSceneInputs = [];
  runtimeScenes = [];
  persist();
}

export function ensureUniqueSceneId(candidateId) {
  hydrate();
  const baseId = sanitiseId(candidateId);
  const taken = new Set([
    ...defaultScenes.map((scene) => scene.id),
    ...runtimeScenes.map((scene) => scene.id)
  ]);
  if (!taken.has(baseId)) {
    return baseId;
  }
  let suffix = 1;
  let nextId = `${baseId}-${suffix}`;
  while (taken.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }
  return nextId;
}

export function addRuntimeScene(sceneInput) {
  hydrate();
  if (!sceneInput?.id) {
    throw new Error('Runtime scenes require an id.');
  }
  const normalised = createScene(sceneInput);
  runtimeSceneInputs.push(clone(sceneInput));
  runtimeScenes.push(normalised);
  persist();
  return clone(normalised);
}

export function sanitiseId(value) {
  if (!value) return 'scene';
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'scene';
}
