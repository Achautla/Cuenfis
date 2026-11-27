// Service worker: la app funciona sin conexión. Navegación: red primero; recursos: caché primero.
const CACHE = 'cuenfis-v1';
const BASE = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).then((r) => { caches.open(CACHE).then((c) => c.put('/index.html', r.clone())); return r; }).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
    return r;
  })));
});
