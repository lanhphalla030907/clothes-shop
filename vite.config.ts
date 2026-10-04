import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read here rather than in `src/lib/api/config.ts`: the client only ever needs
  // the URL, but the *proxy* needs the origin to forward to, and that is a
  // build-time concern the browser never sees.
  const env = loadEnv(mode, process.cwd(), '')

  // Where the API lives in development. Overridable so a backend on another host
  // or port needs no code change.
  const apiTarget = env['VITE_API_PROXY_TARGET'] || 'http://localhost:3000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number(env['VITE_PORT'] ?? 5173),
      proxy: {
        /**
         * The API sends no CORS headers, so a cross-origin request from the dev
         * server would be blocked before it reached a handler. Proxying makes the
         * browser see one origin.
         *
         * `rewrite` strips `/api` because the backend mounts its routes at the
         * root (`/cart`, not `/api/cart`). `src/lib/api/config.ts` defaults its
         * base URL to `/api` in development for exactly this reason; in production
         * `VITE_API_BASE_URL` points at wherever the API is actually served, and
         * no proxy is involved.
         */
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
