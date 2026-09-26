# Geositios de Chile — PWA

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
python tools/voces.py                        # -> docs/audio/*.mp3 (edge-tts, es-CL-CatalinaNeural)
```

`docs/data/quiz.json` y `docs/data/glosario.json` se redactaron a mano a partir de los textos.
Al cambiar el shell de la app, subir `VERSION` en `docs/sw.js`.

Prueba de GPS sin moverse: abrir con `?sim=lat,lon` (p. ej. `?sim=-22.339,-68.012` junto a El Tatio).
