// Service worker mínimo: guarda la "carcasa" de la app para que abra rápido.
// Nunca guarda respuestas del servidor (datos, sesiones).
var CACHE = 'fitclub-v17';
var CARCASA = ['./', 'index.html', 'tema.css', 'estilos.css', 'config.js', 'js/api.js', 'js/agenda.js', 'js/reservas.js', 'js/equipo.js', 'js/app.js', 'manifest.webmanifest', 'iconos/icono-192.png', 'iconos/logo-fitclub-marino.png', 'iconos/logo-fitclub-blanco-app.png'];
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
  // cache: 'no-cache' = preguntar siempre a GitHub si el archivo ha cambiado (GitHub Pages deja usar la copia del
  // navegador 10 minutos y se veía la versión anterior tras publicar). Si no ha cambiado, la respuesta es mínima (304).
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (r) {
    var copia = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
    return r;
  }).catch(function () { return caches.match(e.request); }));
});
