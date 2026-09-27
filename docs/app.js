/* Geositios de Chile — PWA (español / English)
   Datos: data/geositios.json (extraído del KMZ del libro) + data/en.json (traducción), quiz[-en].json, glosario[-en].json
   Progreso del usuario en localStorage con prefijo "geositios:" (sin IndexedDB: el origen
   github.io es compartido con otras PWAs de la cuenta).
   Desarrollo: Carlos Venegas. */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const MEDIA_CACHE = 'geositios-chile-media-v1';
const PDF_URL = 'libro/Geositios-de-Chile-Sernageomin-2023.pdf';

const store = {
  get(k, d) { try { const v = localStorage.getItem('geositios:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('geositios:' + k, JSON.stringify(v)); } catch {} },
};

// ---------------------------------------------------------------- idioma
const LANG = (() => {
  const s = new URLSearchParams(location.search).get('lang') || store.get('lang');
  if (s === 'es' || s === 'en') return s;
  return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
})();
document.documentElement.lang = LANG;

const TXT = {
  es: {
    bv_lista: ['Recorre 49 lugares donde la Tierra cuenta su historia', 'Escucha cada geositio narrado', 'Llega con tu GPS y gana su sello en el pasaporte', 'Responde el quiz y colecciona insignias'],
    comenzar: 'Comenzar el viaje', subtitulo: 'Una mirada a sus maravillas geológicas', titulo: 'Geositios de Chile',
    instalar: '📲 Instalar como app', instalar_sub: 'Pantalla completa, sin barra del navegador y funciona sin señal.',
    instalada_ok: '¡Listo! Ábrela desde el ícono <b>Geositios de Chile</b> de tu teléfono', pantalla_completa: 'Pantalla completa',
    ios_t: 'Úsala en pantalla completa', ios_intro: 'Agrega Geositios a tu pantalla de inicio: se abre sin la barra del navegador, como una app, y funciona sin señal.',
    ios_1: 'Toca el botón <b>Compartir</b> {ico} de Safari', ios_1_chrome: 'Toca el botón <b>Compartir</b> {ico} junto a la barra de direcciones',
    ios_2: 'Desliza y elige <b>«Agregar a pantalla de inicio»</b> ➕', ios_3: 'Abre <b>Geositios de Chile</b> desde el nuevo ícono',
    ios_ok: 'Entendido', no_mostrar: 'No volver a mostrar', ios_rec: '📲 Úsala sin la barra del navegador', como: '¿Cómo?',
    dev: 'App desarrollada por Carlos Venegas', dev_corto: 'Desarrollo: Carlos Venegas',
    tab_mapa: 'Mapa', tab_cerca: 'Explorar', tab_pasaporte: 'Pasaporte', tab_libro: 'Libro',
    buscar: 'Buscar geositio, comuna, roca…', todas_regiones: 'Todas las regiones', todos: 'Todos',
    mi_pasaporte: 'Mi pasaporte', insignias: 'Insignias', sellos: 'Sellos', sellos_leyenda: '📍 visitado · 🧠 estudiado',
    escuchar_intro: '▶ Escuchar introducción y prólogos', para_terreno: 'Para terreno',
    terreno_txt: 'Descarga fotos y narraciones para usar la app sin señal. El mapa base solo guarda las zonas que ya viste.',
    descargar_todo: '⬇ Descargar todo', glosario: 'Glosario geológico', buscar_termino: 'Buscar término…', creditos: 'Créditos',
    creditos_txt: 'Textos y fotografías del libro; los autores de cada foto se indican en su ficha. Narración generada con voz sintética. Quiz y glosario elaborados a partir de los textos del libro.',
    creditos_en: 'Traducción al inglés elaborada para esta app a partir del texto original en español.',
    mapas: 'Mapas: © Esri, OpenStreetMap.', reiniciar: 'Reiniciar mi progreso', idioma: 'Idioma',
    ir_mapa: 'Explorar el mapa de geositios', ir_mapa_sub: 'Recorre los 49 lugares con tu GPS, gana sellos y escucha su historia',
    libro_pdf: '📕 Descargar el libro (PDF)', libro_pdf_pronto: '📕 El libro en PDF estará disponible pronto',
    libro_pdf_desc: 'Versión completa del libro publicado por Sernageomin.',
    base_topo: 'Topográfico', base_sat: 'Satélite', base_osm: 'Calles',
    ver_geositio: 'Ver geositio →', sin_gps: 'Este dispositivo no tiene GPS disponible',
    gps_denegado: 'Permiso de ubicación denegado. Actívalo en el navegador para ganar sellos.', gps_error: 'No se pudo obtener tu ubicación',
    mas_cercano: (d, r) => `Geositio más cercano · ${d} al ${r}`, estas_a: (d, n) => `📍 Estás a ${d} de <b>${n}</b>`, ver: 'Ver',
    sello_visita: '¡Sello de visita!', mas100: '+100 puntos', escuchar_historia: '🎧 Escuchar la historia', seguir: 'Seguir',
    cerca_de_mi: 'Cerca de mí', explorar_ns: 'Explorar de norte a sur', sin_resultados: 'No hay geositios con ese filtro.',
    ordenar_gps: '📍 Ordenar por cercanía (usar GPS)', al: (d, r) => `${d} al ${r}`,
    de_n: (a, b) => `${a} de ${b}`, volver: 'Volver', compartir: 'Compartir', valor: v => `Valor ${v}`,
    escuchar: m => `🎧 Escuchar (${m})`, como_llegar: '🚗 Cómo llegar', ir_quiz: n => `🧠 Pon a prueba lo aprendido (${n} preguntas)`,
    ayuda_texto: 'Toca una palabra subrayada para ver su significado. Toca un párrafo para escucharlo desde ahí.',
    provincia: 'Provincia', comuna: 'Comuna', localidad: 'Localidad más cercana', altitud: 'Altitud', interes: 'Interés geocientífico',
    valor_principal: 'Valor principal', coordenadas: 'Coordenadas', cercanos: 'Geositios cercanos',
    sello_obtenido: 'Sello de visita obtenido', sello_por_ganar: 'Sello por ganar',
    llega_a: (r, extra) => `Llega a menos de ${r} con el GPS activo${extra}.`, esta_a: (d, r) => ` · el geositio está a ${d} hacia el ${r}`,
    enlace_copiado: 'Enlace copiado', entendido: 'Entendido', cerrar: 'Cerrar',
    quiz_titulo: '¿Cuánto aprendiste de este geositio?', mejor: (m, n) => `Tu mejor resultado: ${m} de ${n}. `,
    aprueba: n => `Aprueba con ${n} respuestas correctas para ganar el sello 🧠 de estudio.`,
    reintentar: 'Intentar de nuevo', empezar: 'Comenzar', pregunta: (i, n) => `Pregunta ${i} de ${n}`,
    correcto: '✅ ¡Correcto!', incorrecto: '❌ No era esa.', siguiente: 'Siguiente', ver_resultado: 'Ver resultado',
    correctas: (n, m) => `${n} de ${m} correctas`, perfecto: p => `¡Perfecto! +${p} puntos.`, aprobado: '¡Aprobado! Ganaste el sello de estudio.',
    reprobado: 'Vuelve a leer o escuchar el texto e inténtalo otra vez.', repetir: 'Repetir', sello_estudio: n => `🧠 Sello de estudio: <b>${n}</b>`,
    intro_titulo: 'Introducción y prólogos', narracion_completa: '🎧 Narración completa · +15 puntos',
    audio_error: 'No se pudo cargar la narración (¿sin conexión y sin descargar?)',
    nivel: n => `Nivel ${n}`, pts_sig: n => `${n} pts para el siguiente nivel`, nivel_max: '¡Nivel máximo!', puntos: 'puntos', pts: 'pts',
    conseguida: '✅ Conseguida', aun_no: '🔒 Aún no', nueva_insignia: n => `¡Nueva insignia! <b>${n}</b>`,
    portada: 'Portada: ', confirmar_reset: '¿Borrar sellos, puntajes e insignias de este dispositivo?', reset_ok: 'Progreso reiniciado',
    sin_cache: 'Este navegador no permite guardar para uso sin conexión', con_error: n => ` · ${n} con error`,
    descarga_err: n => `Descarga terminada con ${n} errores. Vuelve a intentarlo con conexión.`, descarga_ok: '✅ Todo listo para usar sin señal',
    carga_error: 'No se pudieron cargar los datos. Revisa tu conexión y recarga.',
    rumbos: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
    cat: { volcanico: 'Volcánico', geomorfologico: 'Geomorfológico', paleontologico: 'Paleontológico', estratigrafico: 'Estratigráfico', estructural: 'Estructural', petrologico: 'Petrológico', geotermico: 'Geotérmico', otro: 'Otro' },
    niveles: ['Semilla', 'Guijarro', 'Estrato', 'Montaña', 'Cordillera', 'Placa tectónica'],
    ins: {
      primer: ['Primer sello', 'Visita tu primer geositio con el GPS.'], v5: ['Pasos firmes', 'Visita 5 geositios.'],
      v10: ['Espíritu de terreno', 'Visita 10 geositios.'], v25: ['Viaje largo', 'Visita 25 geositios.'], v49: ['Chile completo', 'Visita los 49 geositios.'],
      extremos: ['De Arica a Navarino', 'Visita el geositio más al norte y el más austral.'], isla: ['Rumbo a Rapa Nui', 'Visita el cráter del Rano Kao.'],
      q1: ['Mente de roca', 'Responde un quiz sin errores.'], q10: ['Geocerebro', '10 quiz perfectos.'], q49: ['Enciclopedia viva', 'Aprueba el quiz de los 49 geositios.'],
      o1: ['Buen oído', 'Escucha completa la narración de un geositio.'], o10: ['Radio geológica', 'Escucha 10 narraciones completas.'],
    },
    ins_cat: (c, n) => [`Maestría ${c.toLowerCase()}`, `Descubre (visita o aprueba el quiz) los ${n} geositios de interés ${c.toLowerCase()}.`],
    ins_reg: (r, n) => [r, `Visita con GPS los ${n} geositios de ${r}.`],
  },
  en: {
    bv_lista: ['Travel to 49 places where the Earth tells its story', 'Listen to each geosite narrated', 'Reach it with your GPS and earn its passport stamp', 'Take the quiz and collect badges'],
    comenzar: 'Start the journey', subtitulo: 'A look at its geological wonders', titulo: 'Geosites of Chile',
    instalar: '📲 Install as an app', instalar_sub: 'Full screen, no browser bar, and it works without signal.',
    instalada_ok: 'Done! Open it from the <b>Geositios de Chile</b> icon on your phone', pantalla_completa: 'Full screen',
    ios_t: 'Use it in full screen', ios_intro: 'Add Geositios to your Home Screen: it opens without the browser bar, like an app, and works without signal.',
    ios_1: 'Tap Safari’s <b>Share</b> button {ico}', ios_1_chrome: 'Tap the <b>Share</b> button {ico} next to the address bar',
    ios_2: 'Scroll down and choose <b>“Add to Home Screen”</b> ➕', ios_3: 'Open <b>Geositios de Chile</b> from the new icon',
    ios_ok: 'Got it', no_mostrar: 'Don’t show again', ios_rec: '📲 Use it without the browser bar', como: 'How?',
    dev: 'App developed by Carlos Venegas', dev_corto: 'Developed by Carlos Venegas',
    tab_mapa: 'Map', tab_cerca: 'Explore', tab_pasaporte: 'Passport', tab_libro: 'Book',
    buscar: 'Search geosite, town, rock…', todas_regiones: 'All regions', todos: 'All',
    mi_pasaporte: 'My passport', insignias: 'Badges', sellos: 'Stamps', sellos_leyenda: '📍 visited · 🧠 studied',
    escuchar_intro: '▶ Listen to the introduction and forewords', para_terreno: 'For the field',
    terreno_txt: 'Download photos and narrations to use the app without signal. The base map only keeps areas you have already viewed.',
    descargar_todo: '⬇ Download everything', glosario: 'Geology glossary', buscar_termino: 'Search term…', creditos: 'Credits',
    creditos_txt: 'Texts and photographs from the book; each photo’s author is credited on its page. Narration generated with a synthetic voice. Quiz and glossary written from the book’s texts.',
    creditos_en: 'English translation prepared for this app from the original Spanish text.',
    mapas: 'Maps: © Esri, OpenStreetMap.', reiniciar: 'Reset my progress', idioma: 'Language',
    ir_mapa: 'Explore the geosite map', ir_mapa_sub: 'Visit the 49 places with your GPS, earn stamps and hear their stories',
    libro_pdf: '📕 Download the book (PDF, Spanish)', libro_pdf_pronto: '📕 The book PDF will be available soon',
    libro_pdf_desc: 'Full version of the book published by Sernageomin (in Spanish).',
    base_topo: 'Topographic', base_sat: 'Satellite', base_osm: 'Streets',
    ver_geositio: 'View geosite →', sin_gps: 'This device has no GPS available',
    gps_denegado: 'Location permission denied. Enable it in your browser to earn stamps.', gps_error: 'Could not get your location',
    mas_cercano: (d, r) => `Nearest geosite · ${d} ${r}`, estas_a: (d, n) => `📍 You are ${d} from <b>${n}</b>`, ver: 'View',
    sello_visita: 'Visit stamp!', mas100: '+100 points', escuchar_historia: '🎧 Listen to its story', seguir: 'Continue',
    cerca_de_mi: 'Near me', explorar_ns: 'Explore from north to south', sin_resultados: 'No geosites match that filter.',
    ordenar_gps: '📍 Sort by distance (use GPS)', al: (d, r) => `${d} ${r}`,
    de_n: (a, b) => `${a} of ${b}`, volver: 'Back', compartir: 'Share', valor: v => `${v[0].toUpperCase() + v.slice(1)} value`,
    escuchar: m => `🎧 Listen (${m})`, como_llegar: '🚗 Directions', ir_quiz: n => `🧠 Test what you learned (${n} questions)`,
    ayuda_texto: 'Tap an underlined word to see its meaning. Tap a paragraph to listen from there.',
    provincia: 'Province', comuna: 'District', localidad: 'Nearest town', altitud: 'Elevation', interes: 'Geoscientific interest',
    valor_principal: 'Main value', coordenadas: 'Coordinates', cercanos: 'Nearby geosites',
    sello_obtenido: 'Visit stamp earned', sello_por_ganar: 'Stamp to earn',
    llega_a: (r, extra) => `Get within ${r} with GPS on${extra}.`, esta_a: (d, r) => ` · the geosite is ${d} to the ${r}`,
    enlace_copiado: 'Link copied', entendido: 'Got it', cerrar: 'Close',
    quiz_titulo: 'How much did you learn about this geosite?', mejor: (m, n) => `Your best score: ${m} of ${n}. `,
    aprueba: n => `Get ${n} right to earn the 🧠 study stamp.`,
    reintentar: 'Try again', empezar: 'Start', pregunta: (i, n) => `Question ${i} of ${n}`,
    correcto: '✅ Correct!', incorrecto: '❌ Not quite.', siguiente: 'Next', ver_resultado: 'See result',
    correctas: (n, m) => `${n} of ${m} correct`, perfecto: p => `Perfect! +${p} points.`, aprobado: 'Passed! You earned the study stamp.',
    reprobado: 'Read or listen to the text again and try once more.', repetir: 'Repeat', sello_estudio: n => `🧠 Study stamp: <b>${n}</b>`,
    intro_titulo: 'Introduction and forewords', narracion_completa: '🎧 Narration complete · +15 points',
    audio_error: 'Could not load the narration (offline and not downloaded?)',
    nivel: n => `Level ${n}`, pts_sig: n => `${n} pts to the next level`, nivel_max: 'Top level!', puntos: 'points', pts: 'pts',
    conseguida: '✅ Earned', aun_no: '🔒 Not yet', nueva_insignia: n => `New badge! <b>${n}</b>`,
    portada: 'Cover: ', confirmar_reset: 'Delete stamps, scores and badges from this device?', reset_ok: 'Progress reset',
    sin_cache: 'This browser cannot save content for offline use', con_error: n => ` · ${n} failed`,
    descarga_err: n => `Download finished with ${n} errors. Try again with a connection.`, descarga_ok: '✅ All set to use without signal',
    carga_error: 'Could not load the data. Check your connection and reload.',
    rumbos: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
    cat: { volcanico: 'Volcanic', geomorfologico: 'Geomorphological', paleontologico: 'Paleontological', estratigrafico: 'Stratigraphic', estructural: 'Structural', petrologico: 'Petrological', geotermico: 'Geothermal', otro: 'Other' },
    niveles: ['Seed', 'Pebble', 'Stratum', 'Mountain', 'Mountain range', 'Tectonic plate'],
    ins: {
      primer: ['First stamp', 'Visit your first geosite with GPS.'], v5: ['Steady steps', 'Visit 5 geosites.'],
      v10: ['Field spirit', 'Visit 10 geosites.'], v25: ['Long journey', 'Visit 25 geosites.'], v49: ['All of Chile', 'Visit all 49 geosites.'],
      extremos: ['From Arica to Navarino', 'Visit the northernmost and southernmost geosites.'], isla: ['Bound for Rapa Nui', 'Visit Rano Kao crater.'],
      q1: ['Rock-solid mind', 'Answer a quiz with no mistakes.'], q10: ['Geo-brain', '10 perfect quizzes.'], q49: ['Living encyclopedia', 'Pass the quiz for all 49 geosites.'],
      o1: ['Good ear', 'Listen to a full geosite narration.'], o10: ['Geology radio', 'Listen to 10 full narrations.'],
    },
    ins_cat: (c, n) => [`${c} mastery`, `Discover (visit or pass the quiz) all ${n} ${c.toLowerCase()} geosites.`],
    ins_reg: (r, n) => [r, `Visit all ${n} geosites in ${r} with GPS.`],
  },
};
const t = (k, ...a) => { const v = TXT[LANG][k] ?? TXT.es[k]; return typeof v === 'function' ? v(...a) : v; };

const CAT_E = { volcanico: '🌋', geomorfologico: '🏞️', paleontologico: '🦕', estratigrafico: '📚', estructural: '🧱', petrologico: '💎', geotermico: '♨️', otro: '🪨' };
const catNombre = c => t('cat')[c] || t('cat').otro;
const colorCat = c => `var(--${c in CAT_E ? c : 'otro'})`;

// Radio (m) para ganar el sello de visita. Sitios extensos o que se observan desde lejos tienen más.
const RADIO_DEF = 600;
const RADIO = {
  g03: 1000, g05: 1500, g06: 1500, g07: 1500, g09: 1500, g11: 2000, g13: 1000, g14: 3000, g15: 1500,
  g16: 1200, g19: 1200, g21: 1500, g22: 1000, g24: 1500, g25: 2000, g27: 1500, g28: 1500, g29: 1000,
  g33: 2000, g35: 2000, g36: 1500, g37: 2500, g39: 1500, g40: 1500, g42: 800, g43: 11000, g44: 7000,
  g45: 1500, g46: 1500, g47: 8000, g48: 1500, g49: 6000, g20: 400, g41: 400, g08: 800,
};
const radio = id => RADIO[id] || RADIO_DEF;

const NIVELES = [[0, '🌱'], [150, '🪨'], [500, '📚'], [1200, '⛰️'], [2500, '🏔️'], [5000, '🌍']];

let D, QUIZ, GLOS, SITIOS, POR_ID;
let pos = null;          // {lat, lon, acc}
let watchId = null;
let prog = store.get('progreso', {}); // {gNN: {v: ts visita, q: mejor puntaje, o: ts oído}}
let mapa, marcadores = {}, yoMarker, yoCirculo, capaBase, capaEtiquetas;
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
  return t('rumbos')[Math.round(g / 45) % 8];
}
const LOCALE = LANG === 'es' ? 'es-CL' : 'en-US';
function fmtDist(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
  return `${Math.round(m / 1000).toLocaleString(LOCALE)} km`;
}
const fmtMin = s => `${Math.round(s / 60)} min`;
function toast(html, ms = 4500, accion) {
  const el = $('#toast');
  el.innerHTML = `<span>${html}</span>` + (accion ? `<button>${accion.txt}</button>` : '');
  el.hidden = false;
  if (accion) el.querySelector('button').onclick = () => { el.hidden = true; accion.fn(); };
  clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), ms);
}
function hoja(html) {
  $('#hoja-in').innerHTML = '<div class="asa"></div>' + html;
  $('#hoja').hidden = false;
}
$('#hoja').addEventListener('click', e => { if (e.target.id === 'hoja' || e.target.closest('[data-cerrar]')) $('#hoja').hidden = true; });
const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

// Textos fijos del HTML: data-t (texto), data-t-ph (placeholder), data-t-aria (aria-label)
function traducirHTML() {
  document.querySelectorAll('[data-t]').forEach(el => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll('[data-t-ph]').forEach(el => (el.placeholder = t(el.dataset.tPh)));
  document.querySelectorAll('[data-t-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.tAria)));
  $('#bv-lista').innerHTML = ['🗺️', '🎧', '📍', '🧠'].map((e, i) => `<li><span>${e}</span> ${esc(t('bv_lista')[i])}</li>`).join('');
  document.title = t('titulo');
  document.querySelectorAll('.idioma-banderas button').forEach(b => b.classList.toggle('activo', b.dataset.lang === LANG));
}
function cambiarIdioma() {
  store.set('lang', LANG === 'es' ? 'en' : 'es');
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); location.replace(u.href); }
  else location.reload();
}

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
  const [min, e] = NIVELES[i], sig = NIVELES[i + 1];
  return { i: i + 1, e, n: t('niveles')[i], min, sig: sig ? sig[0] : null, pct: sig ? (p - min) / (sig[0] - min) : 1 };
}
const aprobado = id => prog[id]?.q != null && prog[id].q >= Math.ceil((QUIZ[id] || []).length * 2 / 3);
const descubierto = id => !!prog[id]?.v || aprobado(id);

function insignias() {
  const vis = SITIOS.filter(g => prog[g.id]?.v).length;
  const perf = SITIOS.filter(g => prog[g.id]?.q === (QUIZ[g.id] || []).length && prog[g.id]?.q > 0).length;
  const apro = SITIOS.filter(g => aprobado(g.id)).length;
  const oidos = SITIOS.filter(g => prog[g.id]?.o).length;
  const base = [
    ['primer', '🥾', vis >= 1], ['v5', '🧭', vis >= 5], ['v10', '🎒', vis >= 10], ['v25', '🏕️', vis >= 25], ['v49', '👑', vis >= 49],
    ['extremos', '↕️', !!(prog.g01?.v || prog.g02?.v) && !!prog.g49?.v], ['isla', '🗿', !!prog.g16?.v],
    ['q1', '🧠', perf >= 1], ['q10', '🎓', perf >= 10], ['q49', '📜', apro >= 49], ['o1', '🎧', oidos >= 1], ['o10', '📻', oidos >= 10],
  ];
  const L = base.map(([id, e, ok]) => { const [n, d] = t('ins')[id]; return { id, e, n, d, ok }; });
  for (const c of Object.keys(CAT_E)) {
    const g = SITIOS.filter(s => s.categoria === c);
    if (!g.length) continue;
    const [n, d] = t('ins_cat', catNombre(c), g.length);
    L.push({ id: 'cat-' + c, e: CAT_E[c], n, d, ok: g.every(s => descubierto(s.id)) });
  }
  for (const r of [...new Set(SITIOS.map(s => s.region))]) {
    const g = SITIOS.filter(s => s.region === r);
    const [n, d] = t('ins_reg', r, g.length);
    L.push({ id: 'reg-' + r, e: '📍', n, d, ok: g.every(s => prog[s.id]?.v) });
  }
  return L;
}

let insigniasPrevias = null;
function refrescarProgreso() {
  const p = puntos(), nv = nivel(p);
  $('#nivel-pill').innerHTML = `<span>${nv.e}</span> ${esc(nv.n)} <b>${p} ${t('pts')}</b>`;
  const ins = insignias();
  const ok = new Set(ins.filter(i => i.ok).map(i => i.id));
  if (insigniasPrevias) {
    const nuevas = ins.filter(i => i.ok && !insigniasPrevias.has(i.id));
    if (nuevas.length) setTimeout(() => toast(`${nuevas[0].e} ${t('nueva_insignia', esc(nuevas[0].n))}`, 5000), 1600);
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
    return `<span class="term" data-t-term="${esc(g.t)}">${m}</span>`;
  });
}
function mostrarTermino(nombre) {
  const g = GLOS.find(x => x.t === nombre); if (!g) return;
  hoja(`<h3>${esc(g.t)}</h3><p>${esc(g.d)}</p><button class="btn peque" data-cerrar>${t('entendido')}</button>`);
}
document.addEventListener('click', e => {
  const el = e.target.closest('.term');
  if (el) { e.stopPropagation(); mostrarTermino(el.dataset.tTerm); }
});

// ---------------------------------------------------------------- mapa
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const BASES = {
  sat: [ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Imagery © Esri, Maxar, Earthstar Geographics'],
  topo: [ESRI + 'World_Topo_Map/MapServer/tile/{z}/{y}/{x}', 'Tiles © Esri'],
  osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap'],
};
function iniciarMapa() {
  mapa = L.map('mapa', { zoomControl: false, attributionControl: true, worldCopyJump: true });
  ponerBase(store.get('mapa-base', 'sat'));
  mapa.setView([-33, -71], 4);
  for (const g of SITIOS) {
    const m = L.marker([g.lat, g.lon], { icon: iconoPin(g), title: g.nombre, riseOnHover: true }).addTo(mapa);
    const ancho = Math.min(280, window.innerWidth - 90);
    m.bindPopup(`<div class="pop" data-id="${g.id}"><img src="${g.fotos[0].mini}" alt="">
      <div><small>${esc(g.region)}</small><b>${esc(g.nombre)}</b><span class="ir">${t('ver_geositio')}</span></div></div>`,
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
    const act = store.get('mapa-base', 'sat');
    menu.innerHTML = Object.keys(BASES).map(k => `<button data-k="${k}" class="${k === act ? 'on' : ''}">${t('base_' + k)}</button>`).join('');
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
  const b = BASES[k] || BASES.sat;
  if (capaBase) mapa.removeLayer(capaBase);
  if (capaEtiquetas) { mapa.removeLayer(capaEtiquetas); capaEtiquetas = null; }
  capaBase = L.tileLayer(b[0], { maxZoom: 18, attribution: b[1], crossOrigin: true }).addTo(mapa);
  if (k === 'sat') // nombres de lugares y límites sobre la imagen satelital
    capaEtiquetas = L.tileLayer(ESRI + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, crossOrigin: true }).addTo(mapa);
  store.set('mapa-base', k);
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
let simulado = false, mapaEncuadrado = false;
function iniciarGPS(centrar) {
  if (!('geolocation' in navigator)) return toast(t('sin_gps'));
  let primera = true;
  $('#btn-gps').classList.add('activo');
  watchId = navigator.geolocation.watchPosition(p => {
    nuevaPosicion({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy });
    if (primera && centrar) { mapaEncuadrado = true; mapa.setView([pos.lat, pos.lon], 12); }
    primera = false;
  }, err => {
    $('#btn-gps').classList.remove('activo'); watchId = null;
    toast(err.code === 1 ? t('gps_denegado') : t('gps_error'));
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
  mc.innerHTML = `<img src="${g.fotos[0].mini}" alt=""><div><small>${t('mas_cercano', fmtDist(d), rumbo(p, g))}</small><b>${esc(g.nombre)}</b></div>`;
  mc.onclick = () => abrirFicha(g.id);

  for (const { g, d } of orden.slice(0, 5)) {
    const r = radio(g.id);
    if (d <= r && p.acc <= Math.max(150, r / 2) && !prog[g.id]?.v) { ganarSello(g.id); break; }
    if (d <= Math.max(5000, r * 2) && !prog[g.id]?.v && !avisados.has(g.id)) {
      avisados.add(g.id);
      toast(t('estas_a', fmtDist(d), esc(g.nombre)), 7000, { txt: t('ver'), fn: () => abrirFicha(g.id) });
      vibrar(120);
    }
  }
  if (!$('#v-cerca').hidden) pintarLista();
  if (fichaActual) actualizarEstadoSello();
}

function ganarSello(id) {
  const g = POR_ID[id];
  prog[id] = prog[id] || {};
  const nuevo = !prog[id].v;
  prog[id].v = prog[id].v || Date.now();
  guardar();
  if (!nuevo) return;
  vibrar([80, 60, 160]);
  const a = $('#sello-anim');
  a.innerHTML = `<div class="caja"><div class="estampa"><img src="${g.fotos[0].mini}" alt=""></div>
    <p>${t('sello_visita')}</p><h3>${esc(g.nombre)}</h3><p>${t('mas100')}</p>
    <div class="fila-botones" style="justify-content:center;margin-top:14px">
      <button class="btn primario" id="sa-escuchar">${t('escuchar_historia')}</button>
      <button class="btn" id="sa-cerrar">${t('seguir')}</button></div></div>`;
  a.hidden = false;
  $('#sa-cerrar').onclick = () => (a.hidden = true);
  $('#sa-escuchar').onclick = () => { a.hidden = true; abrirFicha(id); reproducir(id); };
}

// ---------------------------------------------------------------- lista / explorar
const filtro = { cat: '', region: '', q: '' };
function prepararLista() {
  const cats = [...new Set(SITIOS.map(s => s.categoria))];
  $('#filtros-cat').innerHTML = `<button class="chip on" data-c="">${t('todos')}</button>` +
    cats.map(c => `<button class="chip" data-c="${c}" style="--c:${colorCat(c)}"><i></i>${catNombre(c)}</button>`).join('');
  $('#filtros-cat').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filtro.cat = b.dataset.c;
    [...$('#filtros-cat').children].forEach(x => x.classList.toggle('on', x === b));
    pintarLista();
  };
  const regs = [...new Set(SITIOS.map(s => s.region))];
  $('#filtro-region').innerHTML = `<option value="">${t('todas_regiones')}</option>` + regs.map(r => `<option>${esc(r)}</option>`).join('');
  $('#filtro-region').onchange = e => { filtro.region = e.target.value; pintarLista(); };
  $('#buscar').oninput = e => { filtro.q = norm(e.target.value.trim()); pintarLista(); };
  $('#lista').onclick = e => { const li = e.target.closest('[data-id]'); if (li) abrirFicha(li.dataset.id); };
  for (const g of SITIOS) g._busca = norm([g.nombre, g.nombre_es, g.region, g.comuna, g.localidad, g.provincia, g.interes, ...g.parrafos].join(' '));
}
function itemHTML(g, d) {
  const s = prog[g.id] || {};
  return `<li class="item" data-id="${g.id}"><img loading="lazy" src="${g.fotos[0].mini}" alt="">
    <div class="t"><small>${CAT_E[g.categoria]} ${esc(g.region)}</small><b>${esc(g.nombre)}</b>
    <small>${d != null ? `<span class="dist">${t('al', fmtDist(d), rumbo(pos, g))}</span> · ` : ''}${esc(g.comuna)}</small></div>
    <span class="marcas">${s.v ? '📍' : ''}${aprobado(g.id) ? '🧠' : ''}</span></li>`;
}
function pintarLista() {
  const l = SITIOS.filter(g => (!filtro.cat || g.categoria === filtro.cat) && (!filtro.region || g.region === filtro.region) && (!filtro.q || g._busca.includes(filtro.q)));
  const conD = l.map(g => ({ g, d: pos ? distancia(pos, g) : null }));
  if (pos) conD.sort((a, b) => a.d - b.d);
  $('#cerca-titulo').textContent = pos ? t('cerca_de_mi') : t('explorar_ns');
  $('#lista').innerHTML = conD.length ? conD.map(({ g, d }) => itemHTML(g, d)).join('') : `<li class="vacio">${t('sin_resultados')}</li>`;
  if (!pos && !$('#lista').querySelector('.gps-ofrecer')) {
    const li = document.createElement('li'); li.className = 'vacio gps-ofrecer';
    li.innerHTML = `<button class="btn primario">${t('ordenar_gps')}</button>`;
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
      <button class="cerrar" aria-label="${t('volver')}">←</button>
      <button class="compartir" aria-label="${t('compartir')}">⤴</button>
      <div class="tit"><small>${t('de_n', g.orden, SITIOS.length)} · ${esc(g.region_txt)}</small><h2>${esc(g.nombre)}</h2></div></div>
    <div class="ficha-cuerpo">
      <div class="chips">
        <span class="chip on" style="--c:${colorCat(g.categoria)}">${CAT_E[g.categoria]} ${catNombre(g.categoria)}</span>
        ${g.altitud ? `<span class="chip">⛰️ ${esc(g.altitud)}</span>` : ''}
        ${g.valor ? `<span class="chip">⭐ ${esc(t('valor', g.valor))}</span>` : ''}
      </div>
      <div class="estado-sello" id="estado-sello"></div>
      <div class="acciones">
        <button class="btn primario" id="f-escuchar">${t('escuchar', fmtMin(g.audio.dur))}</button>
        <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lon}">${t('como_llegar')}</a>
        <button class="btn ancho" id="f-ir-quiz">${t('ir_quiz', qs.length)}</button>
      </div>
      <div class="texto" id="texto">${g.parrafos.map((p, i) => `<p data-i="${i}">${conGlosario(p, usados)}</p>`).join('')}</div>
      <p class="pie-foto">${t('ayuda_texto')}</p>
      <div class="galeria">${g.fotos.slice(1).map(ft => `<img loading="lazy" src="${ft.src}" width="${ft.w}" height="${ft.h}" alt="">`).join('')}</div>
      ${g.pies.map(p => `<p class="pie-foto">${esc(p)}</p>`).join('')}
      <dl class="datos">
        ${[['provincia', g.provincia], ['comuna', g.comuna], ['localidad', g.localidad], ['altitud', g.altitud],
           ['interes', g.interes], ['valor_principal', g.valor],
           ['coordenadas', `${g.lat.toFixed(5)}, ${g.lon.toFixed(5)}`]].filter(x => x[1]).map(([k, v]) => `<dt>${t(k)}</dt><dd>${esc(v)}</dd>`).join('')}
      </dl>
      <div class="quiz" id="quiz"></div>
      <h3 class="sec">${t('cercanos')}</h3>
      <div class="vecinos">${otros.map(({ g: o, d }) => itemHTML(o, null).replace('</b>', `</b><small class="dist">${fmtDist(d)}</small>`)).join('')}</div>
      <div class="acciones" style="margin-top:18px">
        ${ant ? `<button class="btn" data-ir="${ant.id}">← ${esc(ant.nombre)}</button>` : '<span></span>'}
        ${sig ? `<button class="btn" data-ir="${sig.id}">${esc(sig.nombre)} →</button>` : ''}
      </div>
      <p class="firma">${t('dev')}</p>
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
    el.innerHTML = `<span class="ico">🏅</span><div><b>${t('sello_obtenido')}</b><small>${new Date(s.v).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>`;
  } else {
    const d = pos ? distancia(pos, g) : null;
    el.innerHTML = `<span class="ico">📍</span><div><b>${t('sello_por_ganar')}</b><small>${t('llega_a', fmtDist(radio(g.id)), d != null ? t('esta_a', fmtDist(d), rumbo(pos, g)) : '')}</small></div>`;
  }
}
function compartir(g) {
  const url = location.origin + location.pathname + '#/' + g.id;
  const data = { title: g.nombre, text: `${g.nombre} — ${t('titulo')}`, url };
  if (navigator.share) navigator.share(data).catch(() => {});
  else navigator.clipboard?.writeText(url).then(() => toast(t('enlace_copiado')));
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
  const minimo = Math.ceil(qs.length * 2 / 3);
  const pasos = () => `<div class="pasos">${qs.map((_, k) => `<i class="${k < res.length ? (res[k] ? 'bien' : 'mal') : k === i ? 'act' : ''}"></i>`).join('')}</div>`;
  const mejor = prog[id]?.q;
  const portada = () => {
    el.innerHTML = `<h4>Quiz</h4><p class="preg">${t('quiz_titulo')}</p>
      <p class="expl">${mejor != null ? t('mejor', mejor, qs.length) : ''}${t('aprueba', minimo)}</p>
      <button class="btn primario" id="q-empezar">${mejor != null ? t('reintentar') : t('empezar')}</button>`;
    $('#q-empezar').onclick = pregunta;
  };
  const pregunta = () => {
    const q = qs[i], ops = barajar(q.o.map((tx, k) => ({ tx, ok: k === 0 })));
    el.innerHTML = `${pasos()}<h4>${t('pregunta', i + 1, qs.length)}</h4><p class="preg">${esc(q.p)}</p>
      <div class="ops">${ops.map((o, k) => `<button data-k="${k}">${esc(o.tx)}</button>`).join('')}</div><div id="q-sig"></div>`;
    el.querySelector('.ops').onclick = e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const o = ops[+b.dataset.k];
      el.querySelectorAll('.ops button').forEach((x, k) => { x.disabled = true; if (ops[k].ok) x.classList.add('bien'); });
      if (!o.ok) b.classList.add('mal');
      res.push(o.ok); vibrar(o.ok ? 30 : [40, 40, 40]);
      $('#q-sig').innerHTML = `<p class="expl">${o.ok ? t('correcto') : t('incorrecto')} ${esc(q.e)}</p>
        <button class="btn primario">${i + 1 < qs.length ? t('siguiente') : t('ver_resultado')}</button>`;
      $('#q-sig button').onclick = () => { i++; i < qs.length ? pregunta() : final(); };
    };
  };
  const final = () => {
    const n = res.filter(Boolean).length;
    const antes = aprobado(id);
    prog[id] = prog[id] || {};
    prog[id].q = Math.max(prog[id].q ?? 0, n);
    guardar();
    const e = n === qs.length ? '🏆' : n >= minimo ? '🎉' : '📖';
    el.innerHTML = `${pasos()}<div class="final"><div class="gran">${e}</div><p class="preg">${t('correctas', n, qs.length)}</p>
      <p class="expl">${n === qs.length ? t('perfecto', n * 10 + 20) : n >= minimo ? t('aprobado') : t('reprobado')}</p>
      <button class="btn" id="q-otra">${t('repetir')}</button></div>`;
    $('#q-otra').onclick = () => { i = 0; res.length = 0; pregunta(); };
    if (!antes && aprobado(id)) { vibrar([60, 40, 120]); toast(t('sello_estudio', esc(POR_ID[id].nombre))); }
  };
  portada();
}

// ---------------------------------------------------------------- narración
const audio = $('#audio');
let pista = null; // {id, titulo, marcas, dur}
const VELS = [1, 1.25, 1.5, 0.85];
const fmtVel = v => (LANG === 'es' ? String(v).replace('.', ',') : String(v)) + '×';
function reproducir(id, desdeTrozo = 0) {
  const g = POR_ID[id];
  const a = id === 'intro' ? D.audio_intro : g.audio;
  if (!pista || pista.id !== id) {
    pista = { id, titulo: id === 'intro' ? t('intro_titulo') : g.nombre, marcas: a.marcas, dur: a.dur };
    audio.src = a.src;
    audio.playbackRate = store.get('vel', 1);
    $('#rep-titulo').textContent = pista.titulo;
    $('#reproductor').hidden = false; document.body.classList.add('con-rep');
    guardarParaOffline(a.src);
    if ('mediaSession' in navigator) {
      const foto = id === 'intro' ? D.portada.mini : g.fotos[0].mini;
      navigator.mediaSession.metadata = new MediaMetadata({ title: pista.titulo, artist: t('titulo'), album: 'Sernageomin',
        artwork: [{ src: new URL(foto, location.href).href, sizes: '400x400', type: 'image/webp' }] });
    }
  }
  const ts = a.marcas[desdeTrozo] ?? 0;
  const ir = () => { if (desdeTrozo || audio.currentTime >= audio.duration - 1) audio.currentTime = ts; audio.play().catch(() => {}); };
  audio.readyState >= 1 ? ir() : audio.addEventListener('loadedmetadata', ir, { once: true });
  if (audio.readyState < 1) audio.load();
}
async function guardarParaOffline(url) {
  try { const c = await caches.open(MEDIA_CACHE); if (!(await c.match(url))) c.add(url).catch(() => {}); } catch {}
}
$('#rep-play').onclick = () => (audio.paused ? audio.play() : audio.pause());
$('#rep-vel').onclick = () => {
  const v = VELS[(VELS.indexOf(audio.playbackRate) + 1) % VELS.length] || 1;
  audio.playbackRate = v; store.set('vel', v); $('#rep-vel').textContent = fmtVel(v);
};
$('#rep-vel').textContent = fmtVel(store.get('vel', 1));
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
    toast(t('narracion_completa'), 3000);
  }
});
audio.addEventListener('error', () => { if (audio.src) toast(t('audio_error')); });
function marcarParrafo() {
  const cont = $('#texto'); if (!cont) return;
  let act = -1;
  if (pista && pista.id === fichaActual && audio.currentTime > 0) {
    const ct = audio.currentTime;
    for (let k = 1; k < pista.marcas.length; k++) if (ct >= pista.marcas[k] - 0.05) act = k - 1;
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
  $('#resumen-puntos').innerHTML = `<div class="nivel"><small>${t('nivel', nv.i)}</small><b>${nv.e} ${esc(nv.n)}</b>
    <div class="barra"><div style="width:${Math.round(nv.pct * 100)}%"></div></div>
    <small>${nv.sig ? t('pts_sig', nv.sig - p) : t('nivel_max')} · 📍 ${vis}/49 · 🧠 ${est}/49</small></div>
    <div class="pts"><b>${p}</b><small>${t('puntos')}</small></div>`;
  const ins = insignias();
  ins.sort((a, b) => b.ok - a.ok);
  $('#insignias').innerHTML = ins.map(i => `<div class="insignia${i.ok ? '' : ' bloq'}" data-i="${esc(i.id)}"><span class="e">${i.e}</span>${esc(i.n)}</div>`).join('');
  $('#insignias').onclick = e => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const i = ins.find(x => x.id === b.dataset.i);
    hoja(`<h3>${i.e} ${esc(i.n)}</h3><p>${esc(i.d)}</p><p><b>${i.ok ? t('conseguida') : t('aun_no')}</b></p><button class="btn peque" data-cerrar>${t('cerrar')}</button>`);
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
  $('#pie-portada').textContent = t('portada') + D.pie_portada;
  $('#referencia').textContent = D.referencia;
  $('#creditos-en').hidden = LANG !== 'en';
  $('#btn-intro').onclick = () => reproducir('intro');
  const pintarGlos = q => {
    $('#glosario').innerHTML = GLOS.filter(g => !q || norm(g.t + ' ' + g.d).includes(q))
      .sort((a, b) => a.t.localeCompare(b.t, LANG)).map(g => `<dt>${esc(g.t)}</dt><dd>${esc(g.d)}</dd>`).join('');
  };
  pintarGlos('');
  $('#buscar-glosario').oninput = e => pintarGlos(norm(e.target.value.trim()));
  $('#btn-descargar').onclick = descargarTodo;
  $('#btn-reset').onclick = () => {
    if (!confirm(t('confirmar_reset'))) return;
    prog = {}; guardar(); insigniasPrevias = null; refrescarProgreso(); toast(t('reset_ok'));
  };
  document.querySelectorAll('.idioma-banderas button').forEach(b => (b.onclick = () => b.dataset.lang !== LANG && cambiarIdioma()));
  // Libro en PDF: el botón aparece activo solo si el archivo ya está publicado
  const pdf = $('#btn-pdf');
  fetch(PDF_URL, { method: 'HEAD', cache: 'no-store' }).then(r => {
    if (!r.ok) throw 0;
    const mb = +r.headers.get('content-length') / 1e6;
    pdf.href = PDF_URL; pdf.classList.remove('deshabilitado');
    pdf.textContent = t('libro_pdf') + (mb ? ` · ${mb.toLocaleString(LOCALE, { maximumFractionDigits: 0 })} MB` : '');
  }).catch(() => { pdf.removeAttribute('href'); pdf.classList.add('deshabilitado'); pdf.textContent = t('libro_pdf_pronto'); });
}
async function descargarTodo() {
  if (!('caches' in window)) return toast(t('sin_cache'));
  const datos = LANG === 'es' ? ['data/geositios.json', 'data/quiz.json', 'data/glosario.json'] :
    ['data/geositios.json', 'data/en.json', 'data/quiz-en.json', 'data/glosario-en.json'];
  const urls = [...datos, D.audio_intro.src, D.portada.src, D.portada.mini];
  for (const g of SITIOS) { urls.push(g.audio.src); for (const f of g.fotos) urls.push(f.src, f.mini); }
  const bar = $('#descarga-prog'); bar.hidden = false;
  const c = await caches.open(MEDIA_CACHE);
  let hechos = 0, fallos = 0;
  const pinta = () => { bar.firstElementChild.style.width = (hechos / urls.length * 100) + '%'; bar.lastElementChild.textContent = `${hechos} / ${urls.length}${fallos ? t('con_error', fallos) : ''}`; };
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
  toast(fallos ? t('descarga_err', fallos) : t('descarga_ok'));
}

// ---------------------------------------------------------------- navegación
function ruta() {
  const h = location.hash.replace(/^#\/?/, '');
  if (/^g\d\d$/.test(h)) return abrirFicha(h, true);
  ocultarFicha();
  const v = ['mapa', 'cerca', 'pasaporte'].includes(h) ? h : 'libro';  // la app abre en el Libro
  for (const s of ['mapa', 'cerca', 'pasaporte', 'libro']) $('#v-' + s).hidden = s !== v;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('activa', a.dataset.v === v));
  if (v === 'mapa') setTimeout(() => {
    mapa.invalidateSize();
    if (!mapaEncuadrado && !pos) mapa.fitBounds(L.latLngBounds(SITIOS.filter(g => g.lon > -80).map(g => [g.lat, g.lon])), { padding: [30, 30] });
    mapaEncuadrado = true;
  }, 0);
  if (v === 'cerca') pintarLista();
  if (v === 'pasaporte') pintarPasaporte();
}
window.addEventListener('hashchange', ruta);

// ---------------------------------------------------------------- arranque
async function cargarDatos() {
  const get = u => fetch(u).then(r => r.json());
  const sufijo = LANG === 'es' ? '' : '-' + LANG;
  const [d, q, gl, tr] = await Promise.all([get('data/geositios.json'), get(`data/quiz${sufijo}.json`), get(`data/glosario${sufijo}.json`),
    LANG === 'es' ? null : get(`data/${LANG}.json`)]);
  if (tr) { // superponer la traducción sobre la base en español (fotos, coordenadas y comunas son comunes)
    for (const g of d.sitios) { g.nombre_es = g.nombre; Object.assign(g, tr.sitios[g.id]); }
    for (const k of ['titulo', 'subtitulo', 'lema', 'pie_portada', 'prologos', 'audio_intro']) if (tr[k]) d[k] = tr[k];
  }
  D = d; QUIZ = q; GLOS = gl; SITIOS = D.sitios; POR_ID = Object.fromEntries(SITIOS.map(s => [s.id, s]));
}
// ---------------------------------------------------------------- pantalla completa e instalación
// Ningún navegador permite pantalla completa sin un toque: se pide en el primer toque de cada visita.
// iPhone no tiene Fullscreen API → la única forma sin barra es "Agregar a pantalla de inicio" (guía).
const INSTALADA = ['standalone', 'fullscreen'].some(m => matchMedia(`(display-mode: ${m})`).matches) || navigator.standalone === true;
const ES_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const PUEDE_FS = !INSTALADA && !!document.fullscreenEnabled;
const CADA_RECORDATORIO = 3 * 864e5;
let pedidoInstalar = null;

function pantallaCompleta() {
  if (!PUEDE_FS || document.fullscreenElement) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
function alternarPantalla() {
  if (document.fullscreenElement) { store.set('pantalla-completa', false); document.exitFullscreen().catch(() => {}); }
  else { store.set('pantalla-completa', true); pantallaCompleta(); }
}
if (PUEDE_FS) {
  const primerToque = e => {
    // el botón Instalar necesita el gesto para sí (requestFullscreen lo consume)
    if (e.target.closest && e.target.closest('.btn-instalar, #btn-fs, #toast button')) return;
    document.removeEventListener('click', primerToque, true);
    if (store.get('pantalla-completa', true)) pantallaCompleta();
  };
  document.addEventListener('click', primerToque, true);
  document.addEventListener('fullscreenchange', () => $('#btn-fs').classList.toggle('activo', !!document.fullscreenElement));
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); pedidoInstalar = e; mostrarInstalar();
  if (store.get('bienvenida')) setTimeout(recordarInstalar, 5000);
});
window.addEventListener('appinstalled', () => { pedidoInstalar = null; mostrarInstalar(); toast(t('instalada_ok'), 8000); });
function mostrarInstalar() {
  $('#bv-instalar').hidden = !pedidoInstalar;
  $('#btn-instalar').hidden = INSTALADA || !(pedidoInstalar || ES_IOS);
  $('#btn-fs').hidden = !PUEDE_FS;
}
function instalar() {
  if (pedidoInstalar) {
    pedidoInstalar.prompt();
    pedidoInstalar.userChoice.finally(() => { pedidoInstalar = null; mostrarInstalar(); });
  } else if (ES_IOS) guiaIOS(true);
}
const ICO_COMPARTIR = '<svg class="ico-compartir" viewBox="0 0 24 24" aria-label="Compartir / Share"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 10H6v11h12V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function guiaIOS(manual) {
  const chrome = /CriOS/.test(navigator.userAgent);
  const ipad = /ipad/i.test(navigator.userAgent) || navigator.platform === 'MacIntel';
  store.set('guia-instalar', { ...store.get('guia-instalar', {}), ts: Date.now() });
  hoja(`<h3>📲 ${t('ios_t')}</h3><p>${t('ios_intro')}</p>
    <ol class="pasos-ios">
      <li><span>${t(chrome ? 'ios_1_chrome' : 'ios_1').replace('{ico}', ICO_COMPARTIR)}</span></li>
      <li><span>${t('ios_2')}</span></li><li><span>${t('ios_3')}</span></li>
    </ol>
    <div class="fila-botones"><button class="btn primario" data-cerrar>${t('ios_ok')}</button>${manual ? '' : `<button class="btn peque" id="ios-nunca" data-cerrar>${t('no_mostrar')}</button>`}</div>
    <div class="flecha-compartir ${ipad || chrome ? 'arriba' : 'abajo'}" aria-hidden="true">${ipad || chrome ? '⬆' : '⬇'}</div>`);
  const nunca = $('#ios-nunca');
  if (nunca) nunca.addEventListener('click', () => store.set('guia-instalar', { nunca: true, ts: Date.now() }));
}
// Recordatorio discreto en visitas posteriores, como máximo cada 3 días
function recordarInstalar() {
  if (INSTALADA || !$('#bienvenida').hidden || !$('#hoja').hidden) return;
  const g = store.get('guia-instalar', {});
  if (g.nunca || Date.now() - (g.ts || 0) < CADA_RECORDATORIO) return;
  if (ES_IOS) { store.set('guia-instalar', { ...g, ts: Date.now() }); toast(t('ios_rec'), 9000, { txt: t('como'), fn: () => guiaIOS(false) }); }
  else if (pedidoInstalar) { store.set('guia-instalar', { ...g, ts: Date.now() }); toast(t('instalar_sub'), 9000, { txt: t('instalar'), fn: instalar }); }
}

async function iniciar() {
  traducirHTML();
  mostrarInstalar();
  $('#bv-instalar').onclick = $('#btn-instalar').onclick = instalar;
  $('#btn-fs').onclick = alternarPantalla;
  await cargarDatos();
  prepararGlosario();
  iniciarMapa();
  prepararLista();
  pintarLibro();
  refrescarProgreso();
  ruta();

  if (!store.get('bienvenida')) {
    $('#bv-img').src = D.portada.src; $('#bienvenida').hidden = false;
    $('#bv-ok').onclick = () => {
      store.set('bienvenida', 1); store.set('lang', LANG); $('#bienvenida').hidden = true; iniciarGPS(true);
      if (ES_IOS && !INSTALADA) setTimeout(() => guiaIOS(false), 900);
    };
  } else setTimeout(recordarInstalar, 5000);
  const sim = new URLSearchParams(location.search).get('sim');
  if (sim) { const [la, lo] = sim.split(',').map(Number); simularPosicion(la, lo); }
  else if (store.get('gps')) {
    try { const st = await navigator.permissions.query({ name: 'geolocation' }); if (st.state === 'granted') iniciarGPS(false); } catch {}
  }
}
iniciar().catch(e => { console.error(e); document.body.insertAdjacentHTML('afterbegin', `<p style="padding:20px">${t('carga_error')}</p>`); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
