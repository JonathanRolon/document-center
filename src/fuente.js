// De dónde salen los datos. Rutas relativas: el sitio vive bajo /document-center/.
// - Sitio público (build normal): JSON estáticos generados por scripts/generar-datos.js.
// - Editor local (vite --mode editor): API del servidor de server/editor.js.
// MODE se reemplaza en el build: el código del editor no llega al sitio público.
export const EDITOR = import.meta.env.MODE === 'editor';

export class NoEncontrada extends Error {}

export async function pedir(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (res.status === 404) throw new NoEncontrada('Nota no encontrada');
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data;
}

// → [{ slug, titulo, resumen, tags, creado, publicado, borrador, texto }]
export const obtenerIndice = () => pedir(EDITOR ? 'api/notas' : 'datos/indice.json');

// → { slug, titulo, resumen, tags, creado, publicado, borrador, cuerpo }
export const obtenerNota = (slug) => pedir(EDITOR ? `api/notas/${slug}` : `datos/notas/${slug}.json`);
