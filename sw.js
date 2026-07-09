// ─── Khayyam Advertiser & Auto Decor Center — Service Worker v4 ──────────────────
const CACHE_NAME = 'khayyam-auto-v4';

const LOCAL_ASSETS = [
  './index.html',
  './manifest.json',
  './Khayyam-logo.png'
];

// ─── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching local assets...');
        return cache.addAll(LOCAL_ASSETS);
      })
      .then(() => {
        console.log('✅ Install complete, skipping wait...');
        return self.skipWaiting();
      })
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        console.log('📁 Cleaning old caches...');
        return Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        );
      })
      .then(() => {
        console.log('✅ Activation complete, claiming clients...');
        return self.clients.claim();
      })
  );
});

// ─── FETCH: Handle Navigation Properly ────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }

  // Special handling for navigation requests (the main page load)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match('./index.html').then(response => {
          if (response) {
            console.log('📄 Serving index.html from cache');
            return response;
          }
          console.log('🌐 Fetching index.html from network');
          return fetch(event.request).catch(() => {
            return new Response('Offline', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // For all other requests (images, CSS, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503 });
      });
    })
  );
});