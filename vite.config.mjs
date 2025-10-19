import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { fetchVercelDeployments, deploymentEntrySchema } from './server/fetchVercelDeployments.mjs'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    publicDir: 'public',
    resolve: {
      alias: {
        src: fileURLToPath(new URL('./src', import.meta.url)),
        css: fileURLToPath(new URL('./src/css', import.meta.url)),
        modules: fileURLToPath(new URL('./src/modules', import.meta.url))
      }
    },
    server: {
      host: true,
      open: true,
      port: Number(process.env.VITE_DEV_PORT) || 5175,
      strictPort: false
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    plugins: [
      vercelDeploymentsPlugin()
    ],
    optimizeDeps: {
      include: ['three']
    }
  }
})

function vercelDeploymentsPlugin() {
  return {
    name: 'htdi-vercel-deployments-proxy',
    configureServer(server) {
      server.middlewares.use('/api/vercel-deployments', async (req, res) => {
        if (req.method && req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        const requestUrl = new URL(req.url ?? '', 'http://localhost')
        const limit = requestUrl.searchParams.get('limit')
        const projectId = requestUrl.searchParams.get('projectId')

        try {
          const deployments = await fetchVercelDeployments({
            limit: limit ? Number(limit) : undefined,
            projectId: projectId || undefined
          })

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            schema: deploymentEntrySchema,
            data: deployments
          }))
        } catch (error) {
          res.statusCode = error.statusCode || 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: error.message,
            details: error.details ?? null
          }))
        }
      })
    }
  }
}
