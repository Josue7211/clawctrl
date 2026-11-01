// Reuse the real frontend/config without reading local environment files.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const frontend = fileURLToPath(new URL('../../frontend/', import.meta.url))
const requireFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url))
const { createServer } = await import(requireFrontend.resolve('vite'))
const server = await createServer({
  root: frontend,
  configFile: `${frontend}/vite.config.ts`,
  envDir: false,
  envPrefix: [],
  plugins: [{
    name: 'review-isolation',
    configResolved(config) {
      if (Object.keys(config.server.proxy || {}).length) throw new Error('The isolated review server cannot proxy requests')
    },
    transformIndexHtml: html => html
      .replace(/<link[^>]*rel=["'](?:preconnect|dns-prefetch)["'][^>]*>/g, '')
      .replace(/<link[^>]*https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, ''),
  }],
  define: {
    'import.meta.env.VITE_API_BASE': JSON.stringify('http://fixture.invalid'),
    'import.meta.env.VITE_TRAINING_API_BASE': JSON.stringify('http://fixture.invalid'),
  },
  server: { host: '127.0.0.1', port: 5186, strictPort: true },
})
await server.listen()
server.printUrls()
