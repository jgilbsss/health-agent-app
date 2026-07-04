// Offline shell cache + always-fresh app code.
// Strategy: index.html / sw.js are fetched with cache:'reload' (bypasses the
// 10-min GitHub Pages HTTP cache) so updates appear on next open; media and
// everything else use plain network-first; offline falls back to cache.
const CACHE = 'health-agent-v14';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])));
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname === 'api.github.com') return;           // never touch sync calls
  const isShell = e.request.mode === 'navigate' ||
                  url.pathname.endsWith('index.html') || url.pathname.endsWith('/');
  const req = isShell ? new Request(e.request.url, { cache: 'reload' }) : e.request;
  e.respondWith(
    fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
