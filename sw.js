/* ═══════════════════════════════════════════════════════════════
   MITV Player — Service Worker
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mitv-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/m3u-parser.js',
  '/js/player.js',
  '/js/app.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Don't cache M3U requests or stream URLs
  if (url.pathname.includes('.m3u') || url.pathname.includes('.ts') ||
      url.pathname.includes('.m3u8') || url.hostname !== self.location.hostname) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
