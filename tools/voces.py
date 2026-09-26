"""Genera la narración neural (edge-tts, voz chilena) de cada geositio y del prólogo.

Cada párrafo se sintetiza por separado y los MP3 se concatenan (mismo códec CBR 48 kbps),
así se conocen los tiempos de inicio de cada párrafo para resaltarlo en la app.

Uso: python tools/voces.py [--lang es|en] [--forzar]
"""
import argparse, asyncio, hashlib, json, re
from pathlib import Path
import edge_tts

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / 'docs' / 'data' / 'geositios.json'
AUDIO = RAIZ / 'docs' / 'audio'
KBPS = 48000  # formato por defecto de edge-tts: audio-24khz-48kbitrate-mono-mp3

ORDINALES = {'1': 'primer', '2': 'segundo', '3': 'tercer', '4': 'cuarto', '5': 'quinto', '6': 'sexto',
             '7': 'séptimo', '8': 'octavo', '9': 'noveno', '10': 'décimo', '11': 'undécimo'}

# Correcciones de pronunciación verificadas transcribiendo el audio con Whisper (tools/revisar_voz.py)
REEMPLAZOS_ES = [
    (r'\b([Gg])eositio', r'\1eo sitio'),                           # "geositio" sonaba "geosicio"
    (r'\s*\((?:[^()]*?,\s*)?\d{4}[a-z]?(?:;[^()]*)?\)', ''),         # citas "(Sernageomin, 2023)"
    (r'\s*\(\d+°\d+’\s*[NS][^)]*\)', ''),                           # coordenadas entre paréntesis
    (r'\s*\(T\d\)', ''),
    (r'\bm\s*s\.\s*n\.\s*m\b', 'metros sobre el nivel del mar'),  # deja el punto final
    (r'\bm\s*b\.\s*n\.\s*m\b', 'metros bajo el nivel del mar'),
    (r'(\d)\s*[ºo°]\s*C\b', r'\1 grados Celsius'),
    (r'(\d+)\s*[°o]\s*lugar', lambda m: ORDINALES.get(m.group(1), m.group(1)) + ' lugar'),
    (r'N°\s*(\d+)', r'número \1'),
    (r'(\d+)-(\d+)\s*°', r'\1 a \2 grados'),
    (r'(\d)\s*°', r'\1 grados'),
    (r'(\d)\s*km/s\b', r'\1 kilómetros por segundo'),
    (r'(\d)\s*km2\b|(\d)\s*km²', r'\1\2 kilómetros cuadrados'),
    (r'(\d)\s*km3\b|(\d)\s*km³', r'\1\2 kilómetros cúbicos'),
    (r'(\d)\s*km\b', r'\1 kilómetros'),
    (r'(\d)\s*m2\b|(\d)\s*m²', r'\1\2 metros cuadrados'),
    (r'(\d)\s*m\b(?!\.?\s*s\.)', r'\1 metros'),
    (r'(\d)\s*cm\b', r'\1 centímetros'),
    (r'(\d)\s*mm\b', r'\1 milímetros'),
    (r'(\d)\s*ha\b', r'\1 hectáreas'),
    (r'(\d)\s*t\b', r'\1 toneladas'),
    (r'(\d)\s*Mw\b', r'\1'),
    (r'(\d)\s*Ma\b', r'\1 millones de años'),
    (r'(\d)\s*ka\b', r'\1 mil años'),
    (r'\bd\.\s*C\.', 'después de Cristo'),
    (r'\bBRCU\b', 'B R C U'),
    (r'\bAP\b', 'antes del presente'),
    (r'\bca\.\s*', 'cerca de '),
    (r'\baprox\.\s*', 'aproximadamente '),
    (r'\bpahoehoe\b', 'pajoejoe'),
    (r'(\d)\.(\d{3})', r'\1\2'),  # 4.290 -> 4290 (evita que lea "cuatro punto")
]
REEMPLAZOS_EN = [
    (r'\s*\((?:[^()]*?,\s*)?\d{4}[a-z]?(?:;[^()]*)?\)', ''),
    (r'\s*\(\d+°\d+’\s*[NS][^)]*\)', ''),
    (r'\s*\(T\d\)', ''),
    (r'\bm a\.s\.l\.?', 'meters above sea level'),
    (r'(\d)\s*°C\b', r'\1 degrees Celsius'),
    (r'(\d+)-(\d+)\s*°', r'\1 to \2 degrees'),
    (r'(\d)\s*°', r'\1 degrees'),
    (r'(\d)\s*km/s\b', r'\1 kilometers per second'),
    (r'(\d)\s*km2\b|(\d)\s*km²', r'\1\2 square kilometers'),
    (r'(\d)\s*km3\b|(\d)\s*km³', r'\1\2 cubic kilometers'),
    (r'(\d)\s*km\b', r'\1 kilometers'),
    (r'(\d)\s*m2\b|(\d)\s*m²', r'\1\2 square meters'),
    (r'(\d)\s*m\b', r'\1 meters'),
    (r'(\d)\s*cm\b', r'\1 centimeters'),
    (r'(\d)\s*ha\b', r'\1 hectares'),
    (r'(\d)\s*Mw\b', r'\1'),
    (r'\bBRCU\b', 'B R C U'),
]
REEMPLAZOS = {'es': REEMPLAZOS_ES, 'en': REEMPLAZOS_EN}
VOZ = {'es': 'es-CL-CatalinaNeural', 'en': 'en-US-AvaMultilingualNeural'}


def guion(txt, lang='es'):
    for a, b in REEMPLAZOS[lang]:
        txt = re.sub(a, b, txt)
    return re.sub(r'\s+', ' ', txt).strip()


async def sintetiza(texto, voz, sem, lang):
    async with sem:
        for intento in range(4):
            try:
                com = edge_tts.Communicate(guion(texto, lang), voz, rate='-4%' if lang == 'es' else '-2%')
                buf = bytearray()
                async for ch in com.stream():
                    if ch['type'] == 'audio':
                        buf += ch['data']
                if buf:
                    return bytes(buf)
            except Exception as e:  # red inestable: reintentar
                print('   reintento', intento + 1, type(e).__name__, str(e)[:80])
                await asyncio.sleep(2 + intento * 3)
        raise RuntimeError('no se pudo sintetizar: ' + texto[:60])


async def pista(nombre, trozos, lang, sem, forzar):
    """trozos: lista de textos. Devuelve {'src','dur','marcas'} con inicio de cada trozo (s)."""
    voz = VOZ[lang]
    sub = '' if lang == 'es' else f'{lang}/'
    (AUDIO / sub).mkdir(parents=True, exist_ok=True)
    dest = AUDIO / f'{sub}{nombre}.mp3'
    meta = RAIZ / 'tools' / '_audio_meta' / f'{lang}-{nombre}.json'
    firma = hashlib.sha1(json.dumps([voz] + [guion(t, lang) for t in trozos], ensure_ascii=False).encode()).hexdigest()
    if dest.exists() and meta.exists() and not forzar:
        m = json.loads(meta.read_text(encoding='utf-8'))
        if m.get('firma') == firma:
            return m['pista']
    partes = await asyncio.gather(*(sintetiza(t, voz, sem, lang) for t in trozos))
    marcas, t = [], 0.0
    for p in partes:
        marcas.append(round(t, 2))
        t += len(p) * 8 / KBPS
    dest.write_bytes(b''.join(partes))
    res = {'src': f'audio/{sub}{nombre}.mp3', 'dur': round(t, 1), 'marcas': marcas}
    meta.write_text(json.dumps({'firma': firma, 'pista': res}), encoding='utf-8')
    print(f'  {lang}/{nombre}: {t / 60:.1f} min, {dest.stat().st_size / 1e6:.2f} MB')
    return res


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lang', default='es', choices=['es', 'en'])
    ap.add_argument('--forzar', action='store_true')
    a = ap.parse_args()
    sem = asyncio.Semaphore(6)
    base = json.loads(DATOS.read_text(encoding='utf-8'))
    if a.lang == 'es':
        datos, sitios, archivo = base, {g['id']: g for g in base['sitios']}, DATOS
    else:
        archivo = DATOS.with_name(f'{a.lang}.json')
        datos = json.loads(archivo.read_text(encoding='utf-8'))
        sitios = datos['sitios']

    # Trozo 0 = presentación del sitio; luego un trozo por párrafo (marcas[i+1] = párrafo i)
    ids = [g['id'] for g in base['sitios']]
    tareas = []
    for i in ids:
        g = sitios[i]
        pres = f"{g['nombre']}. {g['region_txt']}." if g.get('region_txt') else f"{g['nombre']}."
        tareas.append(pista(i, [pres] + g['parrafos'], a.lang, sem, a.forzar))
    intro = [datos['titulo'] + '. ' + datos['subtitulo'] + '.', datos['lema']]
    for p in datos['prologos']:
        intro += [p['titulo'] + '.', p['texto']]
    tareas.append(pista('intro', intro, a.lang, sem, a.forzar))

    res = await asyncio.gather(*tareas)
    for i, r in zip(ids, res):
        sitios[i]['audio'] = r
    datos['audio_intro'] = res[-1]
    archivo.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'Total {a.lang}: {sum(r["dur"] for r in res) / 60:.0f} min')


if __name__ == '__main__':
    asyncio.run(main())
