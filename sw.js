/* fake.tv — service worker: permite usar la app sin conexión.
   Sube el número de VERSION cada vez que publiques cambios. */
const VERSION = 'faketv-v3';
const RUNTIME = 'faketv-runtime';
const APP_SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css', 'js/store.js', 'js/chat.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'img/badges/broadcaster.png', 'img/badges/mod.png', 'img/badges/vip.png', 'img/badges/verified.png',
  'img/presets/sub_1.png', 'img/presets/sub_3.png', 'img/presets/sub_6.png', 'img/presets/sub_12.png'
];
// Recursos externos que guardamos al usarlos (fuentes, emotes de Twitch, bits, html2canvas)
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'static-cdn.jtvnw.net', 'd3aqoihi2n8ty8.cloudfront.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Archivos de la app: primero red (para recibir actualizaciones), si no hay conexión, caché
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Externos conocidos: primero caché
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(RUNTIME).then(async c => {
        const hit = await c.match(req);
        if (hit && !(hit.type === 'opaque' && req.mode === 'cors')) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === 'opaque') c.put(req, res.clone());
          return res;
        } catch (err) { return Response.error(); }
      })
    );
  }
});
