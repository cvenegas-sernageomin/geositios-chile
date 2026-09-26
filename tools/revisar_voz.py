"""Control de calidad de la narración: transcribe cada MP3 con Whisper y lo compara con el guion.
Lista las palabras que la voz pronuncia distinto (p. ej. "geositio" -> "geosicio").

Uso: python tools/revisar_voz.py [--lang es|en] [--modelo small] [ids...]
Salida: tools/_revision_voz_<lang>.txt
"""
import argparse, difflib, json, re, sys, unicodedata
from collections import Counter
from pathlib import Path
from faster_whisper import WhisperModel

sys.path.insert(0, str(Path(__file__).parent))
from voces import guion  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
DOCS = RAIZ / 'docs'


def palabras(t):
    t = unicodedata.normalize('NFD', t.lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return re.findall(r"[a-z0-9ñ]+", t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lang', default='es')
    ap.add_argument('--modelo', default='small')
    ap.add_argument('ids', nargs='*')
    a = ap.parse_args()
    base = json.loads((DOCS / 'data' / 'geositios.json').read_text(encoding='utf-8'))
    sitios = {g['id']: g for g in base['sitios']} if a.lang == 'es' else \
        json.loads((DOCS / 'data' / f'{a.lang}.json').read_text(encoding='utf-8'))['sitios']
    ids = a.ids or [g['id'] for g in base['sitios']]
    m = WhisperModel(a.modelo, device='cpu', compute_type='int8')
    difs, lineas = Counter(), []
    for i in ids:
        g = sitios[i]
        texto = ' '.join([f"{g['nombre']}. {g.get('region_txt', '')}."] + g['parrafos'])
        ref = palabras(guion(texto, a.lang))
        segs, _ = m.transcribe(str(DOCS / g['audio']['src']), language=a.lang, beam_size=5,
                               condition_on_previous_text=False, without_timestamps=True)
        hyp = palabras(' '.join(s.text for s in segs))
        sm = difflib.SequenceMatcher(a=ref, b=hyp, autojunk=False)
        for op, a1, a2, b1, b2 in sm.get_opcodes():
            if op == 'replace' and a2 - a1 <= 3 and b2 - b1 <= 3:
                r, h = ' '.join(ref[a1:a2]), ' '.join(hyp[b1:b2])
                if r.replace(' ', '') == h.replace(' ', ''):
                    continue
                difs[(r, h)] += 1
                lineas.append(f'{i}: "{r}" -> "{h}"   …{" ".join(ref[max(0, a1 - 4):a2 + 4])}…')
        print(f'{i} similitud {sm.ratio():.3f}', flush=True)
    out = RAIZ / 'tools' / f'_revision_voz_{a.lang}.txt'
    out.write_text('== Más frecuentes ==\n' + '\n'.join(f'{n:3}  "{r}" -> "{h}"' for (r, h), n in difs.most_common(80))
                   + '\n\n== Detalle ==\n' + '\n'.join(lineas), encoding='utf-8')
    print('->', out)


if __name__ == '__main__':
    main()
