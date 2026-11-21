// Hito 1.3 · Pestaña Agenda.
// Boss: Semana (generar, ajustar y cancelar sesiones) · Actividades (con horario semanal) · Lugares.
// Coach (pestaña Sesiones): la semana y «Generar sesiones» de las actividades de sus lugares.
// Cliente: la semana con lugar, hora, coach, plazas y «Cómo llegar» (las reservas llegan en el hito 1.4).
(function () {
  'use strict';
  var DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var ui = { modo: 'semana', desde: null, semana: null, gestion: null, opciones: null, resultado: null, editando: null };

  function sumarDias(iso, n) {
    var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function diaMes(iso) { var p = iso.split('-'); return +p[2] + ' ' + MESES[+p[1] - 1]; }
  function diaMesAnio(iso) { return diaMes(iso) + ' ' + iso.slice(0, 4); }
  /** Suma meses a una fecha (31 ene + 1 mes = 28/29 feb). */
  function sumarMeses(iso, n) {
    var p = iso.split('-'); var y = +p[0], m = +p[1] - 1 + n, d = +p[2];
    var ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return new Date(Date.UTC(y, m, Math.min(d, ultimo))).toISOString().slice(0, 10);
  }
  // Duraciones para «Generar sesiones»: la fecha final es el día anterior a desde + duración.
  var DURACIONES = [
    ['1s', '1 semana', function (d) { return sumarDias(d, 6); }],
    ['2s', '2 semanas', function (d) { return sumarDias(d, 13); }],
    ['1m', '1 mes', function (d) { return sumarDias(sumarMeses(d, 1), -1); }],
    ['3m', '3 meses', function (d) { return sumarDias(sumarMeses(d, 3), -1); }],
    ['6m', '6 meses', function (d) { return sumarDias(sumarMeses(d, 6), -1); }],
    ['1a', '1 año', function (d) { return sumarDias(sumarMeses(d, 12), -1); }],
    ['fin', 'Hasta una fecha (reto)', null]
  ];
  function textoPlazas(s) {
    if (s.cupo === '' || s.cupo === null) return { texto: 'Sin límite de plazas', clase: '' };
    if (s.libres === 0) return { texto: 'Completa', clase: 'completa' };
    return { texto: 'Quedan ' + s.libres + ' de ' + s.cupo, clase: '' };
  }

  window.VistaAgenda = function (U, usuario) {
    var h = U.h, aviso = U.aviso;
    var esBoss = usuario.rol === 'BOSS';
    var puedeGenerar = esBoss || usuario.rol === 'COACH';
    var caja = h('div', {});

    function repintar() {
      caja.innerHTML = '';
      var nodos = [];
      if (esBoss && !ui.editando) {
        nodos.push(h('div', { clase: 'segmento', role: 'group', 'aria-label': 'Sección' }, [['semana', 'Semana'], ['actividades', 'Actividades'], ['lugares', 'Lugares']].map(function (m) {
          return h('button', { type: 'button', 'aria-pressed': ui.modo === m[0] ? 'true' : 'false', texto: m[1], alClick: function () { ui.modo = m[0]; ui.editando = null; cargar(); } });
        })));
      }
      if (ui.editando) nodos = nodos.concat(ui.editando());
      else if (ui.modo === 'semana') nodos = nodos.concat(vistaSemana());
      else if (ui.modo === 'actividades') nodos = nodos.concat(vistaActividades());
      else nodos = nodos.concat(vistaLugares());
      nodos.forEach(function (n) { if (n) caja.appendChild(n); });
    }
    function cargando(texto) { caja.innerHTML = ''; caja.appendChild(h('div', { clase: 'cargando', style: 'min-height:30vh', texto: texto || 'Cargando…' })); }
    function error(err) { caja.appendChild(aviso('error', err.mensaje)); }

    function cargar() {
      if (ui.modo === 'semana') {
        if (!ui.semana) cargando('Cargando la semana…'); else repintar();
        U.Api.llamar('agenda.semana', ui.desde ? { desde: ui.desde } : {}).then(function (d) { ui.semana = d; ui.desde = d.desde; repintar(); }).catch(function (e) { repintar(); error(e); });
      } else {
        if (!ui.gestion) cargando(); else repintar();
        U.Api.llamar('agenda.gestion').then(function (d) { ui.gestion = d; repintar(); }).catch(function (e) { repintar(); error(e); });
      }
    }

    // ------------------------------------------------ semana
    function vistaSemana() {
      var d = ui.semana;
      if (!d) return [];
      var nodos = [h('div', { clase: 'navsemana' }, [
        h('button', { type: 'button', 'aria-label': 'Semana anterior', texto: '‹', alClick: function () { ui.desde = sumarDias(d.desde, -7); ui.semana = null; cargar(); } }),
        h('strong', { texto: diaMes(d.desde) + ' – ' + diaMes(d.hasta) }),
        h('button', { type: 'button', 'aria-label': 'Semana siguiente', texto: '›', alClick: function () { ui.desde = sumarDias(d.desde, 7); ui.semana = null; cargar(); } })
      ])];
      if (puedeGenerar) nodos.push(h('button', { clase: 'boton', type: 'button', style: 'margin-bottom:12px', texto: 'Generar sesiones', alClick: function () { ui.editando = function () { return editorGenerar(); }; repintar(); } }));
      if (ui.resultado) { nodos.push(aviso('ok', ui.resultado)); ui.resultado = null; }
      if (!d.sesiones.length) {
        nodos.push(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: esBoss ? 'No hay sesiones esta semana. Crea actividades con su horario y pulsa «Generar sesiones».' : puedeGenerar ? 'No hay sesiones esta semana. Pulsa «Generar sesiones» para crearlas.' : 'No hay actividades programadas esta semana.' })]));
        return nodos;
      }
      var porDia = {};
      d.sesiones.forEach(function (s) { (porDia[s.fecha] = porDia[s.fecha] || []).push(s); });
      Object.keys(porDia).sort().forEach(function (f) {
        var ss = porDia[f];
        nodos.push(h('p', { clase: 'seccion', texto: (f === d.hoy ? 'Hoy · ' : '') + ss[0].dia + ' ' + diaMes(f) }));
        nodos.push(h('div', { clase: 'grupo' }, ss.map(function (s) { return filaSesion(s); })));
      });
      if (!puedeGenerar) nodos.push(h('p', { clase: 'subtitulo', style: 'text-align:center;margin-top:16px', texto: 'Muy pronto podrás reservar tu plaza desde aquí.' }));
      return nodos;
    }

    function filaSesion(s) {
      var pl = textoPlazas(s);
      var cancelada = s.estado === 'CANCELADA';
      var contenido = [
        h('div', { clase: 'hora' }, [h('strong', { texto: s.hora_inicio }), h('small', { texto: s.hora_fin })]),
        h('div', { clase: 'barra' + (cancelada ? ' apagada' : '') }),
        h('div', { clase: 'principal', style: 'flex:1' }, [
          h('span', { style: cancelada ? 'text-decoration:line-through' : '', texto: s.actividad }),
          h('small', { texto: s.lugar + (s.coach ? ' · ' + s.coach : '') }),
          h('small', { clase: pl.clase, texto: cancelada ? 'Cancelada' : pl.texto + (s.ocupadas && s.cupo === '' ? ' · ' + s.ocupadas + ' apuntados' : '') })
        ])
      ];
      if (!esBoss) {
        if (s.mapa && !cancelada) contenido.push(h('a', { clase: 'mapa', href: s.mapa, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Cómo llegar a ' + s.lugar, texto: 'Cómo llegar' }));
        return h('div', { clase: 'fila sesion' }, contenido);
      }
      return h('button', { clase: 'fila sesion', type: 'button', 'aria-label': 'Editar ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio, alClick: function () { ui.editando = function () { return editorSesion(s); }; repintar(); } }, contenido.concat([U.icono('chev', 18)]));
    }

    // ------------------------------------------------ generar sesiones (Boss: todos los lugares · Coach: los suyos)
    function editorGenerar() {
      var volver = h('button', { clase: 'volver', type: 'button', texto: '‹ Semana', alClick: function () { ui.editando = null; repintar(); } });
      var op = ui.opciones;
      if (!op) {
        U.Api.llamar('sesiones.opciones').then(function (d) { ui.opciones = d; if (ui.editando) repintar(); })
          .catch(function (e) { if (ui.editando) { repintar(); caja.appendChild(aviso('error', e.mensaje)); } });
        return [volver, h('div', { clase: 'cargando', style: 'min-height:20vh', texto: 'Cargando actividades…' })];
      }
      if (!op.lugares.length) {
        return [volver, h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: esBoss
          ? 'No hay actividades activas. Créalas primero en «Actividades», con su horario semanal.'
          : 'Aún no tienes ningún lugar asignado: el Boss tiene que ponerte como coach de alguna actividad.' })])];
      }
      var desdeDefecto = ui.semana && ui.semana.desde > op.hoy ? ui.semana.desde : op.hoy;
      var desde = h('input', { type: 'date', id: 'gDesde', min: op.hoy, value: desdeDefecto });
      var dur = h('select', { id: 'gDuracion' }, DURACIONES.map(function (x) { return h('option', { value: x[0], selected: x[0] === '1m', texto: x[1] }); }));
      var hasta = h('input', { type: 'date', id: 'gHasta', min: op.hoy });
      var campoHasta = U.campo('Hasta (incluido)', hasta);
      var resumen = h('p', { clase: 'subtitulo', id: 'gResumen', style: 'margin:0 0 12px' });
      var marcadas = {};
      function fechaFin() {
        var x = DURACIONES.filter(function (y) { return y[0] === dur.value; })[0];
        return x && x[2] ? (desde.value ? x[2](desde.value) : '') : hasta.value;
      }
      function actualizar() {
        campoHasta.style.display = dur.value === 'fin' ? '' : 'none';
        if (dur.value !== 'fin' && desde.value) hasta.value = fechaFin();
        hasta.min = desde.value || op.hoy;
        var n = Object.keys(marcadas).filter(function (k) { return marcadas[k]; }).length;
        var f = fechaFin();
        resumen.textContent = (n ? n + (n === 1 ? ' actividad' : ' actividades') : 'Ninguna actividad elegida') +
          (desde.value && f && f >= desde.value ? ' · del ' + diaMesAnio(desde.value) + ' al ' + diaMesAnio(f) : '');
        bGenerar.disabled = !n;
      }
      var listas = op.lugares.map(function (l) {
        var casillas = l.actividades.map(function (a) {
          var id = 'gAct_' + a.id;
          var sinHorario = !a.horario;
          var c = h('input', { type: 'checkbox', id: id, value: a.id }); c.disabled = sinHorario;
          c.addEventListener('change', function () { marcadas[a.id] = c.checked; actualizar(); });
          return h('label', { clase: 'casilla eleccion', for: id }, [c, h('span', {}, [
            h('strong', { texto: a.nombre }), h('small', { texto: sinHorario ? 'Sin horario semanal: no se puede generar' : a.horario + (a.coach ? ' · ' + a.coach : '') })
          ])]);
        });
        return h('div', { clase: 'tarjeta', style: 'margin-bottom:8px' }, [h('p', { clase: 'seccion', style: 'margin:0 0 8px', texto: l.nombre })].concat(casillas));
      });
      var zona = h('div', {});
      var bGenerar = h('button', { clase: 'boton', type: 'button', texto: 'Generar sesiones', alClick: function () {
        var ids = Object.keys(marcadas).filter(function (k) { return marcadas[k]; });
        bGenerar.disabled = true; bGenerar.textContent = 'Generando…'; zona.innerHTML = '';
        U.Api.llamar('sesiones.generar', { actividad_ids: ids, desde: desde.value, hasta: fechaFin() }).then(function (d) {
          ui.semana = d; ui.desde = d.desde; ui.editando = null;
          var detalle = d.por_actividad.map(function (x) { return x.actividad + ' ' + x.creadas; }).join(', ');
          ui.resultado = d.creadas ? 'Creadas ' + d.creadas + ' sesiones del ' + diaMes(d.periodo.desde) + ' al ' + diaMesAnio(d.periodo.hasta) + ' (' + detalle + ').'
            : 'No había sesiones nuevas que crear en ese periodo: ya estaban todas.';
          repintar();
        }).catch(function (e) { bGenerar.textContent = 'Generar sesiones'; actualizar(); zona.appendChild(aviso('error', e.mensaje)); });
      } });
      desde.addEventListener('change', actualizar);
      dur.addEventListener('change', function () { if (dur.value === 'fin' && !hasta.value) hasta.value = fechaFin(); actualizar(); });
      hasta.addEventListener('change', actualizar);
      hasta.value = DURACIONES[2][2](desdeDefecto);
      actualizar();
      return [volver,
        h('p', { clase: 'seccion', texto: esBoss ? '1 · Elige las actividades' : '1 · Elige las actividades de tus lugares' })].concat(listas).concat([
        h('p', { clase: 'seccion', texto: '2 · Elige el periodo' }),
        h('div', { clase: 'tarjeta' }, [U.campo('Desde', desde), U.campo('Duración', dur), campoHasta, resumen, bGenerar, zona]),
        h('p', { clase: 'subtitulo', style: 'margin-top:12px', texto: 'Se crean según el horario semanal de cada actividad. No duplica las que ya existen ni recupera las canceladas. Como mucho, un año de una vez.' })
      ]);
    }

    function editorSesion(s) {
      var g = ui.gestion;
      var ini = h('input', { type: 'time', id: 'sIni', value: s.hora_inicio });
      var fin = h('input', { type: 'time', id: 'sFin', value: s.hora_fin });
      var cupo = h('input', { type: 'number', id: 'sCupo', min: '1', max: '500', inputmode: 'numeric', placeholder: 'Sin límite', value: s.cupo === '' ? '' : String(s.cupo) });
      var coach = h('select', { id: 'sCoach' }, g ? g.coaches.map(function (c) { return h('option', { value: c.id, selected: c.id === s.coach_id, texto: c.nombre }); }) : [h('option', { value: s.coach_id, texto: s.coach })]);
      if (!g) U.Api.llamar('agenda.gestion').then(function (d) { ui.gestion = d; if (ui.editando) repintar(); }).catch(function () {});
      var zona = h('div', {});
      var guardar = function (datos, boton, textoBoton) {
        boton.disabled = true; boton.textContent = 'Guardando…'; zona.innerHTML = '';
        U.Api.llamar('sesiones.editar', Object.assign({ id: s.id }, datos)).then(function (d) { ui.semana = d; ui.editando = null; repintar(); })
          .catch(function (e) { boton.disabled = false; boton.textContent = textoBoton; zona.appendChild(aviso('error', e.mensaje)); });
      };
      var bGuardar = h('button', { clase: 'boton', type: 'button', texto: 'Guardar cambios', alClick: function () { guardar({ hora_inicio: ini.value, hora_fin: fin.value, cupo: cupo.value, coach_id: coach.value }, bGuardar, 'Guardar cambios'); } });
      var cancelada = s.estado === 'CANCELADA';
      var bEstado = h('button', { clase: 'boton ' + (cancelada ? 'secundario' : 'peligro'), type: 'button', texto: cancelada ? 'Volver a programarla' : 'Cancelar esta sesión', alClick: function () {
        if (!cancelada && !confirm('¿Cancelar ' + s.actividad + ' del ' + s.dia + ' ' + diaMes(s.fecha) + '?')) return;
        guardar({ estado: cancelada ? 'PROGRAMADA' : 'CANCELADA' }, bEstado, bEstado.textContent);
      } });
      return [
        h('button', { clase: 'volver', type: 'button', texto: '‹ Semana', alClick: function () { ui.editando = null; repintar(); } }),
        h('p', { clase: 'seccion', texto: s.dia + ' ' + diaMes(s.fecha) + ' · ' + s.lugar }),
        h('div', { clase: 'tarjeta' }, [
          h('h2', { style: 'margin:0 0 12px;font-size:22px', texto: s.actividad }),
          h('div', { clase: 'dos' }, [U.campo('Empieza', ini), U.campo('Termina', fin)]),
          U.campo('Coach', coach),
          U.campo('Plazas', cupo, 'Vacío = sin límite. Ahora hay ' + (s.ocupadas || 0) + ' apuntados.'),
          bGuardar, zona
        ]),
        bEstado
      ];
    }

    // ------------------------------------------------ actividades
    function vistaActividades() {
      var g = ui.gestion;
      if (!g) return [];
      var lugares = {}; g.lugares.forEach(function (l) { lugares[l.id] = l.nombre; });
      var nodos = [];
      if (!g.lugares.length) {
        nodos.push(h('div', { clase: 'aviso info', texto: 'Primero crea al menos un lugar (pestaña Lugares).' }));
        return nodos;
      }
      nodos.push(h('button', { clase: 'boton', type: 'button', texto: '+ Nueva actividad', alClick: function () { ui.editando = function () { return editorActividad(null); }; repintar(); } }));
      if (!g.actividades.length) { nodos.push(h('div', { clase: 'vacio tarjeta', style: 'margin-top:12px' }, [h('p', { texto: 'Aún no hay actividades.' })])); return nodos; }
      nodos.push(h('div', { clase: 'grupo', style: 'margin-top:12px' }, g.actividades.map(function (a) {
        var franjas = a.horario.map(function (x) { return DIAS_CORTOS[x.dia_semana] + ' ' + x.hora_inicio; }).join(', ') || 'Sin horario';
        return h('button', { clase: 'fila', type: 'button', alClick: function () { ui.editando = function () { return editorActividad(a); }; repintar(); } }, [
          h('div', { clase: 'principal' }, [h('span', { texto: a.nombre }), h('small', { texto: franjas }), h('small', { texto: (lugares[a.lugar_id] || '') + ' · ' + (a.cupo === '' ? 'sin límite' : a.cupo + ' plazas') })]),
          a.activa ? U.icono('chev', 18) : h('span', { clase: 'etiqueta', texto: 'Inactiva' })
        ]);
      })));
      return nodos;
    }

    function editorActividad(a) {
      var g = ui.gestion;
      a = a || { nombre: '', descripcion: '', lugar_id: g.lugares[0].id, coach_id: (g.coaches[0] || {}).id, cupo: '', horas_cancelacion: '', dias_apertura: '', activa: true, horario: [] };
      var nombre = h('input', { type: 'text', id: 'aNombre', maxlength: '60', value: a.nombre });
      var desc = h('textarea', { id: 'aDesc', maxlength: '500', rows: '3' }); desc.value = a.descripcion || '';
      var lugar = h('select', { id: 'aLugar' }, g.lugares.filter(function (l) { return l.activo || l.id === a.lugar_id; }).map(function (l) { return h('option', { value: l.id, selected: l.id === a.lugar_id, texto: l.nombre }); }));
      var coach = h('select', { id: 'aCoach' }, g.coaches.map(function (c) { return h('option', { value: c.id, selected: c.id === a.coach_id, texto: c.nombre }); }));
      var cupo = h('input', { type: 'number', id: 'aCupo', min: '1', max: '500', inputmode: 'numeric', placeholder: 'Sin límite', value: a.cupo === '' ? '' : String(a.cupo) });
      var horas = h('input', { type: 'number', id: 'aHoras', min: '0', max: '168', inputmode: 'numeric', placeholder: 'General: ' + g.general.horas_cancelacion, value: a.horas_cancelacion === '' ? '' : String(a.horas_cancelacion) });
      var dias = h('input', { type: 'number', id: 'aDias', min: '0', max: '60', inputmode: 'numeric', placeholder: 'General: ' + g.general.dias_apertura, value: a.dias_apertura === '' ? '' : String(a.dias_apertura) });
      var activa = h('input', { type: 'checkbox', id: 'aActiva' }); activa.checked = a.activa !== false;
      var franjas = h('div', {});
      var filas = (a.horario || []).map(function (x) { return { dia_semana: x.dia_semana, hora_inicio: x.hora_inicio, hora_fin: x.hora_fin }; });
      function pintarFranjas() {
        franjas.innerHTML = '';
        filas.forEach(function (f, i) {
          var dia = h('select', { 'aria-label': 'Día' }, DIAS.slice(1).map(function (n, j) { return h('option', { value: String(j + 1), selected: j + 1 === Number(f.dia_semana), texto: n }); }));
          var ini = h('input', { type: 'time', 'aria-label': 'Empieza', value: f.hora_inicio || '' });
          var fin = h('input', { type: 'time', 'aria-label': 'Termina', value: f.hora_fin || '' });
          dia.addEventListener('change', function () { f.dia_semana = Number(dia.value); });
          ini.addEventListener('change', function () { f.hora_inicio = ini.value; });
          fin.addEventListener('change', function () { f.hora_fin = fin.value; });
          franjas.appendChild(h('div', { clase: 'franja' }, [dia, ini, fin, h('button', { type: 'button', clase: 'quitar', 'aria-label': 'Quitar franja', texto: '✕', alClick: function () { filas.splice(i, 1); pintarFranjas(); } })]));
        });
      }
      pintarFranjas();
      var anadir = h('button', { clase: 'boton secundario', type: 'button', texto: '+ Añadir día y hora', alClick: function () { filas.push({ dia_semana: 1, hora_inicio: '19:00', hora_fin: '20:00' }); pintarFranjas(); } });
      var zona = h('div', {});
      var bGuardar = h('button', { clase: 'boton', type: 'button', texto: 'Guardar actividad', alClick: function () {
        bGuardar.disabled = true; bGuardar.textContent = 'Guardando…'; zona.innerHTML = '';
        U.Api.llamar('actividades.guardar', { id: a.id, nombre: nombre.value, descripcion: desc.value, lugar_id: lugar.value, coach_id: coach.value,
          cupo: cupo.value, horas_cancelacion: horas.value, dias_apertura: dias.value, activa: activa.checked, horario: filas })
          .then(function (d) { ui.gestion = d; ui.opciones = null; ui.editando = null; repintar(); })
          .catch(function (e) { bGuardar.disabled = false; bGuardar.textContent = 'Guardar actividad'; zona.appendChild(aviso('error', e.mensaje)); });
      } });
      return [
        h('button', { clase: 'volver', type: 'button', texto: '‹ Actividades', alClick: function () { ui.editando = null; repintar(); } }),
        h('div', { clase: 'tarjeta' }, [
          U.campo('Nombre', nombre), U.campo('Descripción (la verán los clientes)', desc),
          U.campo('Lugar', lugar), U.campo('Coach', coach),
          U.campo('Plazas por sesión', cupo, 'Vacío = sin límite. Puedes ponerlo cuando quieras.'),
          h('p', { clase: 'seccion', style: 'margin-left:0', texto: 'Horario semanal' }), franjas, anadir,
          h('p', { clase: 'seccion', style: 'margin-left:0', texto: 'Reservas (vacío = valor general)' }),
          h('div', { clase: 'dos' }, [U.campo('Horas para cancelar', horas), U.campo('Días de apertura', dias)]),
          h('label', { clase: 'casilla', for: 'aActiva', style: 'margin-top:8px' }, [activa, h('span', { texto: 'Actividad activa (si no, no se generan sesiones nuevas)' })]),
          bGuardar, zona
        ]),
        h('p', { clase: 'subtitulo', style: 'margin-top:12px', texto: 'Los cambios de horario se aplican a las sesiones que generes a partir de ahora. Las ya creadas se ajustan una a una en la Semana.' })
      ];
    }

    // ------------------------------------------------ lugares
    function vistaLugares() {
      var g = ui.gestion;
      if (!g) return [];
      var nodos = [h('button', { clase: 'boton', type: 'button', texto: '+ Nuevo lugar', alClick: function () { ui.editando = function () { return editorLugar(null); }; repintar(); } })];
      if (!g.lugares.length) { nodos.push(h('div', { clase: 'vacio tarjeta', style: 'margin-top:12px' }, [h('p', { texto: 'Aún no hay lugares. Crea el primero: por ejemplo, «La Malagueta».' })])); return nodos; }
      // Son pocos lugares (menos de 10): tarjetas con la miniatura del mapa a la derecha.
      g.lugares.forEach(function (l) {
        var editar = function () { ui.editando = function () { return editorLugar(l); }; repintar(); };
        nodos.push(h('div', { clase: 'tarjeta lugar' + (l.activo ? '' : ' inactivo') }, [
          h('button', { clase: 'lugar-datos', type: 'button', 'aria-label': 'Editar ' + l.nombre, alClick: editar }, [
            h('strong', { texto: l.nombre }),
            h('small', { texto: l.direccion || 'Sin dirección' }),
            l.url_mapa ? null : h('small', { texto: 'Sin enlace de Google Maps' }),
            l.activo ? null : h('span', { clase: 'etiqueta', texto: 'Inactivo' }),
            h('span', { clase: 'lugar-editar', texto: 'Editar ›' })
          ]),
          miniatura(l)
        ]));
      });
      return nodos;
    }

    /** Mapa pequeño del lugar; al tocarlo se abre Google Maps. */
    function miniatura(l) {
      if (!l.miniatura) return h('button', { clase: 'lugar-mapa vacio-mapa', type: 'button', alClick: function () { ui.editando = function () { return editorLugar(l); }; repintar(); } }, [h('span', { texto: 'Sin mapa' })]);
      return h('a', { clase: 'lugar-mapa', href: l.mapa || l.url_mapa, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Abrir ' + l.nombre + ' en Google Maps' }, [
        h('iframe', { src: l.miniatura, loading: 'lazy', tabindex: '-1', 'aria-hidden': 'true', title: 'Mapa de ' + l.nombre, referrerpolicy: 'no-referrer-when-downgrade' })
      ]);
    }

    function editorLugar(l) {
      l = l || { nombre: '', direccion: '', notas: '', url_mapa: '', activo: true };
      var nombre = h('input', { type: 'text', id: 'lNombre', maxlength: '80', value: l.nombre });
      var dir = h('input', { type: 'text', id: 'lDir', maxlength: '160', value: l.direccion || '', placeholder: 'Para que los clientes lo encuentren' });
      var mapa = h('input', { type: 'url', id: 'lMapa', maxlength: '500', inputmode: 'url', value: l.url_mapa || '', placeholder: 'https://maps.app.goo.gl/…' });
      var notas = h('textarea', { id: 'lNotas', maxlength: '300', rows: '2' }); notas.value = l.notas || '';
      var activo = h('input', { type: 'checkbox', id: 'lActivo' }); activo.checked = l.activo !== false;
      var zona = h('div', {});
      var b = h('button', { clase: 'boton', type: 'button', texto: 'Guardar lugar', alClick: function () {
        b.disabled = true; b.textContent = 'Guardando…'; zona.innerHTML = '';
        U.Api.llamar('lugares.guardar', { id: l.id, nombre: nombre.value, direccion: dir.value, url_mapa: mapa.value, notas: notas.value, activo: activo.checked })
          .then(function (d) { ui.gestion = d; ui.opciones = null; ui.editando = null; repintar(); })
          .catch(function (e) { b.disabled = false; b.textContent = 'Guardar lugar'; zona.appendChild(aviso('error', e.mensaje)); });
      } });
      return [
        h('button', { clase: 'volver', type: 'button', texto: '‹ Lugares', alClick: function () { ui.editando = null; repintar(); } }),
        h('div', { clase: 'tarjeta' }, [U.campo('Nombre', nombre), U.campo('Dirección', dir),
          U.campo('Enlace de Google Maps', mapa, 'En Google Maps, busca el sitio → Compartir → Copiar enlace, y pégalo aquí. Los clientes verán «Cómo llegar». Si lo dejas vacío, se usará la dirección.'),
          l.miniatura ? h('div', { clase: 'lugar-vista' }, [miniatura(l)]) : null,
          l.url_mapa ? h('a', { clase: 'mapa', href: l.url_mapa, target: '_blank', rel: 'noopener noreferrer', texto: 'Probar el enlace' }) : null,
          U.campo('Notas internas', notas),
          h('label', { clase: 'casilla', for: 'lActivo' }, [activo, h('span', { texto: 'Lugar activo' })]), b, zona])
      ];
    }

    cargar();
    return [caja];
  };

  window.VistaAgenda.reiniciar = function () { ui = { modo: 'semana', desde: null, semana: null, gestion: null, opciones: null, resultado: null, editando: null }; };
})();
