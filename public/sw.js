// Service worker: la app funciona sin conexión. Navegación: red primero; recursos: caché primero.
const CACHE = 'cuenfis-v3';
const BASE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png'];
const INDEX = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(INDEX, copia)); return r; }).catch(() => caches.match(INDEX)));
    return;
  }
  e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
    return r;
  })));
});

// Al tocar un aviso: abre (o enfoca) la app en la pantalla del aviso
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ruta = e.notification.data?.ruta ?? 'inicio';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
    const w = ws[0];
    if (w) { w.navigate?.(new URL(`./#/${ruta}`, self.registration.scope).href); return w.focus(); }
    return self.clients.openWindow(`./#/${ruta}`);
  }));
});
