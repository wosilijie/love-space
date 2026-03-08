import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/love-space/',
  server: {
    proxy: {
      '/api/csst': {
        target: 'https://www.cmathc.org.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/csst/, '/csst'),
      },
      '/api/jsst': {
        target: 'https://www.cmathc.org.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jsst/, '/jsst'),
      },
      '/api/static': {
        target: 'https://www.cmathc.org.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/static/, '/static'),
      },
    },
  },
})

