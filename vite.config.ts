import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/saavn': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/saavn/, '')
      },
      '/api/youtube': {
        target: 'https://suggestqueries.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/youtube/, '')
      }
    }
  }
})
