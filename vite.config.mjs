// vite.config.mjs
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { fetchVercelDeployments, deploymentEntrySchema } from './server/fetchVercelDeployments.mjs';

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
        '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
        '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
        '@css': fileURLToPath(new URL('./src/css', import.meta.url)),
        '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
        '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),

        // Three domain
        '@three': fileURLToPath(new URL('./src/three', import.meta.url)),
        '@three/core': fileURLToPath(new URL('./src/three/core', import.meta.url)),
        '@three/lighting': fileURLToPath(new URL('./src/three/lighting', import.meta.url)),
        '@three/materials': fileURLToPath(new URL('./src/three/materials', import.meta.url)),
        '@three/objects': fileURLToPath(new URL('./src/three/objects', import.meta.url)),
        '@three/post': fileURLToPath(new URL('./src/three/postprocessing', import.meta.url)),
        '@three/registry': fileURLToPath(new URL('./src/three/registry', import.meta.url)),
        '@three/utils': fileURLToPath(new URL('./src/three/utils', import.meta.url)),

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
    },

    plugins: [
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
