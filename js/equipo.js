// Hito 1.5 · Coach y Boss.
// Coach, pestaña Sesiones: «Mis sesiones» (con la lista de cada una para pasar lista) y «Semana del club» (la Agenda).
// Coach, pestaña Participantes: sus clientes, con asistencias y faltas; dar de baja de una actividad o del club.
// Boss, pestaña Resumen: números del club y las sesiones de hoy (con su lista). En la Agenda, cada sesión tiene «Participantes y lista».
(function () {
  'use strict';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function diaMes(iso) { var p = iso.split('-'); return +p[2] + ' ' + MESES[+p[1] - 1]; }
  function sumarDias(iso, n) { var p = iso.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  var estado = { modoCoach: 'mias', mias: null, lista: null, participantes: null, persona: null, resumen: null };

  // ------------------------------------------------------------------ lista de una sesión (Coach y Boss)
  /** Pinta la lista de la sesión en `caja`. `volver` = función para salir. */
  function pintarLista(U, caja, sesionId, volver) {
    var h = U.h, aviso = U.aviso;
    zonaAnadir.U = U;
    caja.innerHTML = '';
    caja.appendChild(h('button', { clase: 'volver', type: 'button', texto: '‹ Volver', alClick: volver }));
    caja.appendChild(h('div', { clase: 'cargando', style: 'min-height:20vh', texto: 'Cargando la lista…' }));
    U.Api.llamar('sesion.participantes', { sesion_id: sesionId }).then(function (d) { dibujar(d); })
      .catch(function (e) { caja.appendChild(aviso('error', e.mensaje)); });

    function dibujar(d, mensaje) {
      var s = d.sesion;
      var marcas = {}; // usuario_id → estado nuevo (solo lo cambiado)
      caja.innerHTML = '';
      caja.appendChild(h('button', { clase: 'volver', type: 'button', texto: '‹ Volver', alClick: volver }));
      caja.appendChild(h('div', { clase: 'tarjeta cabecera-lista' }, [
        h('h2', { texto: s.actividad }),
        h('p', { clase: 'subtitulo', texto: s.dia + ' ' + diaMes(s.fecha) + ' · ' + s.hora_inicio + '-' + s.hora_fin + ' · ' + s.lugar }),
        h('div', { clase: 'chips' }, [
          h('span', { clase: 'chip', texto: plural(d.resumen.apuntados, 'apuntado', 'apuntados') + (s.cupo !== '' ? ' de ' + s.cupo : '') }),
          h('span', { clase: 'chip ok', id: 'cAsis', texto: plural(d.resumen.asistieron, 'vino', 'vinieron') }),
          h('span', { clase: 'chip mal', id: 'cFaltas', texto: plural(d.resumen.faltaron, 'faltó', 'faltaron') })
        ])
      ]));
      if (mensaje) caja.appendChild(aviso('ok', mensaje));
      if (!d.puede_pasar_lista) caja.appendChild(h('div', { clase: 'aviso info', texto: d.motivo_lista }));
      var anadir = s.estado === 'PROGRAMADA' ? zonaAnadir(s, function (r) { dibujar(r, r.mensaje); }) : null;
      if (!d.participantes.length) {
        caja.appendChild(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'Aún no hay nadie apuntado.' })]));
        if (anadir) caja.appendChild(anadir);
        return;
      }
      var zona = h('div', {});
      var bGuardar = h('button', { clase: 'boton', type: 'button', id: 'guardarLista', texto: 'Guardar lista', alClick: guardar });
      bGuardar.disabled = true;
      function actual(p) { return marcas[p.usuario_id] !== undefined ? marcas[p.usuario_id] : p.asistencia; }
      function contar() {
        var v = 0, f = 0;
        d.participantes.forEach(function (p) { var a = actual(p); if (a === 'ASISTIO') v++; else if (a === 'FALTA') f++; });
        document.getElementById('cAsis').textContent = plural(v, 'vino', 'vinieron');
        document.getElementById('cFaltas').textContent = plural(f, 'faltó', 'faltaron');
        bGuardar.disabled = !Object.keys(marcas).length;
      }
      var filas = d.participantes.map(function (p) {
        var bSi = h('button', { type: 'button', clase: 'marca-lista si', 'aria-label': p.nombre + ' vino', texto: '✓ Vino' });
        var bNo = h('button', { type: 'button', clase: 'marca-lista no', 'aria-label': p.nombre + ' faltó', texto: '✗ Faltó' });
        function pintar() {
          var a = actual(p);
          bSi.setAttribute('aria-pressed', a === 'ASISTIO' ? 'true' : 'false');
          bNo.setAttribute('aria-pressed', a === 'FALTA' ? 'true' : 'false');
        }
        function elegir(est) {
          var nuevo = actual(p) === est ? '' : est; // tocar otra vez la misma, la quita
          if (nuevo === p.asistencia) delete marcas[p.usuario_id]; else marcas[p.usuario_id] = nuevo;
          pintar(); contar();
        }
        bSi.addEventListener('click', function () { elegir('ASISTIO'); });
        bNo.addEventListener('click', function () { elegir('FALTA'); });
        bSi.disabled = bNo.disabled = !d.puede_pasar_lista;
        pintar();
        p._pintar = pintar;
        var nota = p.reserva && p.reserva !== 'CONFIRMADA' ? ' · reserva cancelada' : '';
        return h('div', { clase: 'fila participante' }, [
          U.circulo({ nombre: p.nombre, apellidos: p.apellidos, foto: p.foto }, { clase: 'mini', ampliable: true }),
          h('div', { clase: 'principal', style: 'flex:1;min-width:0' }, [h('span', { texto: (p.nombre + ' ' + p.apellidos).trim() }), nota ? h('small', { texto: nota.slice(3) }) : null]),
          h('div', { clase: 'marcas' }, [bSi, bNo])
        ]);
      });
      caja.appendChild(h('div', { clase: 'grupo' }, filas));
      if (d.puede_pasar_lista) {
        caja.appendChild(h('button', { clase: 'boton enlace', type: 'button', id: 'todosVinieron', texto: 'Marcar a todos como que vinieron', alClick: function () {
          d.participantes.forEach(function (p) { if (actual(p) !== 'ASISTIO') { if (p.asistencia === 'ASISTIO') delete marcas[p.usuario_id]; else marcas[p.usuario_id] = 'ASISTIO'; } p._pintar(); });
          contar();
        } }));
        caja.appendChild(bGuardar);
        caja.appendChild(zona);
      }
      if (anadir) caja.appendChild(anadir);
      function guardar() {
        var lista = Object.keys(marcas).map(function (k) { return { usuario_id: k, estado: marcas[k] }; });
        bGuardar.disabled = true; bGuardar.textContent = 'Guardando…'; zona.innerHTML = '';
        U.Api.llamar('asistencia.guardar', { sesion_id: s.id, marcas: lista }).then(function (r) { estado.mias = null; estado.resumen = null; dibujar(r, r.mensaje); })
          .catch(function (e) { bGuardar.disabled = false; bGuardar.textContent = 'Guardar lista'; zona.appendChild(aviso('error', e.mensaje)); });
      }
    }
  }

  /** «Añadir cliente»: buscador de clientes activos; al tocar uno, se le apunta a la sesión (coach o Boss, en cualquier momento). */
  function zonaAnadir(s, alTerminar) {
    var U = zonaAnadir.U, h = U.h, aviso = U.aviso;
    var caja = h('div', { clase: 'anadir-cliente' });
    var abrir = h('button', { clase: 'boton secundario', type: 'button', id: 'anadirCliente', texto: '+ Añadir cliente', alClick: function () {
      caja.innerHTML = '';
      var buscador = h('input', { type: 'search', id: 'buscarCliente', placeholder: 'Nombre, apellidos o email', autocomplete: 'off', 'aria-label': 'Buscar cliente' });
      var resultados = h('div', { clase: 'grupo', style: 'margin-top:8px' });
      var zona = h('div', {});
      var temporizador = null;
      buscador.addEventListener('input', function () {
        clearTimeout(temporizador);
        temporizador = setTimeout(function () {
          var texto = buscador.value.trim();
          resultados.innerHTML = '';
          if (texto.length < 2) return;
          U.Api.llamar('clientes.buscar', { texto: texto }).then(function (r) {
            if (buscador.value.trim() !== texto) return;
            resultados.innerHTML = '';
            if (!r.clientes.length) { resultados.appendChild(h('div', { clase: 'fila' }, [h('span', { clase: 'subtitulo', texto: 'Nadie con ese nombre entre los clientes activos.' })])); return; }
            r.clientes.forEach(function (c) {
              resultados.appendChild(h('button', { clase: 'fila', type: 'button', alClick: function (ev) {
                ev.currentTarget.disabled = true; zona.innerHTML = '';
                U.Api.llamar('sesion.anadirCliente', { sesion_id: s.id, usuario_id: c.id }).then(alTerminar)
                  .catch(function (e) { ev.currentTarget.disabled = false; zona.appendChild(aviso('error', e.mensaje)); });
              } }, [U.circulo(c, { clase: 'mini' }), h('span', { style: 'flex:1', texto: (c.nombre + ' ' + c.apellidos).trim() }), h('span', { clase: 'etiqueta', texto: 'Añadir' })]));
            });
          }).catch(function (e) { zona.appendChild(aviso('error', e.mensaje)); });
        }, 300);
      });
      caja.appendChild(h('div', { clase: 'tarjeta', style: 'margin-top:12px' }, [h('p', { clase: 'seccion', style: 'margin:0 0 8px', texto: 'Añadir cliente a esta sesión' }), buscador, resultados, zona,
        h('p', { clase: 'subtitulo', style: 'margin:8px 0 0;font-size:13px', texto: 'Se le apunta aunque no esté abierta la inscripción o esté completa. Lo verá en sus reservas.' })]));
      buscador.focus();
    } });
    caja.appendChild(abrir);
    return caja;
  }

  // ------------------------------------------------------------------ Coach · Sesiones (Mis sesiones | Semana del club)
  window.VistaCoachSesiones = function (U, usuario) {
    var h = U.h, aviso = U.aviso;
    var raiz = h('div', {});
    var cuerpo = h('div', {});
    function segmento() {
      return h('div', { clase: 'segmento', role: 'group', 'aria-label': 'Sección' }, [['mias', 'Mis sesiones'], ['semana', 'Semana del club']].map(function (m) {
        return h('button', { type: 'button', 'aria-pressed': estado.modoCoach === m[0] ? 'true' : 'false', texto: m[1], alClick: function () { estado.modoCoach = m[0]; pintar(); } });
      }));
    }
    function pintar() {
      raiz.innerHTML = '';
      if (estado.lista) {
        raiz.appendChild(cuerpo);
        pintarLista(U, cuerpo, estado.lista, function () { estado.lista = null; pintar(); });
        return;
      }
      raiz.appendChild(segmento());
      raiz.appendChild(cuerpo);
      cuerpo.innerHTML = '';
      if (estado.modoCoach === 'semana') { (window.VistaAgenda(U, usuario) || []).forEach(function (n) { cuerpo.appendChild(n); }); return; }
      if (estado.mias) dibujarMias(); else cuerpo.appendChild(h('div', { clase: 'cargando', style: 'min-height:20vh', texto: 'Cargando tus sesiones…' }));
      U.Api.llamar('coach.misSesiones').then(function (d) { estado.mias = d; if (estado.modoCoach === 'mias' && !estado.lista) dibujarMias(); })
        .catch(function (e) { cuerpo.appendChild(aviso('error', e.mensaje)); });
    }
    function dibujarMias() {
      var d = estado.mias;
      cuerpo.innerHTML = '';
      var proximas = d.sesiones.filter(function (s) { return !s.pasada; });
      var pasadas = d.sesiones.filter(function (s) { return s.pasada; }).reverse();
      if (!d.sesiones.length) {
        cuerpo.appendChild(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'No tienes sesiones asignadas en estas dos semanas. Las verás aquí cuando el Boss te ponga como coach de alguna actividad.' })]));
        return;
      }
      var porDia = {};
      proximas.forEach(function (s) { (porDia[s.fecha] = porDia[s.fecha] || []).push(s); });
      Object.keys(porDia).sort().forEach(function (f) {
        var etiqueta = f === d.hoy ? 'Hoy · ' : f === sumarDias(d.hoy, 1) ? 'Mañana · ' : '';
        cuerpo.appendChild(h('p', { clase: 'seccion', texto: etiqueta + porDia[f][0].dia + ' ' + diaMes(f) }));
        cuerpo.appendChild(h('div', { clase: 'grupo' }, porDia[f].map(fila)));
      });
      if (pasadas.length) {
        cuerpo.appendChild(h('p', { clase: 'seccion', texto: 'Últimos 7 días' }));
        cuerpo.appendChild(h('div', { clase: 'grupo' }, pasadas.map(fila)));
      }
    }
    function fila(s) {
      var cancelada = s.estado === 'CANCELADA';
      var etiqueta = cancelada ? h('span', { clase: 'etiqueta', texto: 'Cancelada' })
        : s.en_curso ? h('span', { clase: 'etiqueta ok', texto: 'Ahora' })
        : s.pasada && s.apuntados && !s.lista_pasada ? h('span', { clase: 'etiqueta aviso', texto: 'Lista pendiente' })
        : s.pasada && s.lista_pasada ? h('span', { clase: 'etiqueta ok', texto: 'Lista ✓' }) : null;
      return h('button', { clase: 'fila sesion', type: 'button', 'aria-label': 'Lista de ' + s.actividad + ' ' + s.dia + ' ' + s.hora_inicio, alClick: function () { estado.lista = s.id; pintar(); } }, [
        h('div', { clase: 'hora' }, [h('strong', { texto: s.hora_inicio }), h('small', { texto: s.hora_fin })]),
        h('div', { clase: 'barra' + (cancelada ? ' apagada' : '') }),
        h('div', { clase: 'principal', style: 'flex:1;min-width:0' }, [
          h('span', { style: cancelada ? 'text-decoration:line-through' : '', texto: s.actividad }),
          h('small', { texto: s.lugar + (s.pasada ? '' : ' · ' + (s.fecha ? s.dia + ' ' + diaMes(s.fecha) : '')) }),
          h('small', { texto: plural(s.apuntados, 'apuntado', 'apuntados') + (s.cupo !== '' ? ' de ' + s.cupo : '') })
        ]),
        etiqueta, U.icono('chev', 18)
      ]);
    }
    pintar();
    return [raiz];
  };

  // ------------------------------------------------------------------ Coach · Participantes
  window.VistaParticipantes = function (U) {
    var h = U.h, aviso = U.aviso;
    var caja = h('div', {});
    var mensaje = null;
    function cargar() {
      if (!estado.participantes) caja.appendChild(h('div', { clase: 'cargando', style: 'min-height:20vh', texto: 'Cargando…' }));
      U.Api.llamar('coach.participantes').then(function (d) { estado.participantes = d; pintar(); })
        .catch(function (e) { caja.appendChild(aviso('error', e.mensaje)); });
    }
    function pintar() {
      caja.innerHTML = '';
      var d = estado.participantes;
      if (mensaje) { caja.appendChild(aviso('ok', mensaje)); mensaje = null; }
      if (estado.persona) {
        var p = d.personas.filter(function (x) { return x.id === estado.persona; })[0];
        if (p) return ficha(p);
        estado.persona = null;
      }
      if (!d.personas.length) {
        caja.appendChild(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'Aquí aparecerán las personas que reserven en tus sesiones.' })]));
        return;
      }
      var deBajaClub = d.personas.filter(function (p) { return p.estado !== 'ACTIVO'; }).length;
      caja.appendChild(h('div', { clase: 'chips', style: 'margin-bottom:10px' }, [
        h('span', { clase: 'chip', texto: plural(d.personas.length, 'persona', 'personas') }),
        h('span', { clase: 'chip' + (d.bajas_actividad ? ' mal' : ''), texto: plural(d.bajas_actividad, 'baja', 'bajas') + ' en tus actividades' }),
        h('span', { clase: 'chip' + (deBajaClub ? ' mal' : ''), texto: plural(deBajaClub, 'baja', 'bajas') + ' del club' })
      ]));
      caja.appendChild(h('div', { clase: 'grupo' }, d.personas.map(function (p) {
        var datos = [plural(p.asistencias, 'asistencia', 'asistencias'), plural(p.faltas, 'falta', 'faltas'), plural(p.proximas, 'próxima', 'próximas')].join(' · ');
        return h('button', { clase: 'fila', type: 'button', alClick: function () { estado.persona = p.id; pintar(); } }, [
          U.circulo(p, { clase: 'mini' }),
          h('div', { clase: 'principal', style: 'flex:1;min-width:0' }, [h('span', { texto: (p.nombre + ' ' + p.apellidos).trim() }), h('small', { texto: datos })]),
          p.estado !== 'ACTIVO' ? h('span', { clase: 'etiqueta', texto: 'De baja' }) : p.bajas.length ? h('span', { clase: 'etiqueta aviso', texto: 'Baja en ' + p.bajas.map(function (b) { return b.actividad; }).join(', ') }) : null,
          U.icono('chev', 18)
        ]);
      })));
    }
    function accion(texto, clase, llamada) {
      var zona = h('div', {});
      var b = h('button', { clase: 'boton ' + clase, type: 'button', texto: texto, alClick: function () {
        var prom = llamada();
        if (!prom) return;
        b.disabled = true; b.textContent = 'Guardando…'; zona.innerHTML = '';
        prom.then(function (r) { mensaje = r.mensaje; if (r.personas) estado.participantes = r; else { estado.participantes = null; estado.persona = null; return cargar(); } pintar(); })
          .catch(function (e) { b.disabled = false; b.textContent = texto; zona.appendChild(aviso('error', e.mensaje)); });
      } });
      return h('div', {}, [b, zona]);
    }
    function ficha(p) {
      var d = estado.participantes;
      caja.appendChild(h('button', { clase: 'volver', type: 'button', texto: '‹ Participantes', alClick: function () { estado.persona = null; pintar(); } }));
      caja.appendChild(h('div', { clase: 'perfil-foto' }, [U.circulo(p, { clase: 'mediano', ampliable: true }), h('h2', { style: 'margin:0', texto: (p.nombre + ' ' + p.apellidos).trim() })]));
      caja.appendChild(h('div', { clase: 'grupo' }, [
        h('div', { clase: 'fila' }, [h('span', { texto: 'Asistencias' }), h('span', { clase: 'valor', texto: String(p.asistencias) })]),
        h('div', { clase: 'fila' }, [h('span', { texto: 'Faltas' }), h('span', { clase: 'valor', texto: String(p.faltas) })]),
        h('div', { clase: 'fila' }, [h('span', { texto: 'Próximas reservas' }), h('span', { clase: 'valor', texto: String(p.proximas) })]),
        h('div', { clase: 'fila' }, [h('span', { texto: 'Última vez' }), h('span', { clase: 'valor', texto: p.ultima ? diaMes(p.ultima) : '—' })])
      ]));
      if (p.estado !== 'ACTIVO') { caja.appendChild(h('p', { clase: 'subtitulo', texto: 'Esta persona está de baja del club.' })); return; }
      caja.appendChild(h('p', { clase: 'seccion', texto: 'Actividades' }));
      var bajas = {};
      p.bajas.forEach(function (b) { bajas[b.actividad_id] = b; });
      d.mis_actividades.forEach(function (a) {
        var b = bajas[a.id];
        if (b) caja.appendChild(accion('Permitir de nuevo ' + a.nombre, 'secundario', function () { return U.Api.llamar('usuarios.quitarBajaActividad', { baja_id: b.id }); }));
        else caja.appendChild(accion('Dar de baja de ' + a.nombre, 'secundario', function () {
          var motivo = prompt('Dar de baja a ' + p.nombre + ' de ' + a.nombre + '. Se anularán sus reservas futuras de esta actividad y no podrá reservarla.\n\nMotivo (opcional):', '');
          return motivo !== null && U.Api.llamar('usuarios.bajaActividad', { id: p.id, actividad_id: a.id, motivo: motivo });
        }));
      });
      caja.appendChild(h('p', { clase: 'seccion', texto: 'Club' }));
      caja.appendChild(accion('Dar de baja del club', 'peligro', function () {
        var motivo = prompt('Dar de baja a ' + p.nombre + ' del club. Motivo (opcional):', '');
        return motivo !== null && U.Api.llamar('usuarios.bajaClub', { id: p.id, motivo: motivo });
      }));
    }
    if (estado.participantes) pintar();
    cargar();
    return [caja];
  };

  // ------------------------------------------------------------------ Boss · Resumen
  window.VistaResumen = function (U) {
    var h = U.h, aviso = U.aviso;
    var caja = h('div', {});
    var lista = null;
    function pintar() {
      caja.innerHTML = '';
      if (lista) { pintarLista(U, caja, lista, function () { lista = null; pintar(); }); return; }
      var d = estado.resumen;
      function dato(valor, texto, extra) { return h('div', { clase: 'dato' + (extra ? ' ' + extra : '') }, [h('strong', { texto: valor === null ? '—' : String(valor) }), h('small', { texto: texto })]); }
      caja.appendChild(h('p', { clase: 'seccion', texto: 'Personas' }));
      caja.appendChild(h('div', { clase: 'datos' }, [dato(d.personas.clientes, 'clientes'), dato(d.personas.coaches, 'coaches'),
        dato(d.personas.pendientes, 'altas pendientes', d.personas.pendientes ? 'alerta' : ''), dato(d.personas.bajas_pedidas, 'bajas por revisar', d.personas.bajas_pedidas ? 'alerta' : ''),
        dato(d.personas.bajas_actividad, 'bajas en actividades'), dato(d.personas.bajas_club_30_dias, 'bajas del club (30 días)')]));
      caja.appendChild(h('p', { clase: 'seccion', texto: 'Esta semana · ' + diaMes(d.semana.desde) + ' – ' + diaMes(d.semana.hasta) }));
      caja.appendChild(h('div', { clase: 'datos' }, [dato(d.esta_semana.sesiones, 'sesiones'), dato(d.esta_semana.reservas, 'reservas'),
        dato(d.esta_semana.ocupacion === null ? null : d.esta_semana.ocupacion + ' %', 'ocupación (con cupo)')]));
      caja.appendChild(h('p', { clase: 'seccion', texto: 'Últimos 7 días' }));
      caja.appendChild(h('div', { clase: 'datos' }, [dato(d.ultimos_7_dias.asistencia === null ? null : d.ultimos_7_dias.asistencia + ' %', 'asistencia'),
        dato(d.ultimos_7_dias.asistencias, 'vinieron'), dato(d.ultimos_7_dias.faltas, 'faltaron'), dato(d.ultimos_7_dias.cancelaciones_tardias, 'cancelaciones tardías')]));
      caja.appendChild(h('p', { clase: 'seccion', texto: 'Hoy' }));
      if (!d.hoy_sesiones.length) caja.appendChild(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'Hoy no hay sesiones.' })]));
      else caja.appendChild(h('div', { clase: 'grupo' }, d.hoy_sesiones.map(function (s) {
        return h('button', { clase: 'fila sesion', type: 'button', 'aria-label': 'Lista de ' + s.actividad + ' ' + s.hora_inicio, alClick: function () { lista = s.id; pintar(); } }, [
          h('div', { clase: 'hora' }, [h('strong', { texto: s.hora_inicio }), h('small', { texto: s.hora_fin })]),
          h('div', { clase: 'barra' }),
          h('div', { clase: 'principal', style: 'flex:1;min-width:0' }, [h('span', { texto: s.actividad }), h('small', { texto: s.lugar + (s.coach ? ' · ' + s.coach : '') }),
            h('small', { texto: plural(s.apuntados, 'apuntado', 'apuntados') + (s.cupo !== '' ? ' de ' + s.cupo : '') })]),
          U.icono('chev', 18)
        ]);
      })));
    }
    if (estado.resumen) pintar(); else caja.appendChild(h('div', { clase: 'cargando', style: 'min-height:30vh', texto: 'Cargando el resumen…' }));
    U.Api.llamar('boss.resumen').then(function (d) { estado.resumen = d; if (!lista) pintar(); }).catch(function (e) { caja.appendChild(aviso('error', e.mensaje)); });
    return [caja];
  };

  window.FitclubEquipo = {
    pintarLista: pintarLista,
    reiniciar: function () { estado = { modoCoach: 'mias', mias: null, lista: null, participantes: null, persona: null, resumen: null }; }
  };
})();
