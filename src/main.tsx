import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker (via vite-plugin-pwa when installed).
// If the PWA plugin is not installed yet this import will fail during runtime/build —
// run `npm install` after pulling this change.
try {
  // This import is virtual and provided by vite-plugin-pwa at build time.
  // When the plugin is not yet installed, this will throw; that's okay —
  // install the dependency then rebuild.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerSW } = require('virtual:pwa-register') as any;
  if (registerSW) {
    registerSW({
      onNeedRefresh() {
        console.log('[pwa] new content available, please refresh.');
      },
      onOfflineReady() {
        console.log('[pwa] app is ready to work offline.');
      },
    });
  }
} catch (e) {
  // plugin not installed yet — install deps (npm i) and rebuild/deploy
  // fallback: try manual registration if serviceWorker is supported
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    });
  }
}
