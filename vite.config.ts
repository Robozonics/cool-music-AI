import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// forced restart 2
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Cool Music AI',
        short_name: 'MusicAI',
        description: 'Vibestream Music App',
        theme_color: '#050505',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
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
      },
      '/api/yt-search-proxy': {
        target: 'https://pipedapi.kavin.rocks',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const q = url.searchParams.get('q') || '';
          return `/search?q=${encodeURIComponent(q)}&filter=music_songs`;
        }
      },
      '/api/yt-stream': {
        target: 'https://pipedapi.kavin.rocks',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const id = url.searchParams.get('id') || '';
          // We can't do a 302 redirect logic purely in vite proxy easily, 
          // but we can return the streams JSON and have the client handle it.
          // Since the client expects a redirect from /api/yt-stream, this won't work perfectly locally unless we handle the JSON.
          return `/streams/${id}`;
        }
      },
      '/api/saavncdn': {
        target: 'https://aac.saavncdn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/saavncdn/, '')
      }
    }
  }
})
