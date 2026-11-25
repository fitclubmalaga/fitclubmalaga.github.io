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
  // Hito 2.2 · dinero: céntimos → «5 €», «5,50 €» (con espacios duros para que no se parta la línea).
  function euros(c) { c = Math.round(Number(c) || 0); var e = Math.floor(c / 100), r = c % 100; return e + (r ? ',' + (r < 10 ? '0' : '') + r : '') + ' €'; }
  function eurosLlano(c) { return euros(c).replace(/ /g, ' '); }
  function sinCorte(t) { return String(t || '').replace(/ (?=\d+(,\d+)? €)/g, ' ').replace(/ €/g, ' €'); }
  function centimos(t) { var v = String(t || '').replace(/€/g, '').replace(/\s+/g, '').replace(',', '.'); return /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(parseFloat(v) * 100) : null; }
  function nuevaClave() { return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  var estado = { modoCoach: 'mias', mias: null, lista: null, participantes: null, persona: null, resumen: null };

  // ------------------------------------------------------------------ lista de una sesión (Coach y Boss)
  /** Pinta la lista de la sesión en `caja`. `volver` = función para salir. */
  /**
   * opciones.compacta: sin «Volver» ni cabecera (para pasar lista dentro de una tarjeta del Inicio).
   * opciones.alGuardar(r): tras guardar la lista o añadir a alguien.
   */
  function pintarLista(U, caja, sesionId, volver, opciones) {
    var h = U.h, aviso = U.aviso;
    opciones = opciones || {};
    var compacta = !!opciones.compacta;
    zonaAnadir.U = U;
    var claveEnvio = nuevaClave(); // misma clave si hay que reintentar; nueva tras guardar bien (hito 2.2)
    caja.innerHTML = '';
    if (!compacta) caja.appendChild(h('button', { clase: 'volver', type: 'button', texto: '‹ Volver', alClick: volver }));
    caja.appendChild(h('div', { clase: 'cargando', style: 'min-height:20vh', texto: 'Cargando la lista…' }));
    U.Api.llamar('sesion.participantes', { sesion_id: sesionId }).then(function (d) { dibujar(d); })
      .catch(function (e) { caja.appendChild(aviso('error', e.mensaje)); });

    function dibujar(d, mensaje) {
      var s = d.sesion;
      var marcas = {}; // usuario_id → estado nuevo (solo lo cambiado)
      var pagos = {}; // usuario_id → cobro preparado y aún sin guardar (hito 2.2)
      var cobra = !!s.cobros_activos;
      caja.innerHTML = '';
      var chipAsis = h('span', { clase: 'chip ok', texto: plural(d.resumen.asistieron, 'vino', 'vinieron') });
      var chipFaltas = h('span', { clase: 'chip mal', texto: plural(d.resumen.faltaron, 'faltó', 'faltaron') });
      var chips = h('div', { clase: 'chips' }, [
        h('span', { clase: 'chip', texto: plural(d.resumen.apuntados, 'apuntado', 'apuntados') + (s.cupo !== '' ? ' de ' + s.cupo : '') }), chipAsis, chipFaltas]);
      var chipCobrado = cobra ? h('p', { clase: 'cobrado-hoy', id: 'cobradoHoy' }) : null;
      if (compacta) { caja.appendChild(chips); if (chipCobrado) caja.appendChild(chipCobrado); }
      else {
        caja.appendChild(h('button', { clase: 'volver', type: 'button', texto: '‹ Volver', alClick: volver }));
        caja.appendChild(h('div', { clase: 'tarjeta cabecera-lista' }, [
          h('h2', { texto: s.actividad }),
          h('p', { clase: 'subtitulo', texto: s.dia + ' ' + diaMes(s.fecha) + ' · ' + s.hora_inicio + '-' + s.hora_fin + ' · ' + s.lugar }),
          chips, chipCobrado
        ]));
      }
      if (mensaje) caja.appendChild(aviso('ok', mensaje));
      if (!d.puede_pasar_lista) caja.appendChild(h('div', { clase: 'aviso info', texto: d.motivo_lista }));
      var anadir = s.estado === 'PROGRAMADA' ? zonaAnadir(s, function (r) { if (opciones.alGuardar) opciones.alGuardar(r); dibujar(r, r.mensaje); }) : null;
      if (!d.participantes.length) {
        caja.appendChild(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'Aún no hay nadie apuntado.' })]));
        if (anadir) caja.appendChild(anadir);
        return;
      }
      var zona = h('div', {});
      var textoGuardar = cobra ? 'Guardar lista y cobros' : 'Guardar lista';
      var bGuardar = h('button', { clase: 'boton', type: 'button', id: 'guardarLista', texto: textoGuardar, alClick: guardar });
      bGuardar.disabled = true;
      function actual(p) { return marcas[p.usuario_id] !== undefined ? marcas[p.usuario_id] : p.asistencia; }
      function contar() {
        var v = 0, f = 0;
        d.participantes.forEach(function (p) { var a = actual(p); if (a === 'ASISTIO') v++; else if (a === 'FALTA') f++; });
        chipAsis.textContent = plural(v, 'vino', 'vinieron');
        chipFaltas.textContent = plural(f, 'faltó', 'faltaron');
        bGuardar.disabled = !Object.keys(marcas).length && !Object.keys(pagos).length;
        if (chipCobrado) {
          var ef = d.sesion.cobrado.efectivo_cent, bz = d.sesion.cobrado.bizum_cent, sin = 0;
          Object.keys(pagos).forEach(function (k) { if (pagos[k].metodo === 'BIZUM') bz += pagos[k].cent; else ef += pagos[k].cent; });
          d.participantes.forEach(function (p) { if (actual(p) === 'ASISTIO' && p.cobro && p.cobro.hoy_cent > 0 && !pagos[p.usuario_id]) sin++; });
          var partes = [];
          if (ef && bz) partes.push(euros(ef) + ' en efectivo', euros(bz) + ' por Bizum');
          chipCobrado.textContent = 'Cobrado: ' + euros(ef + bz) + (partes.length ? ' (' + partes.join(', ') + ')' : ef ? ' en efectivo' : bz ? ' por Bizum' : '') +
            (sin ? ' · ' + sin + ' sin pagar' : '');
        }
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
          if (nuevo !== 'ASISTIO') delete pagos[p.usuario_id]; // sin «Vino» no se cobra
          pintar(); contar();
        }
        function marcarVino() { if (actual(p) !== 'ASISTIO') { if (p.asistencia === 'ASISTIO') delete marcas[p.usuario_id]; else marcas[p.usuario_id] = 'ASISTIO'; } }
        // ---- cobro (hito 2.2): «Pagó X €» con un toque; «⋯» para cambiar importe, Bizum, vender bono o mes, deudas
        var cob = p.cobro, zonaCobro = null, bPagar = null;
        if (cob && cobra) {
          zonaCobro = h('div', { clase: 'cobro-acciones' });
          var pintarCobro = function () {
            zonaCobro.innerHTML = '';
            cob.pagos.forEach(function (pg) {
              zonaCobro.appendChild(h('span', { clase: 'pagado', texto: 'Pagado ' + euros(pg.importe_cent) + (pg.metodo === 'BIZUM' ? ' Bizum' : '') + ' ✓' }));
              if (pg.puede_anular) zonaCobro.appendChild(h('button', { clase: 'anular-cobro', type: 'button', texto: 'Anular', 'aria-label': 'Anular el cobro de ' + p.nombre, alClick: function () { anularCobro(p, pg); } }));
            });
            if (!d.puede_pasar_lista) return;
            var pend = pagos[p.usuario_id];
            if (pend || cob.propuesto_cent > 0) {
              bPagar = h('button', { clase: 'pagar', type: 'button', 'aria-pressed': pend ? 'true' : 'false', texto: 'Pagó ' + euros(pend ? pend.cent : cob.propuesto_cent) + (pend && pend.metodo === 'BIZUM' ? ' · Bizum' : ''),
                'aria-label': p.nombre + ' pagó', alClick: function () {
                  if (pagos[p.usuario_id]) delete pagos[p.usuario_id];
                  else { pagos[p.usuario_id] = { cent: cob.propuesto_cent, metodo: 'EFECTIVO', saldar: true, tarifa_id: '', importe_hoy: null }; marcarVino(); }
                  pintar(); pintarCobro(); contar();
                } });
              zonaCobro.appendChild(bPagar);
            }
            if (d.sesion.vendibles.length || cob.propuesto_cent > 0) zonaCobro.appendChild(h('button', { clase: 'mas-cobro', type: 'button', texto: '⋯', 'aria-label': 'Más opciones de cobro de ' + p.nombre,
              alClick: function () { hojaCobro(p, function () { marcarVino(); pintar(); pintarCobro(); contar(); }); } }));
          };
          p._pintarCobro = pintarCobro;
          pintarCobro();
        }
        bSi.addEventListener('click', function () { elegir('ASISTIO'); });
        bNo.addEventListener('click', function () { elegir('FALTA'); });
        bSi.disabled = bNo.disabled = !d.puede_pasar_lista;
        pintar();
        p._pintar = function () { pintar(); if (p._pintarCobro) p._pintarCobro(); };
        var nota = p.reserva && p.reserva !== 'CONFIRMADA' ? ' · reserva cancelada' : '';
        var textoCob = cob && cobra ? sinCorte(cob.texto) + (cob.deudas_cent > 0 ? ' + debía ' + euros(cob.deudas_cent) : '') : '';
        return h('div', { clase: 'fila participante' + (zonaCobro ? ' con-cobro' : '') }, [
          U.circulo({ nombre: p.nombre, apellidos: p.apellidos, foto: p.foto }, { clase: 'mini', ampliable: true }),
          h('div', { clase: 'principal', style: 'flex:1;min-width:0' }, [h('span', { texto: (p.nombre + ' ' + p.apellidos).trim() }), nota ? h('small', { texto: nota.slice(3) }) : null,
            textoCob ? h('small', { clase: 'cobertura', texto: textoCob }) : null]),
          h('div', { clase: 'marcas' }, [bSi, bNo]),
          zonaCobro
        ]);
      });
      caja.appendChild(h('div', { clase: 'grupo' }, filas));
      contar();
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
        var cobros = Object.keys(pagos).map(function (k) {
          var x = pagos[k], c = { usuario_id: k, metodo: x.metodo, saldar_deudas: x.saldar };
          if (x.tarifa_id) c.tarifa_id = x.tarifa_id;
          if (x.importe_hoy !== null) c.importe_hoy = x.importe_hoy;
          return c;
        });
        bGuardar.disabled = true; bGuardar.textContent = 'Guardando…'; zona.innerHTML = '';
        // Un solo envío con lista y cobros. Si falla (p. ej. sin cobertura), se reintenta con la MISMA clave: no cobra dos veces.
        U.Api.llamar('lista.guardar', { sesion_id: s.id, clave: claveEnvio, marcas: lista, cobros: cobros }).then(function (r) {
          claveEnvio = nuevaClave(); estado.mias = null; estado.resumen = null; if (opciones.alGuardar) opciones.alGuardar(r); dibujar(r, r.mensaje);
        }).catch(function (e) { bGuardar.disabled = false; bGuardar.textContent = textoGuardar; zona.appendChild(aviso('error', e.mensaje)); });
      }
      function anularCobro(p, pg) {
        var motivo = window.prompt('Se anulará el cobro de ' + p.nombre + ' y se apuntará «devuelto ' + eurosLlano(pg.importe_cent) + '». ¿Por qué?', 'Error al cobrar');
        if (motivo === null) return;
        zona.innerHTML = '';
        U.Api.llamar('cobros.anular', { grupo_id: pg.grupo_id, motivo: motivo }).then(function (r) {
          estado.mias = null; estado.resumen = null; if (opciones.alGuardar) opciones.alGuardar(r); dibujar(r, r.mensaje);
        }).catch(function (e) { (zona.parentNode ? zona : caja).appendChild(aviso('error', e.mensaje)); });
      }
      /** Hoja «⋯» de una persona: importe de hoy, efectivo o Bizum, vender bono o mes, y saldar sus deudas. */
      function hojaCobro(p, alAceptar) {
        var cob = p.cobro, previo = pagos[p.usuario_id] || {};
        var metodo = previo.metodo || 'EFECTIVO';
        var capa = h('div', { clase: 'capa-compartir capa-cobro', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Cobro de ' + p.nombre });
        var vender = h('select', { 'aria-label': 'Qué paga' }, [h('option', { value: '', texto: cob.hoy_cent > 0 ? 'La sesión de hoy · ' + eurosLlano(cob.hoy_cent) : 'Nada más (solo deudas)' })]
          .concat(d.sesion.vendibles.filter(function (v) { return v.tipo !== 'SUELTA'; }).map(function (v) {
            return h('option', { value: v.id, selected: v.id === previo.tarifa_id, texto: v.nombre + ' · ' + eurosLlano(v.propuesto_cent) });
          })));
        var importe = h('input', { type: 'text', inputmode: 'decimal', id: 'importeHoy', 'aria-label': 'Importe' });
        var campoImporte = h('label', { clase: 'campo' }, [h('span', { texto: 'Importe' }), importe]);
        function propuestoDe() { var v = d.sesion.vendibles.filter(function (x) { return x.id === vender.value; })[0]; return v ? v.propuesto_cent : cob.hoy_cent; }
        function ponerImporte() { var c = propuestoDe(); importe.value = c ? eurosLlano(c).replace(' €', '') : ''; campoImporte.style.display = c ? '' : 'none'; }
        vender.addEventListener('change', ponerImporte);
        ponerImporte();
        if (previo.importe_hoy) importe.value = previo.importe_hoy;
        var seg = h('div', { clase: 'segmento', role: 'group', 'aria-label': 'Forma de pago' });
        [['EFECTIVO', 'Efectivo'], ['BIZUM', 'Bizum']].forEach(function (m) {
          var b = h('button', { type: 'button', texto: m[1], 'aria-pressed': metodo === m[0] ? 'true' : 'false' });
          b.addEventListener('click', function () { metodo = m[0]; seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); });
          seg.appendChild(b);
        });
        var saldar = h('input', { type: 'checkbox', id: 'saldarDeudas' }); saldar.checked = previo.saldar !== false;
        var error = h('div', {});
        function cerrar() { capa.remove(); document.body.classList.remove('sin-scroll'); }
        capa.addEventListener('click', function (ev) { if (ev.target === capa) cerrar(); });
        capa.appendChild(h('div', { clase: 'caja-compartir hoja-cobro' }, [
          h('button', { clase: 'cerrar-capa', type: 'button', 'aria-label': 'Cerrar', texto: '✕', alClick: cerrar }),
          h('h2', { texto: (p.nombre + ' ' + p.apellidos).trim() }),
          h('p', { clase: 'subtitulo', texto: cob.texto + (cob.deudas_cent > 0 ? ' · debe ' + eurosLlano(cob.deudas_cent) + ' de otros días' : '') }),
          h('label', { clase: 'campo' }, [h('span', { texto: 'Qué paga' }), vender]), campoImporte, seg,
          cob.deudas_cent > 0 ? h('label', { clase: 'casilla' }, [saldar, h('span', { texto: 'Saldar también lo que debe (' + eurosLlano(cob.deudas_cent) + ')' })]) : null,
          error,
          h('button', { clase: 'boton', type: 'button', texto: 'Aceptar', alClick: function () {
            var hoy = propuestoDe() ? centimos(importe.value) : 0;
            if (propuestoDe() && (hoy === null || hoy < 1)) { error.innerHTML = ''; error.appendChild(aviso('error', 'Escribe un importe válido, por ejemplo 5 o 5,50.')); return; }
            var deudas = cob.deudas_cent > 0 && saldar.checked ? cob.deudas_cent : 0;
            if (!hoy && !deudas) { error.innerHTML = ''; error.appendChild(aviso('error', 'No hay nada que cobrar: elige qué paga.')); return; }
            pagos[p.usuario_id] = { cent: hoy + deudas, metodo: metodo, saldar: cob.deudas_cent > 0 ? saldar.checked : true, tarifa_id: vender.value,
              importe_hoy: propuestoDe() && hoy !== propuestoDe() || vender.value ? importe.value : null };
            cerrar(); alAceptar();
          } })
        ]));
        document.body.appendChild(capa); document.body.classList.add('sin-scroll');
        vender.focus();
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
      return h('div', { clase: 'segmento', role: 'group', 'aria-label': 'Sección' }, [['mias', 'Mis sesiones'], ['semana', 'Semana del club'], ['actividades', 'Mis actividades']].map(function (m) {
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
      if (estado.modoCoach === 'actividades') { (window.VistaAgenda(U, usuario, { modo: 'actividades' }) || []).forEach(function (n) { cuerpo.appendChild(n); }); return; }
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
        cuerpo.appendChild(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'No tienes sesiones en estas dos semanas. Crea tus actividades en «Mis actividades» y genera sus sesiones, o espera a que el Boss te asigne alguna.' })]));
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
        (function () { var m = window.FitclubActividad.miniatura(h, s, 36); if (cancelada) m.style.opacity = '.35'; return m; })(),
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
          window.FitclubActividad.miniatura(h, s, 36),
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
