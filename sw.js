// ─── Khayyam Advertiser & Auto Decor Center — Service Worker v3 ──────────────────
const CACHE_NAME = 'khayyam-auto-v3';

const LOCAL_ASSETS = [
  './index.html',
  './manifest.json',
  './Khayyam-logo.png'
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// ─── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('🔧 Installing Service Worker...');
      try {
        // Cache local files first
        await cache.addAll(LOCAL_ASSETS);
        console.log('✅ Local assets cached');
        
        // Cache CDN assets (don't fail if they don't load)
        await Promise.allSettled(
          CDN_ASSETS.map(url =>
            fetch(url, { mode: 'cors' })
              .then(res => {
                if (res.ok) {
                  cache.put(url, res);
                  console.log('✅ Cached:', url);
                }
              })
              .catch(() => console.log('⚠️ Failed to cache:', url))
          )
        );
        console.log('✅ Installation complete!');
      } catch (error) {
        console.error('❌ Installation failed:', error);
      }
    }).then(() => {
      console.log('🚀 Skip waiting...');
      return self.skipWaiting();
    })
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        console.log('📁 Existing caches:', keys);
        return Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => {
            console.log('🗑️ Deleting old cache:', k);
            return caches.delete(k);
          })
        );
      })
      .then(() => {
        console.log('✅ Activation complete, claiming clients...');
        return self.clients.claim();
      })
  );
});

// ─── FETCH: Cache First + background revalidate ───────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (!url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      // Try cache first
      const cached = await cache.match(event.request);
      if (cached) {
        console.log('📦 Serving from cache:', event.request.url);
        return cached;
      }

      // Fallback to network
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type !== 'opaque') {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        console.log('⚠️ Network failed, looking for fallback...');
        
        // If it's a document request, serve index.html
        if (event.request.destination === 'document' || event.request.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) {
            console.log('📄 Serving fallback index.html');
            return fallback;
          }
        }
        
        return new Response('Offline — resource unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })
  );
});