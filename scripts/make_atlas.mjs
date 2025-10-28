// scripts/make_atlas.mjs
// Modern PNG/JPEG → RGBA texture atlas with potpack + sharp (2025).
// - Trims transparent borders (configurable threshold).
// - Adds extruded padding to avoid mipmap bleeding.
// - Packs with potpack; can round atlas size to power-of-two.
// - Writes atlas image (PNG/AVIF/WebP) + JSON with pixels and normalized UVs.
//
// Usage:
//   node scripts/make_atlas.mjs ./assets/sprites ./public/atlas.png ./public/atlas.json \
//     --recursive --pad=4 --trim=10 --pot --format=png
//
// Install:
//   npm i sharp potpack
//
// three.js tip: for color textures set texture.colorSpace = THREE.SRGBColorSpace.  // docs linked above.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import potpack from 'potpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ---------- CLI args ----------
function parseArgs(argv = process.argv.slice(2)) {
  const flags = {
    recursive: argv.includes('--recursive'),
    pot: argv.includes('--pot'),
    format: 'png',      // png | webp | avif (use ktx2 in a later step if needed)
    pad: 2,             // extrude border in pixels
    trim: 0,            // 0 disables trim; else threshold 1..255 (see sharp trim())
    quality: 90,        // for webp/avif if chosen
  };
  for (const a of argv) {
    if (a.startsWith('--pad=')) flags.pad = Math.max(0, parseInt(a.split('=')[1], 10) || 0);
    if (a.startsWith('--trim=')) flags.trim = Math.max(0, parseInt(a.split('=')[1], 10) || 0);
    if (a.startsWith('--format=')) flags.format = a.split('=')[1];
    if (a.startsWith('--quality=')) flags.quality = Math.max(1, Math.min(100, parseInt(a.split('=')[1], 10) || 90));
  }
  const positional = argv.filter(a => !a.startsWith('--'));
  if (positional.length < 3) {
    console.error(`Usage:
  node ${path.relative(process.cwd(), __filename)} <src-dir|list.json> <out-image> <out-json> [--recursive] [--pad=4] [--trim=10] [--pot] [--format=png|webp|avif] [--quality=90]`);
    process.exit(1);
  }
  return { src: positional[0], outImage: positional[1], outJson: positional[2], flags };
}

// ---------- helpers ----------
const nextPOT = (n) => { let p = 1; while (p < n) p <<= 1; return p; };
const isDir = async (p) => { try { return (await fs.stat(p)).isDirectory(); } catch { return false; } };
const ensureDir = (p) => fs.mkdir(p, { recursive: true });

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function collectSourceList(src, recursive) {
  // If src is a JSON list file, read it; else scan a directory.
  const abs = path.isAbsolute(src) ? src : path.join(projectRoot, src);
  if (!(await isDir(abs))) {
    if (abs.endsWith('.json')) {
      const list = JSON.parse(await fs.readFile(abs, 'utf-8'));
      return list.map((p) => path.isAbsolute(p) ? p : path.join(projectRoot, p));
    }
    // Single file case:
    return [abs];
  }
  const exts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.tif', '.tiff']);
  const files = [];
  if (recursive) {
    for await (const f of walk(abs)) if (exts.has(path.extname(f).toLowerCase())) files.push(f);
  } else {
    for (const name of await fs.readdir(abs)) {
      const f = path.join(abs, name);
      if (!(await isDir(f)) && exts.has(path.extname(f).toLowerCase())) files.push(f);
    }
  }
  return files;
}

// Load, optional trim, ensure alpha, get buffer + dims (pre-padding)
async function loadSprite(file, trimThreshold) {
  let pipeline = sharp(file).ensureAlpha(); // ensure RGBA for predictable packing/composite  :contentReference[oaicite:5]{index=5}
  if (trimThreshold > 0) pipeline = pipeline.trim({ threshold: trimThreshold }); // trim near-transparent/boring edges  :contentReference[oaicite:6]{index=6}
  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true }); // normalized to PNG RGBA
  return { file, buffer: data, w: info.width, h: info.height };
}

// ---------- main atlas builder ----------
async function createTextureAtlas(imagePathsOrDir, outImage, outJson, opts = {}) {
  const { recursive = false, pad = 2, trim = 0, pot = false, format = 'png', quality = 90 } = opts;

  const srcList = Array.isArray(imagePathsOrDir)
    ? imagePathsOrDir.map((p) => path.isAbsolute(p) ? p : path.join(projectRoot, p))
    : await collectSourceList(imagePathsOrDir, recursive);

  if (srcList.length === 0) throw new Error('No source images found');

  // 1) Ingest/trim
  const sprites = [];
  for (const file of srcList) {
    const s = await loadSprite(file, trim);
    sprites.push(s);
  }

  // 2) Build rectangles (include padding)
  const boxes = sprites.map((s, i) => ({ i, w: s.w + pad * 2, h: s.h + pad * 2 }));

  // 3) Pack
  const { w: packedW, h: packedH, fill } = potpack(boxes); // mutates boxes: adds x,y  :contentReference[oaicite:7]{index=7}
  let atlasW = packedW, atlasH = packedH;
  if (pot) { atlasW = nextPOT(packedW); atlasH = nextPOT(packedH); }

  // 4) Composite with extruded padding to prevent mip bleeding
  //    We extend each sprite by `pad` pixels using edge-copy, then place at (box.x, box.y).  :contentReference[oaicite:8]{index=8}
  const composites = [];
  const frames = {};
  for (const box of boxes) {
    const s = sprites[box.i];

    // extrude edges by 'pad' pixels
    const extended = await sharp(s.buffer)
      .extend({ top: pad, left: pad, bottom: pad, right: pad, extendWith: 'copy' }) // edge-pixel replication  :contentReference[oaicite:9]{index=9}
      .png()
      .toBuffer();

    composites.push({ input: extended, left: box.x, top: box.y });

    // record frame info (inner rect without padding)
    const inner = { x: box.x + pad, y: box.y + pad, w: s.w, h: s.h };
    frames[path.relative(projectRoot, s.file)] = {
      frame: { x: inner.x, y: inner.y, w: inner.w, h: inner.h },
      rotated: false,
      trimmed: trim > 0,
      spriteSourceSize: { x: 0, y: 0, w: s.w, h: s.h },
      sourceSize: { w: s.w, h: s.h },
      uv: {
        u0: inner.x / atlasW,
        v0: inner.y / atlasH,
        u1: (inner.x + inner.w) / atlasW,
        v1: (inner.y + inner.h) / atlasH
      }
    };
  }

  // 5) Create base + write atlas
  await ensureDir(path.dirname(outImage));
  await ensureDir(path.dirname(outJson));

  let base = sharp({
    create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  });

  base = base.composite(composites); // sharp composite over blank canvas  :contentReference[oaicite:10]{index=10}

  if (format === 'png') {
    await base.png().toFile(outImage);
  } else if (format === 'webp') {
    await base.webp({ quality }).toFile(outImage);
  } else if (format === 'avif') {
    await base.avif({ quality }).toFile(outImage);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  // 6) Write JSON
  const atlas = {
    meta: {
      app: 'make_atlas.mjs',
      version: 1,
      image: path.basename(outImage),
      size: { w: atlasW, h: atlasH },
      format,
      padding: pad,
      pot,
      packFill: +fill.toFixed(3)
    },
    frames
  };
  await fs.writeFile(outJson, JSON.stringify(atlas, null, 2), 'utf-8');

  return { image: outImage, json: outJson, count: sprites.length, width: atlasW, height: atlasH };
}

// ---------- entry ----------
if (import.meta.url === pathToFileURL(__filename).href) {
  const { src, outImage, outJson, flags } = parseArgs();
  const absImg = path.isAbsolute(outImage) ? outImage : path.join(projectRoot, outImage);
  const absJson = path.isAbsolute(outJson) ? outJson : path.join(projectRoot, outJson);
  createTextureAtlas(src, absImg, absJson, flags)
    .then((r) => console.log(`✓ Atlas ${r.width}x${r.height}  sprites=${r.count}  → ${r.image}\n   JSON → ${r.json}`))
    .catch((e) => { console.error(e); process.exit(1); });
}

export { createTextureAtlas };
