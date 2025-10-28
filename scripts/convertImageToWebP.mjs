// scripts/png2webp.mjs
// Up-to-date PNG → WebP converter using sharp (ESM).
// - Auto-picks WebP mode based on input (PNG alpha → lossless; non-alpha PNG → nearLossless; photos → quality).
// - Accepts single files or whole directories (with optional --recursive).
// - Skips work if destination is newer (incremental).
//
// Usage examples:
//   node scripts/png2webp.mjs src/images/logo.png dist/images/logo.webp
//   node scripts/png2webp.mjs src/images dist/images --recursive
//   node scripts/png2webp.mjs src/images dist/images --recursive --q=82 --effort=6
//
// Requires: Node ≥18.17 or ≥20.3 and sharp installed:
//   npm i sharp
//
// Notes on options:
//   - WebP options map to sharp’s documented API: quality, alphaQuality, lossless, nearLossless, effort, smartSubsample.
//   - For PNG w/ alpha, we default to { lossless: true, alphaQuality: 100 }.
//   - For non-alpha PNG, we default to { nearLossless: true, quality: 60 } (near-lossless triggers lossless w/ preprocessing).
//   - For photos (JPEG, etc.), default { quality: 80 }.
//   - You can override via CLI flags: --q=..., --alphaQ=..., --lossless, --nearLossless, --effort=..., --no-smartSubsample.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv = process.argv.slice(2)) {
  const flags = {
    recursive: argv.includes('--recursive'),
    smartSubsample: !argv.includes('--no-smartSubsample'),
  };
  for (const a of argv) {
    if (a.startsWith('--q=')) flags.q = Number(a.split('=')[1]);
    if (a.startsWith('--alphaQ=')) flags.alphaQ = Number(a.split('=')[1]);
    if (a === '--lossless') flags.lossless = true;
    if (a === '--nearLossless') flags.nearLossless = true;
    if (a.startsWith('--effort=')) flags.effort = Number(a.split('=')[1]);
  }
  const positional = argv.filter(a => !a.startsWith('--'));
  if (positional.length < 2) {
    usage();
    process.exit(1);
  }
  return { src: positional[0], dst: positional[1], flags };
}

function usage() {
  console.error(
    `Usage:
  node ${path.relative(process.cwd(), __filename)} <src-file|src-dir> <dst-file|dst-dir> [--recursive] [--q=80] [--alphaQ=100] [--lossless] [--nearLossless] [--effort=5] [--no-smartSubsample]`
  );
}

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function isDir(p) {
  try { return (await fs.stat(p)).isDirectory(); } catch { return false; }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function toWebPExt(p) {
  return path.extname(p).toLowerCase() === '.webp' ? p : p.replace(/\.[^.]+$/, '') + '.webp';
}

function defaultWebpOptionsFromMeta(meta, flags = {}) {
  const base = {
    // effort: 0..6 (6 = slowest/best compression). Default to 5 for good size.
    effort: Number.isFinite(flags.effort) ? flags.effort : 5,
    smartSubsample: flags.smartSubsample ?? true
  };

  // If explicit overrides passed, apply directly
  if (flags.lossless || flags.nearLossless || Number.isFinite(flags.q) || Number.isFinite(flags.alphaQ)) {
    return {
      ...base,
      ...(Number.isFinite(flags.q) ? { quality: flags.q } : {}),
      ...(Number.isFinite(flags.alphaQ) ? { alphaQuality: flags.alphaQ } : {}),
      ...(flags.lossless ? { lossless: true } : {}),
      ...(flags.nearLossless ? { nearLossless: true } : {}),
    };
  }

  // Heuristics by input format:
  if (meta.format === 'png') {
    if (meta.hasAlpha) {
      return { ...base, lossless: true, alphaQuality: 100 };
    }
    // Sparse/flat graphics often compress better with near-lossless preprocessing
    return { ...base, nearLossless: true, quality: 60 };
  }

  // Photos (jpeg, tiff, etc.)
  return { ...base, quality: 80 };
}

async function isUpToDate(src, dst) {
  try {
    const [s, d] = await Promise.all([fs.stat(src), fs.stat(dst)]);
    return d.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

async function convertOneFileToWebP(srcFile, dstFile, flags) {
  const meta = await sharp(srcFile).metadata(); // includes format, hasAlpha, width, height, etc.
  const opts = defaultWebpOptionsFromMeta(meta, flags);

  await ensureDir(path.dirname(dstFile));
  await sharp(srcFile)
    .webp(opts)
    .toFile(dstFile);

  return { src: srcFile, out: dstFile, meta, opts };
}

async function* walk(dir, recursive) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive) yield* walk(p, recursive);
    } else {
      yield p;
    }
  }
}

async function main() {
  const { src, dst, flags } = parseArgs();

  const srcIsDir = await isDir(src);
  const dstIsDir = await isDir(dst) || (!path.extname(dst) || await pathExists(dst));

  if (srcIsDir && !dstIsDir) {
    console.error('When source is a directory, destination must be a directory.');
    process.exit(1);
  }

  if (!srcIsDir) {
    // single file
    const outPath = dstIsDir ? toWebPExt(path.join(dst, path.basename(src))) : (path.extname(dst) ? dst : toWebPExt(dst));
    if (await isUpToDate(src, outPath)) {
      console.log(`↷ Skipped (up-to-date): ${path.relative(process.cwd(), outPath)}`);
      return;
    }
    const { opts } = await convertOneFileToWebP(src, outPath, flags);
    console.log(`✓ ${path.relative(process.cwd(), src)} → ${path.relative(process.cwd(), outPath)}  ${JSON.stringify(opts)}`);
    return;
  }

  // directory mode
  await ensureDir(dst);
  let count = 0;
  for await (const file of walk(src, flags.recursive)) {
    const ext = path.extname(file).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp'].includes(ext)) continue;
    const rel = path.relative(src, file);
    const out = toWebPExt(path.join(dst, rel));
    if (await isUpToDate(file, out)) {
      console.log(`↷ Skipped (up-to-date): ${path.relative(process.cwd(), out)}`);
      continue;
    }
    try {
      const { opts } = await convertOneFileToWebP(file, out, flags);
      console.log(`✓ ${path.relative(src, file)} → ${path.relative(dst, out)}  ${JSON.stringify(opts)}`);
      count++;
    } catch (err) {
      console.error(`✗ Failed: ${file}\n  ${err?.message || err}`);
    }
  }
  if (count === 0) {
    console.log('No convertible images found.');
  }
}

if (import.meta.url === pathToFileURL(__filename).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

// Also export a small API similar to your original helper:
export async function convertImageToWebP(sourcePath, outputPath, flags = {}) {
  const absSrc = path.resolve(sourcePath);
  const absOut = path.resolve(path.extname(outputPath) ? outputPath : toWebPExt(outputPath));
  return convertOneFileToWebP(absSrc, absOut, flags);
}
