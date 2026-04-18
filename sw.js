/* MITV Player Pro — Service Worker v3 */
const CACHE = 'mitv-pro-v3';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/firebase-config.js', '/js/tracker.js', '/js/m3u-parser.js', '/js/ai-engine.js', '/js/player.js', '/js/app.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.includes('.m3u') || url.pathname.includes('.ts') || url.pathname.includes('.m3u8') || url.hostname !== self.location.hostname) return;
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
    if (res.ok && e.request.method === 'GET') {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return res;
  })).catch(() => caches.match('/index.html')));
});
