// Formatos de la toolbar de Markdown. Funciones puras:
// (texto, selInicio, selFin) → { texto, inicio, fin } con la selección resultante.

// Envuelve la selección (o un texto de ejemplo): **texto**
const envolver = (antes, despues, ejemplo) => (t, i, f) => {
  const sel = t.slice(i, f) || ejemplo;
  const inicio = i + antes.length;
  return { texto: t.slice(0, i) + antes + sel + despues + t.slice(f), inicio, fin: inicio + sel.length };
};

// Agrega un prefijo a cada línea tocada por la selección: "- ", "> ", "## "
const prefijarLineas = (prefijo, ejemplo) => (t, i, f) => {
  const ini = t.lastIndexOf('\n', i - 1) + 1;
  const bloque = t.slice(ini, f) || ejemplo;
  const nuevo = bloque.split('\n').map((l) => prefijo + l).join('\n');
  return { texto: t.slice(0, ini) + nuevo + t.slice(f), inicio: ini, fin: ini + nuevo.length };
};

// Bloque en líneas propias (separado por una línea en blanco de lo anterior)
const bloque = (antes, despues, ejemplo) => (t, i, f) => {
  const previo = t.slice(0, i);
  const sep = previo === '' || previo.endsWith('\n\n') ? '' : previo.endsWith('\n') ? '\n' : '\n\n';
  const sel = t.slice(i, f) || ejemplo;
  const inicio = i + sep.length + antes.length;
  return { texto: previo + sep + antes + sel + despues + '\n' + t.slice(f), inicio, fin: inicio + sel.length };
};

const link = (t, i, f) => {
  const sel = t.slice(i, f) || 'texto';
  const url = 'https://';
  const inicio = i + sel.length + 3; // [sel](
  return { texto: `${t.slice(0, i)}[${sel}](${url})${t.slice(f)}`, inicio, fin: inicio + url.length };
};

export const FORMATOS = {
  titulo: { etiqueta: 'H2', ayuda: 'Título', aplicar: prefijarLineas('## ', 'Título') },
  negrita: { etiqueta: 'B', ayuda: 'Negrita (Ctrl+B)', aplicar: envolver('**', '**', 'texto') },
  cursiva: { etiqueta: 'I', ayuda: 'Cursiva (Ctrl+I)', aplicar: envolver('_', '_', 'texto') },
  codigo: { etiqueta: '`c`', ayuda: 'Código en línea', aplicar: envolver('`', '`', 'código') },
  bloqueCodigo: { etiqueta: '{ }', ayuda: 'Bloque de código', aplicar: bloque('```abap\n', '\n```', 'código') },
  link: { etiqueta: '🔗', ayuda: 'Link', aplicar: link },
  lista: { etiqueta: '•', ayuda: 'Lista', aplicar: prefijarLineas('- ', 'elemento') },
  tarea: { etiqueta: '☑', ayuda: 'Lista de tareas', aplicar: prefijarLineas('- [ ] ', 'tarea') },
  cita: { etiqueta: '❝', ayuda: 'Cita', aplicar: prefijarLineas('> ', 'cita') },
  tabla: {
    etiqueta: '▦',
    ayuda: 'Tabla',
    aplicar: bloque('', '', '| Columna | Columna |\n| --- | --- |\n| valor | valor |')
  }
};

// Aplica el cambio sobre el textarea con execCommand para conservar Ctrl+Z.
// Devuelve false si el navegador no lo soporta (el llamador actualiza el estado a mano).
export function reemplazarEnTextarea(ta, viejo, { texto: nuevo, inicio, fin }) {
  let p = 0;
  while (p < viejo.length && p < nuevo.length && viejo[p] === nuevo[p]) p++;
  let s = 0;
  while (s < viejo.length - p && s < nuevo.length - p && viejo[viejo.length - 1 - s] === nuevo[nuevo.length - 1 - s]) s++;

  ta.focus();
  ta.setSelectionRange(p, viejo.length - s);
  const ok = typeof document.execCommand === 'function' &&
    document.execCommand('insertText', false, nuevo.slice(p, nuevo.length - s));
  if (ok) ta.setSelectionRange(inicio, fin);
  return ok;
}
