// Tags libres: minúsculas, espacios internos como guiones
export const MAX_TAGS = 10;
export const MAX_LARGO_TAG = 50;

export const normalizarTag = (tag) => String(tag).trim().toLowerCase().replace(/\s+/g, '-');

// Normaliza, quita vacíos y repetidos, recorta a MAX_TAGS de MAX_LARGO_TAG caracteres
export function normalizarTags(tags) {
  const unicos = new Set(
    (tags ?? []).map(normalizarTag).filter(Boolean).map((t) => t.slice(0, MAX_LARGO_TAG))
  );
  return [...unicos].slice(0, MAX_TAGS);
}
