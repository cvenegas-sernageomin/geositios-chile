/* Service worker de Geositios de Chile.
   OJO: el origen cvenegas-sernageomin.github.io es compartido con otras PWAs (Geonotas, etc.):
   caches.keys() devuelve también sus cachés. Solo se purgan las que calzan con MIAS. */
const VERSION = 'geositios-chile-v3';
const SHELL = VERSION + '-shell';
const MEDIA = 'geositios-chile-media-v1';   // fotos y audios (misma constante en app.js)
const TILES = 'geositios-chile-tiles';
const MIAS = [/^geositios-chile-v\d+-shell$/];
const esMia = k => MIAS.some(re => re.test(k));
const MAX_TILES = 3000;

const ASSETS = [
  './', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest',
  'vendor/leaflet.js', 'vendor/leaflet.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png',
  'data/geositios.json', 'data/quiz.json', 'data/glosario.json',
  'data/en.json', 'data/quiz-en.json', 'data/glosario-en.json',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(ASSETS);
    // miniaturas (≈2 MB): listas, sellos y mapa funcionan sin conexión desde el primer uso
    try {
      const d = await (await c.match('data/geositios.json')).json();
      const minis = d.sitios.map(s => s.fotos[0].mini).concat(d.portada.mini);
      const m = await caches.open(MEDIA);
      await Promise.all(minis.map(u => m.match(u).then(r => r || m.add(u)).catch(() => {})));
    } catch {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== SHELL && esMia(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function respuestaRango(req, resp) {
  const buf = await resp.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  const total = buf.byteLength;
  let a = m && m[1] ? +m[1] : 0, b = m && m[2] ? +m[2] : total - 1;
  b = Math.min(b, total - 1);
  return new Response(buf.slice(a, b + 1), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${a}-${b}/${total}`,
      'Content-Length': String(b - a + 1), 'Accept-Ranges': 'bytes' },
  });
}

let contadorTiles = 0;
async function recortarTiles() {
  const c = await caches.open(TILES), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Teselas del mapa base: caché primero (lo que ya se vio queda disponible sin señal)
  if (/arcgisonline\.com|tile\.openstreetmap\.org/.test(url.host)) {
    e.respondWith(caches.open(TILES).then(c => c.match(req).then(r => r || fetch(req).then(resp => {
      if (resp.ok || resp.type === 'opaque') { c.put(req, resp.clone()); if (++contadorTiles % 200 === 0) recortarTiles(); }
      return resp;
    }).catch(() => new Response('', { status: 504 })))));
    return;
  }
  if (url.origin !== location.origin) return;
  // El PDF del libro es grande: se descarga directo, sin pasar por la caché
  if (url.pathname.endsWith('.pdf')) return;

  // Narraciones: desde caché si están descargadas (con soporte de Range para adelantar/retroceder)
  if (url.pathname.endsWith('.mp3')) {
    e.respondWith(caches.match(url.href, { ignoreSearch: true }).then(r => {
      if (!r) return fetch(req);
      return req.headers.has('range') ? respuestaRango(req, r) : r;
    }));
    return;
  }
  // Fotos, íconos y librerías: caché primero
  if (/\/(img|icons|vendor)\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => {
      if (resp.ok && url.pathname.includes('/img/')) { const cp = resp.clone(); caches.open(MEDIA).then(c => c.put(req, cp)); }
      return resp;
    })));
    return;
  }
  // HTML, JS, CSS y datos: red primero (actualizaciones inmediatas), caché si no hay señal
  e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(resp => {
    if (resp.ok) { const cp = resp.clone(); caches.open(SHELL).then(c => c.put(req, cp)); }
    return resp;
  }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
