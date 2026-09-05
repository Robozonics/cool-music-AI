// Service Worker for offline support: caches app shell and stores last-online date.
const CACHE_NAME = 'cool-music-ai-v1';
const OFFLINE_URL = '/index.html';
const LAST_ONLINE_KEY = '/last-online';

// Keep install precache minimal — don't include source files that don't exist in production.
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  const installPromise = caches.open(CACHE_NAME).then((cache) => {
    // Try to cache core assets, but don't fail the install if some are missing.
    return Promise.allSettled(
      CORE_ASSETS.map((url) => cache.add(url).catch((err) => {
        // Log and continue — missing/404 assets shouldn't block installation
        console.warn('[sw] failed to cache', url, err && err.message);
      }))
    ).then(() => {
      // Save a last-online timestamp when installing
      const now = new Response(new Date().toISOString(), {
        headers: { 'Content-Type': 'text/plain' }
      });
      return cache.put(LAST_ONLINE_KEY, now);
    });
  });

  event.waitUntil(installPromise.catch((e) => {
    console.error('[sw] install error', e && e.message);
  }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches if any in future versions
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
      // Claim clients so the SW starts controlling pages ASAP
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Provide the stored last-online timestamp
  if (url.pathname === LAST_ONLINE_KEY) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(LAST_ONLINE_KEY);
        if (cached) return cached;
        return new Response(new Date().toISOString(), { headers: { 'Content-Type': 'text/plain' } });
      })
    );
    return;
  }

  // For navigation requests (HTML pages), try network first then cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // If response ok, update cache
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For other requests, use cache-first strategy with network fallback and caching
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          // Cache successful GET responses (opaque responses like CDN assets are fine)
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => {
          // If nothing in cache, and request is for an image or similar, return a fallback
          if (event.request.destination === 'image') {
            return new Response('', { status: 404, statusText: 'offline' });
          }
        });
    })
  );
});

// Listen for messages from the page to update last-online timestamp
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    if (data && data.type === 'update-last-online') {
      const ts = new Response(data.date || new Date().toISOString(), {
        headers: { 'Content-Type': 'text/plain' }
      });
      caches.open(CACHE_NAME).then((cache) => cache.put(LAST_ONLINE_KEY, ts));
    }
  } catch (e) {
    // ignore
  }
});
