// src/config/assetCatalog.js
import manifest from './assets.js';

const FACE_ORDER = ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'];

const hdrAssets = [];
const hdrById = new Map();

const cubemapAssets = [];
const cubemapById = new Map();

const modelAssets = [];
const modelById = new Map();

const kidSkinVariants = [];
const kidSkinById = new Map();

const textureAssets = [];
const textureById = new Map();

const goboAssets = [];
const goboById = new Map();

const pbrMaterialSets = [];
const pbrMaterialSetById = new Map();

function normaliseDirectory(path) {
  if (!path) return '';
  let value = path;
  if (!value.startsWith('/')) value = `/${value}`;
  if (!value.endsWith('/')) value = `${value}/`;
  return value;
}

function splitSource(source) {
  if (!source) {
    return { path: '', file: '' };
  }
  const normalised = source.startsWith('/') ? source : `/${source}`;
  const lastSlash = normalised.lastIndexOf('/');
  if (lastSlash === -1) {
    return { path: '/', file: normalised.replace(/^\//, '') };
  }
  return {
    path: normaliseDirectory(normalised.slice(0, lastSlash)),
    file: normalised.slice(lastSlash + 1),
  };
}

function toId(value) {
  if (!value) return 'asset';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function toLabel(value) {
  if (!value) return 'Asset';
  const withoutExt = value.replace(/\.[^/.]+$/, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ');
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function classifyKidSkinFile(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('metal')) return 'metalness';
  if (lower.includes('rough')) return 'roughness';
  if (lower.includes('normal')) return 'normal';
  if (lower.includes('transluc')) return 'translucence';
  if (lower.includes('opacity') || lower.includes('alpha')) return 'opacity';
  if (lower.includes('aomap') || (lower.includes('ao') && !lower.includes('map02'))) return 'ao';
  if (lower.includes('dismap') || lower.includes('displacement')) return 'displacement';
  if (lower.includes('map02')) return 'baseAlt';
  if (lower.includes('map')) return 'base';
  if (lower.includes('color')) return 'base';
  return null;
}

function classifyPbrMapRole(fileName) {
  const lower = fileName.toLowerCase();
  if (/(albedo|basecolor|base-color|base_color|base|diffuse|color)/.test(lower)) return 'albedo';
  if (/(metal|metalness|metallic)/.test(lower)) return 'metallic';
  if (/(rough|gloss)/.test(lower)) return 'roughness';
  if (/(normal)/.test(lower)) return 'normal';
  if (/(ao|ambientocclusion)/.test(lower)) return 'ao';
  if (/(height|disp|displacement)/.test(lower)) return 'displacement';
  if (/(bump)/.test(lower)) return 'bump';
  if (/(opacity|alpha|transparency)/.test(lower)) return 'opacity';
  if (/(sheen)/.test(lower)) return 'sheen';
  if (/(emissive|emission|glow)/.test(lower)) return 'emissive';
  if (/(iridescence|thinfilm)/.test(lower)) return 'iridescence';
  return null;
}

function buildHdrAssets() {
  const group = manifest.find((entry) => entry?.name === 'envs');
  if (!group?.items) return;

  group.items
    .filter((item) => item?.type === 'hdr' && item.source)
    .forEach((item) => {
      const { path, file } = splitSource(item.source);
      const id = toId(item.source.replace(/\.[^/.]+$/, ''));
      const entry = {
        id,
        label: toLabel(file),
        source: item.source,
        path,
        file,
      };
      hdrAssets.push(entry);
      hdrById.set(id, entry);
    });
}

function buildCubemapAssets() {
  const group = manifest.find((entry) => entry?.name === 'cubes');
  if (!group?.items) return;

  const folders = new Map();
  group.items
    .filter((item) => item?.type === 'image' && item.source)
    .forEach((item) => {
      const { path, file } = splitSource(item.source);
      const trimmed = path.replace(/\/$/, '');
      const folder = trimmed.split('/').pop();
      if (!folder) return;
      const key = folder.toLowerCase();
      const entry =
        folders.get(key) ??
        {
          id: toId(`${path}`),
          label: toLabel(folder),
          folder,
          path,
          files: new Map(),
        };
      entry.files.set(file.toLowerCase(), file);
      folders.set(key, entry);
    });

  folders.forEach((entry) => {
    const ordered = FACE_ORDER.filter((face) => entry.files.has(face)).map((face) => entry.files.get(face));
    const cubemap = {
      id: entry.id,
      label: entry.label,
      folder: entry.folder,
      path: entry.path,
      files: ordered,
    };
    cubemapAssets.push(cubemap);
    cubemapById.set(cubemap.id, cubemap);
  });
}

function buildModelAssets() {
  const group = manifest.find((entry) => entry?.name === 'models');
  if (!group?.items) return;

  const VALID_EXT = new Set(['glb', 'gltf', 'fbx', 'obj', '3ds']);

  group.items
    .filter((item) => item?.type === 'model' && item.source)
    .forEach((item) => {
      const { path, file } = splitSource(item.source);
      const ext = file.split('.').pop()?.toLowerCase() ?? '';
      if (!VALID_EXT.has(ext)) return;
      const id = toId(item.source.replace(/\.[^/.]+$/, ''));
      const entry = {
        id,
        label: toLabel(file),
        source: item.source,
        path,
        file,
        format: ext,
      };
      modelAssets.push(entry);
      modelById.set(id, entry);
  });
}

function buildKidSkinAssets() {
  const variants = new Map();

  manifest.forEach((group) => {
    group?.items?.forEach((item) => {
      if (!item?.source) return;
      if (!item.source.includes('/models/fbx/curiousKid/skins/')) return;

      const { path, file } = splitSource(item.source);
      const segments = path.split('/').filter(Boolean);
      const folder = segments[segments.length - 1];
      if (!folder) return;

      const variantId = toId(`kid-skin-${folder}`);
      const type = classifyKidSkinFile(file);

      const variant =
        variants.get(variantId) ??
        {
          id: variantId,
          label: toLabel(folder),
          folder,
          path,
          files: {},
          misc: [],
        };

      const fileEntry = {
        id: `${variantId}-${type ?? 'file'}`,
        label: toLabel(file),
        source: item.source,
        path,
        file,
        type,
      };

      if (type) {
        variant.files[type] = fileEntry;
      } else {
        variant.misc.push(fileEntry);
      }

      variants.set(variantId, variant);
    });
  });

  const sortedVariants = Array.from(variants.values()).sort((a, b) => a.label.localeCompare(b.label));
  sortedVariants.forEach((variant) => {
    variant.primaryBase = variant.files.base ?? variant.files.baseAlt ?? null;
    kidSkinVariants.push(variant);
    kidSkinById.set(variant.id, variant);
  });
}

function buildTextureAssets() {
  const group = manifest.find((entry) => entry?.name === 'pbrmaps');
  if (!group?.items) return;

  group.items
    .filter((item) => item?.source)
    .forEach((item) => {
      const { path, file } = splitSource(item.source);
      const id = toId(item.source.replace(/\.[^/.]+$/, ''));
      const entry = {
        id,
        label: toLabel(file),
        source: item.source,
        path,
        file,
      };
      textureAssets.push(entry);
      textureById.set(id, entry);
    });
}

function buildGoboAssets() {
  const group = manifest.find((entry) => entry?.name === 'gobos');
  if (!group?.items) return;

  group.items
    .filter((item) => item?.source)
    .forEach((item) => {
      const { path, file } = splitSource(item.source);
      const id = toId(item.source.replace(/\.[^/.]+$/, ''));
      const entry = {
        id,
        label: toLabel(file),
        source: item.source,
        path,
        file
      };
      goboAssets.push(entry);
      goboById.set(id, entry);
    });
}

function buildPbrMaterialSets() {
  const group = manifest.find((entry) => entry?.name === 'pbrmaps');
  if (!group?.items) return;

  const folders = new Map();

  group.items.forEach((item) => {
    if (!item?.source) return;
    const { path, file } = splitSource(item.source);
    const segments = path.split('/').filter(Boolean);
    const folder = segments[segments.length - 1];
    if (!folder) return;

    const role = classifyPbrMapRole(file);
    const setId = toId(`pbr-${folder}`);
    const entry =
      folders.get(setId) ?? {
        id: setId,
        label: toLabel(folder),
        folder,
        path,
        maps: {},
        items: [],
        misc: [],
      };

    const fileEntry = {
      id: `${setId}-${role ?? 'file'}`,
      label: toLabel(file),
      source: item.source,
      path,
      file,
      role,
    };

    if (role) {
      entry.maps[role] = fileEntry;
    } else {
      entry.misc.push(fileEntry);
    }
    entry.items.push(fileEntry);
    folders.set(setId, entry);
  });

  const sorted = Array.from(folders.values()).sort((a, b) => a.label.localeCompare(b.label));
  sorted.forEach((set) => {
    pbrMaterialSets.push(set);
    pbrMaterialSetById.set(set.id, set);
  });
}

buildHdrAssets();
buildCubemapAssets();
buildModelAssets();
buildKidSkinAssets();
buildTextureAssets();
buildGoboAssets();
buildPbrMaterialSets();

export { hdrAssets, cubemapAssets, modelAssets, kidSkinVariants, textureAssets, goboAssets, pbrMaterialSets };

export function getHdrById(id) {
  return hdrById.get(id) ?? null;
}

export function getCubemapById(id) {
  return cubemapById.get(id) ?? null;
}

export function getModelById(id) {
  return modelById.get(id) ?? null;
}

export function getKidSkinVariantById(id) {
  return kidSkinById.get(id) ?? null;
}

export function getTextureById(id) {
  return textureById.get(id) ?? null;
}

export function getGoboById(id) {
  return goboById.get(id) ?? null;
}

export function getPbrMaterialSetById(id) {
  return pbrMaterialSetById.get(id) ?? null;
}

export function registerPbrMaterialSet(set) {
  if (!set?.id) return null;
  const existing = pbrMaterialSetById.get(set.id);
  if (existing) {
    return existing;
  }
  pbrMaterialSetById.set(set.id, set);
  pbrMaterialSets.push(set);
  return set;
}

export function toOptions(entries) {
  return entries.map((entry) => ({ text: entry.label, value: entry.id }));
}
