// Cliente de la API y almacenamiento local. Sin dependencias.
(function () {
  'use strict';
  var CLAVE_TOKEN = 'fitclub_token';
  var CLAVE_INICIO = 'fitclub_inicio'; // última carga inicial (solo datos públicos) para pintar al instante

  function guardar(clave, valor) { try { if (valor === null) localStorage.removeItem(clave); else localStorage.setItem(clave, valor); return true; } catch (e) { return false; } }
  function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }

  var Api = {
    token: function () { return leer(CLAVE_TOKEN); },
    guardarSesion: function (token, inicio) { guardar(CLAVE_TOKEN, token); Api.guardarInicio(inicio); },
    guardarInicio: function (inicio) { if (inicio) guardar(CLAVE_INICIO, JSON.stringify(inicio)); },
    inicioGuardado: function () { try { return JSON.parse(leer(CLAVE_INICIO) || 'null'); } catch (e) { return null; } },
    olvidarSesion: function () { guardar(CLAVE_TOKEN, null); guardar(CLAVE_INICIO, null); },

    /** Llama a una acción del servidor. Devuelve una promesa con `datos` o rechaza con {mensaje, codigo}. */
    llamar: function (accion, datos) {
      var url = window.FITCLUB_API || '';
      if (url.indexOf('/exec') < 0 || url.indexOf('PEGA_AQUI') >= 0) {
        return Promise.reject({ mensaje: 'La app no está conectada al servidor (falta la URL en config.js).', codigo: 'sin_config' });
      }
      var controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var temporizador = setTimeout(function () { if (controlador) controlador.abort(); }, 30000);
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita la petición previa de CORS
        body: JSON.stringify({ accion: accion, token: Api.token(), datos: datos || {} }),
        redirect: 'follow',
        signal: controlador ? controlador.signal : undefined
      }).then(function (r) {
        if (!r.ok) throw { mensaje: 'El servidor no responde (' + r.status + '). Inténtalo en un momento.', codigo: 'http' };
        return r.json();
      }, function () {
        throw { mensaje: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', codigo: 'red' };
      }).then(function (res) {
        clearTimeout(temporizador);
        if (!res || res.ok !== true) throw { mensaje: (res && res.error) || 'Error desconocido.', codigo: (res && res.codigo) || 'error' };
        return res.datos;
      }, function (err) { clearTimeout(temporizador); throw err; });
    }
  };
  window.Api = Api;
})();
