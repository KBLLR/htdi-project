import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeAssetManifest } from './assetManifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');
const outputFile = path.resolve(rootDir, 'src/config/assets.js');

const { changed } = await writeAssetManifest({ publicDir, outputFile });

if (changed) {
  console.info(`[asset-manifest] Updated ${path.relative(rootDir, outputFile)}`);
} else {
  console.info('[asset-manifest] Manifest already up to date');
}
