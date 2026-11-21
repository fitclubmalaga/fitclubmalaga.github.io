// Service worker mínimo: guarda la "carcasa" de la app para que abra rápido.
// Nunca guarda respuestas del servidor (datos, sesiones).
var CACHE = 'fitclub-v3';
var CARCASA = ['./', 'index.html', 'tema.css', 'estilos.css', 'config.js', 'js/api.js', 'js/app.js', 'manifest.webmanifest', 'iconos/icono-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CARCASA); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // la API va directa a la red
  // Primero la red (para recibir siempre la última versión); si no hay conexión, la copia guardada.
  e.respondWith(fetch(e.request).then(function (r) {
    var copia = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
    return r;
  }).catch(function () { return caches.match(e.request); }));
});
