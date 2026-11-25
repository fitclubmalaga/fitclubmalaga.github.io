// Deslizar hacia abajo para actualizar (0.12.1), como en otras apps.
// Solo con el dedo, desde lo alto de la pantalla. Al soltar pasado el umbral se recarga la app: vuelve a pedir los
// datos al servidor y, si se ha publicado una versión nueva de la web, la trae. Se conserva la pestaña en la que estabas.
(function () {
  'use strict';
  var UMBRAL = 70;      // px (ya amortiguados) que hay que bajar para actualizar
  var MAXIMO = 110;     // el círculo no baja más de esto
  var marca = null, y0 = 0, x0 = 0, tirando = false, decidido = false, tirado = 0, recargando = false;

  function crearMarca() {
    marca = document.createElement('div');
    marca.className = 'refrescar';
    marca.setAttribute('aria-hidden', 'true');
    marca.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>';
    document.body.appendChild(marca);
  }
  function arriba() { return (window.scrollY || document.documentElement.scrollTop || 0) <= 0; }
  function bloqueado(ev) {
    if (recargando) return true;
    if (document.querySelector('.arrastrando, .capa-compartir')) return true; // ordenando sedes o con una capa abierta
    var t = ev.target;
    if (t && t.closest && t.closest('input, textarea, select, [data-sin-refrescar]')) return true;
    var a = document.activeElement;
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); // escribiendo: el teclado mueve la pantalla
  }
  function mover(px) {
    if (!marca) crearMarca();
    var listo = px >= UMBRAL;
    marca.style.transform = 'translate(-50%,' + (px - 50) + 'px) rotate(' + Math.round(px * 3) + 'deg)';
    marca.style.opacity = Math.min(1, px / 40);
    marca.classList.toggle('listo', listo);
  }
  function soltar() {
    if (!marca) return;
    marca.style.transition = 'transform .2s, opacity .2s';
    marca.style.transform = 'translate(-50%,-50px)'; marca.style.opacity = 0;
    setTimeout(function () { if (marca && !recargando) { marca.style.transition = ''; marca.classList.remove('listo'); } }, 220);
  }
  function actualizar() {
    recargando = true;
    marca.style.transition = 'transform .2s';
    marca.style.transform = 'translate(-50%,' + (UMBRAL - 50) + 'px)';
    marca.classList.add('girando');
    try { var p = window.FitclubApp && window.FitclubApp.pestana(); if (p) sessionStorage.setItem('fitclub_pestana', p); } catch (e) { /* sin almacenamiento */ }
    var recargar = function () { location.reload(); };
    // Si hay una versión nueva de la web, que la descargue antes de recargar (máximo 1,5 s de espera).
    var reg = navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration() : null;
    var espera = setTimeout(recargar, 1500);
    if (reg) reg.then(function (r) { return r && r.update(); }).then(function () { clearTimeout(espera); setTimeout(recargar, 250); }, function () {});
    else { clearTimeout(espera); setTimeout(recargar, 250); }
  }

  document.addEventListener('touchstart', function (ev) {
    tirando = false; decidido = false; tirado = 0;
    if (ev.touches.length !== 1 || !arriba() || bloqueado(ev)) return;
    tirando = true; y0 = ev.touches[0].clientY; x0 = ev.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchmove', function (ev) {
    if (!tirando) return;
    var dy = ev.touches[0].clientY - y0, dx = ev.touches[0].clientX - x0;
    if (!decidido) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      decidido = true;
      // Hacia los lados (carruseles), hacia arriba o con la página ya bajada: no es para actualizar.
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || !arriba() || document.querySelector('.arrastrando')) { tirando = false; return; }
    }
    if (ev.cancelable) ev.preventDefault(); // que no rebote la página mientras tiras
    tirado = Math.min(MAXIMO, dy * 0.5);
    mover(tirado);
  }, { passive: false });

  function fin() {
    if (!tirando) return;
    tirando = false;
    if (decidido && tirado >= UMBRAL) actualizar(); else soltar();
  }
  document.addEventListener('touchend', fin);
  document.addEventListener('touchcancel', function () { tirado = 0; fin(); });
})();
