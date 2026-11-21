# fitclub-web

Pantalla (frontend) de **Fitclub Málaga**, publicada con GitHub Pages.

- **Repositorio público a propósito.** Aquí solo hay HTML, CSS, JS e iconos. No hay datos de clientes, claves ni lógica de permisos: todo eso vive en el servidor Apps Script y en la hoja de Google, en privado.
- **La fuente de trabajo es el repositorio privado** `elpanzilla/Fitclub`, carpeta `web/`. Este repositorio es la copia que se publica. Cambia primero allí, documenta en `docs/CAMBIOS.md` y luego copia aquí.
- `config.js` contiene la URL pública de la API (Apps Script `/exec`). No es secreta.
- Estado actual: **hito 1.2**: acceso por código, menú por rol, perfil, alta de clientes y gestión de usuarios. La prueba técnica sigue en `/prueba-tecnica/`.
