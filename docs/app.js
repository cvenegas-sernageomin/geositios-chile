/* Geositios de Chile — PWA
   Datos: data/geositios.json (extraído del KMZ del libro), data/quiz.json, data/glosario.json
   Progreso del usuario en localStorage con prefijo "geositios:" (sin IndexedDB: el origen
   github.io es compartido con otras PWAs de la cuenta). */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const MEDIA_CACHE = 'geositios-chile-media-v1';

const store = {
  get(k, d) { try { const v = localStorage.getItem('geositios:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('geositios:' + k, JSON.stringify(v)); } catch {} },
};

const CAT = {
  volcanico: { n: 'Volcánico', e: '🌋' }, geomorfologico: { n: 'Geomorfológico', e: '🏞️' },
  paleontologico: { n: 'Paleontológico', e: '🦕' }, estratigrafico: { n: 'Estratigráfico', e: '📚' },
  estructural: { n: 'Estructural', e: '🧱' }, petrologico: { n: 'Petrológico', e: '💎' },
  geotermico: { n: 'Geotérmico', e: '♨️' }, otro: { n: 'Otro', e: '🪨' },
};
const colorCat = c => `var(--${c in CAT ? c : 'otro'})`;

// Radio (m) para ganar el sello de visita. Sitios extensos o que se observan desde lejos tienen más.
const RADIO_DEF = 600;
const RADIO = {
  g03: 1000, g05: 1500, g06: 1500, g07: 1500, g09: 1500, g11: 2000, g13: 1000, g14: 3000, g15: 1500,
  g16: 1200, g19: 1200, g21: 1500, g22: 1000, g24: 1500, g25: 2000, g27: 1500, g28: 1500, g29: 1000,
  g33: 2000, g35: 2000, g36: 1500, g37: 2500, g39: 1500, g40: 1500, g42: 800, g43: 11000, g44: 7000,
  g45: 1500, g46: 1500, g47: 8000, g48: 1500, g49: 6000, g20: 400, g41: 400, g08: 800,
};
const radio = id => RADIO[id] || RADIO_DEF;

const NIVELES = [
  [0, '🌱', 'Semilla'], [150, '🪨', 'Guijarro'], [500, '📚', 'Estrato'], [1200, '⛰️', 'Montaña'],
  [2500, '🏔️', 'Cordillera'], [5000, '🌍', 'Placa tectónica'],
];

let D, QUIZ, GLOS, SITIOS, POR_ID;
let pos = null;          // {lat, lon, acc}
let watchId = null;
let prog = store.get('progreso', {}); // {gNN: {v: ts visita, q: mejor puntaje, o: ts oído}}
let mapa, marcadores = {}, yoMarker, yoCirculo, capaBase;
let fichaActual = null, fichaDesdeApp = false;
let avisados = new Set();

// ---------------------------------------------------------------- utilidades
function distancia(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function rumbo(a, b) {
  const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  const g = (Math.atan2(y, x) / r + 360) % 360;
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(g / 45) % 8];
}
function fmtDist(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(m / 1000).toLocaleString('es-CL')} km`;
}
const fmtMin = s => `${Math.round(s / 60)} min`;
function toast(html, ms = 4500, accion) {
  const t = $('#toast');
  t.innerHTML = `<span>${html}</span>` + (accion ? `<button>${accion.txt}</button>` : '');
  t.hidden = false;
  if (accion) t.querySelector('button').onclick = () => { t.hidden = true; accion.fn(); };
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
}
function hoja(html) {
  $('#hoja-in').innerHTML = '<div class="asa"></div>' + html;
  $('#hoja').hidden = false;
}
$('#hoja').addEventListener('click', e => { if (e.target.id === 'hoja' || e.target.closest('[data-cerrar]')) $('#hoja').hidden = true; });
const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

// ---------------------------------------------------------------- progreso y puntos
function guardar() { store.set('progreso', prog); refrescarProgreso(); }
function puntos() {
  let p = 0;
  for (const id in prog) {
    const s = prog[id];
    if (s.v) p += 100;
    if (s.q != null) p += s.q * 10 + (s.q === (QUIZ[id] || []).length ? 20 : 0);
    if (s.o) p += 15;
  }
  return p;
}
function nivel(p) {
  let i = 0; while (i + 1 < NIVELES.length && p >= NIVELES[i + 1][0]) i++;
  const [min, e, n] = NIVELES[i], sig = NIVELES[i + 1];
  return { i: i + 1, e, n, min, sig: sig ? sig[0] : null, pct: sig ? (p - min) / (sig[0] - min) : 1 };
}
const aprobado = id => prog[id]?.q != null && prog[id].q >= Math.ceil((QUIZ[id] || []).length * 2 / 3);
const descubierto = id => !!prog[id]?.v || aprobado(id);

function insignias() {
  const vis = SITIOS.filter(g => prog[g.id]?.v).length;
  const perf = SITIOS.filter(g => prog[g.id]?.q === (QUIZ[g.id] || []).length && prog[g.id]?.q > 0).length;
  const apro = SITIOS.filter(g => aprobado(g.id)).length;
  const oidos = SITIOS.filter(g => prog[g.id]?.o).length;
  const L = [
    ['primer', '🥾', 'Primer sello', 'Visita tu primer geositio con el GPS.', vis >= 1],
    ['v5', '🧭', 'Pasos firmes', 'Visita 5 geositios.', vis >= 5],
    ['v10', '🎒', 'Espíritu de terreno', 'Visita 10 geositios.', vis >= 10],
    ['v25', '🏕️', 'Viaje largo', 'Visita 25 geositios.', vis >= 25],
    ['v49', '👑', 'Chile completo', 'Visita los 49 geositios.', vis >= 49],
    ['extremos', '↕️', 'De Arica a Navarino', 'Visita el geositio más al norte y el más austral.', !!(prog.g01?.v || prog.g02?.v) && !!prog.g49?.v],
    ['isla', '🗿', 'Rumbo a Rapa Nui', 'Visita el cráter del Rano Kao.', !!prog.g16?.v],
    ['q1', '🧠', 'Mente de roca', 'Responde un quiz sin errores.', perf >= 1],
    ['q10', '🎓', 'Geocerebro', '10 quiz perfectos.', perf >= 10],
    ['q49', '📜', 'Enciclopedia viva', 'Aprueba el quiz de los 49 geositios.', apro >= 49],
    ['o1', '🎧', 'Buen oído', 'Escucha completa la narración de un geositio.', oidos >= 1],
    ['o10', '📻', 'Radio geológica', 'Escucha 10 narraciones completas.', oidos >= 10],
  ];
  for (const c of Object.keys(CAT)) {
    const g = SITIOS.filter(s => s.categoria === c);
    if (!g.length) continue;
    L.push(['cat-' + c, CAT[c].e, `Maestría ${CAT[c].n.toLowerCase()}`,
      `Descubre (visita o aprueba el quiz) los ${g.length} geositios de interés ${CAT[c].n.toLowerCase()}.`,
      g.every(s => descubierto(s.id))]);
  }
  const regiones = [...new Set(SITIOS.map(s => s.region))];
  for (const r of regiones) {
    const g = SITIOS.filter(s => s.region === r);
    L.push(['reg-' + r, '📍', r, `Visita con GPS los ${g.length} geositios de ${r}.`, g.every(s => prog[s.id]?.v)]);
  }
  return L.map(([id, e, n, d, ok]) => ({ id, e, n, d, ok }));
}

let insigniasPrevias = null;
function refrescarProgreso() {
  const p = puntos(), nv = nivel(p);
  $('#nivel-pill').innerHTML = `<span>${nv.e}</span> ${nv.n} <b>${p} pts</b>`;
  const ins = insignias();
  const ok = new Set(ins.filter(i => i.ok).map(i => i.id));
  if (insigniasPrevias) {
    const nuevas = ins.filter(i => i.ok && !insigniasPrevias.has(i.id));
    if (nuevas.length) setTimeout(() => toast(`${nuevas[0].e} ¡Nueva insignia! <b>${esc(nuevas[0].n)}</b>`, 5000), 1600);
  }
  insigniasPrevias = ok;
  if (!$('#v-pasaporte').hidden) pintarPasaporte();
  pintarMarcadores();
}

// ---------------------------------------------------------------- glosario
let reGlos, termPorVariante;
function prepararGlosario() {
  // Regex sensible a mayúsculas, salvo la primera letra de cada variante ("Formación X" ≠ "su formación").
  const alt = [], lista = [];
  for (const g of GLOS) for (const v of g.v) {
    lista.push([new RegExp('^(?:' + v + ')$', 'iu'), g]);
    alt.push(v.replace(/^([a-záéíóúñ])/, m => `[${m}${m.toUpperCase()}]`));
  }
  alt.sort((a, b) => b.length - a.length);
  reGlos = new RegExp('(?<![\\p{L}\\p{N}])(' + alt.join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
  termPorVariante = txt => (lista.find(([re]) => re.test(txt)) || [])[1];
}
function conGlosario(texto, usados) {
  return esc(texto).replace(reGlos, m => {
    const g = termPorVariante(m);
    if (!g || usados.has(g.t)) return m;
    usados.add(g.t);
    return `<span class="term" data-t="${esc(g.t)}">${m}</span>`;
  });
}
function mostrarTermino(t) {
  const g = GLOS.find(x => x.t === t); if (!g) return;
  hoja(`<h3>${esc(g.t)}</h3><p>${esc(g.d)}</p><button class="btn peque" data-cerrar>Entendido</button>`);
}
document.addEventListener('click', e => {
  const t = e.target.closest('.term');
  if (t) { e.stopPropagation(); mostrarTermino(t.dataset.t); }
});

// ---------------------------------------------------------------- mapa
const BASES = {
  topo: ['Topográfico', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', 'Tiles © Esri'],
  sat: ['Satélite', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Imágenes © Esri'],
  osm: ['Calles', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap'],
};
function iniciarMapa() {
  mapa = L.map('mapa', { zoomControl: false, attributionControl: true, worldCopyJump: true });
  ponerBase(store.get('base', 'topo'));
  const cont = SITIOS.filter(g => g.lon > -80);
  mapa.fitBounds(L.latLngBounds(cont.map(g => [g.lat, g.lon])), { padding: [30, 30] });
  for (const g of SITIOS) {
    const m = L.marker([g.lat, g.lon], { icon: iconoPin(g), title: g.nombre, riseOnHover: true }).addTo(mapa);
    const ancho = Math.min(280, window.innerWidth - 90);
    m.bindPopup(`<div class="pop" data-id="${g.id}"><img src="${g.fotos[0].mini}" alt="">
      <div><small>${esc(g.region)}</small><b>${esc(g.nombre)}</b><span class="ir">Ver geositio →</span></div></div>`,
      { maxWidth: ancho, minWidth: Math.min(220, ancho) });
    marcadores[g.id] = m;
  }
  mapa.on('popupopen', e => {
    const el = e.popup.getElement().querySelector('.pop');
    el && el.addEventListener('click', () => abrirFicha(el.dataset.id));
  });
  $('#btn-capas').onclick = () => {
    const ex = document.querySelector('.capas-menu'); if (ex) return ex.remove();
    const menu = document.createElement('div'); menu.className = 'capas-menu';
    const act = store.get('base', 'topo');
    menu.innerHTML = Object.entries(BASES).map(([k, b]) => `<button data-k="${k}" class="${k === act ? 'on' : ''}">${b[0]}</button>`).join('');
    menu.onclick = e => { const k = e.target.dataset.k; if (k) { ponerBase(k); menu.remove(); } };
    $('#v-mapa').appendChild(menu);
  };
  $('#btn-gps').onclick = () => {
    if (!watchId && !simulado) return iniciarGPS(true);
    if (pos) mapa.flyTo([pos.lat, pos.lon], Math.max(mapa.getZoom(), 12));
  };
  $('#nivel-pill').onclick = () => (location.hash = '#/pasaporte');
}
function ponerBase(k) {
  const b = BASES[k] || BASES.topo;
  if (capaBase) mapa.removeLayer(capaBase);
  capaBase = L.tileLayer(b[1], { maxZoom: 18, attribution: b[2], crossOrigin: true }).addTo(mapa);
  store.set('base', k);
}
function iconoPin(g) {
  const s = prog[g.id] || {};
  const marca = s.v ? '✓' : g.orden;
  return L.divIcon({
    className: '', iconSize: [30, 30], iconAnchor: [15, 36], popupAnchor: [0, -34],
    html: `<div class="pin${s.v ? ' sellado' : ''}" style="--c:${colorCat(g.categoria)}"><span>${marca}</span></div>`,
  });
}
function pintarMarcadores() { if (mapa) for (const g of SITIOS) marcadores[g.id].setIcon(iconoPin(g)); }

// ---------------------------------------------------------------- GPS
let simulado = false;
function iniciarGPS(centrar) {
  if (!('geolocation' in navigator)) return toast('Este dispositivo no tiene GPS disponible');
  let primera = true;
  $('#btn-gps').classList.add('activo');
  watchId = navigator.geolocation.watchPosition(p => {
    nuevaPosicion({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy });
    if (primera && centrar) mapa.flyTo([pos.lat, pos.lon], 12);
    primera = false;
  }, err => {
    $('#btn-gps').classList.remove('activo'); watchId = null;
    toast(err.code === 1 ? 'Permiso de ubicación denegado. Actívalo en el navegador para ganar sellos.' : 'No se pudo obtener tu ubicación');
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
  store.set('gps', true);
}
// Pruebas / demostraciones: ?sim=lat,lon o window.simularPosicion(lat, lon)
window.simularPosicion = (lat, lon, acc = 10) => {
  simulado = true; $('#btn-gps').classList.add('activo');
  nuevaPosicion({ lat, lon, acc });
};
function nuevaPosicion(p) {
  pos = p;
  const ll = [p.lat, p.lon];
  if (!yoMarker) {
    yoMarker = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="yo"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 1000, interactive: false }).addTo(mapa);
    yoCirculo = L.circle(ll, { radius: p.acc, color: '#2f7de1', weight: 1, fillOpacity: .08, interactive: false }).addTo(mapa);
  } else { yoMarker.setLatLng(ll); yoCirculo.setLatLng(ll).setRadius(p.acc); }

  const orden = SITIOS.map(g => ({ g, d: distancia(p, g) })).sort((a, b) => a.d - b.d);
  const { g, d } = orden[0];
  const mc = $('#mas-cercano');
  mc.hidden = false;
  mc.innerHTML = `<img src="${g.fotos[0].mini}" alt=""><div><small>Geositio más cercano · ${fmtDist(d)} al ${rumbo(p, g)}</small><b>${esc(g.nombre)}</b></div>`;
  mc.onclick = () => abrirFicha(g.id);

  for (const { g, d } of orden.slice(0, 5)) {
    const r = radio(g.id);
    if (d <= r && p.acc <= Math.max(150, r / 2) && !prog[g.id]?.v) { ganarSello(g.id, 'v'); break; }
    if (d <= Math.max(5000, r * 2) && !prog[g.id]?.v && !avisados.has(g.id)) {
      avisados.add(g.id);
      toast(`📍 Estás a ${fmtDist(d)} de <b>${esc(g.nombre)}</b>`, 7000, { txt: 'Ver', fn: () => abrirFicha(g.id) });
      vibrar(120);
    }
  }
  if (!$('#v-cerca').hidden) pintarLista();
  if (fichaActual) actualizarEstadoSello();
}

function ganarSello(id, tipo) {
  const g = POR_ID[id];
  prog[id] = prog[id] || {};
  const nuevo = tipo === 'v' ? !prog[id].v : false;
  if (tipo === 'v') prog[id].v = prog[id].v || Date.now();
  guardar();
  if (!nuevo) return;
  vibrar([80, 60, 160]);
  const a = $('#sello-anim');
  a.innerHTML = `<div class="caja"><div class="estampa"><img src="${g.fotos[0].mini}" alt=""></div>
    <p>¡Sello de visita!</p><h3>${esc(g.nombre)}</h3><p>+100 puntos</p>
    <div class="fila-botones" style="justify-content:center;margin-top:14px">
      <button class="btn primario" id="sa-escuchar">🎧 Escuchar la historia</button>
      <button class="btn" id="sa-cerrar">Seguir</button></div></div>`;
  a.hidden = false;
  $('#sa-cerrar').onclick = () => (a.hidden = true);
  $('#sa-escuchar').onclick = () => { a.hidden = true; abrirFicha(id); reproducir(id); };
}

// ---------------------------------------------------------------- lista / explorar
const filtro = { cat: '', region: '', q: '' };
function prepararLista() {
  const cats = [...new Set(SITIOS.map(s => s.categoria))];
  $('#filtros-cat').innerHTML = `<button class="chip on" data-c="">Todos</button>` +
    cats.map(c => `<button class="chip" data-c="${c}" style="--c:${colorCat(c)}"><i></i>${CAT[c].n}</button>`).join('');
  $('#filtros-cat').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filtro.cat = b.dataset.c;
    [...$('#filtros-cat').children].forEach(x => x.classList.toggle('on', x === b));
    pintarLista();
  };
  const regs = [...new Set(SITIOS.map(s => s.region))];
  $('#filtro-region').innerHTML += regs.map(r => `<option>${esc(r)}</option>`).join('');
  $('#filtro-region').onchange = e => { filtro.region = e.target.value; pintarLista(); };
  $('#buscar').oninput = e => { filtro.q = norm(e.target.value.trim()); pintarLista(); };
  $('#lista').onclick = e => { const li = e.target.closest('[data-id]'); if (li) abrirFicha(li.dataset.id); };
  for (const g of SITIOS) g._busca = norm([g.nombre, g.region, g.comuna, g.localidad, g.provincia, g.interes, ...g.parrafos].join(' '));
}
function itemHTML(g, d) {
  const s = prog[g.id] || {};
  return `<li class="item" data-id="${g.id}"><img loading="lazy" src="${g.fotos[0].mini}" alt="">
    <div class="t"><small>${CAT[g.categoria].e} ${esc(g.region)}</small><b>${esc(g.nombre)}</b>
    <small>${d != null ? `<span class="dist">${fmtDist(d)} al ${rumbo(pos, g)}</span> · ` : ''}${esc(g.comuna)}</small></div>
    <span class="marcas">${s.v ? '📍' : ''}${aprobado(g.id) ? '🧠' : ''}</span></li>`;
}
function pintarLista() {
  let l = SITIOS.filter(g => (!filtro.cat || g.categoria === filtro.cat) && (!filtro.region || g.region === filtro.region) && (!filtro.q || g._busca.includes(filtro.q)));
  let conD = l.map(g => ({ g, d: pos ? distancia(pos, g) : null }));
  if (pos) conD.sort((a, b) => a.d - b.d);
  $('#cerca-titulo').textContent = pos ? 'Cerca de mí' : 'Explorar de norte a sur';
  $('#lista').innerHTML = conD.length ? conD.map(({ g, d }) => itemHTML(g, d)).join('') :
    '<li class="vacio">No hay geositios con ese filtro.</li>';
  if (!pos && !$('#lista').querySelector('.gps-ofrecer')) {
    const li = document.createElement('li'); li.className = 'vacio gps-ofrecer';
    li.innerHTML = '<button class="btn primario">📍 Ordenar por cercanía (usar GPS)</button>';
    li.querySelector('button').onclick = () => iniciarGPS(false);
    $('#lista').prepend(li);
  }
}

// ---------------------------------------------------------------- ficha
function abrirFicha(id, desdeHash) {
  if (!POR_ID[id]) return;
  if (!desdeHash) { fichaDesdeApp = true; location.hash = '#/' + id; return; }
  const g = POR_ID[id];
  fichaActual = id;
  document.body.classList.add('con-ficha');
  const f = $('#ficha'); f.hidden = false;
  const usados = new Set();
  const qs = QUIZ[id] || [];
  const otros = SITIOS.filter(x => x.id !== id).map(x => ({ g: x, d: distancia(g, x) })).sort((a, b) => a.d - b.d).slice(0, 4);
  const ant = SITIOS[g.orden - 2], sig = SITIOS[g.orden];
  $('#ficha-scroll').innerHTML = `
    <div class="heroe"><img src="${g.fotos[0].src}" alt="${esc(g.nombre)}">
      <button class="cerrar" aria-label="Volver">←</button>
      <button class="compartir" aria-label="Compartir">⤴</button>
      <div class="tit"><small>${g.orden} de ${SITIOS.length} · ${esc(g.region_txt)}</small><h2>${esc(g.nombre)}</h2></div></div>
    <div class="ficha-cuerpo">
      <div class="chips">
        <span class="chip on" style="--c:${colorCat(g.categoria)}">${CAT[g.categoria].e} ${CAT[g.categoria].n}</span>
        ${g.altitud ? `<span class="chip">⛰️ ${esc(g.altitud)}</span>` : ''}
        ${g.valor ? `<span class="chip">⭐ Valor ${esc(g.valor)}</span>` : ''}
      </div>
      <div class="estado-sello" id="estado-sello"></div>
      <div class="acciones">
        <button class="btn primario" id="f-escuchar">🎧 Escuchar (${fmtMin(g.audio.dur)})</button>
        <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lon}">🚗 Cómo llegar</a>
        <button class="btn ancho" id="f-ir-quiz">🧠 Pon a prueba lo aprendido (${qs.length} preguntas)</button>
      </div>
      <div class="texto" id="texto">${g.parrafos.map((p, i) => `<p data-i="${i}">${conGlosario(p, usados)}</p>`).join('')}</div>
      <p class="pie-foto">Toca una palabra subrayada para ver su significado. Toca un párrafo para escucharlo desde ahí.</p>
      <div class="galeria">${g.fotos.slice(1).map(ft => `<img loading="lazy" src="${ft.src}" width="${ft.w}" height="${ft.h}" alt="">`).join('')}</div>
      ${g.pies.map(p => `<p class="pie-foto">${esc(p)}</p>`).join('')}
      <dl class="datos">
        ${[['Provincia', g.provincia], ['Comuna', g.comuna], ['Localidad más cercana', g.localidad], ['Altitud', g.altitud],
           ['Interés geocientífico', g.interes], ['Valor principal', g.valor],
           ['Coordenadas', `${g.lat.toFixed(5)}, ${g.lon.toFixed(5)}`]].filter(x => x[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}
      </dl>
      <div class="quiz" id="quiz"></div>
      <h3 class="sec">Geositios cercanos</h3>
      <div class="vecinos">${otros.map(({ g: o, d }) => itemHTML(o, null).replace('</b>', `</b><small class="dist">${fmtDist(d)}</small>`)).join('')}</div>
      <div class="acciones" style="margin-top:18px">
        ${ant ? `<button class="btn" data-ir="${ant.id}">← ${esc(ant.nombre)}</button>` : '<span></span>'}
        ${sig ? `<button class="btn" data-ir="${sig.id}">${esc(sig.nombre)} →</button>` : ''}
      </div>
    </div>`;
  $('#ficha-scroll').scrollTop = 0;
  f.querySelector('.cerrar').onclick = cerrarFicha;
  f.querySelector('.compartir').onclick = () => compartir(g);
  $('#f-escuchar').onclick = () => reproducir(id);
  $('#f-ir-quiz').onclick = () => $('#quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#texto').onclick = e => {
    if (e.target.closest('.term')) return;
    const p = e.target.closest('p[data-i]'); if (!p) return;
    reproducir(id, +p.dataset.i + 1);
  };
  f.querySelectorAll('[data-ir]').forEach(b => (b.onclick = () => abrirFicha(b.dataset.ir)));
  f.querySelectorAll('.vecinos [data-id]').forEach(b => (b.onclick = () => abrirFicha(b.dataset.id)));
  f.querySelectorAll('.galeria img, .heroe img').forEach(im => (im.onclick = () => visor(im.src)));
  actualizarEstadoSello();
  iniciarQuiz(id);
  marcarParrafo();
}
function cerrarFicha() {
  if (fichaDesdeApp && history.length > 1) history.back();
  else location.hash = '#/';
}
function ocultarFicha() {
  $('#ficha').hidden = true; fichaActual = null; fichaDesdeApp = false;
  document.body.classList.remove('con-ficha');
}
function actualizarEstadoSello() {
  const el = $('#estado-sello'); if (!el || !fichaActual) return;
  const g = POR_ID[fichaActual], s = prog[g.id] || {};
  if (s.v) {
    el.innerHTML = `<span class="ico">🏅</span><div><b>Sello de visita obtenido</b><small>${new Date(s.v).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>`;
  } else {
    const d = pos ? distancia(pos, g) : null;
    el.innerHTML = `<span class="ico">📍</span><div><b>Sello por ganar</b><small>Llega a menos de ${fmtDist(radio(g.id))} con el GPS activo${d != null ? ` · el geositio está a ${fmtDist(d)} hacia el ${rumbo(pos, g)}` : ''}.</small></div>`;
  }
}
function compartir(g) {
  const url = location.origin + location.pathname + '#/' + g.id;
  const data = { title: g.nombre, text: `${g.nombre} — Geositios de Chile`, url };
  if (navigator.share) navigator.share(data).catch(() => {});
  else navigator.clipboard?.writeText(url).then(() => toast('Enlace copiado'));
}
function visor(src) {
  const v = document.createElement('div'); v.className = 'visor';
  v.innerHTML = `<img src="${src}" alt="">`; v.onclick = () => v.remove();
  document.body.appendChild(v);
}

// ---------------------------------------------------------------- quiz
function barajar(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function iniciarQuiz(id) {
  const qs = QUIZ[id] || [], el = $('#quiz');
  if (!qs.length) return (el.hidden = true);
  const res = [];
  let i = 0;
  const pasos = () => `<div class="pasos">${qs.map((_, k) => `<i class="${k < res.length ? (res[k] ? 'bien' : 'mal') : k === i ? 'act' : ''}"></i>`).join('')}</div>`;
  const mejor = prog[id]?.q;
  const portada = () => {
    el.innerHTML = `<h4>Quiz</h4><p class="preg">¿Cuánto aprendiste de este geositio?</p>
      <p class="expl">${mejor != null ? `Tu mejor resultado: ${mejor} de ${qs.length}. ` : ''}Aprueba con ${Math.ceil(qs.length * 2 / 3)} respuestas correctas para ganar el sello 🧠 de estudio.</p>
      <button class="btn primario" id="q-empezar">${mejor != null ? 'Intentar de nuevo' : 'Comenzar'}</button>`;
    $('#q-empezar').onclick = pregunta;
  };
  const pregunta = () => {
    const q = qs[i], ops = barajar(q.o.map((t, k) => ({ t, ok: k === 0 })));
    el.innerHTML = `${pasos()}<h4>Pregunta ${i + 1} de ${qs.length}</h4><p class="preg">${esc(q.p)}</p>
      <div class="ops">${ops.map((o, k) => `<button data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div id="q-sig"></div>`;
    el.querySelector('.ops').onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const o = ops[+b.dataset.k];
      el.querySelectorAll('.ops button').forEach((x, k) => { x.disabled = true; if (ops[k].ok) x.classList.add('bien'); });
      if (!o.ok) b.classList.add('mal');
      res.push(o.ok); vibrar(o.ok ? 30 : [40, 40, 40]);
      $('#q-sig').innerHTML = `<p class="expl">${o.ok ? '✅ ¡Correcto!' : '❌ No era esa.'} ${esc(q.e)}</p>
        <button class="btn primario">${i + 1 < qs.length ? 'Siguiente' : 'Ver resultado'}</button>`;
      $('#q-sig button').onclick = () => { i++; i < qs.length ? pregunta() : final(); };
    };
  };
  const final = () => {
    const n = res.filter(Boolean).length;
    const antes = aprobado(id);
    prog[id] = prog[id] || {};
    prog[id].q = Math.max(prog[id].q ?? 0, n);
    guardar();
    const e = n === qs.length ? '🏆' : n >= Math.ceil(qs.length * 2 / 3) ? '🎉' : '📖';
    el.innerHTML = `${pasos()}<div class="final"><div class="gran">${e}</div><p class="preg">${n} de ${qs.length} correctas</p>
      <p class="expl">${n === qs.length ? '¡Perfecto! +' + (n * 10 + 20) + ' puntos.' : n >= Math.ceil(qs.length * 2 / 3) ? '¡Aprobado! Ganaste el sello de estudio.' : 'Vuelve a leer o escuchar el texto e inténtalo otra vez.'}</p>
      <button class="btn" id="q-otra">Repetir</button></div>`;
    $('#q-otra').onclick = () => { i = 0; res.length = 0; pregunta(); };
    if (!antes && aprobado(id)) { vibrar([60, 40, 120]); toast(`🧠 Sello de estudio: <b>${esc(POR_ID[id].nombre)}</b>`); }
  };
  portada();
}

// ---------------------------------------------------------------- narración
const audio = $('#audio');
let pista = null; // {id, titulo, marcas, dur}
const VELS = [1, 1.25, 1.5, 0.85];
function reproducir(id, desdeTrozo = 0) {
  const g = POR_ID[id];
  const a = id === 'intro' ? D.audio_intro : g.audio;
  if (!pista || pista.id !== id) {
    pista = { id, titulo: id === 'intro' ? 'Introducción y prólogos' : g.nombre, marcas: a.marcas, dur: a.dur };
    audio.src = a.src;
    audio.playbackRate = store.get('vel', 1);
    $('#rep-titulo').textContent = pista.titulo;
    $('#reproductor').hidden = false; document.body.classList.add('con-rep');
    guardarParaOffline(a.src);
    if ('mediaSession' in navigator) {
      const foto = id === 'intro' ? D.portada.mini : g.fotos[0].mini;
      navigator.mediaSession.metadata = new MediaMetadata({ title: pista.titulo, artist: 'Geositios de Chile', album: 'Sernageomin',
        artwork: [{ src: new URL(foto, location.href).href, sizes: '400x400', type: 'image/webp' }] });
    }
  }
  const t = a.marcas[desdeTrozo] ?? 0;
  const ir = () => { if (desdeTrozo || audio.currentTime >= audio.duration - 1) audio.currentTime = t; audio.play().catch(() => {}); };
  audio.readyState >= 1 ? ir() : audio.addEventListener('loadedmetadata', ir, { once: true });
  if (audio.readyState < 1) audio.load();
}
async function guardarParaOffline(url) {
  try { const c = await caches.open(MEDIA_CACHE); if (!(await c.match(url))) c.add(url).catch(() => {}); } catch {}
}
$('#rep-play').onclick = () => (audio.paused ? audio.play() : audio.pause());
$('#rep-vel').onclick = () => {
  const v = VELS[(VELS.indexOf(audio.playbackRate) + 1) % VELS.length] || 1;
  audio.playbackRate = v; store.set('vel', v); $('#rep-vel').textContent = v.toString().replace('.', ',') + '×';
};
$('#rep-vel').textContent = String(store.get('vel', 1)).replace('.', ',') + '×';
$('#rep-barra').oninput = e => { if (audio.duration) audio.currentTime = e.target.value / 100 * audio.duration; };
$('#rep-titulo').onclick = () => pista && pista.id !== 'intro' && abrirFicha(pista.id);
audio.addEventListener('play', () => ($('#rep-play').textContent = '❚❚'));
audio.addEventListener('pause', () => ($('#rep-play').textContent = '▶'));
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  $('#rep-barra').value = audio.currentTime / audio.duration * 100;
  marcarParrafo();
  if (pista && pista.id !== 'intro' && audio.currentTime / audio.duration > 0.9 && !prog[pista.id]?.o) {
    prog[pista.id] = prog[pista.id] || {}; prog[pista.id].o = Date.now(); guardar();
    toast('🎧 Narración completa · +15 puntos', 3000);
  }
});
audio.addEventListener('error', () => { if (audio.src) toast('No se pudo cargar la narración (¿sin conexión y sin descargar?)'); });
function marcarParrafo() {
  const cont = $('#texto'); if (!cont) return;
  let act = -1;
  if (pista && pista.id === fichaActual && audio.currentTime > 0) {
    const t = audio.currentTime;
    for (let k = 1; k < pista.marcas.length; k++) if (t >= pista.marcas[k] - 0.05) act = k - 1;
  }
  cont.querySelectorAll('p').forEach((p, k) => {
    const on = k === act;
    if (on && !p.classList.contains('leyendo') && !audio.paused) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
    p.classList.toggle('leyendo', on);
  });
}

// ---------------------------------------------------------------- pasaporte
function pintarPasaporte() {
  const p = puntos(), nv = nivel(p);
  const vis = SITIOS.filter(g => prog[g.id]?.v).length, est = SITIOS.filter(g => aprobado(g.id)).length;
  $('#resumen-puntos').innerHTML = `<div class="nivel"><small>Nivel ${nv.i}</small><b>${nv.e} ${nv.n}</b>
    <div class="barra"><div style="width:${Math.round(nv.pct * 100)}%"></div></div>
    <small>${nv.sig ? `${nv.sig - p} pts para el siguiente nivel` : '¡Nivel máximo!'} · 📍 ${vis}/49 · 🧠 ${est}/49</small></div>
    <div class="pts"><b>${p}</b><small>puntos</small></div>`;
  const ins = insignias();
  ins.sort((a, b) => b.ok - a.ok);
  $('#insignias').innerHTML = ins.map(i => `<div class="insignia${i.ok ? '' : ' bloq'}" data-i="${esc(i.id)}"><span class="e">${i.e}</span>${esc(i.n)}</div>`).join('');
  $('#insignias').onclick = e => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const i = ins.find(x => x.id === b.dataset.i);
    hoja(`<h3>${i.e} ${esc(i.n)}</h3><p>${esc(i.d)}</p><p><b>${i.ok ? '✅ Conseguida' : '🔒 Aún no'}</b></p><button class="btn peque" data-cerrar>Cerrar</button>`);
  };
  $('#sellos').innerHTML = SITIOS.map(g => {
    const s = prog[g.id] || {};
    return `<div class="sello${s.v ? ' visita' : ''}${aprobado(g.id) ? ' estudio' : ''}" data-id="${g.id}" style="--c:${colorCat(g.categoria)}">
      <div class="circ"><img loading="lazy" src="${g.fotos[0].mini}" alt=""></div><span class="num">${g.orden}</span>
      <span class="mk">${s.v ? '📍' : ''}${aprobado(g.id) ? '🧠' : ''}</span><small>${esc(g.nombre)}</small></div>`;
  }).join('');
  $('#sellos').onclick = e => { const s = e.target.closest('[data-id]'); if (s) abrirFicha(s.dataset.id); };
}

// ---------------------------------------------------------------- libro
function pintarLibro() {
  $('#portada-img').src = D.portada.src;
  $('#lema').textContent = D.lema.replace(/^"/, '“');
  $('#prologos').innerHTML = D.prologos.map(p => `<details class="prologo"><summary>${esc(p.titulo)}</summary>${
    p.texto.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚ“"])/).reduce((acc, o) => { const u = acc[acc.length - 1]; if (u && u.length < 500) acc[acc.length - 1] = u + ' ' + o; else acc.push(o); return acc; }, [])
      .map(x => `<p>${esc(x)}</p>`).join('')}</details>`).join('');
  $('#pie-portada').textContent = 'Portada: ' + D.pie_portada;
  $('#referencia').textContent = D.referencia;
  $('#btn-intro').onclick = () => reproducir('intro');
  const pintarGlos = q => {
    $('#glosario').innerHTML = GLOS.filter(g => !q || norm(g.t + ' ' + g.d).includes(q))
      .sort((a, b) => a.t.localeCompare(b.t, 'es')).map(g => `<dt>${esc(g.t)}</dt><dd>${esc(g.d)}</dd>`).join('');
  };
  pintarGlos('');
  $('#buscar-glosario').oninput = e => pintarGlos(norm(e.target.value.trim()));
  $('#btn-descargar').onclick = descargarTodo;
  $('#btn-reset').onclick = () => {
    if (!confirm('¿Borrar sellos, puntajes e insignias de este dispositivo?')) return;
    prog = {}; guardar(); insigniasPrevias = null; refrescarProgreso(); toast('Progreso reiniciado');
  };
}
async function descargarTodo() {
  if (!('caches' in window)) return toast('Este navegador no permite guardar para uso sin conexión');
  const urls = ['data/geositios.json', 'data/quiz.json', 'data/glosario.json', D.audio_intro.src, D.portada.src, D.portada.mini];
  for (const g of SITIOS) { urls.push(g.audio.src); for (const f of g.fotos) urls.push(f.src, f.mini); }
  const bar = $('#descarga-prog'); bar.hidden = false;
  const c = await caches.open(MEDIA_CACHE);
  let hechos = 0, fallos = 0;
  const pinta = () => { bar.firstElementChild.style.width = (hechos / urls.length * 100) + '%'; bar.lastElementChild.textContent = `${hechos} / ${urls.length}${fallos ? ` · ${fallos} con error` : ''}`; };
  pinta();
  const cola = urls.slice();
  const trabajador = async () => {
    while (cola.length) {
      const u = cola.shift();
      try { if (!(await c.match(u))) { const r = await fetch(u); if (!r.ok) throw 0; await c.put(u, r); } } catch { fallos++; }
      hechos++; pinta();
    }
  };
  $('#btn-descargar').disabled = true;
  await Promise.all([1, 2, 3, 4].map(trabajador));
  $('#btn-descargar').disabled = false;
  try { navigator.storage?.persist?.(); } catch {}
  toast(fallos ? `Descarga terminada con ${fallos} errores. Vuelve a intentarlo con conexión.` : '✅ Todo listo para usar sin señal');
}

// ---------------------------------------------------------------- navegación
function ruta() {
  const h = location.hash.replace(/^#\/?/, '');
  if (/^g\d\d$/.test(h)) return abrirFicha(h, true);
  ocultarFicha();
  const v = ['cerca', 'pasaporte', 'libro'].includes(h) ? h : 'mapa';
  for (const s of ['mapa', 'cerca', 'pasaporte', 'libro']) $('#v-' + s).hidden = s !== v;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('activa', a.dataset.v === v));
  if (v === 'mapa') setTimeout(() => mapa.invalidateSize(), 0);
  if (v === 'cerca') pintarLista();
  if (v === 'pasaporte') pintarPasaporte();
}
window.addEventListener('hashchange', ruta);

// ---------------------------------------------------------------- arranque
async function iniciar() {
  const [d, q, gl] = await Promise.all(['data/geositios.json', 'data/quiz.json', 'data/glosario.json'].map(u => fetch(u).then(r => r.json())));
  D = d; QUIZ = q; GLOS = gl; SITIOS = D.sitios; POR_ID = Object.fromEntries(SITIOS.map(s => [s.id, s]));
  prepararGlosario();
  iniciarMapa();
  prepararLista();
  pintarLibro();
  refrescarProgreso();
  ruta();

  if (!store.get('bienvenida')) {
    $('#bv-img').src = D.portada.src; $('#bienvenida').hidden = false;
    $('#bv-ok').onclick = () => { store.set('bienvenida', 1); $('#bienvenida').hidden = true; iniciarGPS(true); };
  }
  const sim = new URLSearchParams(location.search).get('sim');
  if (sim) { const [la, lo] = sim.split(',').map(Number); simularPosicion(la, lo); }
  else if (store.get('gps')) {
    try { const st = await navigator.permissions.query({ name: 'geolocation' }); if (st.state === 'granted') iniciarGPS(false); } catch {}
  }
}
iniciar().catch(e => { console.error(e); document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px">No se pudieron cargar los datos. Revisa tu conexión y recarga.</p>'); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
