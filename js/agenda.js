// Hito 1.3 · Pestaña Agenda.
// Boss: Semana (generar, ajustar y cancelar sesiones) · Actividades (con horario semanal) · Lugares.
// Coach (pestaña Sesiones): la semana y «Generar sesiones» de las actividades de sus lugares.
// Cliente: la semana con lugar, hora, coach, plazas y «Cómo llegar»; reservar y cancelar su plaza (hito 1.4).
(function () {
  'use strict';
  var DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var ui = { modo: 'semana', desde: null, semana: null, gestion: null, opciones: null, resultado: null, error: null, editando: null };
  // Sede elegida en el filtro de la Semana (se recuerda en este navegador; '' = todas).
  var sede = '';
  try { sede = localStorage.getItem('fitclub_sede') || ''; } catch (e) { sede = ''; }
  function elegirSede(id) { sede = id; try { localStorage.setItem('fitclub_sede', id); } catch (e) { /* sin almacenamiento */ } }

  function sumarDias(iso, n) {
    var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function diaMes(iso) { var p = iso.split('-'); return +p[2] + ' ' + MESES[+p[1] - 1]; }
  function diaMesAnio(iso) { return diaMes(iso) + ' ' + iso.slice(0, 4); }
  function lunesDe(iso) { var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); return sumarDias(iso, d === 0 ? -6 : 1 - d); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  /** Texto del resultado de cancelar / volver a programar / borrar varias. */
  function textoLote(l) {
    var verbo = { cancelar: ['cancelada', 'canceladas'], reactivar: ['vuelta a programar', 'vueltas a programar'], borrar: ['borrada', 'borradas'] }[l.operacion];
    var t = l.hechas ? plural(l.hechas, 'sesión ' + verbo[0], 'sesiones ' + verbo[1]) + '.' : 'No había sesiones que cambiar.';
    if (l.con_reservas) t += ' ' + plural(l.con_reservas, 'no se ha borrado porque tiene reservas', 'no se han borrado porque tienen reservas') + ': cancélalas en su lugar.';
    if (l.pasadas) t += ' ' + plural(l.pasadas, 'ya había pasado y no se toca', 'ya habían pasado y no se tocan') + '.';
    if (l.sin_cambio && l.operacion !== 'borrar') t += ' ' + plural(l.sin_cambio, 'ya estaba así', 'ya estaban así') + '.';
    if (l.reservas_anuladas) t += ' ' + plural(l.reservas_anuladas, 'reserva anulada', 'reservas anuladas') + '; ' + plural(l.avisadas, 'persona avisada', 'personas avisadas') + ' por correo.';
    return t;
  }
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
  /** Clave idempotente de una reserva: la misma para los reintentos de un mismo intento. */
  function nuevaClave() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, ''); } catch (e) { /* sigue */ }
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  var clavesPendientes = {}; // sesion_id → clave mientras no haya respuesta correcta
  window.FitclubReservas = { nuevaClave: nuevaClave };

  function textoPlazas(s) {
    if (s.cupo === '' || s.cupo === null) return { texto: '', clase: '' }; // sin límite: no se dice nada (Miguel, 22-11)
    if (s.libres === 0) return { texto: 'Completa', clase: 'completa' };
    return { texto: 'Quedan ' + s.libres + ' de ' + s.cupo, clase: '' };
  }

  /** opciones.modo = 'actividades': solo «Mis actividades» (lo usa el coach desde su pestaña Sesiones). */
  window.VistaAgenda = function (U, usuario, opciones) {
    var h = U.h, aviso = U.aviso;
    var esBoss = usuario.rol === 'BOSS';
    var soloActividades = !!(opciones && opciones.modo === 'actividades');
    if (soloActividades) ui.modo = 'actividades'; else if (!esBoss) ui.modo = 'semana';
    var puedeGenerar = esBoss || usuario.rol === 'COACH';
    var esCliente = usuario.rol === 'USUARIO';
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
      if (puedeGenerar) nodos.push(h('button', { clase: 'boton', type: 'button', style: esBoss ? 'margin-bottom:8px' : 'margin-bottom:12px', texto: 'Generar sesiones', alClick: function () { ui.editando = function () { return editorGenerar(); }; repintar(); } }));
      if (esBoss) nodos.push(h('button', { clase: 'boton secundario', type: 'button', style: 'margin-bottom:12px', texto: 'Cancelar o borrar varias', alClick: function () { ui.editando = function () { return editorLote(); }; repintar(); } }));
      if (ui.resultado) { nodos.push(aviso('ok', ui.resultado)); ui.resultado = null; }
      if (ui.error) { nodos.push(aviso('error', ui.error)); ui.error = null; }
      // Filtro por sede: solo si hay más de una.
      var sedes = d.lugares || [];
      if (sede && !sedes.some(function (l) { return l.id === sede; })) sede = '';
      if (sedes.length > 1) {
        nodos.push(h('div', { clase: 'filtro-sedes', role: 'group', 'aria-label': 'Filtrar por sede' }, [{ id: '', nombre: 'Todas' }].concat(sedes).map(function (l) {
          return h('button', { type: 'button', 'aria-pressed': sede === l.id ? 'true' : 'false', texto: l.nombre, alClick: function () { elegirSede(l.id); repintar(); } });
        })));
      }
      var lista = sede ? d.sesiones.filter(function (s) { return s.lugar_id === sede; }) : d.sesiones;
      if (sede && d.sesiones.length && !lista.length) {
        var nombreSede = (sedes.filter(function (l) { return l.id === sede; })[0] || {}).nombre;
        nodos.push(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'No hay sesiones en ' + nombreSede + ' esta semana.' }),
          h('button', { clase: 'boton secundario', type: 'button', texto: 'Ver todas las sedes', alClick: function () { elegirSede(''); repintar(); } })]));
        return nodos;
      }
      if (!d.sesiones.length) {
        if (d.proxima) {
          nodos.push(h('div', { clase: 'vacio tarjeta' }, [
            h('p', { texto: 'No hay sesiones esta semana. La próxima es el ' + d.proxima.dia.toLowerCase() + ' ' + diaMes(d.proxima.fecha) + '.' }),
            h('button', { clase: 'boton secundario', type: 'button', id: 'irProxima', texto: 'Ir a esa semana ›', alClick: function () { ui.desde = d.proxima.semana; ui.semana = null; cargar(); } })
          ]));
          return nodos;
        }
        nodos.push(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: esBoss ? 'No hay sesiones esta semana ni más adelante. Crea actividades con su horario y pulsa «Generar sesiones».' : puedeGenerar ? 'No hay sesiones programadas. Pulsa «Generar sesiones» para crearlas.' : 'No hay actividades programadas por ahora.' })]));
        return nodos;
      }
      var porDia = {};
      lista.forEach(function (s) { (porDia[s.fecha] = porDia[s.fecha] || []).push(s); });
      Object.keys(porDia).sort().forEach(function (f) {
        var ss = porDia[f];
        nodos.push(h('p', { clase: 'seccion', texto: (f === d.hoy ? 'Hoy · ' : '') + ss[0].dia + ' ' + diaMes(f) }));
        nodos.push(h('div', { clase: 'grupo' }, ss.map(function (s) { return filaSesion(s); })));
      });
      if (esCliente) nodos.push(h('p', { clase: 'subtitulo', style: 'text-align:center;margin-top:16px', texto: 'Tus reservas, también en la pestaña «Reservas».' }));
      return nodos;
    }

    function filaSesion(s) {
      var pl = textoPlazas(s);
      var cancelada = s.estado === 'CANCELADA';
      var contenido = [
        h('div', { clase: 'hora' }, [h('strong', { texto: s.hora_inicio }), h('small', { texto: s.hora_fin })]),
        window.FitclubActividad ? (function () { var m = window.FitclubActividad.miniatura(h, s, 36); if (cancelada) m.style.opacity = '.35'; return m; })()
          : h('div', { clase: 'barra' + (cancelada ? ' apagada' : '') }),
        h('div', { clase: 'principal', style: 'flex:1' }, [
          h('span', { style: cancelada ? 'text-decoration:line-through' : '', texto: s.actividad }),
          h('small', { clase: 'con-coach' }, [s.lugar + (s.coach ? ' · ' : ''), s.coach ? h('span', { clase: 'coach-nombre' }, [U.circulo({ nombre: s.coach, apellidos: '', foto: s.coach_foto }, { clase: 'micro', ampliable: !esBoss }), ' ' + s.coach]) : null]),
          (function () {
            var t = cancelada ? 'Cancelada' : [pl.texto, s.cupo === '' && s.ocupadas && !esCliente ? plural(s.ocupadas, 'apuntado', 'apuntados') : ''].filter(Boolean).join(' · ');
            return t ? h('small', { clase: pl.clase, texto: t }) : null;
          })()
        ])
      ];
      if (!esBoss) {
        if (esCliente && s.mi && !cancelada) {
          // Botones a la derecha: Reservar (o Reservada + Cancelar) y debajo «Cómo llegar» (Miguel, 22-11).
          var acc = accionesReserva(s);
          if (s.mapa) acc.appendChild(h('a', { clase: 'mapa', href: s.mapa, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Cómo llegar a ' + s.lugar, texto: 'Cómo llegar' }));
          contenido.push(acc);
        } else if (s.mapa && !cancelada) contenido.push(h('a', { clase: 'mapa', href: s.mapa, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Cómo llegar a ' + s.lugar, texto: 'Cómo llegar' }));
        return h('div', { clase: 'fila sesion' + (s.mi && s.mi.reserva ? ' reservada' : '') }, contenido);
      }
      return h('button', { clase: 'fila sesion', type: 'button', 'aria-label': 'Editar ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio, alClick: function () { ui.editando = function () { return editorSesion(s); }; repintar(); } }, contenido.concat([U.icono('chev', 18)]));
    }

    // ------------------------------------------------ reservas del cliente (hito 1.4)
    function accionesReserva(s) {
      var mi = s.mi;
      var caja2 = h('div', { clase: 'acciones-derecha' });
      if (mi.reserva) {
        caja2.appendChild(h('span', { clase: 'etiqueta ok', texto: 'Reservada ✓' }));
        if (!mi.empezada) caja2.appendChild(h('button', { clase: 'boton-mini secundario', type: 'button', texto: 'Cancelar', 'aria-label': 'Cancelar mi plaza en ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio, alClick: function (ev) {
          var aviso1 = mi.tarde_si_cancela ? 'Faltan menos de ' + mi.horas_cancelacion + ' h: contará como cancelación tardía.\n\n' : '';
          if (!confirm(aviso1 + '¿Cancelar tu plaza en ' + s.actividad + ' del ' + s.dia.toLowerCase() + ' ' + diaMes(s.fecha) + ' a las ' + s.hora_inicio + '?')) return;
          var b = ev.currentTarget; b.disabled = true; b.textContent = 'Cancelando…';
          U.Api.llamar('reservas.cancelar', { reserva_id: mi.reserva.id }).then(function (d) { ui.semana = d; ui.resultado = d.mensaje; repintar(); })
            .catch(function (e) { ui.error = e.mensaje; repintar(); });
        } }));
        return caja2;
      }
      if (mi.empezada) return caja2;
      if (mi.abre) {
        var n = mi.dias_para_abrir;
        caja2.appendChild(h('small', { clase: 'abre-en', title: 'Inscripción desde el ' + diaMes(mi.abre), texto: n === 1 ? 'Inscripción mañana' : 'Inscripción en ' + n + ' días' }));
        return caja2;
      }
      if (s.libres === 0) return caja2;
      caja2.appendChild(h('button', { clase: 'boton-mini', type: 'button', texto: 'Reservar', 'aria-label': 'Reservar ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio, alClick: function (ev) {
        var b = ev.currentTarget; b.disabled = true; b.textContent = 'Reservando…';
        var clave = clavesPendientes[s.id] || (clavesPendientes[s.id] = nuevaClave());
        U.Api.llamar('reservas.reservar', { sesion_id: s.id, clave: clave }).then(function (d) {
          delete clavesPendientes[s.id]; ui.semana = d; ui.resultado = d.mensaje; repintar();
        }).catch(function (e) {
          // Si falló la red, se reintenta con la misma clave (no duplica). Si el servidor dijo que no, clave nueva.
          if (e.codigo !== 'red' && e.codigo !== 'http') delete clavesPendientes[s.id];
          ui.error = e.mensaje; repintar();
        });
      } }));
      return caja2;
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
        U.Api.llamar('sesiones.editar', Object.assign({ id: s.id }, datos)).then(function (d) { ui.semana = d; ui.editando = null; if (d.mensaje) ui.resultado = d.mensaje; repintar(); })
          .catch(function (e) { boton.disabled = false; boton.textContent = textoBoton; zona.appendChild(aviso('error', e.mensaje)); });
      };
      var bGuardar = h('button', { clase: 'boton', type: 'button', texto: 'Guardar cambios', alClick: function () { guardar({ hora_inicio: ini.value, hora_fin: fin.value, cupo: cupo.value, coach_id: coach.value }, bGuardar, 'Guardar cambios'); } });
      var cancelada = s.estado === 'CANCELADA';
      var bEstado = h('button', { clase: 'boton ' + (cancelada ? 'secundario' : 'peligro'), type: 'button', texto: cancelada ? 'Volver a programarla' : 'Cancelar esta sesión', alClick: function () {
        if (!cancelada && !confirm('¿Cancelar ' + s.actividad + ' del ' + s.dia + ' ' + diaMes(s.fecha) + '?' + (s.ocupadas ? '\n\nTiene ' + s.ocupadas + (s.ocupadas === 1 ? ' persona apuntada: se le avisará' : ' personas apuntadas: se les avisará') + ' por correo y su reserva quedará anulada.' : ''))) return;
        guardar({ estado: cancelada ? 'PROGRAMADA' : 'CANCELADA' }, bEstado, bEstado.textContent);
      } });
      var bBorrar = h('button', { clase: 'boton secundario', type: 'button', style: 'margin-top:8px', texto: 'Borrar esta sesión', alClick: function () {
        if (!confirm('¿Borrar ' + s.actividad + ' del ' + s.dia + ' ' + diaMes(s.fecha) + '? Desaparece de la agenda. Si tiene reservas no se podrá borrar: cancélala.')) return;
        bBorrar.disabled = true; zona.innerHTML = '';
        U.Api.llamar('sesiones.lote', { operacion: 'borrar', ids: [s.id] }).then(function (d) {
          ui.semana = d; ui.desde = d.desde; ui.editando = null; ui.resultado = textoLote(d.lote); repintar();
        }).catch(function (e) { bBorrar.disabled = false; zona.appendChild(aviso('error', e.mensaje)); });
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
        h('button', { clase: 'boton secundario', type: 'button', id: 'verLista', style: 'margin-top:8px', texto: 'Participantes y lista (' + (s.ocupadas || 0) + ')', alClick: function () {
          ui.editando = function () {
            var c = h('div', {});
            window.FitclubEquipo.pintarLista(U, c, s.id, function () { ui.editando = null; repintar(); });
            return [c];
          };
          repintar();
        } }),
        bEstado, bBorrar
      ];
    }

    // ------------------------------------------------ cancelar / volver a programar / borrar varias (Boss)
    function editorLote() {
      var volver = h('button', { clase: 'volver', type: 'button', texto: '‹ Semana', alClick: function () { ui.editando = null; repintar(); } });
      var op = ui.opciones;
      if (!op) {
        U.Api.llamar('sesiones.opciones').then(function (d) { ui.opciones = d; if (ui.editando) repintar(); })
          .catch(function (e) { if (ui.editando) { repintar(); caja.appendChild(aviso('error', e.mensaje)); } });
        return [volver, h('div', { clase: 'cargando', style: 'min-height:20vh', texto: 'Cargando actividades…' })];
      }
      if (!op.lugares.length) return [volver, h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'No hay actividades activas.' })])];
      var marcadas = {};
      var OPS = [['cancelar', 'Cancelarlas', 'Siguen en la agenda, tachadas. Sus reservas se anulan y se avisa por correo. Se pueden volver a programar.'],
        ['borrar', 'Borrarlas', 'Desaparecen. Las que tengan reservas no se borran (cancélalas). Se pueden volver a generar.'],
        ['reactivar', 'Volver a programar las canceladas', 'Las canceladas del periodo vuelven a estar activas.']];
      var opElegida = 'cancelar';
      var radios = OPS.map(function (o) {
        var r = h('input', { type: 'radio', name: 'lOp', id: 'lOp_' + o[0], value: o[0] }); r.checked = o[0] === opElegida;
        r.addEventListener('change', function () { opElegida = o[0]; actualizar(); });
        return h('label', { clase: 'casilla eleccion', for: 'lOp_' + o[0] }, [r, h('span', {}, [h('strong', { texto: o[1] }), h('small', { texto: o[2] })])]);
      });
      var desdeDefecto = ui.semana && ui.semana.desde > op.hoy ? ui.semana.desde : op.hoy;
      var desde = h('input', { type: 'date', id: 'lDesde', min: op.hoy, value: desdeDefecto });
      var hasta = h('input', { type: 'date', id: 'lHasta', min: op.hoy, value: sumarDias(desdeDefecto, 6) });
      var resumen = h('p', { clase: 'subtitulo', id: 'lResumen', style: 'margin:0 0 12px' });
      var zona = h('div', {});
      var bAplicar = h('button', { clase: 'boton peligro', type: 'button', id: 'lAplicar' });
      function ids() { return Object.keys(marcadas).filter(function (k) { return marcadas[k]; }); }
      function actualizar() {
        hasta.min = desde.value || op.hoy;
        var n = ids().length;
        resumen.textContent = (n ? plural(n, 'actividad', 'actividades') : 'Ninguna actividad elegida') +
          (desde.value && hasta.value && hasta.value >= desde.value ? ' · del ' + diaMesAnio(desde.value) + ' al ' + diaMesAnio(hasta.value) + ', ambos incluidos' : '');
        bAplicar.textContent = { cancelar: 'Cancelar sesiones', borrar: 'Borrar sesiones', reactivar: 'Volver a programar' }[opElegida];
        bAplicar.className = 'boton ' + (opElegida === 'reactivar' ? '' : 'peligro');
        bAplicar.disabled = !n;
      }
      var listas = op.lugares.map(function (l) {
        return h('div', { clase: 'tarjeta', style: 'margin-bottom:8px' }, [h('p', { clase: 'seccion', style: 'margin:0 0 8px', texto: l.nombre })].concat(l.actividades.map(function (a) {
          var id = 'lAct_' + a.id;
          var c = h('input', { type: 'checkbox', id: id, value: a.id });
          c.addEventListener('change', function () { marcadas[a.id] = c.checked; actualizar(); });
          return h('label', { clase: 'casilla eleccion', for: id }, [c, h('span', {}, [h('strong', { texto: a.nombre }), h('small', { texto: a.horario || 'Sin horario' })])]);
        })));
      });
      bAplicar.addEventListener('click', function () {
        var verbo = { cancelar: 'cancelar', borrar: 'borrar', reactivar: 'volver a programar' }[opElegida];
        if (!confirm('¿Seguro que quieres ' + verbo + ' las sesiones de ' + plural(ids().length, 'actividad', 'actividades') + ' del ' + diaMes(desde.value) + ' al ' + diaMesAnio(hasta.value) + '?')) return;
        var texto = bAplicar.textContent;
        bAplicar.disabled = true; bAplicar.textContent = 'Aplicando…'; zona.innerHTML = '';
        U.Api.llamar('sesiones.lote', { operacion: opElegida, actividad_ids: ids(), desde: desde.value, hasta: hasta.value }).then(function (d) {
          ui.semana = d; ui.desde = d.desde; ui.editando = null; ui.resultado = textoLote(d.lote); repintar();
        }).catch(function (e) { bAplicar.textContent = texto; actualizar(); zona.appendChild(aviso('error', e.mensaje)); });
      });
      desde.addEventListener('change', function () { if (hasta.value < desde.value) hasta.value = desde.value; actualizar(); });
      hasta.addEventListener('change', actualizar);
      actualizar();
      return [volver, h('p', { clase: 'seccion', texto: '1 · Qué quieres hacer' }), h('div', { clase: 'tarjeta', style: 'margin-bottom:8px' }, radios),
        h('p', { clase: 'seccion', texto: '2 · De qué actividades' })].concat(listas).concat([
        h('p', { clase: 'seccion', texto: '3 · Entre qué fechas' }),
        h('div', { clase: 'tarjeta' }, [h('div', { clase: 'dos' }, [U.campo('Desde', desde), U.campo('Hasta', hasta)]), resumen, bAplicar, zona]),
        h('p', { clase: 'subtitulo', style: 'margin-top:12px', texto: 'Las sesiones que ya han pasado no se tocan nunca. Para una sola sesión, tócala en la Semana.' })
      ]);
    }

    // ------------------------------------------------ actividades
    function vistaActividades() {
      var g = ui.gestion;
      if (!g) return [];
      var lugares = {}; g.lugares.forEach(function (l) { lugares[l.id] = l.nombre; });
      var nodos = [];
      if (!g.lugares.some(function (l) { return l.activo; })) {
        nodos.push(h('div', { clase: 'aviso info', texto: esBoss ? 'Primero crea al menos un lugar (pestaña Lugares).' : 'Aún no hay lugares activos: pídele al Boss que cree uno.' }));
        return nodos;
      }
      if (ui.resultado) { nodos.push(aviso('ok', ui.resultado)); ui.resultado = null; }
      if (!esBoss) nodos.push(h('p', { clase: 'subtitulo', style: 'margin:0 4px 4px', texto: 'Las actividades que creas tú. Las que te asigna el Boss las cambia él.' }));
      nodos.push(h('button', { clase: 'boton', type: 'button', texto: '+ Nueva actividad', alClick: function () { ui.editando = function () { return editorActividad(null); }; repintar(); } }));
      if (!g.actividades.length) { nodos.push(h('div', { clase: 'vacio tarjeta', style: 'margin-top:12px' }, [h('p', { texto: esBoss ? 'Aún no hay actividades.' : 'Aún no has creado ninguna actividad.' })])); return nodos; }
      nodos.push(h('div', { clase: 'grupo', style: 'margin-top:12px' }, g.actividades.map(function (a) {
        var franjas = a.horario.map(function (x) { return DIAS_CORTOS[x.dia_semana] + ' ' + x.hora_inicio; }).join(', ') || 'Sin horario';
        return h('button', { clase: 'fila', type: 'button', alClick: function () { ui.editando = function () { return editorActividad(a); }; repintar(); } }, [
          window.FitclubActividad.miniatura(h, a, 54), // alto de las tres líneas de texto
          h('div', { clase: 'principal' }, [h('span', { texto: a.nombre }), h('small', { texto: franjas }),
            h('small', { texto: (lugares[a.lugar_id] || '') + (a.cupo === '' ? '' : ' · ' + a.cupo + ' plazas') + (esBoss && a.creado_por && a.creado_por !== 'ti' ? ' · creada por ' + a.creado_por : '') })]),
          a.activa ? U.icono('chev', 18) : h('span', { clase: 'etiqueta', texto: 'Inactiva' })
        ]);
      })));
      return nodos;
    }

    /** Borrar la actividad con todo lo suyo: primero muestra el recuento y pide escribir su nombre. */
    function zonaBorrar(a) {
      var caja = h('div', { clase: 'zona-peligro' });
      var abrir = h('button', { clase: 'boton peligro', type: 'button', id: 'borrarActividad', texto: 'Borrar actividad…', alClick: function () {
        abrir.disabled = true; abrir.textContent = 'Contando sesiones…';
        U.Api.llamar('actividades.borrar', { id: a.id, simular: true }).then(function (r) {
          caja.innerHTML = '';
          var partes = [plural(r.sesiones, 'sesión', 'sesiones'), plural(r.reservas, 'reserva', 'reservas'), plural(r.asistencias, 'marca de asistencia', 'marcas de asistencia')];
          caja.appendChild(h('p', { clase: 'borrar-resumen' }, ['Se borrará «', h('strong', { texto: r.nombre }), '» con ' + partes.join(', ') + '. No se puede deshacer.']));
          if (r.futuras_con_reserva) caja.appendChild(aviso('error', plural(r.futuras_con_reserva, 'sesión próxima tiene', 'sesiones próximas tienen') + ' gente apuntada. No se les avisa: díselo tú antes.'));
          var conf = h('input', { type: 'text', id: 'aConfirmar', autocomplete: 'off', placeholder: r.nombre });
          caja.appendChild(U.campo('Para confirmar, escribe el nombre de la actividad', conf));
          var zonaB = h('div', {});
          var bSi = h('button', { clase: 'boton peligro', type: 'button', id: 'confirmarBorrar', texto: 'Borrar definitivamente', alClick: function () {
            bSi.disabled = true; bSi.textContent = 'Borrando…'; zonaB.innerHTML = '';
            U.Api.llamar('actividades.borrar', { id: a.id, confirmacion: conf.value }).then(function (d) {
              ui.gestion = d; ui.opciones = null; ui.semana = null; ui.editando = null; ui.resultado = d.mensaje; repintar();
            }).catch(function (e) { bSi.disabled = false; bSi.textContent = 'Borrar definitivamente'; zonaB.appendChild(aviso('error', e.mensaje)); });
          } });
          caja.appendChild(bSi);
          caja.appendChild(h('button', { clase: 'boton secundario', type: 'button', texto: 'No borrar', alClick: function () { caja.parentNode.replaceChild(zonaBorrar(a), caja); } }));
          caja.appendChild(zonaB);
        }).catch(function (e) { abrir.disabled = false; abrir.textContent = 'Borrar actividad…'; caja.appendChild(aviso('error', e.mensaje)); });
      } });
      caja.appendChild(abrir);
      caja.appendChild(h('p', { clase: 'subtitulo', style: 'margin-top:6px', texto: 'Borra también todas sus sesiones, reservas y listas. Útil para datos de prueba o errores; para dejar de usarla, mejor desmárcala como activa.' }));
      return caja;
    }

    function editorActividad(a) {
      var g = ui.gestion;
      a = a || { nombre: '', descripcion: '', lugar_id: g.lugares[0].id, coach_id: (g.coaches[0] || {}).id, cupo: '', horas_cancelacion: '', dias_apertura: '', activa: true, horario: [] };
      var nombre = h('input', { type: 'text', id: 'aNombre', maxlength: '60', value: a.nombre });
      var desc = h('textarea', { id: 'aDesc', maxlength: '500', rows: '3' }); desc.value = a.descripcion || '';
      if (!a.lugar_id || !g.lugares.some(function (l) { return l.id === a.lugar_id && l.activo; })) a.lugar_id = a.lugar_id || ((g.lugares.filter(function (l) { return l.activo; })[0] || {}).id);
      var lugar = h('select', { id: 'aLugar' }, g.lugares.filter(function (l) { return l.activo || l.id === a.lugar_id; }).map(function (l) { return h('option', { value: l.id, selected: l.id === a.lugar_id, texto: l.nombre }); }));
      var coach = h('select', { id: 'aCoach' }, g.coaches.map(function (c) { return h('option', { value: c.id, selected: c.id === a.coach_id, texto: c.nombre }); }));
      var nueva = !a.id;
      var cupo = h('input', { type: 'number', id: 'aCupo', min: '1', max: '500', inputmode: 'numeric', placeholder: 'Sin límite', value: a.cupo === '' ? '' : String(a.cupo) });
      var horas = h('input', { type: 'number', id: 'aHoras', min: '0', max: '168', inputmode: 'numeric', placeholder: 'General: ' + g.general.horas_cancelacion, value: a.horas_cancelacion === '' ? '' : String(a.horas_cancelacion) });
      var dias = h('input', { type: 'number', id: 'aDias', min: '0', max: '60', inputmode: 'numeric', placeholder: 'General: ' + g.general.dias_apertura, value: a.dias_apertura === '' ? '' : String(a.dias_apertura) });
      var activa = h('input', { type: 'checkbox', id: 'aActiva' }); activa.checked = a.activa !== false;
      var mostrar = h('input', { type: 'checkbox', id: 'aMostrar' }); mostrar.checked = a.mostrar_antes !== false;
      // Color e icono: «Automático» = el servidor elige (icono por el nombre, color fijo por actividad).
      var FA = window.FitclubActividad;
      var eleccion = { color: a.color_elegido || '', icono: a.icono_elegido || '', imagen: null }; // imagen: null = sin cambios; '' = quitar
      var muestra = h('span', {});
      function pintarMuestra() {
        muestra.innerHTML = '';
        var m = { id: a.id, color: eleccion.color || a.color || '#475569', icono: eleccion.icono || a.icono || 'fuerza', imagen_v: eleccion.imagen === null ? a.imagen_v : '', imagen: eleccion.imagen || '' };
        muestra.appendChild(FA.miniatura(h, m, 64));
        if (bQuitarImg) bQuitarImg.hidden = !(eleccion.imagen || (eleccion.imagen === null && a.imagen_v));
      }
      // Imagen propia: se reduce en el móvil a 96×96 y pocos KB antes de enviarla.
      var bQuitarImg = null;
      var archivo = h('input', { type: 'file', accept: 'image/*', id: 'aImagen', 'aria-label': 'Elegir imagen de la actividad' });
      var avisoImg = h('div', {});
      archivo.addEventListener('change', function () {
        avisoImg.innerHTML = '';
        if (!archivo.files[0]) return;
        FA.reducirImagen(archivo.files[0]).then(function (d) {
          eleccion.imagen = d; pintarMuestra();
          avisoImg.appendChild(h('p', { clase: 'subtitulo', style: 'margin:6px 0 0', texto: 'Imagen lista (' + Math.max(1, Math.round(d.length * 0.75 / 1024)) + ' KB). Se guarda al pulsar «Guardar actividad».' }));
        }).catch(function (e) { avisoImg.appendChild(aviso('error', e.message)); });
        archivo.value = '';
      });
      bQuitarImg = h('button', { clase: 'boton-mini secundario', type: 'button', texto: 'Quitar imagen', alClick: function () { eleccion.imagen = ''; pintarMuestra(); avisoImg.innerHTML = ''; } });
      var zonaImagen = h('div', { clase: 'imagen-actividad' }, [archivo,
        h('label', { clase: 'boton-mini secundario', for: 'aImagen', texto: 'Subir imagen' }), bQuitarImg]);
      function selector(clase, valores, clave, dibujo, etiqueta) {
        var caja = h('div', { clase: clase, role: 'group', 'aria-label': etiqueta });
        function marcar() { caja.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b._v === eleccion[clave] ? 'true' : 'false'); }); pintarMuestra(); }
        [''].concat(valores).forEach(function (v) {
          var b = v ? dibujo(v) : h('button', { type: 'button', clase: 'auto', texto: 'Automático' });
          b._v = v; b.addEventListener('click', function () { eleccion[clave] = v; marcar(); });
          caja.appendChild(b);
        });
        marcar();
        return caja;
      }
      var selColor = selector('selector-color', FA.colores, 'color', function (c) { return h('button', { type: 'button', style: 'background:' + c, 'aria-label': 'Color ' + c, id: 'aColor' + c.slice(1) }); }, 'Color de la actividad');
      var NOMBRES_ICONO = FA.nombresIconos;
      var selIcono = selector('selector-icono', FA.iconos, 'icono', function (n) { var b = h('button', { type: 'button', 'aria-label': 'Icono ' + NOMBRES_ICONO[n], id: 'aIcono' + n }); b.appendChild(FA.svg(n, 22)); return b; }, 'Icono de la actividad');
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
        var datos = { id: a.id, nombre: nombre.value, descripcion: desc.value, lugar_id: lugar.value, coach_id: coach.value,
          cupo: cupo.value, horas_cancelacion: horas.value, dias_apertura: dias.value, activa: activa.checked, mostrar_antes: mostrar.checked, horario: filas, color: eleccion.color, icono: eleccion.icono };
        if (eleccion.imagen !== null) datos.imagen = eleccion.imagen;
        U.Api.llamar('actividades.guardar', datos)
          .then(function (d) { ui.gestion = d; ui.opciones = null; ui.editando = null; repintar(); })
          .catch(function (e) { bGuardar.disabled = false; bGuardar.textContent = 'Guardar actividad'; zona.appendChild(aviso('error', e.mensaje)); });
      } });
      return [
        h('button', { clase: 'volver', type: 'button', texto: '‹ Actividades', alClick: function () { ui.editando = null; repintar(); } }),
        h('div', { clase: 'tarjeta' }, [
          U.campo('Nombre', nombre), U.campo('Descripción (la verán los clientes)', desc),
          U.campo('Lugar', lugar), esBoss ? U.campo('Coach', coach) : null,
          U.campo('Plazas por sesión', cupo, 'Vacío = sin límite. Puedes ponerlo cuando quieras.'),
          h('p', { clase: 'seccion', style: 'margin-left:0', texto: 'Color e icono, o una imagen propia (se ven en el Inicio y en la Agenda)' }),
          h('div', { style: 'display:flex;gap:14px;align-items:flex-start;margin-bottom:12px' }, [muestra, h('div', { style: 'display:flex;flex-direction:column;gap:10px;flex:1;min-width:0' }, [selColor, selIcono, zonaImagen, avisoImg])]),
          h('p', { clase: 'seccion', style: 'margin-left:0', texto: 'Horario semanal' }), franjas, anadir,
          h('p', { clase: 'seccion', style: 'margin-left:0', texto: 'Reservas (vacío = valor general)' }),
          h('div', { clase: 'dos' }, [U.campo('Horas para cancelar', horas), U.campo('Días de apertura', dias)]),
          h('label', { clase: 'casilla', for: 'aMostrar' }, [mostrar, h('span', { texto: 'Los clientes ven las sesiones antes de que se abra la inscripción (con los días que faltan). Si lo desmarcas, aparecen al abrirse.' })]),
          h('label', { clase: 'casilla', for: 'aActiva', style: 'margin-top:8px' }, [activa, h('span', { texto: 'Actividad activa (si no, no se generan sesiones nuevas)' })]),
          bGuardar, zona,
          nueva ? null : zonaBorrar(a)
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

  window.VistaAgenda.reiniciar = function () { ui = { modo: 'semana', desde: null, semana: null, gestion: null, opciones: null, resultado: null, error: null, editando: null }; };
})();
