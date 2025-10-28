// scripts/ktx2.mjs
// PNG/JPEG → KTX2 encoder using `ktx2-encoder` (Node ESM).
// - Defaults to UASTC + mipmaps (good quality; larger than ETC1S).
// - Accepts a file or a directory; preserves relpaths when output is a dir.
// - Requires `ktx2-encoder` WASM. We resolve it from node_modules.
//   npm i ktx2-encoder sharp
//
// Usage:
//   node scripts/ktx2.mjs input.png out.ktx2
//   node scripts/ktx2.mjs assets/textures build/textures --recursive --etc1s
//
// Notes:
// • KTX2 in glTF should contain Basis Universal (ETC1S or UASTC). Runtime decoders
//   (three.js KTX2Loader, Babylon, etc.) transcode these to GPU-native formats.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv = process.argv.slice(2)) {
  const flags = { recursive: argv.includes('--recursive'), uastc: !argv.includes('--etc1s') };
  const positional = argv.filter(a => !a.startsWith('--'));
  if (positional.length < 2) {
    console.error(`Usage: node ${path.relative(process.cwd(), __filename)} <src-file|src-dir> <dst-file|dst-dir> [--recursive] [--etc1s]`);
    process.exit(1);
  }
  return { src: positional[0], dst: positional[1], flags };
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function isDir(p) { try { return (await fs.stat(p)).isDirectory(); } catch { return false; } }
async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

function outPathFor(srcFile, dstRoot) {
  const base = path.basename(srcFile).replace(/\.[^.]+$/, '') + '.ktx2';
  return path.extname(dstRoot) ? dstRoot : path.join(dstRoot, base);
}

function wasmHref() {
  // resolve packaged encoder WASM from ktx2-encoder
  const guess = path.resolve(process.cwd(), 'node_modules/ktx2-encoder/public/basis_encoder.wasm');
  return pathToFileURL(guess).href;
}

async function encodeFileToKTX2(srcFile, dstFile, { uastc }) {
  // `encodeToKTX2` expects PNG bytes; we normalize any input to PNG first.
  const png = await sharp(srcFile).png().toBuffer();
  const data = await encodeToKTX2(png, {
    isUASTC: uastc,           // true → UASTC, false → ETC1S
    generateMipmap: true,
    enableDebug: false,
    wasmUrl: wasmHref()
    // Other options are available; see README/docs of ktx2-encoder.
  });
  await ensureDir(path.dirname(dstFile));
  await fs.writeFile(dstFile, Buffer.from(new Uint8Array(data)));
  console.log(`✓ ${path.relative(process.cwd(), srcFile)} → ${path.relative(process.cwd(), dstFile)} (${uastc ? 'UASTC' : 'ETC1S'})`);
}

async function* walk(dir) {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function main() {
  const { src, dst, flags } = parseArgs();
  const srcIsDir = await isDir(src);
  if (!srcIsDir) {
    await encodeFileToKTX2(src, outPathFor(src, dst), flags);
    return;
  }
  if (!(await exists(dst))) await ensureDir(dst);
  if (!flags.recursive) {
    const files = await fs.readdir(src);
    for (const f of files) {
      const inFile = path.join(src, f);
      if ((await isDir(inFile))) continue;
      await encodeFileToKTX2(inFile, outPathFor(inFile, dst), flags);
    }
  } else {
    for await (const inFile of walk(src)) {
      const rel = path.relative(src, inFile);
      const out = path.join(dst, rel).replace(/\.[^.]+$/, '.ktx2');
      await encodeFileToKTX2(inFile, out, flags);
    }
  }
}

if (import.meta.url === pathToFileURL(__filename).href) {
  main().catch(err => { console.error(err); process.exit(1); });
}

// Programmatic API
export async function convertImageToKTX2(sourcePath, outputPath, { uastc = true } = {}) {
  await encodeFileToKTX2(sourcePath, outPathFor(sourcePath, outputPath), { uastc });
}
