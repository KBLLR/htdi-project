import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'fonts', 'shared')
const OUTPUT_CSS_PATH = path.join(OUTPUT_DIR, 'fonts.generated.css')
const OUTPUT_MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json')

const WAREHOUSE_BASE_URL = process.env.WAREHOUSE_URL?.trim() || 'http://127.0.0.1:5202'
const WAREHOUSE_FONT_SOURCE_ID = process.env.WAREHOUSE_FONT_SOURCE_ID?.trim() || 'core-ui-shared-fonts'
const QUERY_LIMIT = 32

async function main() {
  const fonts = await queryWarehouseFonts()

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true })
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const manifestEntries = []

  for (const item of fonts) {
    const fileBytes = await readWarehouseFontBytes(item)
    const outputPath = path.join(OUTPUT_DIR, item.filename)
    await fs.writeFile(outputPath, fileBytes)

    manifestEntries.push({
      id: item.id,
      filename: item.filename,
      checksum: item.checksum ?? null,
      path: `/fonts/shared/${item.filename}`,
      family: item.font_meta.family,
      weight: item.font_meta.weight ?? 400,
      style: item.font_meta.style ?? 'normal',
      format: item.font_meta.format ?? item.extension ?? 'woff2',
      license: item.font_meta.license ?? null,
      license_url: item.font_meta.license_url ?? null,
      specimen_text: item.font_meta.specimen_text ?? null,
      source: item.source,
    })
  }

  await fs.writeFile(OUTPUT_CSS_PATH, buildFontStylesheet(manifestEntries))
  await fs.writeFile(
    OUTPUT_MANIFEST_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        warehouse_base_url: WAREHOUSE_BASE_URL,
        source_id: WAREHOUSE_FONT_SOURCE_ID,
        item_count: manifestEntries.length,
        items: manifestEntries,
      },
      null,
      2,
    ),
  )

  console.log(JSON.stringify({
    synced: manifestEntries.length,
    output_dir: OUTPUT_DIR,
    source_id: WAREHOUSE_FONT_SOURCE_ID,
  }, null, 2))
}

async function readWarehouseFontBytes(item) {
  try {
    const resolution = await requestJson(`/resolve/${encodeURIComponent(item.id)}`)
    const assetResponse = await fetch(resolution.url)
    if (assetResponse.ok) {
      return Buffer.from(await assetResponse.arrayBuffer())
    }
  } catch {
    // Fall through to local backend fallback below.
  }

  if (typeof item.backend_uri === 'string' && item.backend_uri.startsWith('file://')) {
    return fs.readFile(fileURLToPath(item.backend_uri))
  }

  throw new Error(`Failed to materialize ${item.filename} from Warehouse or local backend`)
}

async function queryWarehouseFonts() {
  const query = new URLSearchParams({
    kind: 'font',
    sources: WAREHOUSE_FONT_SOURCE_ID,
    sort: 'recent',
    limit: String(QUERY_LIMIT),
    offset: '0',
  })

  const payload = await requestJson(`/query?${query.toString()}`)
  const items = Array.isArray(payload.items) ? payload.items : []
  const fonts = items
    .filter((item) => item.kind === 'font')
    .map((item) => {
      if (!item.font_meta || typeof item.font_meta !== 'object') {
        throw new Error(`Warehouse font item ${item.id} is missing font_meta`)
      }
      return item
    })
    .sort((left, right) => {
      const familyCompare = String(left.font_meta.family).localeCompare(String(right.font_meta.family))
      if (familyCompare !== 0) {
        return familyCompare
      }
      return Number(left.font_meta.weight ?? 400) - Number(right.font_meta.weight ?? 400)
    })

  if (fonts.length === 0) {
    throw new Error(`No Warehouse fonts returned for source ${WAREHOUSE_FONT_SOURCE_ID}`)
  }

  return fonts
}

async function requestJson(pathname) {
  const response = await fetch(`${WAREHOUSE_BASE_URL.replace(/\/+$/, '')}${pathname}`)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && typeof payload.message === 'string'
      ? payload.message
      : `Warehouse request failed: ${response.status}`
    throw new Error(message)
  }
  return payload
}

function buildFontStylesheet(entries) {
  const blocks = entries.map((entry) => {
    const declarations = [
      '@font-face {',
      `  font-family: '${escapeCssString(entry.family)}';`,
      `  src: url('${entry.path}') format('${cssFormat(entry.format)}');`,
      `  font-weight: ${entry.weight};`,
      `  font-style: ${entry.style};`,
      '  font-display: swap;',
      '}',
    ]
    return declarations.join('\n')
  })

  return `${blocks.join('\n\n')}\n`
}

function cssFormat(format) {
  switch (String(format || '').toLowerCase()) {
    case 'woff2':
      return 'woff2'
    case 'woff':
      return 'woff'
    case 'ttf':
      return 'truetype'
    case 'otf':
      return 'opentype'
    default:
      return 'woff2'
  }
}

function escapeCssString(value) {
  return String(value).replace(/'/g, "\\'")
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
