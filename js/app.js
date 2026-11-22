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
    correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>'
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

  // ---------- fotos de las personas (foto o avatar) ----------
  // Todas las personas ven las fotos (decisión de Miguel, 21-11). Cada foto se identifica por una clave opaca k y una versión v.
  // Se piden juntas (una llamada para todas las que falten) y se guardan en este navegador (las últimas 40).
  var CLAVE_FOTOS = 'fitclub_fotos';
  var fotos = (function () { try { return JSON.parse(localStorage.getItem(CLAVE_FOTOS) || '{}') || {}; } catch (e) { return {}; } })();
  function guardarFotos() {
    try {
      var ks = Object.keys(fotos).sort(function (a, b) { return (fotos[b].t || 0) - (fotos[a].t || 0); });
      ks.slice(40).forEach(function (k) { delete fotos[k]; });
      localStorage.setItem(CLAVE_FOTOS, JSON.stringify(fotos));
    } catch (e) { /* sin espacio o sin almacenamiento: se pedirán otra vez */ }
  }
  function fotoDe(f) { var c = f && fotos[f.k]; return c && c.v === f.v ? c.imagen : ''; }
  function ponerFoto(k, v, imagen) {
    if (imagen) fotos[k] = { v: v, imagen: imagen, t: Date.now() }; else delete fotos[k];
    guardarFotos();
    document.querySelectorAll('.avatar[data-k="' + k + '"]').forEach(function (el) { pintarCirculo(el, el._persona, imagen); });
  }
  var pendientes = {}, temporizador = null;
  function pedirFoto(f) {
    if (pendientes[f.k]) return;
    pendientes[f.k] = f.v;
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      var claves = Object.keys(pendientes); pendientes = {};
      Api.llamar('avatares.ver', { claves: claves }).then(function (d) {
        Object.keys(d.fotos || {}).forEach(function (k) { ponerFoto(k, d.fotos[k].v, d.fotos[k].imagen); });
      }).catch(function () { /* se quedan las iniciales */ });
    }, 30);
  }
  function pintarCirculo(el, p, img) {
    el.innerHTML = '';
    if (img) el.appendChild(h('img', { src: img, alt: '' })); else el.textContent = iniciales(p);
    el.classList.toggle('con-foto', !!img);
  }
  /**
   * Círculo con la foto de una persona o sus iniciales. p = {nombre, apellidos, foto: {k, v} | null}.
   * opciones.clase: tamaño (p. ej. 'mini', 'mediano'); opciones.ampliable: al tocarlo se ve en grande.
   */
  function circulo(p, opciones) {
    opciones = opciones || {};
    var f = p.foto;
    var el = h(opciones.ampliable ? 'button' : 'div', { clase: 'avatar' + (opciones.clase ? ' ' + opciones.clase : ''), type: opciones.ampliable ? 'button' : null,
      'aria-hidden': opciones.ampliable ? null : 'true', 'aria-label': opciones.ampliable ? 'Ver la foto de ' + (p.nombre || '') : null, 'data-k': f ? f.k : null });
    el._persona = p;
    var img = f ? fotoDe(f) : '';
    pintarCirculo(el, p, img);
    if (f && !img) pedirFoto(f);
    if (opciones.ampliable) el.addEventListener('click', function (ev) {
      ev.stopPropagation(); ev.preventDefault();
      var actual = f ? fotoDe(f) : '';
      if (actual) ampliar(actual, ((p.nombre || '') + ' ' + (p.apellidos || '')).trim());
    });
    return el;
  }
  /** Vista ampliada: la foto en grande sobre fondo oscuro. Se cierra tocando o con Escape. */
  function ampliar(img, nombre) {
    var capa = h('div', { clase: 'visor', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Foto de ' + nombre, tabindex: '-1' }, [
      h('img', { src: img, alt: 'Foto de ' + nombre }), h('p', { texto: nombre }), h('button', { type: 'button', clase: 'cerrar', 'aria-label': 'Cerrar', texto: '✕' })
    ]);
    var cerrar = function () { capa.remove(); document.removeEventListener('keydown', tecla); };
    var tecla = function (e) { if (e.key === 'Escape') cerrar(); };
    capa.addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla);
    document.body.appendChild(capa);
    capa.focus();
  }

  /** Avatar dibujado: un dibujo o las iniciales sobre un color, pintado en el móvil y enviado como imagen. */
  var AVATARES = ['Aa', '🏃', '🚴', '🏊', '🧘', '🏋️', '🤸', '⚽', '🎾', '🥊', '🧗', '🏄', '💪', '🔥', '⭐', '😎'];
  var COLORES = ['#C2410C', '#0F1E31', '#0E7490', '#15803D', '#7C3AED', '#BE185D', '#CA8A04', '#475569'];
  function dibujarAvatar(simbolo, color, texto, tam) {
    var c = document.createElement('canvas'); c.width = c.height = tam;
    var x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, tam, tam);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (simbolo === 'Aa') { x.fillStyle = '#fff'; x.font = '700 ' + Math.round(tam * 0.42) + 'px -apple-system, system-ui, sans-serif'; x.fillText(texto, tam / 2, tam / 2 + tam * 0.02); }
    else { x.font = Math.round(tam * 0.55) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.fillText(simbolo, tam / 2, tam / 2 + tam * 0.04); }
    return c.toDataURL('image/jpeg', 0.9);
  }

  /** Reduce la foto en el propio móvil: recorte cuadrado centrado de 320 px en JPEG (unos 20-30 KB). */
  function reducirFoto(archivo) {
    return new Promise(function (ok, mal) {
      if (!archivo || !/^image\//.test(archivo.type || 'image/')) return mal(new Error('Elige una imagen.'));
      var url = URL.createObjectURL(archivo);
      var im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var lado = Math.min(im.naturalWidth, im.naturalHeight);
        if (!lado) return mal(new Error('No se ha podido leer la imagen.'));
        var c = document.createElement('canvas');
        var sx = (im.naturalWidth - lado) / 2, sy = (im.naturalHeight - lado) / 2;
        for (var tam = 320, q = 0.85; tam >= 160; tam -= 32, q -= 0.05) {
          c.width = c.height = tam;
          var x = c.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(0, 0, tam, tam);
          x.drawImage(im, sx, sy, lado, lado, 0, 0, tam, tam);
          var d = c.toDataURL('image/jpeg', q);
          if (d.length <= 44000) return ok(d);
        }
        mal(new Error('La foto es demasiado grande. Prueba con otra.'));
      };
      im.onerror = function () { URL.revokeObjectURL(url); mal(new Error('No se ha podido leer la imagen. Prueba con una foto JPEG o PNG.')); };
      im.src = url;
    });
  }
  var NOMBRES_ROL = { USUARIO: 'Cliente', COACH: 'Coach', BOSS: 'Boss' };


  // ---------- bienvenida: dos caminos claros ----------
  function pantallaBienvenida() {
    var opcion = function (titulo, texto, clase, fn) {
      return h('button', { clase: 'opcion ' + clase, type: 'button', alClick: fn }, [h('strong', { texto: titulo }), h('span', { texto: texto })]);
    };
    pintar([
      h('div', { clase: 'marca' }, [h('div', { clase: 'logo', 'aria-hidden': 'true', texto: 'F' }), h('h1', { texto: 'Fitclub Málaga' }), h('p', { texto: 'Entrenamientos al aire libre' })]),
      opcion('Ya soy socio', 'Entra con tu email: te enviaremos un código.', 'principal', function () { pantallaAcceso(); }),
      opcion('Es mi primera vez', 'Date de alta en 3 pasos: tus datos, confirmar tu email y la aprobación del club.', '', function () { pantallaAlta(); })
    ], false);
  }

  function pasos(actual) {
    var nombres = ['Tus datos', 'Confirma tu email', 'Aprobación del club'];
    return h('ol', { clase: 'pasos', 'aria-label': 'Paso ' + actual + ' de 3' }, nombres.map(function (n, i) {
      return h('li', { clase: i + 1 === actual ? 'actual' : (i + 1 < actual ? 'hecho' : ''), 'aria-current': i + 1 === actual ? 'step' : false }, [h('span', { clase: 'num', texto: String(i + 1) }), h('span', { texto: n })]);
    }));
  }

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
      h('button', { clase: 'volver', type: 'button', texto: '‹ Inicio', alClick: pantallaBienvenida }),
      h('div', { clase: 'cabecera' }, [h('h1', { texto: 'Entrar' })]),
      h('p', { clase: 'subtitulo', texto: 'Escribe el email con el que te diste de alta. Te enviaremos un código de 6 cifras.' }),
      form
    ], false);
    setTimeout(function () { email.focus(); }, 50);
  }

  function pantallaCodigo(email, mensaje, desdeAlta) {
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
      desdeAlta ? null : h('button', { clase: 'boton enlace', type: 'button', texto: 'Cambiar de email o pedir otro código', alClick: function () { pantallaAcceso(email); } })
    ]);
    // Quien escribe un email nuevo en "Entrar" no recibe nada (para no revelar quién es socio): se le orienta al alta.
    var ayudaAlta = desdeAlta ? null : h('div', { clase: 'tarjeta', style: 'margin-top:12px' }, [
      h('p', { style: 'margin:0', texto: '¿No te llega el código? Si es tu primera vez en el club, primero tienes que darte de alta.' }),
      h('button', { clase: 'boton secundario', type: 'button', texto: 'Es mi primera vez: darme de alta', alClick: function () { pantallaAlta(email); } })
    ]);
    pintar([
      desdeAlta ? pasos(2) : null,
      h('div', { clase: 'cabecera' }, [h('h1', { texto: desdeAlta ? 'Confirma tu email' : 'Revisa tu correo' })]),
      form, ayudaAlta
    ], false);
    setTimeout(function () { codigo.focus(); }, 50);
  }


  // ---------- alta propia (hito 1.2) ----------
  function campo(etiqueta, input, ayuda) {
    return h('div', { clase: 'campo' }, [h('label', { for: input.id, texto: etiqueta }), input, ayuda ? h('p', { clase: 'subtitulo', style: 'margin:6px 0 0', texto: ayuda }) : null]);
  }
  function pantallaAlta(emailPrevio) {
    var nombre = h('input', { type: 'text', id: 'nombre', autocomplete: 'given-name', maxlength: '60' });
    var apellidos = h('input', { type: 'text', id: 'apellidos', autocomplete: 'family-name', maxlength: '60' });
    var email = h('input', { type: 'email', id: 'emailAlta', autocomplete: 'email', inputmode: 'email', value: emailPrevio || '' });
    var tel = h('input', { type: 'tel', id: 'telefono', autocomplete: 'tel', inputmode: 'tel', placeholder: '600 00 00 00' });
    var nac = h('input', { type: 'date', id: 'nacimiento', autocomplete: 'bday', max: new Date().toISOString().slice(0, 10) });
    var acepto = h('input', { type: 'checkbox', id: 'privacidad' });
    var textoPriv = h('span', { texto: 'Acepto que el club trate mis datos para gestionar mi alta y mis actividades.' });
    var btn = h('button', { clase: 'boton', type: 'submit', texto: 'Continuar' });
    var zonaMsg = h('div', {});
    Api.llamar('alta.textoPrivacidad').then(function (d) { if (d && d.texto) textoPriv.textContent = d.texto; }).catch(function () {});
    var form = h('form', { clase: 'tarjeta', novalidate: true, alSubmit: function (ev) {
      ev.preventDefault();
      zonaMsg.innerHTML = '';
      btn.disabled = true; btn.textContent = 'Enviando…';
      Api.llamar('alta.registrar', { nombre: nombre.value, apellidos: apellidos.value, email: email.value, telefono: tel.value, fecha_nacimiento: nac.value, acepta_privacidad: acepto.checked })
        .then(function (d) { pantallaCodigo(email.value.trim(), d.mensaje, true); })
        .catch(function (err) { btn.disabled = false; btn.textContent = 'Continuar'; zonaMsg.appendChild(aviso('error', err.mensaje)); });
    } }, [
      campo('Nombre', nombre), campo('Apellidos', apellidos), campo('Email', email, 'Te enviaremos un código para confirmarlo.'),
      campo('Teléfono', tel), campo('Fecha de nacimiento', nac),
      h('label', { clase: 'casilla', for: 'privacidad' }, [acepto, textoPriv]),
      btn, zonaMsg
    ]);
    pintar([
      h('button', { clase: 'volver', type: 'button', texto: '‹ Inicio', alClick: pantallaBienvenida }),
      pasos(1),
      h('div', { clase: 'cabecera' }, [h('h1', { texto: 'Tus datos' })]),
      h('p', { clase: 'subtitulo', texto: 'Después te enviaremos un código para confirmar tu email, y el club revisará tu alta.' }),
      form
    ], false);
    setTimeout(function () { nombre.focus(); }, 50);
  }

  // ---------- gestión de usuarios del Boss (hito 1.2) ----------
  var ESTADOS = { PENDIENTE: 'Pendiente', ACTIVO: 'Activo', RECHAZADO: 'Rechazado', BAJA_SOLICITADA: 'Baja pedida', BAJA: 'Baja' };
  var gestion = { datos: null, filtro: 'PENDIENTE', detalle: null };

  function vistaUsuarios() {
    var caja = h('div', {}, [h('div', { clase: 'cargando', style: 'min-height:30vh', texto: 'Cargando personas…' })]);
    var pintarCaja = function () { caja.innerHTML = ''; (gestion.detalle ? vistaDetalleUsuario() : vistaListaUsuarios()).forEach(function (n) { if (n) caja.appendChild(n); }); };
    gestion.repintar = pintarCaja;
    if (gestion.datos) pintarCaja();
    Api.llamar('usuarios.listar').then(function (d) { actualizarGestion(d); }).catch(function (err) { caja.innerHTML = ''; caja.appendChild(aviso('error', err.mensaje)); });
    return [caja];
  }

  function actualizarGestion(d) {
    gestion.datos = d;
    if (gestion.detalle) gestion.detalle = d.usuarios.filter(function (u) { return u.id === gestion.detalle.id; })[0] || null;
    var pendientes = (d.cuenta.PENDIENTE || 0) + d.bajasSolicitadas.length;
    if (estado.inicio) { estado.inicio.avisos = estado.inicio.avisos || {}; estado.inicio.avisos.usuarios = pendientes; Api.guardarInicio(estado.inicio); pintarPestanas(); }
    if (gestion.repintar && estado.pestana === 'usuarios') gestion.repintar();
  }

  function vistaListaUsuarios() {
    var d = gestion.datos;
    var grupos = { PENDIENTE: ['PENDIENTE'], ACTIVO: ['ACTIVO'], BAJA: ['BAJA', 'BAJA_SOLICITADA', 'RECHAZADO'] };
    var etiquetas = [['PENDIENTE', 'Pendientes'], ['ACTIVO', 'Activos'], ['BAJA', 'Bajas']];
    var seg = h('div', { clase: 'segmento', role: 'group', 'aria-label': 'Filtrar' }, etiquetas.map(function (e) {
      var n = d.usuarios.filter(function (u) { return grupos[e[0]].indexOf(u.estado) >= 0; }).length;
      return h('button', { type: 'button', 'aria-pressed': gestion.filtro === e[0] ? 'true' : 'false', texto: e[1] + ' · ' + n, alClick: function () { gestion.filtro = e[0]; gestion.repintar(); } });
    }));
    var lista = d.usuarios.filter(function (u) { return grupos[gestion.filtro].indexOf(u.estado) >= 0; });
    var nodos = [seg];
    if (d.bajasSolicitadas.length) {
      nodos.push(h('p', { clase: 'seccion', texto: 'Bajas pedidas por coaches' }));
      nodos.push(h('div', { clase: 'grupo' }, d.bajasSolicitadas.map(function (b) {
        return h('div', { clase: 'fila', style: 'flex-wrap:wrap' }, [
          h('div', { clase: 'principal' }, [h('span', { texto: b.usuario }), h('small', { texto: 'Pedida por ' + b.solicitada_por + (b.motivo ? ' · ' + b.motivo : '') })]),
          h('div', { clase: 'acciones', style: 'width:100%' }, [
            botonAccion('Confirmar baja', 'peligro', function () { return Api.llamar('usuarios.resolverBaja', { bajaId: b.id, aprobar: true }); }),
            botonAccion('Denegar', 'secundario', function () { return Api.llamar('usuarios.resolverBaja', { bajaId: b.id, aprobar: false }); })
          ])
        ]);
      })));
    }
    if (!lista.length) {
      nodos.push(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: gestion.filtro === 'PENDIENTE' ? 'No hay altas pendientes.' : 'No hay nadie en esta lista.' })]));
      return nodos;
    }
    nodos.push(h('div', { clase: 'grupo' }, lista.map(function (u) {
      return h('button', { clase: 'fila', type: 'button', alClick: function () { gestion.detalle = u; gestion.repintar(); } }, [
        circulo(u, { clase: 'mini' }),
        h('div', { clase: 'principal', style: 'flex:1' }, [h('span', { texto: (u.nombre + ' ' + u.apellidos).trim() }), h('small', { texto: u.email })]),
        h('span', { clase: 'etiqueta', texto: u.estado === 'ACTIVO' ? (NOMBRES_ROL[u.rol] || u.rol) : ESTADOS[u.estado] })
      ]);
    })));
    return nodos;
  }

  function fechaLegible(iso) {
    if (!iso) return '—';
    var p = iso.slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }

  function vistaDetalleUsuario() {
    var u = gestion.detalle;
    var filaDato = function (k, v, enlace) { return h('div', { clase: 'fila' }, [h('span', { texto: k }), enlace ? h('a', { href: enlace, clase: 'valor', texto: v }) : h('span', { clase: 'valor', texto: v })]); };
    var nodos = [
      h('button', { clase: 'volver', type: 'button', texto: '‹ Personas', alClick: function () { gestion.detalle = null; gestion.repintar(); } }),
      h('div', { clase: 'perfil-foto' }, [circulo(u, { clase: 'mediano', ampliable: true })]),
      h('p', { clase: 'seccion', texto: ESTADOS[u.estado] || u.estado }),
      h('div', { clase: 'grupo' }, [
        filaDato('Nombre', (u.nombre + ' ' + u.apellidos).trim()),
        filaDato('Email', u.email, 'mailto:' + u.email),
        filaDato('Teléfono', u.telefono || '—', u.telefono ? 'tel:' + u.telefono : null),
        filaDato('Nacimiento', fechaLegible(u.fecha_nacimiento)),
        filaDato('Alta', fechaLegible(u.creado)),
        filaDato('Rol', NOMBRES_ROL[u.rol] || u.rol)
      ])
    ];
    var selectorRol = h('select', { id: 'rol', 'aria-label': 'Rol' }, ['USUARIO', 'COACH', 'BOSS'].map(function (r) { return h('option', { value: r, selected: r === u.rol, texto: NOMBRES_ROL[r] }); }));
    if (u.estado === 'PENDIENTE') {
      nodos.push(h('p', { clase: 'seccion', texto: 'Aprobar como' }), selectorRol);
      nodos.push(h('div', { clase: 'acciones' }, [
        botonAccion('Aprobar', '', function () { return Api.llamar('usuarios.aprobar', { id: u.id, rol: selectorRol.value }); }),
        botonAccion('Rechazar', 'peligro', function () { return confirm('¿Rechazar el alta de ' + u.nombre + '?') && Api.llamar('usuarios.rechazar', { id: u.id }); })
      ]));
    } else if (u.estado === 'ACTIVO') {
      nodos.push(h('p', { clase: 'seccion', texto: 'Rol' }), selectorRol);
      nodos.push(botonAccion('Guardar rol', 'secundario', function () { return Api.llamar('usuarios.cambiarRol', { id: u.id, rol: selectorRol.value }); }));
      nodos.push(botonAccion('Dar de baja del club', 'peligro', function () {
        var motivo = prompt('Motivo de la baja (opcional):', '');
        return motivo !== null && Api.llamar('usuarios.bajaClub', { id: u.id, motivo: motivo });
      }));
    } else {
      nodos.push(botonAccion('Reactivar', '', function () { return Api.llamar('usuarios.reactivar', { id: u.id }); }));
    }
    return nodos;
  }

  /** Botón que llama al servidor, muestra "Guardando…" y actualiza la lista con la respuesta. */
  function botonAccion(texto, clase, accion) {
    var zona = h('div', {});
    var b = h('button', { clase: 'boton ' + (clase || ''), type: 'button', texto: texto, alClick: function () {
      var promesa = accion();
      if (!promesa) return; // cancelado
      b.disabled = true; b.textContent = 'Guardando…'; zona.innerHTML = '';
      promesa.then(function (d) { actualizarGestion(d); })
        .catch(function (err) { b.disabled = false; b.textContent = texto; zona.appendChild(aviso('error', err.mensaje)); });
    } });
    return h('div', { style: 'flex:1' }, [b, zona]);
  }

  // ---------- cuenta pendiente ----------
  function pantallaPendiente(inicio) {
    var u = inicio.usuario;
    var texto = u.estado === 'PENDIENTE'
      ? 'Tu email está confirmado. Ahora el club revisará tu alta; te avisaremos por correo cuando esté aprobada y podrás apuntarte a las actividades.'
      : 'Tu cuenta está en revisión. Si tienes dudas, habla con el club.';
    pintar([
      u.estado === 'PENDIENTE' ? pasos(3) : null,
      h('div', { clase: 'vacio tarjeta', style: 'margin-top:16px' }, [icono('reloj', 40), h('h2', { texto: 'Hola, ' + (u.nombre || '') }), h('p', { texto: texto })]),
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
    pintarPestanas();
    var actual = menu.filter(function (m) { return m.id === estado.pestana; })[0] || { id: 'perfil', titulo: 'Perfil' };
    var u = inicio.usuario;
    var cabecera = h('div', { clase: 'cabecera' }, [h('h1', { texto: actual.titulo }), circulo(u)]);
    var vista = actual.id === 'perfil' ? vistaPerfil(inicio) : actual.id === 'usuarios' ? vistaUsuarios()
      : (actual.id === 'agenda' || (actual.id === 'sesiones' && u.rol === 'COACH')) && window.VistaAgenda ? window.VistaAgenda(UI, u)
      : actual.id === 'reservas' && u.rol === 'USUARIO' && window.VistaReservas ? window.VistaReservas(UI, u) : vistaProximamente(actual);
    pintar([cabecera].concat(vista), true);
  }

  function pintarPestanas() {
    var menu = (estado.inicio && estado.inicio.menu) || [];
    var avisos = (estado.inicio && estado.inicio.avisos) || {};
    $pestanasInt.innerHTML = '';
    menu.forEach(function (m) {
      var n = avisos[m.id] || 0;
      $pestanasInt.appendChild(h('button', { type: 'button', 'aria-current': m.id === estado.pestana ? 'page' : false,
        'aria-label': m.titulo + (n ? ', ' + n + ' pendientes' : ''),
        alClick: function () { if (m.id !== 'usuarios') gestion.detalle = null; estado.pestana = m.id; mostrarInicio(estado.inicio); } },
        [icono(m.icono), h('span', { texto: m.titulo }), n ? h('span', { clase: 'insignia', 'aria-hidden': 'true', texto: String(n) }) : null]));
    });
  }

  function vistaPerfil(inicio) {
    var u = inicio.usuario;
    var zona = h('div', {});
    var panel = h('div', {});
    var archivo = h('input', { type: 'file', id: 'fotoArchivo', accept: 'image/*', clase: 'oculto' });
    var tiene = !!u.foto;
    var bFoto = h('button', { clase: 'boton secundario', type: 'button', id: 'fotoCambiar', texto: tiene ? 'Cambiar foto' : 'Poner foto', alClick: function () { archivo.click(); } });
    var bAvatar = h('button', { clase: 'boton secundario', type: 'button', id: 'avatarElegir', texto: 'Elegir un avatar', alClick: function () { panel.innerHTML = ''; panel.appendChild(selectorAvatar()); } });
    var bQuitar = tiene ? h('button', { clase: 'boton enlace', type: 'button', id: 'fotoQuitar', texto: 'Quitar', alClick: function () {
      if (confirm('¿Quitar tu foto?')) enviar('');
    } }) : null;
    function enviar(imagen) {
      zona.innerHTML = ''; [bFoto, bAvatar].forEach(function (b) { b.disabled = true; }); bFoto.textContent = 'Guardando…';
      Api.llamar('perfil.guardarAvatar', { imagen: imagen }).then(function (d) {
        u.avatar_v = d.v; u.foto = d.v ? { k: d.k, v: d.v } : null;
        ponerFoto(d.k, d.v, d.imagen);
        mostrarInicio(estado.inicio);
      }).catch(function (e) { [bFoto, bAvatar].forEach(function (b) { b.disabled = false; }); bFoto.textContent = tiene ? 'Cambiar foto' : 'Poner foto'; zona.appendChild(aviso('error', e.mensaje)); });
    }
    archivo.addEventListener('change', function () {
      var f = archivo.files && archivo.files[0];
      archivo.value = '';
      if (!f) return;
      zona.innerHTML = '';
      reducirFoto(f).then(enviar).catch(function (e) { zona.appendChild(aviso('error', e.message)); });
    });
    function selectorAvatar() {
      var elegido = { simbolo: AVATARES[1], color: COLORES[0] };
      var vista = h('div', { clase: 'avatar mediano con-foto' });
      var ini = iniciales(u);
      function pintar() { vista.innerHTML = ''; vista.appendChild(h('img', { src: dibujarAvatar(elegido.simbolo, elegido.color, ini, 160), alt: '' })); }
      var rejilla = h('div', { clase: 'rejilla-avatares', role: 'group', 'aria-label': 'Dibujo' }, AVATARES.map(function (a) {
        return h('button', { type: 'button', 'aria-pressed': a === elegido.simbolo ? 'true' : 'false', 'aria-label': a === 'Aa' ? 'Tus iniciales' : 'Dibujo ' + a, texto: a === 'Aa' ? ini : a, alClick: function (ev) {
          elegido.simbolo = a; rejilla.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); ev.currentTarget.setAttribute('aria-pressed', 'true'); pintar();
        } });
      }));
      var colores = h('div', { clase: 'rejilla-colores', role: 'group', 'aria-label': 'Color' }, COLORES.map(function (c) {
        return h('button', { type: 'button', style: 'background:' + c, 'aria-label': 'Color ' + c, 'aria-pressed': c === elegido.color ? 'true' : 'false', alClick: function (ev) {
          elegido.color = c; colores.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); ev.currentTarget.setAttribute('aria-pressed', 'true'); pintar();
        } });
      }));
      pintar();
      return h('div', { clase: 'tarjeta selector-avatar' }, [vista, rejilla, colores,
        h('button', { clase: 'boton', type: 'button', id: 'avatarUsar', texto: 'Usar este avatar', alClick: function () { enviar(dibujarAvatar(elegido.simbolo, elegido.color, ini, 320)); } }),
        h('button', { clase: 'boton enlace', type: 'button', texto: 'Cancelar', alClick: function () { panel.innerHTML = ''; } })]);
    }
    return [
      h('div', { clase: 'perfil-foto' }, [circulo(u, { clase: 'mediano', ampliable: true }),
        h('div', { clase: 'dos botones-foto' }, [bFoto, bAvatar]), bQuitar, archivo, zona,
        h('p', { clase: 'subtitulo', texto: 'Una foto o un avatar, como prefieras. La verán las personas del club. Toca el círculo para verla en grande.' })]),
      panel,
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
      var fin = function () { Api.olvidarSesion(); estado.pestana = null; if (window.VistaAgenda) window.VistaAgenda.reiniciar(); if (window.VistaReservas) window.VistaReservas.reiniciar(); pantallaBienvenida(); };
      Api.llamar('acceso.cerrarSesion').then(fin, fin);
    } });
  }

  function pantallaError(mensaje) {
    pintar([h('div', { clase: 'vacio tarjeta', style: 'margin-top:32px' }, [h('h2', { texto: 'No se ha podido cargar' }), h('p', { texto: mensaje })]),
      h('button', { clase: 'boton', type: 'button', texto: 'Reintentar', alClick: arrancar })], false);
  }

  // ---------- arranque ----------
  function arrancar() {
    if (!Api.token()) return pantallaBienvenida();
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

  // Utilidades compartidas con las vistas de otros archivos (js/agenda.js…).
  var UI = { h: h, icono: icono, aviso: aviso, campo: campo, Api: Api, circulo: circulo };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  arrancar();
})();
