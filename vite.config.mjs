// vite.config.mjs
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fetchVercelDeployments, deploymentEntrySchema } from './server/fetchVercelDeployments.mjs';
import { writeAssetManifest } from './scripts/assetManifest.mjs';

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    publicDir: 'public',

    resolve: {
      alias: {
        // Baselines
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        src: fileURLToPath(new URL('./src', import.meta.url)),
        css: fileURLToPath(new URL('./src/css', import.meta.url)),
        modules: fileURLToPath(new URL('./src/modules', import.meta.url)),

        // Preferred aliases
        '@apps': fileURLToPath(new URL('./src/apps', import.meta.url)),
        '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
        '@css': fileURLToPath(new URL('./src/css', import.meta.url)),
        '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
        '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
        '@music': fileURLToPath(new URL('./src/music', import.meta.url)),
        '@history': fileURLToPath(new URL('./src/modules/history', import.meta.url)),
        '@extras': fileURLToPath(new URL('./src/extras', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),

        // World domain
        '@world': fileURLToPath(new URL('./src/world', import.meta.url)),
        '@world/core': fileURLToPath(new URL('./src/world/core', import.meta.url)),
        '@world/lighting': fileURLToPath(new URL('./src/world/lighting', import.meta.url)),
        '@world/materials': fileURLToPath(new URL('./src/world/materials', import.meta.url)),
        '@world/objects': fileURLToPath(new URL('./src/world/objects', import.meta.url)),
        '@world/post': fileURLToPath(new URL('./src/world/postprocessing', import.meta.url)),
        '@world/registry': fileURLToPath(new URL('./src/world/registry', import.meta.url)),
        '@world/utils': fileURLToPath(new URL('./src/world/utils', import.meta.url)),

        // Misc roots
        '@controllers': fileURLToPath(new URL('./src/controllers', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@shaders': fileURLToPath(new URL('./src/shaders', import.meta.url)),
        '@svg': fileURLToPath(new URL('./src/svg', import.meta.url)),
      },
      dedupe: ['three'],
    },

    server: {
      host: true,
      open: true,
      port: Number(process.env.VITE_DEV_PORT) || 5175,
      strictPort: false,
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
      chunkSizeWarningLimit: 1000, // Increase limit to 1MB
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three') || id.includes('postprocessing')) {
                return 'vendor-three';
              }
              if (id.includes('tippy.js') || id.includes('tweakpane') || id.includes('lil-gui') || id.includes('aos') || id.includes('augmented-ui') || id.includes('@tweakpane/plugin-essentials')) {
                return 'vendor-ui';
              }
              if (id.includes('gsap') || id.includes('@tweenjs/tween.js') || id.includes('popmotion')) {
                return 'vendor-animation';
              }
              if (id.includes('pixi.js') || id.includes('@pixi/filter-kawase-blur')) {
                return 'vendor-pixi';
              }
              return 'vendor'; // Catch-all for other node_modules
            }
          },
        },
      },
    },

    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/three/examples/jsm/libs/basis/*',
            dest: 'basis',
          },
        ],
      }),
      assetManifestPlugin(),
      vercelDeploymentsPlugin(),
    ],

    optimizeDeps: {
      include: ['three'],
    },
  };
});

function vercelDeploymentsPlugin() {
  // Shared handler for dev/preview
  const handler = async (req, res) => {
    if (req.method && req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET');
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    const requestUrl = new URL(req.url ?? '', 'http://localhost');
    const limit = requestUrl.searchParams.get('limit');
    const projectId = requestUrl.searchParams.get('projectId');

    try {
      const deployments = await fetchVercelDeployments({
        limit: limit ? Number(limit) : undefined,
        projectId: projectId || undefined,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        schema: deploymentEntrySchema,
        data: deployments,
      }));
    } catch (error) {
      res.statusCode = error.statusCode || 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: error.message,
        details: error.details ?? null,
      }));
    }
  };

  return {
    name: 'htdi-vercel-deployments-proxy',

    // Dev server
    configureServer(server) {
      server.middlewares.use('/api/vercel-deployments', handler);
    },

    // `vite preview` support
    configurePreviewServer(server) {
      server.middlewares.use('/api/vercel-deployments', handler);
    },
  };
}

function assetManifestPlugin({ output = 'src/config/assets.js' } = {}) {
  let rootDir = process.cwd();
  let publicDir = path.resolve(rootDir, 'public');
  let outputFile = path.resolve(rootDir, output);
  let lastSignature = null;
  let debounceTimer = null;

  const runGenerate = async () => {
    try {
      const { signature } = await writeAssetManifest({
        publicDir,
        outputFile,
        previousSignature: lastSignature,
      });
      lastSignature = signature;
    } catch (error) {
      console.error('[asset-manifest] Failed to update manifest', error);
    }
  };

  const scheduleGenerate = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runGenerate();
    }, 75);
  };

  return {
    name: 'htdi-asset-manifest',
    configResolved(config) {
      rootDir = config.root;
      publicDir = path.resolve(rootDir, config.publicDir ?? 'public');
      outputFile = path.resolve(rootDir, output);
    },
    async buildStart() {
      await runGenerate();
    },
    configureServer(server) {
      const watcher = server.watcher;
      const handleChange = (file) => {
        if (!file) return;
        const normalized = path.resolve(file);
        if (normalized.startsWith(publicDir)) {
          scheduleGenerate();
        }
      };
      watcher.on('add', handleChange);
      watcher.on('unlink', handleChange);
      watcher.on('change', handleChange);
    },
  };
}
