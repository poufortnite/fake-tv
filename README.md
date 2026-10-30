# fake.tv 💜

Crea chats de Twitch falsos (vista PC, tema oscuro) para tus AU.
**No usa servidor ni base de datos**: todo se guarda en el navegador de cada persona, en su propio dispositivo.

## Qué puedes hacer

- **Canales**: cada canal tiene su chat, sus mods, VIPs, subs e insignias de sub propias. Al crear un canal se crea también su usuario (el streamer).
- **Usuarios globales**: añade muchos a la vez escribiéndolos separados por comas. Cualquiera puede escribir en cualquier canal.
- **Escribir rápido**: elige usuario (con autocompletado) o pulsa 🎲 para uno aleatorio. Si escribes un nombre que no existe, se crea solo.
- **Pegar guion**: pega muchas líneas `usuario: mensaje` y se añaden todas de golpe.
- **Eventos**: subs (nivel 1/2/3/Prime, meses), regalos de subs, raids, bits, anuncios, mensaje fijado, mensajes del sistema.
- **En cada mensaje** (pasa el ratón por encima): responder, fijar, editar (hora, destacado, primer mensaje, `<mensaje eliminado>`), borrar.
- **Emotes**: los globales de Twitch y los tuyos propios (PNG/WEBP/GIF).
- **Punto de vista**: elige quién “mira” el chat y sus menciones se resaltan en rojo, como en Twitch.
- **Modo captura** (Esc para salir) y **Descargar PNG**.
- **Exportar / Importar** una copia `.json` de todos tus datos (¡haz copias de vez en cuando!).

## Publicar en GitHub Pages

1. Crea un repositorio y sube **el contenido** de esta carpeta (que `index.html` quede en la raíz).
2. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En un par de minutos estará en `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`.

Cuando subas cambios, cambia `VERSION` en `sw.js` (p. ej. `faketv-v2`) para que quien la tenga instalada reciba la versión nueva.

## Instalar como app

- **Chrome / Edge (PC o Android)**: botón **⬇ Instalar app** en la barra de arriba, o el icono de instalar en la barra de direcciones.
- **iPhone / iPad (Safari)**: Compartir → **Añadir a pantalla de inicio**.

Funciona sin conexión (los emotes de Twitch necesitan internet la primera vez que se ven).

## Dónde están los datos

En el `localStorage` del navegador, en ese dispositivo y en esa web. Si borras los datos del navegador se pierden, por eso existe **Exportar**.
Las imágenes que subes se reducen automáticamente para ocupar poco.

## Estructura

```
index.html
manifest.webmanifest   ← para que se pueda instalar
sw.js                  ← funcionamiento sin conexión
css/style.css
js/store.js            ← datos (localStorage)
js/chat.js             ← cómo se pinta el chat
js/app.js              ← pantallas y botones
img/badges/            ← streamer, mod, vip, verificado
img/presets/           ← insignias de sub de ejemplo
icons/
```
