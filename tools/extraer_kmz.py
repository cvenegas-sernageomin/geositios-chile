"""Extrae LIBRO.kmz (Geositios de Chile, SERNAGEOMIN) a data/geositios.json + fotos originales.

Uso: python tools/extraer_kmz.py [ruta_kmz]
Salida: app/data/geositios.json y tools/_fotos_orig/<archivo original>
"""
import json, re, sys, unicodedata, zipfile
from pathlib import Path
from bs4 import BeautifulSoup

RAIZ = Path(__file__).resolve().parent.parent
KMZ = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads' / 'LIBRO.kmz'
ORIG = RAIZ / 'tools' / '_fotos_orig'
OUT = RAIZ / 'docs' / 'data' / 'geositios.json'

nfc = lambda s: unicodedata.normalize('NFC', s)
limpia = lambda s: re.sub(r'\s+', ' ', s or '').strip()


def nombre_zip(info):
    # El KMZ no marca los nombres como UTF-8: zipfile los decodifica como cp437.
    n = info.filename
    if not info.flag_bits & 0x800:
        try:
            n = n.encode('cp437').decode('utf-8')
        except UnicodeError:
            pass
    return nfc(n)


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


# Clasificación por el PRIMER término del "Interés geocientífico" (el principal según el libro)
CATEGORIAS = [
    ('volcanico', 'Volcánico', r'volcan'),
    ('geomorfologico', 'Geomorfológico', r'geomorf|exogeol'),
    ('paleontologico', 'Paleontológico', r'pale?o?ntol'),
    ('estratigrafico', 'Estratigráfico-sedimentario', r'estratig|sedimentol'),
    ('estructural', 'Estructural-tectónico', r'estructural|tect'),
    ('petrologico', 'Petrológico-mineral', r'petrol|mineral|hidrogeol'),
    ('geotermico', 'Geotérmico', r'geot[eé]rm'),
]


def categoria(interes):
    primero = re.split(r'\s*-\s*', (interes or '').lower().strip())[0]
    for k, _, rx in CATEGORIAS:
        if re.search(rx, primero):
            return k
    return 'otro'


def parte_parrafo(p, maximo=800):
    """Divide párrafos muy largos en trozos de oraciones completas (lectura en móvil)."""
    if len(p) <= maximo:
        return [p]
    oraciones = re.split(r'(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ“"(])', p)
    trozos, act = [], ''
    objetivo = len(p) / -(-len(p) // maximo)
    for o in oraciones:
        if act and len(act) + len(o) > objetivo * 1.15:
            trozos.append(act.strip()); act = ''
        act += ' ' + o
    if act.strip():
        trozos.append(act.strip())
    return trozos


def sin_repetidos(parrafos):
    """El HTML del KML trae <p> anidados y párrafos repetidos: elimina oraciones ya vistas."""
    vistas, out = set(), []
    for p in parrafos:
        oraciones = re.split(r'(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÑ“"(])', p)
        nuevas = [o for o in oraciones if o.strip() not in vistas]
        vistas.update(o.strip() for o in oraciones)
        if nuevas:
            out.append(' '.join(nuevas).strip())
    return [p for p in out if len(p) > 3]


def main():
    z = zipfile.ZipFile(KMZ)
    archivos = {nombre_zip(i): i for i in z.infolist()}
    kml = z.read(archivos['doc.kml']).decode('utf-8')
    ORIG.mkdir(parents=True, exist_ok=True)

    def extrae_foto(src):
        src = nfc(src.strip())
        info = archivos.get(src)
        if not info:
            print('  !! foto no encontrada en KMZ:', src)
            return None
        dest = ORIG / Path(src).name
        if not dest.exists():
            dest.write_bytes(z.read(info))
        return Path(src).name

    # --- Intro (descripción del Document) ---
    m = re.search(r'<Document.*?<description><!\[CDATA\[(.*?)\]\]></description>', kml, re.S)
    intro_soup = BeautifulSoup(m.group(1), 'html.parser')
    intro_txt = intro_soup.get_text('\n')
    portada = extrae_foto(intro_soup.find('img')['src'])
    bloques = re.split(r'PRÓLOGO ', intro_txt)
    lema = limpia(bloques[0])
    prologos = []
    for b in bloques[1:]:
        cab, _, cuerpo = b.partition('\n')
        cuerpo = cuerpo.split('Referencia bibliográfica')[0]
        # Los prólogos vienen con saltos de línea duros: reconstruir párrafos por oraciones
        prologos.append({'titulo': 'Prólogo ' + limpia(cab).title().replace(' - ', ' — ').replace(' De ', ' de '),
                         'texto': limpia(cuerpo)})
    ref = limpia(intro_txt.split('Referencia bibliográfica')[1].split('Portada:')[0])
    pie_portada = limpia(intro_txt.split('Portada:')[1])

    # --- Geositios ---
    sitios = []
    for n, pm in enumerate(re.findall(r'<Placemark.*?</Placemark>', kml, re.S), 1):
        nombre_kml = limpia(re.search(r'<name>(.*?)</name>', pm, re.S).group(1))
        lon, lat = map(float, re.search(r'<coordinates>\s*([-\d.]+),([-\d.]+)', pm).groups())
        html = re.search(r'<description><!\[CDATA\[(.*?)\]\]></description>', pm, re.S).group(1)
        s = BeautifulSoup(html, 'html.parser')

        titulo = limpia(s.select_one('.titulo').get_text()) if s.select_one('.titulo') else nombre_kml
        nombre, _, region = [limpia(x) for x in titulo.partition('|')]
        campos = {}
        for tr in s.select('.detalle tr'):
            td = tr.find_all('td')
            if len(td) >= 2:
                campos[limpia(td[0].get_text()).rstrip(':')] = limpia(td[1].get_text())
        res = s.select_one('.resumen')
        parrafos = [limpia(p.get_text()) for p in res.find_all('p')] if res else []
        parrafos = sin_repetidos(parrafos)
        parrafos = [t for p in parrafos for t in parte_parrafo(p)]
        if res:
            res.decompose()

        fotos = [f for f in (extrae_foto(im['src']) for im in s.find_all('img') if im.get('src')) if f]
        pies = [limpia(i.get_text()) for i in s.find_all('i')]
        pies = [p for p in pies if p]

        interes = campos.get('Interés geocientífico', '').replace('palentol', 'paleontol')
        sitios.append({
            'id': f'g{n:02d}',
            'orden': n,
            'slug': slug(nombre),
            'nombre': nombre or nombre_kml.title(),
            'region': region.replace('Región de ', '').replace('Región del ', '').strip() or '',
            'region_txt': region,
            'lat': round(lat, 6), 'lon': round(lon, 6),
            'provincia': campos.get('Provincia', ''),
            'comuna': campos.get('Comuna', ''),
            'localidad': campos.get('Localidad más cercana', ''),
            'altitud': campos.get('Altitud', ''),
            'interes': interes,
            'categoria': categoria(interes),
            'valor': campos.get('Valor principal', ''),
            'parrafos': parrafos,
            'fotos_orig': fotos,
            'pies': pies,
        })

    datos = {
        'titulo': 'Geositios de Chile',
        'subtitulo': 'Una mirada a sus maravillas geológicas',
        'lema': lema,
        'portada_orig': portada,
        'pie_portada': pie_portada,
        'prologos': prologos,
        'referencia': ref,
        'categorias': [{'id': k, 'nombre': nom} for k, nom, _ in CATEGORIAS] + [{'id': 'otro', 'nombre': 'Otro'}],
        'sitios': sitios,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding='utf-8')

    # --- Chequeos ---
    print(f'{len(sitios)} geositios -> {OUT}')
    for g in sitios:
        prob = []
        if not (-56 < g['lat'] < -17 and -110 < g['lon'] < -66): prob.append('coords fuera de Chile')
        if len(g['parrafos']) < 2: prob.append(f"{len(g['parrafos'])} párrafos")
        if not g['fotos_orig']: prob.append('sin fotos')
        if not g['region']: prob.append('sin región')
        print(f"{g['id']} {g['nombre'][:40]:40} {g['region'][:18]:18} {g['categoria']:15} p={len(g['parrafos'])} f={len(g['fotos_orig'])} pies={len(g['pies'])} {'!! ' + ', '.join(prob) if prob else ''}")


if __name__ == '__main__':
    main()
