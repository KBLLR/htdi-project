import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp']);
const MODEL_EXTS = new Set(['.glb', '.gltf', '.fbx', '.obj', '.3ds']);
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const FONT_EXTS = new Set(['.ttf', '.otf', '.woff', '.woff2']);
const HDR_EXTS = new Set(['.hdr', '.exr']);
const IGNORED_NAMES = new Set(['.DS_Store']);

const toPosix = (value) => value.split(path.sep).join('/');

const sanitizeSegment = (segment) => segment.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const buildItemName = (groupName, relativePath) => {
  const parts = relativePath.split(/[/\\]/);
  if (groupName) parts.unshift(groupName);
  return parts
    .map(sanitizeSegment)
    .filter(Boolean)
    .join('_');
};

const inferType = (source) => {
  const ext = path.extname(source).toLowerCase();
  if (ext === '.svg') return 'svg';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (HDR_EXTS.has(ext)) return 'hdr';
  if (MODEL_EXTS.has(ext)) return 'model';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (FONT_EXTS.has(ext)) return 'font';
  if (ext === '.json') return 'json';
  return 'asset';
};

const readDirSafe = async (directory) => {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn(`[asset-manifest] Failed to read directory: ${directory}`, error);
    }
    return [];
  }
};

const collectFiles = async (absDir, relDir) => {
  const dirents = await readDirSafe(absDir);
  const files = [];
  for (const dirent of dirents) {
    if (IGNORED_NAMES.has(dirent.name)) continue;
    const absPath = path.join(absDir, dirent.name);
    const relPath = relDir ? `${relDir}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) {
      const nested = await collectFiles(absPath, relPath);
      files.push(...nested);
    } else if (dirent.isFile()) {
      const relativePosix = toPosix(relPath);
      files.push({
        relative: relativePosix,
        source: `/${relativePosix}`,
      });
    }
  }
  files.sort((a, b) => a.source.localeCompare(b.source));
  return files;
};

const defaultGroupNameMapper = (folder) => (folder === 'textures' ? 'pbrmaps' : folder);

export async function buildAssetManifest(publicDir, { mapGroupName = defaultGroupNameMapper } = {}) {
  const dirents = await readDirSafe(publicDir);
  const manifest = [];
  const rootItems = [];

  for (const dirent of dirents) {
    if (IGNORED_NAMES.has(dirent.name)) continue;
    if (dirent.isDirectory()) {
      const originalName = dirent.name;
      const groupName = mapGroupName(originalName);
      const items = await collectFiles(path.join(publicDir, originalName), originalName);
      if (!items.length) continue;
      const mappedItems = items.map(({ relative, source }) => {
        const trimmedRelative = relative.startsWith(`${originalName}/`)
          ? relative.slice(originalName.length + 1)
          : relative;
        return {
          name: buildItemName(groupName, trimmedRelative),
          source,
          type: inferType(source),
        };
      });
      manifest.push({
        name: groupName,
        data: {},
        items: mappedItems,
      });
    } else if (dirent.isFile()) {
      const source = `/${toPosix(dirent.name)}`;
      rootItems.push({
        name: buildItemName(null, dirent.name),
        source,
        type: inferType(source),
      });
    }
  }

  if (rootItems.length) {
    rootItems.sort((a, b) => a.source.localeCompare(b.source));
    manifest.push({
      name: 'root',
      data: {},
      items: rootItems,
    });
  }

  manifest.sort((a, b) => a.name.localeCompare(b.name));

  const content = `export default ${JSON.stringify(manifest, null, 2)};\n`;
  const signature = createHash('sha256').update(content).digest('hex');

  return { manifest, content, signature };
}

export async function writeAssetManifest({ publicDir, outputFile, previousSignature, mapGroupName } = {}) {
  const { content, signature } = await buildAssetManifest(publicDir, { mapGroupName });
  if (signature === previousSignature) {
    return { signature, changed: false };
  }

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, content, 'utf8');

  return { signature, changed: true };
}
