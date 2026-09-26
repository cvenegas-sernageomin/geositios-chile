# Geositios de Chile — PWA (español / English)

Desarrollo: **Carlos Venegas**.

App web instalable (PWA) para recorrer con el GPS los 49 geositios del libro
*Geositios de Chile: una mirada a sus maravillas geológicas* (Sernageomin, 2023).

- **Mapa** con los 49 geositios, posición GPS y el geositio más cercano.
- **Explorar**: lista ordenada por distancia, filtros por tipo de interés y región, búsqueda en el texto.
- **Ficha** de cada geositio: fotos, texto del libro, narración con voz neural chilena (resalta el párrafo que se lee), glosario al tocar términos, quiz, geositios cercanos y "cómo llegar".
- **Pasaporte**: sello 📍 al llegar con GPS (radio por sitio), sello 🧠 al aprobar el quiz, puntos, niveles e insignias.
- **Sin conexión**: "Descargar todo" guarda fotos y narraciones (~50 MB); el mapa base guarda lo ya visto.

Publicada desde `docs/` con GitHub Pages. El progreso se guarda en `localStorage` (prefijo `geositios:`).

## Reconstruir los datos desde el KMZ

```bash
python tools/extraer_kmz.py ruta/LIBRO.kmz   # -> docs/data/geositios.json + tools/_fotos_orig/
python tools/imagenes.py                     # -> docs/img/*.webp + docs/icons/
python tools/voces.py --lang es              # -> docs/audio/*.mp3 (edge-tts, es-CL-CatalinaNeural)
python tools/traduccion_en.py                # tools/_trad/*.json -> docs/data/en.json
python tools/voces.py --lang en              # -> docs/audio/en/*.mp3 (en-US-AvaMultilingualNeural)
python tools/revisar_voz.py --lang es        # control de pronunciación con Whisper -> tools/_revision_voz_es.txt
```

Las correcciones de pronunciación están en `REEMPLAZOS_ES` de `tools/voces.py` (p. ej. "geositio" se
sintetizaba "geosicio"; se envía como "geo sitio"). El libro en PDF se publica en
`docs/libro/Geositios-de-Chile-Sernageomin-2023.pdf`; el botón de descarga se activa solo si el archivo existe.

`docs/data/quiz[-en].json` y `docs/data/glosario[-en].json` se redactaron a mano a partir de los textos.
Al cambiar el shell de la app, subir `VERSION` en `docs/sw.js`.

Prueba de GPS sin moverse: abrir con `?sim=lat,lon` (p. ej. `?sim=-22.339,-68.012` junto a El Tatio).
