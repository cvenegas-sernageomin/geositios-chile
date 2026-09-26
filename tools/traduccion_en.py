"""Arma docs/data/en.json a partir de las traducciones en tools/_trad/*.json.
(Las marcas de audio en inglés las agrega después: python tools/voces.py --lang en)
"""
import json, re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
TRAD = RAIZ / 'tools' / '_trad'
BASE = RAIZ / 'docs' / 'data' / 'geositios.json'
OUT = RAIZ / 'docs' / 'data' / 'en.json'

TERMINOS = {
    'geomorfológico': 'geomorphological', 'petrológico': 'petrological', 'geotérmico': 'geothermal',
    'sedimentológico': 'sedimentological', 'hidrogeológico': 'hydrogeological', 'mineralógico': 'mineralogical',
    'exogeológico': 'exogeological', 'estratigráfico': 'stratigraphic', 'paleontológico': 'paleontological',
    'volcanológico': 'volcanological', 'paleoambiental': 'paleoenvironmental', 'glaciológico': 'glaciological',
    'peligro geológico': 'geological hazard', 'geológico estructural': 'structural geology', 'tectónico': 'tectonic',
    'recreativo': 'recreational', 'cultural': 'cultural', 'científico': 'scientific', 'didáctico': 'educational',
    'ambiental': 'environmental',
}


def traduce_terminos(t):
    for es in sorted(TERMINOS, key=len, reverse=True):
        t = t.replace(es, TERMINOS[es])
    return t


def region_en(txt):
    r = re.sub(r'^Región (?:de la |del |de )?', '', txt)
    if r.startswith('Metropolitana'):
        return 'Santiago Metropolitan Region'
    return f'{r} Region'


def altitud_en(a):
    m = re.match(r'([\d.]+)\s*m s\.n\.m\.', a or '')
    return f"{int(m.group(1).replace('.', '')):,} m a.s.l." if m else a


def main():
    base = json.loads(BASE.read_text(encoding='utf-8'))
    trad = {}
    for f in sorted(TRAD.glob('en_[0-9].json')):
        trad.update(json.loads(f.read_text(encoding='utf-8')))
    pies = json.loads((TRAD / 'en_pies.json').read_text(encoding='utf-8'))
    libro = pies.pop('_libro')
    previo = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'sitios': {}}
    sitios = {}
    for g in base['sitios']:
        t = trad[g['id']]
        sitios[g['id']] = {
            'nombre': t['nombre'],
            'region_txt': region_en(g['region_txt']),
            'interes': traduce_terminos(g['interes']),
            'valor': traduce_terminos(g['valor']),
            'altitud': altitud_en(g['altitud']),
            'parrafos': t['parrafos'],
            'pies': pies[g['id']],
        }
        if 'audio' in previo['sitios'].get(g['id'], {}):
            sitios[g['id']]['audio'] = previo['sitios'][g['id']]['audio']
    out = dict(libro, sitios=sitios)
    if 'audio_intro' in previo:
        out['audio_intro'] = previo['audio_intro']
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    faltan = [g['id'] for g in base['sitios'] if len(pies[g['id']]) != len(g['pies'])]
    print(f'{len(sitios)} sitios -> {OUT}; pies con distinto número: {faltan or "ninguno"}')
    print(sorted({s["interes"] for s in sitios.values()}))


if __name__ == '__main__':
    main()
