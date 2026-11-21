// Pantallas de la app (hito 1.1): acceso por código, cuenta pendiente, menú por rol y perfil.
// Todo el texto se inserta con textContent (nunca HTML de datos), para evitar inyecciones.
(function () {
  'use strict';
  var $contenido = document.getElementById('contenido');
  var $pestanas = document.getElementById('pestanas');
  var $pestanasInt = document.getElementById('pestanasInterior');
  var estado = { inicio: null, pestana: null };

  // ---------- utilidades de DOM ----------
  function h(etiqueta, atributos, hijos) {
    var el = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (k) {
      var v = atributos[k];
      if (k === 'texto') el.textContent = v;
      else if (k === 'clase') el.className = v;
      else if (k.indexOf('al') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v === true ? '' : v);
    });
    (hijos || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  var ICONOS = {
    cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    grupo: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6"/>',
    casa: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
  };
  function icono(nombre, tam) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', tam || 24); s.setAttribute('height', tam || 24); s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONOS[nombre] || ''; // contenido fijo de este archivo, nunca datos
    return s;
  }
  function pintar(nodos, conPestanas) {
    $contenido.innerHTML = '';
    nodos.forEach(function (n) { if (n) $contenido.appendChild(n); });
    $pestanas.classList.toggle('oculto', !conPestanas);
    window.scrollTo(0, 0);
  }
  function aviso(tipo, texto) { return h('div', { clase: 'aviso ' + tipo, role: tipo === 'error' ? 'alert' : 'status', texto: texto }); }
  function iniciales(u) { return ((u.nombre || '?')[0] + ((u.apellidos || '')[0] || '')).toUpperCase(); }
  var NOMBRES_ROL = { USUARIO: 'Cliente', COACH: 'Coach', BOSS: 'Boss' };

  // ---------- acceso por código ----------
  function pantallaAcceso(emailPrevio, mensaje) {
    var email = h('input', { type: 'email', id: 'email', autocomplete: 'email', inputmode: 'email', placeholder: 'nombre@correo.com', value: emailPrevio || '' });
    var btn = h('button', { clase: 'boton', type: 'submit', texto: 'Enviarme un código' });
    var zonaMsg = h('div', {}, mensaje ? [aviso('info', mensaje)] : []);
    var form = h('form', { clase: 'tarjeta', novalidate: true, alSubmit: function (ev) {
      ev.preventDefault();
      zonaMsg.innerHTML = '';
      btn.disabled = true; btn.textContent = 'Enviando…';
      Api.llamar('acceso.pedirCodigo', { email: email.value }).then(function (d) {
        pantallaCodigo(email.value.trim(), d.mensaje);
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Enviarme un código';
        zonaMsg.appendChild(aviso('error', err.mensaje));
      });
    } }, [h('label', { for: 'email', texto: 'Tu email' }), email, btn, zonaMsg]);
    pintar([
      h('div', { clase: 'marca' }, [h('div', { clase: 'logo', 'aria-hidden': 'true', texto: 'F' }), h('h1', { texto: 'Fitclub Málaga' }), h('p', { texto: 'Entra con tu email. Te enviaremos un código.' })]),
      form
    ], false);
    setTimeout(function () { email.focus(); }, 50);
  }

  function pantallaCodigo(email, mensaje) {
    var codigo = h('input', { type: 'text', id: 'codigo', clase: 'codigo', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: '••••••', 'aria-describedby': 'ayudaCodigo' });
    var btn = h('button', { clase: 'boton', type: 'submit', texto: 'Entrar' });
    var zonaMsg = h('div', {}, [aviso('ok', mensaje)]);
    var form = h('form', { clase: 'tarjeta', novalidate: true, alSubmit: function (ev) {
      ev.preventDefault();
      zonaMsg.innerHTML = '';
      btn.disabled = true; btn.textContent = 'Comprobando…';
      Api.llamar('acceso.verificarCodigo', { email: email, codigo: codigo.value, dispositivo: navigator.userAgent.slice(0, 120) }).then(function (d) {
        Api.guardarSesion(d.token, d.inicio);
        mostrarInicio(d.inicio);
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Entrar';
        zonaMsg.appendChild(aviso('error', err.mensaje));
      });
    } }, [
      h('label', { for: 'codigo', texto: 'Código de 6 cifras' }), codigo,
      h('p', { id: 'ayudaCodigo', clase: 'subtitulo', style: 'margin:8px 0 0', texto: 'Enviado a ' + email + '. Caduca en 10 minutos.' }),
      btn, zonaMsg,
      h('button', { clase: 'boton enlace', type: 'button', texto: 'Cambiar de email o pedir otro código', alClick: function () { pantallaAcceso(email); } })
    ]);
    pintar([
      h('div', { clase: 'marca' }, [h('div', { clase: 'logo', 'aria-hidden': 'true', texto: 'F' }), h('h1', { texto: 'Revisa tu correo' })]),
      form
    ], false);
    setTimeout(function () { codigo.focus(); }, 50);
  }

  // ---------- cuenta pendiente ----------
  function pantallaPendiente(inicio) {
    var u = inicio.usuario;
    var texto = u.estado === 'PENDIENTE'
      ? 'El club tiene que revisar y aprobar tu alta. Cuando esté aprobada, al abrir la app verás las actividades.'
      : 'Tu cuenta está en revisión. Si tienes dudas, habla con el club.';
    pintar([
      h('div', { clase: 'vacio tarjeta', style: 'margin-top:32px' }, [icono('reloj', 40), h('h2', { texto: 'Hola, ' + (u.nombre || '') }), h('p', { texto: texto })]),
      h('button', { clase: 'boton secundario', type: 'button', texto: 'Comprobar de nuevo', alClick: arrancar }),
      botonSalir()
    ], false);
  }

  // ---------- app con pestañas ----------
  var PROXIMAMENTE = {
    agenda: 'Aquí verás las actividades de la semana con su lugar, horario y plazas.',
    reservas: 'Aquí verás tus reservas y podrás cancelarlas.',
    sesiones: 'Aquí verás tus sesiones asignadas.',
    participantes: 'Aquí verás quién viene a tus sesiones y podrás pasar lista.',
    resumen: 'Aquí verás el resumen del club: clientes, sesiones y reservas.',
    usuarios: 'Aquí aprobarás altas, gestionarás roles y bajas.'
  };

  function mostrarInicio(inicio) {
    estado.inicio = inicio;
    if (inicio.usuario.estado !== 'ACTIVO') return pantallaPendiente(inicio);
    var menu = inicio.menu || [];
    if (!estado.pestana || !menu.some(function (m) { return m.id === estado.pestana; })) estado.pestana = menu.length ? menu[0].id : 'perfil';
    $pestanasInt.innerHTML = '';
    menu.forEach(function (m) {
      $pestanasInt.appendChild(h('button', { type: 'button', 'aria-current': m.id === estado.pestana ? 'page' : false, alClick: function () { estado.pestana = m.id; mostrarInicio(estado.inicio); } }, [icono(m.icono), h('span', { texto: m.titulo })]));
    });
    var actual = menu.filter(function (m) { return m.id === estado.pestana; })[0] || { id: 'perfil', titulo: 'Perfil' };
    var u = inicio.usuario;
    var cabecera = h('div', { clase: 'cabecera' }, [h('h1', { texto: actual.titulo }), h('div', { clase: 'avatar', 'aria-hidden': 'true', texto: iniciales(u) })]);
    pintar([cabecera].concat(actual.id === 'perfil' ? vistaPerfil(inicio) : vistaProximamente(actual)), true);
  }

  function vistaPerfil(inicio) {
    var u = inicio.usuario;
    return [
      h('p', { clase: 'seccion', texto: 'Tus datos' }),
      h('div', { clase: 'grupo' }, [
        h('div', { clase: 'fila' }, [h('span', { texto: 'Nombre' }), h('span', { clase: 'valor', texto: ((u.nombre || '') + ' ' + (u.apellidos || '')).trim() })]),
        h('div', { clase: 'fila' }, [h('span', { texto: 'Email' }), h('span', { clase: 'valor', texto: u.email })]),
        h('div', { clase: 'fila' }, [h('span', { texto: 'Rol' }), h('span', { clase: 'etiqueta', texto: NOMBRES_ROL[u.rol] || u.rol })])
      ]),
      botonSalir(),
      h('p', { clase: 'subtitulo', style: 'text-align:center;margin-top:24px', texto: (inicio.club && inicio.club.nombre || 'Fitclub') + ' · versión ' + (inicio.version || '') })
    ];
  }

  function vistaProximamente(m) {
    return [h('div', { clase: 'vacio tarjeta' }, [
      icono(m.icono, 40),
      h('h2', { texto: 'En construcción' }),
      h('p', { texto: (PROXIMAMENTE[m.id] || '') + ' Llegará en el hito ' + m.hito + '.' })
    ])];
  }

  function botonSalir() {
    return h('button', { clase: 'boton secundario', type: 'button', texto: 'Cerrar sesión en este móvil', alClick: function (ev) {
      ev.target.disabled = true;
      var fin = function () { Api.olvidarSesion(); estado.pestana = null; pantallaAcceso(); };
      Api.llamar('acceso.cerrarSesion').then(fin, fin);
    } });
  }

  function pantallaError(mensaje) {
    pintar([h('div', { clase: 'vacio tarjeta', style: 'margin-top:32px' }, [h('h2', { texto: 'No se ha podido cargar' }), h('p', { texto: mensaje })]),
      h('button', { clase: 'boton', type: 'button', texto: 'Reintentar', alClick: arrancar })], false);
  }

  // ---------- arranque ----------
  function arrancar() {
    if (!Api.token()) return pantallaAcceso();
    var guardado = Api.inicioGuardado();
    if (guardado) mostrarInicio(guardado); // pinta al instante con lo último conocido…
    Api.llamar('app.inicio').then(function (inicio) { // …y lo actualiza con el servidor
      Api.guardarInicio(inicio);
      mostrarInicio(inicio);
    }).catch(function (err) {
      if (err.codigo === 'sin_sesion') { Api.olvidarSesion(); return pantallaAcceso('', 'Tu sesión ha caducado. Vuelve a entrar.'); }
      if (!guardado) pantallaError(err.mensaje);
    });
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  arrancar();
})();
