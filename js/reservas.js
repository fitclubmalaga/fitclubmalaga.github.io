// Hito 1.4 · Pestaña «Reservas» del cliente: próximas (con cancelar y «Cómo llegar») e historial reciente.
(function () {
  'use strict';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function diaMes(iso) { var p = iso.split('-'); return +p[2] + ' ' + MESES[+p[1] - 1]; }
  var datos = null, mensaje = null, error = null;

  window.VistaReservas = function (U) {
    var h = U.h, aviso = U.aviso;
    var caja = h('div', {});

    function repintar() {
      caja.innerHTML = '';
      var nodos = [];
      if (mensaje) { nodos.push(aviso('ok', mensaje)); mensaje = null; }
      if (error) { nodos.push(aviso('error', error)); error = null; }
      nodos.push(h('p', { clase: 'seccion', texto: 'Próximas' }));
      if (!datos.proximas.length) {
        nodos.push(h('div', { clase: 'vacio tarjeta' }, [h('p', { texto: 'No tienes reservas próximas. Reserva tu plaza desde la Agenda.' })]));
      } else {
        datos.proximas.forEach(function (r) { nodos.push(tarjeta(r, true)); });
      }
      if (datos.historial.length) {
        nodos.push(h('p', { clase: 'seccion', texto: 'Anteriores y canceladas' }));
        nodos.push(h('div', { clase: 'grupo' }, datos.historial.map(function (r) { return filaHistorial(r); })));
      }
      nodos.forEach(function (n) { if (n) caja.appendChild(n); });
    }

    function tarjeta(r, conAcciones) {
      var cancelar = h('button', { clase: 'boton-mini secundario', type: 'button', texto: 'Cancelar', 'aria-label': 'Cancelar mi plaza en ' + r.actividad + ' ' + r.dia + ' ' + r.hora_inicio, alClick: function (ev) {
        var tarde = r.tarde_si_cancela ? 'Faltan menos de ' + r.horas_cancelacion + ' h: contará como cancelación tardía.\n\n' : '';
        if (!confirm(tarde + '¿Cancelar tu plaza en ' + r.actividad + ' del ' + r.dia.toLowerCase() + ' ' + diaMes(r.fecha) + ' a las ' + r.hora_inicio + '?')) return;
        var b = ev.currentTarget; b.disabled = true; b.textContent = 'Cancelando…';
        U.Api.llamar('reservas.cancelar', { reserva_id: r.id, vista: 'mias' }).then(function (d) { datos = d; mensaje = d.mensaje; repintar(); })
          .catch(function (e) { error = e.mensaje; repintar(); });
      } });
      return h('div', { clase: 'tarjeta reserva' }, [
        h('div', { clase: 'reserva-fecha' }, [h('strong', { texto: String(+r.fecha.slice(8)) }), h('small', { texto: MESES[+r.fecha.slice(5, 7) - 1] })]),
        h('div', { clase: 'principal', style: 'flex:1;min-width:0' }, [
          h('span', { clase: 'reserva-titulo', style: 'display:flex;align-items:center;gap:8px' }, [window.FitclubActividad.miniatura(h, r, 24), r.actividad]),
          h('small', { texto: r.dia + ' · ' + r.hora_inicio + '-' + r.hora_fin }),
          h('small', { clase: 'con-coach' }, [r.lugar + (r.coach ? ' · ' : ''), r.coach ? h('span', { clase: 'coach-nombre' }, [U.circulo({ nombre: r.coach, apellidos: '', foto: r.coach_foto }, { clase: 'micro', ampliable: true }), ' ' + r.coach]) : null]),
          conAcciones ? h('span', { clase: 'etiqueta ok', style: 'margin-top:6px;display:inline-block', texto: 'Reservada ✓' }) : null
        ]),
        // A la derecha, como en la Agenda: «Cancelar» y debajo «Cómo llegar» (Miguel, 22-11).
        conAcciones ? h('div', { clase: 'acciones-derecha' }, [cancelar,
          r.mapa ? h('a', { clase: 'mapa', href: r.mapa, target: '_blank', rel: 'noopener noreferrer', texto: 'Cómo llegar' }) : null]) : null
      ]);
    }

    function filaHistorial(r) {
      var texto = r.pasada && r.estado === 'CONFIRMADA' ? 'Pasada' : r.estado_texto;
      var clase = r.estado === 'CANCELADA_TARDE' || r.estado === 'CANCELADA_CLUB' ? 'etiqueta aviso' : 'etiqueta';
      return h('div', { clase: 'fila' }, [
        window.FitclubActividad.miniatura(h, r, 32),
        h('div', { clase: 'principal', style: 'flex:1' }, [h('span', { texto: r.actividad }), h('small', { texto: r.dia + ' ' + diaMes(r.fecha) + ' · ' + r.hora_inicio + ' · ' + r.lugar })]),
        h('span', { clase: clase, texto: texto })
      ]);
    }

    if (datos) repintar(); else caja.appendChild(h('div', { clase: 'cargando', style: 'min-height:30vh', texto: 'Cargando tus reservas…' }));
    U.Api.llamar('reservas.mias').then(function (d) { datos = d; repintar(); })
      .catch(function (e) { if (!datos) { caja.innerHTML = ''; } caja.appendChild(aviso('error', e.mensaje)); });
    return [caja];
  };
  window.VistaReservas.reiniciar = function () { datos = null; mensaje = null; error = null; };
})();
