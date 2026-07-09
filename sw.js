// ─── Khayyam Advertiser & Auto Decor Center — Service Worker v1 ──────────────────
const CACHE_NAME = 'khayyam-auto-v1';

const LOCAL_ASSETS = [
  './index.html',
  './manifest.json',
  './Khayyam-logo.png'
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(LOCAL_ASSETS);
      await Promise.allSettled(
        CDN_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(res => { if (res.ok) cache.put(url, res); })
            .catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (!url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);

      const networkPromise = fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) return cached;

      const networkResponse = await networkPromise;
      if (networkResponse) return networkResponse;

      if (event.request.destination === 'document') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }

      return new Response('Offline — resource unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});