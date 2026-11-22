// Pantalla de Inicio por rol (diseño aprobado por Miguel el 22-11-2026 a partir del prototipo del lienzo de diseño).
// Tarjeta oscura con el saludo, una cifra grande con su barra y tres datos; «Hoy»; «Próximos 7 días»; lo pendiente.
// También: la miniatura (color + icono) de cada actividad, que usa la Agenda.
(function () {
  'use strict';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function diaMes(iso) { var p = iso.split('-'); return +p[2] + ' ' + MESES[+p[1] - 1]; }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  var NS = 'http://www.w3.org/2000/svg';

  // Iconos (contenido fijo de este archivo, nunca datos).
  var ICONOS = {
    fuerza: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
    run: '<circle cx="15" cy="4" r="2"/><path d="M7 21l3-6 3 2v4M10 15l1-6 4 3 3-1M6 11l3-3h3"/>',
    yoga: '<circle cx="12" cy="5" r="2"/><path d="M4 21l4-6 4 2 4-2 4 6M12 7v10M7 11h10"/>',
    bici: '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8M10 9l2 8h-3M14 5h3"/>',
    agua: '<path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><circle cx="15" cy="6" r="2"/><path d="M5 14l5-5 3 2 4-2"/>',
    cardio: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/><path d="M3 12h4l2-3 3 6 2-3h7"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    alta: '<circle cx="10" cy="8" r="4"/><path d="M3 21c0-4 3-6 7-6s7 2 7 6M19 8v6M16 11h6"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grupo: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6"/>',
    pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    campana: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    aviso: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    lista: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'
  };
  function svg(nombre, tam, color, grosor) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', color || 'currentColor'); s.setAttribute('stroke-width', grosor || 2);
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONOS[nombre] || ICONOS.fuerza;
    return s;
  }
  /** Cuadrado de color con el icono de la actividad (también para la Agenda). */
  function miniatura(h, s, tam) {
    var t = tam || 46;
    var el = h('span', { clase: 'mini-act', 'aria-hidden': 'true', style: 'width:' + t + 'px;height:' + t + 'px;background:' + (/^#[0-9A-Fa-f]{6}$/.test(s.color || '') ? s.color : '#475569') });
    el.appendChild(svg(s.icono, Math.round(t * 0.48), '#FFFFFF'));
    return el;
  }
  window.FitclubActividad = { miniatura: miniatura, svg: svg, iconos: ['fuerza', 'run', 'yoga', 'bici', 'agua', 'cardio'],
    colores: ['#C2410C', '#15803D', '#0E7490', '#7C3AED', '#BE185D', '#1D4ED8', '#B45309', '#475569'] };

  function saludo() { var hr = new Date().getHours(); return hr >= 6 && hr < 14 ? 'Buenos días' : hr >= 14 && hr < 21 ? 'Buenas tardes' : 'Buenas noches'; }
  function cuentaAtras(min) {
    if (min < 60) return 'en ' + min + ' min';
    if (min < 24 * 60) { var hh = Math.floor(min / 60), mm = min % 60; return 'en ' + hh + ' h' + (mm ? ' ' + mm + ' min' : ''); }
    var d = Math.round(min / 1440); return d === 1 ? 'mañana' : 'en ' + d + ' días';
  }
  function diaRelativo(fecha, hoy, dia) {
    if (fecha === hoy) return 'hoy';
    var p = hoy.split('-'), m = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 1)).toISOString().slice(0, 10);
    return fecha === m ? 'mañana' : dia.toLowerCase() + ' ' + diaMes(fecha);
  }

  var estado = { datos: null, abierta: null, dia: 0, mensaje: null, error: null, lista: null, claves: {} };

  window.VistaInicio = function (U, usuario) {
    var h = U.h, aviso = U.aviso;
    var caja = h('div', { clase: 'inicio' });

    function cargar() {
      U.Api.llamar('inicio.datos').then(function (d) { estado.datos = d; if (!estado.lista) pintar(); })
        .catch(function (e) { if (!estado.datos) caja.innerHTML = ''; caja.appendChild(aviso('error', e.mensaje)); });
    }

    // ---------------------------------------------------------------- piezas
    function heroe(hijos) { return h('section', { clase: 'heroe', 'aria-label': 'Resumen' }, hijos); }
    function cabeceraHeroe(botonDerecha) {
      var c = U.circulo(usuario, { clase: 'heroe-avatar' });
      return h('div', { clase: 'heroe-arriba' }, [c, botonDerecha || null]);
    }
    function campana(n, alPulsar) {
      var b = h('button', { type: 'button', clase: 'heroe-boton', 'aria-label': n ? 'Avisos: ' + n + ' pendientes' : 'Sin avisos', alClick: alPulsar });
      b.appendChild(svg('campana', 18));
      if (n) b.appendChild(h('span', { clase: 'heroe-insignia', 'aria-hidden': 'true', texto: String(n) }));
      return b;
    }
    function cifra(etiqueta, pildora, grande, resto, porcentaje) {
      return h('div', { clase: 'heroe-cifra' }, [
        h('div', { clase: 'heroe-fila' }, [h('span', { clase: 'heroe-etiqueta', texto: etiqueta }), pildora ? h('span', { clase: 'heroe-pildora', texto: pildora }) : null]),
        h('div', { clase: 'heroe-grande' }, [grande === null ? null : h('span', { clase: 'numero', texto: grande }), resto ? h('span', { clase: 'resto', texto: resto }) : null]),
        porcentaje === null || porcentaje === undefined ? null : h('div', { clase: 'heroe-barra', 'aria-hidden': 'true' }, [h('div', { style: 'width:' + Math.max(0, Math.min(100, porcentaje)) + '%' })])
      ]);
    }
    function dato(icono, color, valor, texto, enlace) {
      var hijos = [svg(icono, 18, color), h('strong', { texto: valor }), h('span', { texto: texto })];
      return enlace ? h('a', { clase: 'heroe-dato', href: enlace, target: '_blank', rel: 'noopener noreferrer' }, hijos) : h('div', { clase: 'heroe-dato' }, hijos);
    }
    function titulo(texto, sub, enlace) {
      return h('div', { clase: 'inicio-titulo' }, [h('h2', {}, [texto, sub ? h('span', { texto: ' · ' + sub }) : null]), enlace || null]);
    }
    function circuloEstado(est) {
      var el = h('span', { clase: 'estado-circulo ' + est, 'aria-hidden': 'true' });
      if (est === 'hecha' || est === 'mia') el.appendChild(svg('check', 14, '#FFFFFF', 3));
      return el;
    }
    function textoPlazas(s) { return s.cupo !== '' && s.cupo !== null ? s.apuntados + '/' + s.cupo : plural(s.apuntados, 'apuntado', 'apuntados'); }
    function irSemana() { var el = caja.querySelector('#inicioSemana'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    function enlaceSemana() { return h('button', { type: 'button', clase: 'enlace-texto', texto: 'Ver semana', alClick: irSemana }); }

    // Tira de 7 días y lista del día elegido.
    function semana(dias, tituloTxt, sub, filaDia, marcarDia) {
      if (estado.dia >= dias.length) estado.dia = 0;
      var lista = h('div', { clase: 'tarjeta lista-dia' });
      var tira = h('div', { clase: 'tira-dias', role: 'group', 'aria-label': 'Elegir día' });
      function pintarDia() {
        tira.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', i === estado.dia ? 'true' : 'false'); });
        lista.innerHTML = '';
        var d = dias[estado.dia];
        if (!d.sesiones.length) { lista.appendChild(h('p', { clase: 'vacio-dia', texto: 'Ese día no hay sesiones.' })); return; }
        d.sesiones.forEach(function (s) { lista.appendChild(filaDia(s, d)); });
      }
      dias.forEach(function (d, i) {
        var marca = marcarDia ? marcarDia(d) : null;
        tira.appendChild(h('button', { type: 'button', 'aria-pressed': i === estado.dia ? 'true' : 'false',
          'aria-label': (i === 0 ? 'Hoy, ' : '') + 'día ' + d.num + ': ' + plural(d.sesiones.length, 'sesión', 'sesiones') + (marca ? ', con reserva' : ''),
          alClick: function () { estado.dia = i; pintarDia(); } }, [
          h('span', { clase: 'letra', texto: d.letra }), h('span', { clase: 'num', texto: String(d.num) }),
          marcarDia ? h('span', { clase: 'punto' + (marca ? ' si' : '') }) : h('span', { clase: 'cuenta', texto: d.sesiones.length ? d.sesiones.length + ' ses.' : '—' })
        ]));
      });
      pintarDia();
      return h('section', { id: 'inicioSemana', clase: 'inicio-seccion', 'aria-label': tituloTxt }, [titulo(tituloTxt, null, sub ? h('span', { clase: 'inicio-sub', texto: sub }) : null), tira, lista]);
    }
    function filaDiaSimple(s) {
      return h('div', { clase: 'fila-dia' }, [
        h('span', { clase: 'hora', texto: s.hora_inicio }),
        miniatura(h, s, 32),
        h('span', { clase: 'que' }, [h('span', { texto: s.actividad }), h('small', { texto: s.lugar + (s.coach ? ' · ' + s.coach : '') })]),
        h('span', { clase: 'cuanto', texto: textoPlazas(s) })
      ]);
    }

    // ---------------------------------------------------------------- Boss
    function pintarBoss(d) {
      var n = d.pendiente.altas_total + d.pendiente.listas_sin_pasar.length + d.pendiente.bajas_por_revisar;
      var hh = d.hero;
      caja.appendChild(heroe([
        cabeceraHeroe(campana(n, function () { var el = caja.querySelector('#inicioPendiente'); if (el) el.scrollIntoView({ behavior: 'smooth' }); })),
        h('h1', { clase: 'heroe-saludo', texto: saludo() + ', ' + usuario.nombre }),
        cifra('Reservas de hoy', hh.ocupacion !== null ? hh.ocupacion + ' % de ocupación' : null, String(hh.reservas_hoy), hh.plazas_hoy ? '/ ' + hh.plazas_hoy + ' plazas' : plural(hh.sesiones_hoy, 'sesión', 'sesiones'), hh.ocupacion),
        h('div', { clase: 'heroe-datos' }, [
          dato('cal', '#C2410C', String(hh.sesiones_hoy), hh.sesiones_hoy === 1 ? 'sesión hoy' : 'sesiones hoy'),
          dato('check', '#15803D', hh.asistencia_7 === null ? '—' : hh.asistencia_7 + ' %', 'asistencia 7 días'),
          dato('alta', '#1D4ED8', String(hh.altas_pendientes), hh.altas_pendientes === 1 ? 'alta pendiente' : 'altas pendientes')
        ])
      ]));
      caja.appendChild(seccionHoy(d, true));
      caja.appendChild(semana(d.semana, 'Próximos 7 días', plural(d.semana.reduce(function (t, x) { return t + x.sesiones.length; }, 0), 'sesión', 'sesiones'), filaDiaSimple));
      var pend = [];
      d.pendiente.altas.forEach(function (a) {
        pend.push(h('div', { clase: 'tarjeta pendiente' }, [
          U.circulo({ nombre: a.nombre, apellidos: a.apellidos, foto: null }, { clase: 'mini' }),
          h('span', { clase: 'que' }, [h('strong', { texto: (a.nombre + ' ' + a.apellidos).trim() + ' quiere darse de alta' }), h('small', { texto: a.creado ? 'Desde el ' + diaMes(a.creado.slice(0, 10)) : '' })]),
          h('button', { type: 'button', clase: 'boton-mini', texto: 'Revisar', alClick: function () { U.irA('usuarios'); } })
        ]));
      });
      if (d.pendiente.altas_total > d.pendiente.altas.length) pend.push(h('button', { type: 'button', clase: 'enlace-texto', texto: 'Ver las ' + d.pendiente.altas_total + ' altas pendientes', alClick: function () { U.irA('usuarios'); } }));
      d.pendiente.listas_sin_pasar.forEach(function (l) { pend.push(filaListaSinPasar(l, true)); });
      if (d.pendiente.bajas_por_revisar) pend.push(h('div', { clase: 'tarjeta pendiente' }, [icono('aviso', '#B45309', '#FEF3C7'),
        h('span', { clase: 'que' }, [h('strong', { texto: plural(d.pendiente.bajas_por_revisar, 'baja pedida por un coach', 'bajas pedidas por coaches') }), h('small', { texto: 'Revísalas en Usuarios' })]),
        h('button', { type: 'button', clase: 'boton-mini secundario', texto: 'Ver', alClick: function () { U.irA('usuarios'); } })]));
      if (pend.length) caja.appendChild(h('section', { id: 'inicioPendiente', clase: 'inicio-seccion', 'aria-label': 'Pendiente de ti' }, [titulo('Pendiente de ti')].concat(pend)));
    }
    function icono(nombre, color, fondo) {
      var el = h('span', { clase: 'icono-caja', 'aria-hidden': 'true', style: 'background:' + fondo + ';color:' + color });
      el.appendChild(svg(nombre, 20));
      return el;
    }
    function filaListaSinPasar(l, conCoach) {
      return h('div', { clase: 'tarjeta pendiente' }, [icono('lista', '#B45309', '#FEF3C7'),
        h('span', { clase: 'que' }, [h('strong', { texto: 'Lista sin pasar: ' + l.actividad }),
          h('small', { texto: l.dia + ' ' + diaMes(l.fecha) + ' ' + l.hora_inicio + (conCoach && l.coach ? ' · ' + l.coach : '') + ' · ' + (l.dias_para_cerrar <= 0 ? 'último día' : 'quedan ' + plural(l.dias_para_cerrar, 'día', 'días')) })]),
        h('button', { type: 'button', clase: 'boton-mini secundario', texto: 'Pasar', alClick: function () { abrirLista(l.sesion_id); } })]);
    }
    function abrirLista(id) {
      estado.lista = id;
      caja.innerHTML = '';
      window.FitclubEquipo.pintarLista(U, caja, id, function () { estado.lista = null; pintar(); cargar(); });
    }

    // «Hoy» del Boss y del coach: cada sesión con su estado; al tocarla, quién va (Boss) o la lista (coach, en la de ahora).
    function seccionHoy(d, esBoss) {
      var nodos = [titulo('Hoy', d.dia.toLowerCase() + ' ' + diaMes(d.hoy), enlaceSemana())];
      if (!d.sesiones_hoy.length) nodos.push(h('div', { clase: 'tarjeta vacio-dia', texto: esBoss ? 'Hoy no hay sesiones.' : 'Hoy no tienes sesiones.' }));
      d.sesiones_hoy.forEach(function (s) {
        var abierta = estado.abierta === s.id;
        var pild = s.estado === 'ahora' ? h('span', { clase: 'pildora ahora', texto: 'Ahora · ' + textoPlazas(s) })
          : s.estado === 'pendiente' ? h('span', { clase: 'pildora pendiente', texto: 'Lista pendiente' })
          : s.estado === 'hecha' && s.lista_marcadas ? h('span', { clase: 'pildora hecha', texto: 'Lista ✓ ' + s.lista_vinieron + '/' + s.apuntados })
          : h('span', { clase: 'pildora', texto: textoPlazas(s) });
        var tarjeta = h('div', { clase: 'tarjeta sesion-hoy' + (s.estado === 'ahora' ? ' destacada' : '') });
        var cuerpo = h('div', { clase: 'sesion-hoy-detalle' });
        var conLista = !esBoss && (s.estado === 'ahora' || s.estado === 'pendiente');
        var fila = h(conLista ? 'div' : 'button', { clase: 'sesion-hoy-fila', type: conLista ? null : 'button', 'aria-expanded': conLista ? null : (abierta ? 'true' : 'false'),
          'aria-label': conLista ? null : s.actividad + ' a las ' + s.hora_inicio + ', ' + textoPlazas(s) + '. Ver quién va',
          alClick: conLista ? null : function () { estado.abierta = abierta ? null : s.id; pintar(); } }, [
          circuloEstado(s.estado), miniatura(h, s),
          h('span', { clase: 'que' }, [h('span', { clase: 'nombre', texto: s.actividad }), h('small', { texto: s.hora_inicio + '–' + s.hora_fin + ' · ' + s.lugar + (conLista ? ' · ' + textoPlazas(s) : '') })]),
          conLista ? h('button', { type: 'button', clase: 'boton-mini', 'aria-expanded': abierta ? 'true' : 'false', texto: abierta ? 'Cerrar' : 'Pasar lista', alClick: function () { estado.abierta = abierta ? null : s.id; pintar(); } }) : pild
        ]);
        tarjeta.appendChild(fila);
        if (abierta) {
          tarjeta.appendChild(cuerpo);
          if (conLista) {
            window.FitclubEquipo.pintarLista(U, cuerpo, s.id, null, { compacta: true, alGuardar: function () { U.Api.llamar('inicio.datos').then(function (n) { estado.datos = n; }); } });
          } else {
            cuerpo.appendChild(h('div', { clase: 'detalle-fila' }, [h('span', {}, ['Coach: ', h('strong', { texto: s.coach || '—' })]),
              h('span', { texto: s.lista_marcadas ? 'Lista ✓ · ' + plural(s.lista_vinieron, 'vino', 'vinieron') : s.estado === 'pendiente' ? 'Lista sin pasar' : s.estado === 'ahora' ? 'Ahora' : 'Más tarde' })]));
            var caras = h('div', { clase: 'caras' });
            s.caras.forEach(function (c) { caras.appendChild(U.circulo(c, { clase: 'cara' })); });
            caras.appendChild(h('span', { clase: 'caras-texto', texto: s.apuntados > s.caras.length ? '+' + (s.apuntados - s.caras.length) + ' · ' + textoPlazas(s) : s.apuntados ? textoPlazas(s) : 'Aún no hay nadie apuntado' }));
            cuerpo.appendChild(caras);
            cuerpo.appendChild(h('button', { type: 'button', clase: 'enlace-texto', texto: 'Abrir la lista', alClick: function () { abrirLista(s.id); } }));
          }
        }
        nodos.push(tarjeta);
      });
      return h('section', { clase: 'inicio-seccion', 'aria-label': 'Hoy' }, nodos);
    }

    // ---------------------------------------------------------------- Coach
    function pintarCoach(d) {
      var hh = d.hero;
      var n = d.revisar.listas_sin_pasar.length + d.revisar.faltan_seguido.length;
      caja.appendChild(heroe([
        cabeceraHeroe(campana(n, function () { var el = caja.querySelector('#inicioPendiente'); if (el) el.scrollIntoView({ behavior: 'smooth' }); })),
        h('h1', { clase: 'heroe-saludo', texto: 'Hola, ' + usuario.nombre }),
        cifra(hh.sesiones_hoy === 1 ? 'Apuntados hoy en tu sesión' : hh.sesiones_hoy ? 'Apuntados hoy en tus ' + hh.sesiones_hoy + ' sesiones' : 'Hoy no tienes sesiones',
          hh.listas_total ? 'Listas: ' + hh.listas_pasadas + ' de ' + hh.listas_total : null,
          String(hh.apuntados_hoy), hh.plazas_hoy ? '/ ' + hh.plazas_hoy + ' plazas' : null,
          hh.plazas_hoy ? Math.round(100 * hh.apuntados_hoy / hh.plazas_hoy) : (hh.listas_total ? Math.round(100 * hh.listas_pasadas / hh.listas_total) : null)),
        h('div', { clase: 'heroe-datos' }, [
          dato('reloj', '#C2410C', hh.proxima ? hh.proxima.hora : '—', hh.proxima ? 'próxima · ' + hh.proxima.actividad + (hh.proxima.fecha !== d.hoy ? ' · ' + diaMes(hh.proxima.fecha) : '') : 'sin próximas'),
          dato('check', '#15803D', hh.asistencia_30 === null ? '—' : hh.asistencia_30 + ' %', 'asistencia 30 días'),
          dato('grupo', '#1D4ED8', String(hh.participantes), hh.participantes === 1 ? 'participante (90 días)' : 'participantes (90 días)')
        ])
      ]));
      if (estado.abierta === null) { var ahora = d.sesiones_hoy.filter(function (s) { return s.estado === 'ahora'; })[0]; if (ahora && ahora.apuntados) estado.abierta = ahora.id; }
      caja.appendChild(seccionHoy(d, false));
      caja.appendChild(semana(d.semana, 'Tus próximos 7 días', plural(d.semana.reduce(function (t, x) { return t + x.sesiones.length; }, 0), 'sesión', 'sesiones'), filaDiaSimple));
      var rev = [];
      d.revisar.listas_sin_pasar.forEach(function (l) { rev.push(filaListaSinPasar(l, false)); });
      d.revisar.faltan_seguido.forEach(function (p) {
        rev.push(h('div', { clase: 'tarjeta pendiente' }, [U.circulo(p, { clase: 'mini', ampliable: true }),
          h('span', { clase: 'que' }, [h('strong', { texto: (p.nombre + ' ' + p.apellidos).trim() + ' ha faltado ' + p.faltas + ' veces seguidas' }),
            h('small', { texto: p.ultima_vez ? 'Última vez que vino: ' + diaMes(p.ultima_vez) : 'Aún no ha venido ninguna vez' })])]));
      });
      if (rev.length) caja.appendChild(h('section', { id: 'inicioPendiente', clase: 'inicio-seccion', 'aria-label': 'Para revisar' }, [titulo('Para revisar')].concat(rev)));
    }

    // ---------------------------------------------------------------- Cliente
    function pintarCliente(d) {
      var hh = d.hero, p = hh.proxima;
      var reservas = hh.reservas_semana;
      caja.appendChild(heroe([
        cabeceraHeroe(h('span', { clase: 'heroe-club', texto: 'Fitclub Málaga' })),
        h('h1', { clase: 'heroe-saludo', texto: 'Hola, ' + usuario.nombre }),
        cifra('Tu próxima sesión', p ? cuentaAtras(p.minutos) : null, p ? p.hora_inicio : null,
          p ? p.actividad + ' · ' + diaRelativo(p.fecha, d.hoy, p.dia) : 'Aún no tienes reservas: elige abajo una sesión.', null),
        reservas ? h('div', { clase: 'heroe-cifra' }, [h('span', { clase: 'heroe-etiqueta', texto: 'Esta semana: ' + hh.hechas_semana + (hh.hechas_semana === 1 ? ' hecha' : ' hechas') + ' de ' + plural(reservas, 'reserva', 'reservas') }),
          h('div', { clase: 'heroe-barra', 'aria-hidden': 'true' }, [h('div', { style: 'width:' + Math.round(100 * hh.hechas_semana / reservas) + '%' })])]) : null,
        h('div', { clase: 'heroe-datos' }, [
          dato('cal', '#C2410C', String(reservas), reservas === 1 ? 'reserva esta semana' : 'reservas esta semana'),
          dato('check', '#15803D', String(hh.veces_mes), (hh.veces_mes === 1 ? 'vez en ' : 'veces en ') + MESES_LARGO[+d.hoy.slice(5, 7) - 1]),
          p && p.mapa ? dato('pin', '#1D4ED8', 'Cómo llegar', p.lugar, p.mapa) : dato('pin', '#1D4ED8', '—', 'sin próxima sesión')
        ])
      ]));
      var nodos = [titulo('Hoy', d.dia.toLowerCase() + ' ' + diaMes(d.hoy), enlaceSemana())];
      if (!d.sesiones_hoy.length) nodos.push(h('div', { clase: 'tarjeta vacio-dia', texto: 'Hoy no hay sesiones. Mira los próximos días.' }));
      d.sesiones_hoy.forEach(function (s) { nodos.push(tarjetaCliente(s)); });
      caja.appendChild(h('section', { clase: 'inicio-seccion', 'aria-label': 'Hoy' }, nodos));
      caja.appendChild(semana(d.semana, 'Próximos 7 días', 'Toca un día', function (s) {
        return h('div', { clase: 'fila-dia' }, [h('span', { clase: 'hora', texto: s.hora_inicio }), miniatura(h, s, 32),
          h('span', { clase: 'que' }, [h('span', { texto: s.actividad }), h('small', { texto: s.lugar + (s.coach ? ' · ' + s.coach : '') })]), accionCliente(s, true)]);
      }, function (dia) { return dia.sesiones.some(function (s) { return s.mi && s.mi.reserva; }); }));
    }
    function tarjetaCliente(s) {
      var mia = s.mi && s.mi.reserva;
      var quedan = s.libres !== null && s.libres !== undefined && s.libres > 0 && s.libres <= 3 && !mia ? ' · ¡Quedan ' + s.libres + '!' : '';
      return h('div', { clase: 'tarjeta sesion-hoy cliente' + (mia ? ' mia' : '') }, [h('div', { clase: 'sesion-hoy-fila' }, [
        circuloEstado(mia ? 'mia' : 'luego'), miniatura(h, s),
        h('span', { clase: 'que' }, [h('span', { clase: 'nombre', texto: s.actividad }), h('small', { texto: s.hora_inicio + '–' + s.hora_fin + ' · ' + s.lugar }),
          h('small', { texto: (s.coach ? 'Coach ' + s.coach : '') + quedan })]),
        accionCliente(s, false)
      ])]);
    }
    function accionCliente(s, compacta) {
      var mi = s.mi || {};
      var caja2 = h('span', { clase: 'accion-cliente' });
      if (mi.reserva) {
        if (!compacta) caja2.appendChild(h('span', { clase: 'pildora hecha', texto: 'Reservada ✓' }));
        if (!mi.empezada) caja2.appendChild(h('button', { type: 'button', clase: compacta ? 'boton-mini reservada' : 'boton-mini secundario', texto: compacta ? 'Reservada ✓' : 'Cancelar',
          'aria-label': 'Cancelar mi plaza en ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio, alClick: function (ev) { cancelar(s, ev.currentTarget); } }));
        return caja2;
      }
      if (mi.empezada) { caja2.appendChild(h('span', { clase: 'inicio-sub', texto: 'Empezada' })); return caja2; }
      if (mi.bloqueada) { caja2.appendChild(h('span', { clase: 'inicio-sub', texto: 'No disponible' })); return caja2; }
      if (mi.abre) { caja2.appendChild(h('span', { clase: 'inicio-sub', texto: mi.dias_para_abrir === 1 ? 'Inscripción mañana' : 'Inscripción en ' + mi.dias_para_abrir + ' días' })); return caja2; }
      if (s.libres === 0) { caja2.appendChild(h('span', { clase: 'pildora completa', texto: 'Completa' })); return caja2; }
      caja2.appendChild(h('button', { type: 'button', clase: 'boton-mini', texto: 'Reservar', 'aria-label': 'Reservar ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio,
        alClick: function (ev) { reservar(s, ev.currentTarget); } }));
      return caja2;
    }
    function reservar(s, b) {
      b.disabled = true; b.textContent = 'Reservando…';
      var clave = estado.claves[s.id] || (estado.claves[s.id] = window.FitclubReservas.nuevaClave());
      U.Api.llamar('reservas.reservar', { sesion_id: s.id, clave: clave }).then(function (r) {
        delete estado.claves[s.id]; estado.mensaje = r.mensaje; cargar();
      }).catch(function (e) { if (e.codigo !== 'red' && e.codigo !== 'http') delete estado.claves[s.id]; estado.error = e.mensaje; pintar(); });
    }
    function cancelar(s, b) {
      var mi = s.mi;
      var tarde = mi.tarde_si_cancela ? 'Faltan menos de ' + mi.horas_cancelacion + ' h: contará como cancelación tardía.\n\n' : '';
      if (!confirm(tarde + '¿Cancelar tu plaza en ' + s.actividad + ' del ' + s.dia.toLowerCase() + ' ' + diaMes(s.fecha) + ' a las ' + s.hora_inicio + '?')) return;
      b.disabled = true; b.textContent = 'Cancelando…';
      U.Api.llamar('reservas.cancelar', { reserva_id: mi.reserva.id }).then(function (r) { estado.mensaje = r.mensaje; cargar(); })
        .catch(function (e) { estado.error = e.mensaje; pintar(); });
    }

    // ---------------------------------------------------------------- pintar
    function pintar() {
      caja.innerHTML = '';
      var d = estado.datos;
      if (!d) { caja.appendChild(h('div', { clase: 'cargando', texto: 'Cargando…' })); return; }
      if (estado.mensaje) { caja.appendChild(aviso('ok', estado.mensaje)); estado.mensaje = null; }
      if (estado.error) { caja.appendChild(aviso('error', estado.error)); estado.error = null; }
      if (d.rol === 'BOSS') pintarBoss(d); else if (d.rol === 'COACH') pintarCoach(d); else pintarCliente(d);
    }

    if (estado.lista) { var id = estado.lista; setTimeout(function () { abrirLista(id); }, 0); }
    else pintar();
    cargar();
    return [caja];
  };
  window.VistaInicio.reiniciar = function () { estado = { datos: null, abierta: null, dia: 0, mensaje: null, error: null, lista: null, claves: {} }; };
})();
