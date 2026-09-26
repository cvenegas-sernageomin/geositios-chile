"""Genera la narración neural (edge-tts, voz chilena) de cada geositio y del prólogo.

Cada párrafo se sintetiza por separado y los MP3 se concatenan (mismo códec CBR 48 kbps),
así se conocen los tiempos de inicio de cada párrafo para resaltarlo en la app.

Uso: python tools/voces.py [--voz es-CL-LorenzoNeural] [--forzar]
"""
import argparse, asyncio, json, re
from pathlib import Path
import edge_tts

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / 'docs' / 'data' / 'geositios.json'
AUDIO = RAIZ / 'docs' / 'audio'
KBPS = 48000  # formato por defecto de edge-tts: audio-24khz-48kbitrate-mono-mp3

REEMPLAZOS = [
    (r'\s*\((?:[^()]*?,\s*)?\d{4}[a-z]?(?:;[^()]*)?\)', ''),         # citas "(Sernageomin, 2023)"
    (r'\bm\s*s\.\s*n\.\s*m\b', 'metros sobre el nivel del mar'),  # deja el punto final
    (r'\bm\s*b\.\s*n\.\s*m\b', 'metros bajo el nivel del mar'),
    (r'(\d)\s*[ºo°]\s*C\b', r'\1 grados Celsius'),
    (r'(\d)\s*km2\b|(\d)\s*km²', r'\1\2 kilómetros cuadrados'),
    (r'(\d)\s*km\b', r'\1 kilómetros'),
    (r'(\d)\s*m2\b|(\d)\s*m²', r'\1\2 metros cuadrados'),
    (r'(\d)\s*m\b(?!\.?\s*s\.)', r'\1 metros'),
    (r'(\d)\s*cm\b', r'\1 centímetros'),
    (r'(\d)\s*mm\b', r'\1 milímetros'),
    (r'(\d)\s*Ma\b', r'\1 millones de años'),
    (r'(\d)\s*ka\b', r'\1 mil años'),
    (r'\bAP\b', 'antes del presente'),
    (r'\bca\.\s*', 'cerca de '),
    (r'\baprox\.\s*', 'aproximadamente '),
    (r'\bSernageomin\b', 'Sernagueomín'),
    (r'\bpahoehoe\b', 'pajoejoe'),
    (r'(\d)\.(\d{3})', r'\1\2'),  # 4.290 -> 4290 (evita que lea "cuatro punto")
]


def guion(txt):
    for a, b in REEMPLAZOS:
        txt = re.sub(a, b, txt)
    return re.sub(r'\s+', ' ', txt).strip()


async def sintetiza(texto, voz, sem):
    async with sem:
        for intento in range(4):
            try:
                com = edge_tts.Communicate(guion(texto), voz, rate='-4%')
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


async def pista(nombre, trozos, voz, sem, forzar):
    """trozos: lista de textos. Devuelve {'src','dur','marcas'} con inicio de cada trozo (s)."""
    dest = AUDIO / f'{nombre}.mp3'
    meta = RAIZ / 'tools' / '_audio_meta' / f'{nombre}.json'
    if dest.exists() and meta.exists() and not forzar:
        m = json.loads(meta.read_text(encoding='utf-8'))
        if m.get('voz') == voz and m.get('n') == len(trozos):
            return m['pista']
    partes = await asyncio.gather(*(sintetiza(t, voz, sem) for t in trozos))
    marcas, t = [], 0.0
    for p in partes:
        marcas.append(round(t, 2))
        t += len(p) * 8 / KBPS
    dest.write_bytes(b''.join(partes))
    res = {'src': f'audio/{nombre}.mp3', 'dur': round(t, 1), 'marcas': marcas}
    meta.write_text(json.dumps({'voz': voz, 'n': len(trozos), 'pista': res}), encoding='utf-8')
    print(f'  {nombre}: {t / 60:.1f} min, {dest.stat().st_size / 1e6:.2f} MB')
    return res


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voz', default='es-CL-CatalinaNeural')
    ap.add_argument('--forzar', action='store_true')
    a = ap.parse_args()
    AUDIO.mkdir(parents=True, exist_ok=True)
    datos = json.loads(DATOS.read_text(encoding='utf-8'))
    sem = asyncio.Semaphore(6)

    # Trozo 0 = presentación del sitio; luego un trozo por párrafo (marcas[i+1] = párrafo i)
    tareas = []
    for g in datos['sitios']:
        pres = f"{g['nombre']}. {g['region_txt']}." if g['region_txt'] else f"{g['nombre']}."
        tareas.append(pista(g['id'], [pres] + g['parrafos'], a.voz, sem, a.forzar))
    intro = [datos['titulo'] + '. ' + datos['subtitulo'] + '.', datos['lema']]
    for p in datos['prologos']:
        intro += [p['titulo'] + '.', p['texto']]
    tareas.append(pista('intro', intro, a.voz, sem, a.forzar))

    res = await asyncio.gather(*tareas)
    for g, r in zip(datos['sitios'], res):
        g['audio'] = r
    datos['audio_intro'] = res[-1]
    DATOS.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding='utf-8')
    total = sum(f.stat().st_size for f in AUDIO.glob('*.mp3'))
    print(f'Total audio: {total / 1e6:.1f} MB, {sum(r["dur"] for r in res) / 60:.0f} min')


if __name__ == '__main__':
    asyncio.run(main())
