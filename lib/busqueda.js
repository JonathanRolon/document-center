// Búsqueda y tags en el navegador, sobre el índice de notas.
// nota: { slug, titulo, resumen, tags, creado, publicado, texto? }

// minúsculas y sin acentos: "Configuración" encuentra "configuracion"
export const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Todas las palabras de q tienen que aparecer (en título, resumen, tags o texto)
export function filtrarNotas(notas, { q = '', tag = '' } = {}) {
  const palabras = plano(q).split(/\s+/).filter(Boolean);
  return notas.filter((n) => {
    if (tag && !n.tags.includes(tag)) return false;
    if (!palabras.length) return true;
    const pajar = plano([n.titulo, n.resumen, n.tags.join(' '), n.texto].join('\n'));
    return palabras.every((p) => pajar.includes(p));
  });
}

// → [{ tag, cantidad }] ordenados por cantidad y después alfabéticamente
export function contarTags(notas) {
  const cuenta = new Map();
  for (const n of notas) for (const t of n.tags) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  return [...cuenta]
    .map(([tag, cantidad]) => ({ tag, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.tag.localeCompare(b.tag));
}

// Más recientes primero (publicada o, si es borrador, creada)
export const ordenarNotas = (notas) =>
  [...notas].sort((a, b) => (b.publicado ?? b.creado ?? '').localeCompare(a.publicado ?? a.creado ?? ''));
