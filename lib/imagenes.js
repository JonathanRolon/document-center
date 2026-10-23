// Imágenes de las notas: ![alt](imagenes/<carpeta>/<archivo>.png)
// Viven en borradores/imagenes/ (git-ignorada) o notas/imagenes/; al sitio solo se copian las que
// usa alguna nota publicada. La ruta se valida porque el build copia archivos según lo que diga la nota.

export const RUTA_IMAGEN = /^imagenes\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9][a-z0-9_-]*(?:\.[a-z0-9_-]+)*\.(?:png|jpe?g|gif|webp|svg)$/i;

// ![alt](url) o ![alt](<url> "título")
const IMAGEN_MD = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

// → { validas: [rutas únicas], invalidas: [rutas locales mal formadas] }. Las URLs externas se ignoran.
export function imagenesDe(cuerpo) {
  const validas = new Set();
  const invalidas = new Set();
  for (const [, url] of String(cuerpo ?? '').matchAll(IMAGEN_MD)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) continue;
    (RUTA_IMAGEN.test(url) ? validas : invalidas).add(url);
  }
  return { validas: [...validas], invalidas: [...invalidas] };
}
