import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteDevMockPlugin } from './mock-server/vite-mock-plugin.js'

export default defineConfig(({ mode }) => {
  // `npm run dev:mocks` o VITE_USE_MOCKS=true: API simulada, sin backend
  const usarMocks = mode === 'mocks' || loadEnv(mode, process.cwd(), '').VITE_USE_MOCKS === 'true'

  return {
    plugins: [react(), tailwindcss(), ...(usarMocks ? [viteDevMockPlugin()] : [])],
    resolve: {
      alias: {
        // Motor único del documento, compartido con el servidor (PDF)
        '@siadu/documento': fileURLToPath(new URL('../shared/documento/index.js', import.meta.url))
      }
    },
    server: {
      port: 5173,
      fs: {
        // Permite servir ../shared en desarrollo
        allow: ['..']
      },
      proxy: {
        '/api': {
          target: 'http://localhost:7001',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false
    }
  }
})
