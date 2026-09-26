"""Convierte las fotos originales a WebP (1280 px + miniatura 400 px) con nombres neutros,
genera los íconos de la PWA y reemplaza fotos_orig por fotos en geositios.json.

Uso (después de extraer_kmz.py): python tools/imagenes.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
ORIG = RAIZ / 'tools' / '_fotos_orig'
IMG = RAIZ / 'docs' / 'img'
ICONOS = RAIZ / 'docs' / 'icons'
DATOS = RAIZ / 'docs' / 'data' / 'geositios.json'
GRANDE, MINI = 1280, 400


def convierte(origen, base):
    im = ImageOps.exif_transpose(Image.open(origen)).convert('RGB')
    g = im.copy(); g.thumbnail((GRANDE, GRANDE), Image.LANCZOS)
    g.save(IMG / f'{base}.webp', 'WEBP', quality=62, method=6)
    t = im.copy(); t.thumbnail((MINI, MINI), Image.LANCZOS)
    t.save(IMG / f'{base}-t.webp', 'WEBP', quality=70, method=6)
    return {'src': f'img/{base}.webp', 'mini': f'img/{base}-t.webp', 'w': g.width, 'h': g.height}


def icono(tam, maskable=False):
    """Ícono: estratos plegados bajo un volcán, en la paleta de la app."""
    s = tam
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = 0 if maskable else int(s * 0.06)
    r = int(s * 0.22) if not maskable else 0
    d.rounded_rectangle([pad, pad, s - pad, s - pad], r, fill=(21, 38, 52))
    z = 0.12 * s if maskable else 0  # zona segura maskable
    def P(x, y):  # coordenadas normalizadas 0..1 dentro de la zona útil
        return (pad + z + x * (s - 2 * pad - 2 * z), pad + z + y * (s - 2 * pad - 2 * z))
    # cielo/sol
    cx, cy = P(0.74, 0.24); rr = s * 0.07
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=(244, 185, 66))
    # volcán
    d.polygon([P(0.08, 0.72), P(0.40, 0.26), P(0.52, 0.26), P(0.92, 0.72)], fill=(196, 92, 58))
    d.polygon([P(0.40, 0.26), P(0.52, 0.26), P(0.49, 0.33), P(0.43, 0.33)], fill=(244, 185, 66))
    # estratos
    colores = [(230, 200, 140), (170, 120, 80), (120, 150, 110), (90, 110, 130)]
    for i, c in enumerate(colores):
        y0 = 0.64 + i * 0.09
        d.polygon([P(0.04, y0 + 0.04), P(0.5, y0 - 0.02), P(0.96, y0 + 0.04),
                   P(0.96, y0 + 0.125), P(0.5, y0 + 0.065), P(0.04, y0 + 0.125)], fill=c)
    mascara = Image.new('L', (s, s), 0)
    ImageDraw.Draw(mascara).rounded_rectangle([pad, pad, s - pad, s - pad], r, fill=255)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    out.paste(im, (0, 0), mascara)
    return out


def main():
    IMG.mkdir(parents=True, exist_ok=True); ICONOS.mkdir(parents=True, exist_ok=True)
    datos = json.loads(DATOS.read_text(encoding='utf-8'))
    total_o = total_n = 0
    for g in datos['sitios']:
        g['fotos'] = []
        for i, f in enumerate(g.pop('fotos_orig'), 1):
            o = ORIG / f
            total_o += o.stat().st_size
            if 'envato' in f.lower():
                print(f'  [licencia Envato] {g["id"]} {g["nombre"]}: {f}')
            g['fotos'].append(convierte(o, f'{g["id"]}-{i}'))
    datos['portada'] = convierte(ORIG / datos.pop('portada_orig'), 'portada')
    for f in IMG.glob('*.webp'):
        total_n += f.stat().st_size
    DATOS.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding='utf-8')

    for t in (192, 512):
        icono(t).save(ICONOS / f'icon-{t}.png')
        icono(t, maskable=True).save(ICONOS / f'maskable-{t}.png')
    icono(180, maskable=True).convert('RGB').save(ICONOS / 'apple-touch-icon.png')
    icono(64).save(ICONOS / 'favicon.png')
    print(f'Fotos: {total_o / 1e6:.1f} MB -> {total_n / 1e6:.1f} MB (webp, incluye miniaturas)')


if __name__ == '__main__':
    main()
