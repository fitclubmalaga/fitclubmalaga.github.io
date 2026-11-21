// Hito 1.3 · Pestaña Agenda.
// Boss: Semana (generar, ajustar y cancelar sesiones) · Actividades (con horario semanal) · Lugares.
// Cliente y coach: la semana con lugar, hora, coach y plazas (las reservas llegan en el hito 1.4).
(function () {
  'use strict';
  var DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var ui = { modo: 'semana', desde: null, semana: null, gestion: null, editando: null };

  function sumarDias(iso, n) {
    var p = iso.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function diaMes(iso) { var p = iso.split('-'); return +p[2] + ' ' + MESES[+p[1] - 1]; }
  function textoPlazas(s) {
    if (s.cupo === '' || s.cupo === null) return { texto: 'Sin límite de plazas', clase: '' };
    if (s.libres === 0) return { texto: 'Completa', clase: 'completa' };
    return { texto: 'Quedan ' + s.libres + ' de ' + s.cupo, clase: '' };
  }

  window.VistaAgenda = function (U, usuario) {
    var h = U.h, aviso = U.aviso;
    var esBoss = usuario.rol === 'BOSS';
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
      if (esBoss) nodos.push(tarjetaGenerar());
      if (!d.sesiones.length) {
        nodos.push(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: esBoss ? 'No hay sesiones esta semana. Crea actividades con su horario y pulsa «Generar».' : 'No hay actividades programadas esta semana.' })]));
        return nodos;
      }
      var porDia = {};
      d.sesiones.forEach(function (s) { (porDia[s.fecha] = porDia[s.fecha] || []).push(s); });
      Object.keys(porDia).sort().forEach(function (f) {
        var ss = porDia[f];
        nodos.push(h('p', { clase: 'seccion', texto: (f === d.hoy ? 'Hoy · ' : '') + ss[0].dia + ' ' + diaMes(f) }));
        nodos.push(h('div', { clase: 'grupo' }, ss.map(function (s) { return filaSesion(s); })));
      });
      if (!esBoss) nodos.push(h('p', { clase: 'subtitulo', style: 'text-align:center;margin-top:16px', texto: 'Muy pronto podrás reservar tu plaza desde aquí.' }));
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
      if (!esBoss) return h('div', { clase: 'fila sesion' }, contenido);
      return h('button', { clase: 'fila sesion', type: 'button', 'aria-label': 'Editar ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio, alClick: function () { ui.editando = function () { return editorSesion(s); }; repintar(); } }, contenido.concat([U.icono('chev', 18)]));
    }

    function tarjetaGenerar() {
      var semanas = h('select', { id: 'semanasGenerar', 'aria-label': 'Semanas' }, [2, 4, 8, 12].map(function (n) { return h('option', { value: String(n), selected: n === 4, texto: n + ' semanas' }); }));
      var zona = h('div', {});
      var b = h('button', { clase: 'boton', type: 'button', texto: 'Generar sesiones', alClick: function () {
        b.disabled = true; b.textContent = 'Generando…'; zona.innerHTML = '';
        U.Api.llamar('sesiones.generar', { desde: ui.semana.hoy > ui.semana.desde ? ui.semana.hoy : ui.semana.desde, semanas: Number(semanas.value) }).then(function (d) {
          ui.semana = d; ui.desde = d.desde; repintar();
          caja.insertBefore(aviso('ok', d.creadas ? 'Creadas ' + d.creadas + ' sesiones nuevas.' : 'No había sesiones nuevas que crear: ya estaban todas.'), caja.children[2] || null);
        }).catch(function (e) { b.disabled = false; b.textContent = 'Generar sesiones'; zona.appendChild(aviso('error', e.mensaje)); });
      } });
      return h('div', { clase: 'tarjeta', style: 'margin-bottom:8px' }, [
        h('p', { style: 'margin:0 0 8px', texto: 'Crea las sesiones a partir del horario de cada actividad, desde esta semana. No duplica las que ya existen.' }),
        semanas, b, zona
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
          .then(function (d) { ui.gestion = d; ui.editando = null; repintar(); })
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
      nodos.push(h('div', { clase: 'grupo', style: 'margin-top:12px' }, g.lugares.map(function (l) {
        return h('button', { clase: 'fila', type: 'button', alClick: function () { ui.editando = function () { return editorLugar(l); }; repintar(); } }, [
          h('div', { clase: 'principal' }, [h('span', { texto: l.nombre }), h('small', { texto: l.direccion || '—' })]),
          l.activo ? U.icono('chev', 18) : h('span', { clase: 'etiqueta', texto: 'Inactivo' })
        ]);
      })));
      return nodos;
    }

    function editorLugar(l) {
      l = l || { nombre: '', direccion: '', notas: '', activo: true };
      var nombre = h('input', { type: 'text', id: 'lNombre', maxlength: '80', value: l.nombre });
      var dir = h('input', { type: 'text', id: 'lDir', maxlength: '160', value: l.direccion || '', placeholder: 'Para que los clientes lo encuentren' });
      var notas = h('textarea', { id: 'lNotas', maxlength: '300', rows: '2' }); notas.value = l.notas || '';
      var activo = h('input', { type: 'checkbox', id: 'lActivo' }); activo.checked = l.activo !== false;
      var zona = h('div', {});
      var b = h('button', { clase: 'boton', type: 'button', texto: 'Guardar lugar', alClick: function () {
        b.disabled = true; b.textContent = 'Guardando…'; zona.innerHTML = '';
        U.Api.llamar('lugares.guardar', { id: l.id, nombre: nombre.value, direccion: dir.value, notas: notas.value, activo: activo.checked })
          .then(function (d) { ui.gestion = d; ui.editando = null; repintar(); })
          .catch(function (e) { b.disabled = false; b.textContent = 'Guardar lugar'; zona.appendChild(aviso('error', e.mensaje)); });
      } });
      return [
        h('button', { clase: 'volver', type: 'button', texto: '‹ Lugares', alClick: function () { ui.editando = null; repintar(); } }),
        h('div', { clase: 'tarjeta' }, [U.campo('Nombre', nombre), U.campo('Dirección', dir), U.campo('Notas internas', notas),
          h('label', { clase: 'casilla', for: 'lActivo' }, [activo, h('span', { texto: 'Lugar activo' })]), b, zona])
      ];
    }

    cargar();
    return [caja];
  };

  window.VistaAgenda.reiniciar = function () { ui = { modo: 'semana', desde: null, semana: null, gestion: null, editando: null }; };
})();
