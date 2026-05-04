import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/sangtacviet': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
      '/api/stv-proxy': {
        target: 'https://share.laoto1.workers.dev',
        changeOrigin: true,
        secure: false,
      },
      '/api/metruyenchu': {
        target: 'https://share.laoto.workers.dev',
        changeOrigin: true,
        secure: false,
      },
      '/api/kkphim': {
        target: 'https://share.laoto.workers.dev',
        changeOrigin: true,
        secure: false,
      },
      '/api/nettruyen': {
        target: 'https://share.laoto.workers.dev',
        changeOrigin: true,
        secure: false,
      },
      '/api/nhentai': {
        target: 'https://share.laoto.workers.dev',
        changeOrigin: true,
        secure: false,
      },
      '/api/nhentai-tags': {
        target: 'https://share.laoto.workers.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
