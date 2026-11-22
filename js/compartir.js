// «Instala la app»: QR con el enlace de la app y los pasos para instalarla en iPhone y Android.
// Pensado para enseñarlo en el móvil del Boss o del coach a un cliente nuevo; también lo ve cualquiera desde la bienvenida.
// El QR es un archivo fijo (iconos/qr-app.svg) generado con el enlace https://fitclubmalaga.github.io/.
(function () {
  'use strict';
  var ENLACE = 'https://fitclubmalaga.github.io/';
  var avisoInstalar = null; // Android/Chrome: el aviso de instalación que el navegador deja lanzar con un botón
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); avisoInstalar = e; });
  window.addEventListener('appinstalled', function () { avisoInstalar = null; });

  function sistema() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'ios'; // en el ordenador, se enseña primero iPhone (lo más habitual entre los clientes)
  }
  function yaInstalada() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }

  /** Abre la pantalla completa. h = el ayudante de la app para crear elementos. */
  function abrir(h) {
    var anterior = document.activeElement;
    var capa = h('div', { clase: 'capa-compartir', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tituloCompartir' });
    var elegido = sistema();
    var pasos = h('div', { clase: 'pasos-instalar' });
    var pestanas = h('div', { clase: 'segmento', role: 'group', 'aria-label': 'Tipo de móvil' });
    var PASOS = {
      ios: [
        ['Abre el enlace con Safari', 'Escanea el código con la cámara y toca el aviso amarillo. Si se abre en otra app, cópialo en Safari.'],
        ['Toca «Compartir»', 'El cuadrado con una flecha hacia arriba, abajo en el centro (en iPad, arriba a la derecha).'],
        ['«Añadir a pantalla de inicio»', 'Baja un poco en la lista si no lo ves. Toca «Añadir».'],
        ['Ábrela desde su icono', 'Ya la tienes como una app más. Entra con tu email.']
      ],
      android: [
        ['Abre el enlace con Chrome', 'Escanea el código con la cámara (o Google Lens) y toca el enlace.'],
        ['Toca el menú ⋮', 'Los tres puntos de arriba a la derecha.'],
        ['«Instalar aplicación»', 'O «Añadir a pantalla de inicio», según el móvil. Confirma con «Instalar».'],
        ['Ábrela desde su icono', 'Ya la tienes como una app más. Entra con tu email.']
      ]
    };
    function pintarPasos() {
      pestanas.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b._v === elegido ? 'true' : 'false'); });
      pasos.innerHTML = '';
      pasos.appendChild(h('ol', {}, PASOS[elegido].map(function (p) { return h('li', {}, [h('strong', { texto: p[0] }), h('span', { texto: p[1] })]); })));
      if (elegido === 'android' && avisoInstalar && !yaInstalada()) {
        pasos.appendChild(h('button', { clase: 'boton', type: 'button', texto: 'Instalar en este móvil', alClick: function () {
          var e = avisoInstalar; avisoInstalar = null; e.prompt(); pintarPasos();
        } }));
      }
    }
    [['ios', 'iPhone'], ['android', 'Android']].forEach(function (x) {
      var b = h('button', { type: 'button', texto: x[1], alClick: function () { elegido = x[0]; pintarPasos(); } });
      b._v = x[0]; pestanas.appendChild(b);
    });
    function cerrar() { document.removeEventListener('keydown', tecla); capa.remove(); document.body.classList.remove('sin-scroll'); if (anterior && anterior.focus) anterior.focus(); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    var compartir = navigator.share ? h('button', { clase: 'boton secundario', type: 'button', texto: 'Enviar el enlace', alClick: function () {
      navigator.share({ title: 'Fitclub Málaga', text: 'Instala la app de Fitclub Málaga:', url: ENLACE }).catch(function () { /* cancelado */ });
    } }) : h('button', { clase: 'boton secundario', type: 'button', texto: 'Copiar el enlace', alClick: function (ev) {
      var b = ev.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(ENLACE) : Promise.reject()).then(function () { b.textContent = 'Enlace copiado ✓'; })
        .catch(function () { b.textContent = ENLACE; });
    } });
    var bCerrar = h('button', { clase: 'cerrar-capa', type: 'button', 'aria-label': 'Cerrar', texto: '✕', alClick: cerrar });
    capa.appendChild(h('div', { clase: 'caja-compartir' }, [
      bCerrar,
      h('h2', { id: 'tituloCompartir', texto: 'Instala la app de Fitclub' }),
      h('p', { clase: 'subtitulo', texto: 'Escanea el código con la cámara del móvil.' }),
      h('img', { clase: 'qr-app', src: 'iconos/qr-app.svg', alt: 'Código QR con el enlace ' + ENLACE, width: '260', height: '260' }),
      h('p', { clase: 'enlace-app', texto: ENLACE.replace('https://', '').replace(/\/$/, '') }),
      compartir,
      h('p', { clase: 'seccion', style: 'margin:18px 0 8px', texto: 'Cómo instalarla' }),
      pestanas, pasos
    ]));
    capa.addEventListener('click', function (e) { if (e.target === capa) cerrar(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(capa);
    document.body.classList.add('sin-scroll');
    pintarPasos();
    bCerrar.focus();
  }

  window.FitclubCompartir = { abrir: abrir, enlace: ENLACE };
})();
