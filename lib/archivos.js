// Notas como archivos .md: notas/<slug>.md (versionadas) y borradores/<slug>.md (git-ignorados).
// Una nota es pública si tiene fecha `publicado`; publicar = pasarla a notas/ con esa fecha.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parsear, serializar } from './front-matter.js';
import { esSlugValido, slugDe, slugUnico } from './slug.js';
import { normalizarTags } from './tags.js';

export const CARPETAS = ['notas', 'borradores'];

export class ErrorValidacion extends Error {}

// datos del editor → campos editables validados
function validar({ titulo, resumen = '', tags = [], cuerpo = '' } = {}) {
  if (typeof titulo !== 'string' || !titulo.trim()) throw new ErrorValidacion('El título es obligatorio');
  if (titulo.length > 200) throw new ErrorValidacion('Título: máximo 200 caracteres');
  if (typeof resumen !== 'string' || resumen.length > 1000) throw new ErrorValidacion('Resumen: texto de hasta 1000 caracteres');
  if (typeof cuerpo !== 'string') throw new ErrorValidacion('Cuerpo: debe ser texto');
  if (!Array.isArray(tags)) throw new ErrorValidacion('Tags: debe ser una lista');
  return { titulo: titulo.trim(), resumen: resumen.trim(), tags: normalizarTags(tags), cuerpo };
}

export function crearRepositorio(raiz) {
  const ruta = (carpeta, slug) => join(raiz, carpeta, `${slug}.md`);

  async function leerCarpeta(carpeta) {
    let nombres;
    try {
      nombres = await readdir(join(raiz, carpeta));
    } catch (e) {
      if (e.code === 'ENOENT') return { notas: [], errores: [] };
      throw e;
    }
    const notas = [];
    const errores = [];
    for (const nombre of nombres.filter((n) => n.endsWith('.md')).sort()) {
      const slug = nombre.slice(0, -3);
      const archivo = `${carpeta}/${nombre}`;
      if (!esSlugValido(slug)) {
        errores.push({ archivo, error: 'nombre inválido (solo minúsculas, dígitos y guiones)' });
        continue;
      }
      try {
        const nota = parsear(await readFile(join(raiz, carpeta, nombre), 'utf8'));
        notas.push({ slug, carpeta, borrador: !nota.publicado, ...nota });
      } catch (e) {
        errores.push({ archivo, error: e.message });
      }
    }
    return { notas, errores };
  }

  // → { notas: [...], errores: [{ archivo, error }] }. Un slug repetido en las dos carpetas es un error.
  async function listar(carpetas = CARPETAS) {
    const resultados = await Promise.all(carpetas.map(leerCarpeta));
    const notas = resultados.flatMap((r) => r.notas);
    const errores = resultados.flatMap((r) => r.errores);
    const vistos = new Set();
    for (const n of notas) {
      if (vistos.has(n.slug)) errores.push({ archivo: `borradores/${n.slug}.md`, error: 'el mismo slug existe en notas/ y borradores/' });
      vistos.add(n.slug);
    }
    return { notas, errores };
  }

  async function obtener(slug) {
    if (!esSlugValido(slug)) return null;
    const { notas } = await listar();
    return notas.find((n) => n.slug === slug) ?? null;
  }

  async function escribir(nota) {
    await mkdir(join(raiz, nota.carpeta), { recursive: true });
    await writeFile(ruta(nota.carpeta, nota.slug), serializar(nota), 'utf8');
    return nota;
  }

  async function slugsOcupados(excepto) {
    const { notas } = await listar();
    return new Set(notas.map((n) => n.slug).filter((s) => s !== excepto));
  }

  // nota ya guardada en `previa` → se escribe `nueva` y, si cambió de archivo, se borra el anterior
  async function reemplazar(previa, nueva) {
    await escribir(nueva);
    if (previa.carpeta !== nueva.carpeta || previa.slug !== nueva.slug) await rm(ruta(previa.carpeta, previa.slug));
    return { ...nueva, borrador: !nueva.publicado };
  }

  return {
    listar,
    obtener,

    // siempre arranca como borrador
    async crear(datos) {
      const campos = validar(datos);
      const slug = slugUnico(slugDe(campos.titulo), await slugsOcupados());
      const nota = { slug, carpeta: 'borradores', ...campos, creado: new Date().toISOString(), publicado: null };
      return { ...(await escribir(nota)), borrador: true };
    },

    // un borrador sigue al título (renombra el archivo); una nota publicada conserva el slug
    // para no romper los links del sitio
    async actualizar(slug, datos) {
      const previa = await obtener(slug);
      if (!previa) return null;
      const campos = validar(datos);
      const nuevoSlug = previa.publicado ? slug : slugUnico(slugDe(campos.titulo), await slugsOcupados(slug));
      return reemplazar(previa, { ...previa, ...campos, slug: nuevoSlug });
    },

    async publicar(slug) {
      const previa = await obtener(slug);
      if (!previa) return null;
      if (previa.publicado && previa.carpeta === 'notas') return previa;
      return reemplazar(previa, { ...previa, carpeta: 'notas', publicado: previa.publicado ?? new Date().toISOString() });
    },

    async despublicar(slug) {
      const previa = await obtener(slug);
      if (!previa) return null;
      return reemplazar(previa, { ...previa, carpeta: 'borradores', publicado: null });
    },

    async eliminar(slug) {
      const previa = await obtener(slug);
      if (!previa) return false;
      await rm(ruta(previa.carpeta, previa.slug));
      return true;
    }
  };
}

// Datos del índice: el cuerpo va como `texto`, solo para la búsqueda en el navegador
export const aResumen = ({ cuerpo, carpeta, ...meta }) => ({ ...meta, texto: cuerpo });

// Datos de una nota para el front
export const aDetalle = ({ carpeta, ...nota }) => nota;
