// Respaldo JSON del proyecto anterior ("stacknotes-respaldo" v1) → archivos .md.
// PUBLICADO → notas/ (con fecha publicado), BORRADOR → borradores/. Las versiones no se migran:
// acá el historial es git.
import { serializar } from './front-matter.js';
import { slugDe, slugUnico } from './slug.js';
import { normalizarTags } from './tags.js';

const FORMATO = 'stacknotes-respaldo';
const FORMAT_VERSION = 1;

const fecha = (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

// json: respaldo parseado; ocupados: Set de slugs que ya existen en disco
// → { archivos: [{ carpeta, slug, contenido }], errores: [] }
export function convertirRespaldo(json, ocupados = new Set()) {
  if (json?.formato !== FORMATO) return { archivos: [], errores: [`formato: se esperaba "${FORMATO}"`] };
  if (json.formatVersion !== FORMAT_VERSION) {
    return { archivos: [], errores: [`formatVersion ${json.formatVersion} no soportada (se soporta ${FORMAT_VERSION})`] };
  }
  if (!Array.isArray(json.notas)) return { archivos: [], errores: ['notas: debe ser una lista'] };

  const usados = new Set(ocupados);
  const archivos = [];
  const errores = [];
  json.notas.forEach((n, i) => {
    const ruta = `notas[${i}]`;
    const titulo = typeof n?.titulo === 'string' ? n.titulo.trim() : '';
    if (!titulo) return errores.push(`${ruta}: sin título`);
    if (!['PUBLICADO', 'BORRADOR'].includes(n.estado)) return errores.push(`${ruta} (${titulo}): estado "${n.estado}" desconocido`);
    const creado = fecha(n.creadoEn);
    if (!creado) return errores.push(`${ruta} (${titulo}): creadoEn inválido`);

    const publicada = n.estado === 'PUBLICADO';
    const slug = slugUnico(slugDe(titulo), usados);
    usados.add(slug);
    archivos.push({
      carpeta: publicada ? 'notas' : 'borradores',
      slug,
      contenido: serializar({
        titulo,
        resumen: typeof n.resumen === 'string' ? n.resumen.trim() : '',
        tags: normalizarTags(n.tags),
        creado,
        // una nota publicada sin fecha (no debería pasar) toma la última conocida
        publicado: publicada ? fecha(n.publicadoEn) ?? fecha(n.modificadoEn) ?? creado : null,
        cuerpo: typeof n.cuerpo === 'string' ? n.cuerpo : ''
      })
    });
  });
  return { archivos, errores };
}
