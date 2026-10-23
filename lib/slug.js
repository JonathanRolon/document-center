// "ABAP SQL: del SELECT clásico a CDS" → "abap-sql-del-select-clasico-a-cds"
export function slugDe(titulo) {
  const slug = String(titulo)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80).replace(/-+$/, '');
  return slug || 'nota';
}

// Solo minúsculas, dígitos y guiones simples: además evita rutas tipo "../x" en el servidor
export const esSlugValido = (slug) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;

// Si el slug ya existe agrega -2, -3…  (`existentes`: Set de slugs ocupados)
export function slugUnico(base, existentes) {
  if (!existentes.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base}-${n}`;
    if (!existentes.has(candidato)) return candidato;
  }
}
