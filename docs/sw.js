// Guarda la app en el teléfono para que abra al instante y sin señal.
const CACHE = 'finanzas-v3';
const SHELL = ['./', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Apps Script va directo a la red
  // Abre al instante con la copia guardada y la actualiza en segundo plano.
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(e.request).then((cached) => {
        const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; });
        net.catch(() => {});
        return cached || net.catch(() => c.match("index.html"));
      })
    )
  );
});
