// Front matter de las notas: un subconjunto chico de YAML con campos fijos.
// ---
// titulo: "..."
// resumen: "..."
// tags: ["abap", "sap-btp"]
// creado: 2026-10-21T21:00:00.000Z
// publicado: 2026-10-22T10:00:00.000Z   # opcional: si existe, la nota es pública
// ---
import { normalizarTags } from './tags.js';

const LINEA = /^([A-Za-z_][\w-]*):\s*(.*)$/;

// "texto" | 'texto' | texto  (un comentario " # ..." al final se ignora fuera de comillas)
function escalar(crudo, ruta) {
  const v = crudo.trim();
  if (v.startsWith('"')) {
    const fin = cierreComillasDobles(v);
    if (fin < 0) throw new Error(`${ruta}: comillas sin cerrar`);
    resto(v.slice(fin + 1), ruta);
    return JSON.parse(v.slice(0, fin + 1));
  }
  if (v.startsWith("'")) {
    const m = /^'((?:[^']|'')*)'(.*)$/.exec(v);
    if (!m) throw new Error(`${ruta}: comillas sin cerrar`);
    resto(m[2], ruta);
    return m[1].replace(/''/g, "'");
  }
  return v.replace(/\s+#.*$/, '').trim();
}

function cierreComillasDobles(v) {
  for (let i = 1; i < v.length; i++) {
    if (v[i] === '\\') i++;
    else if (v[i] === '"') return i;
  }
  return -1;
}

// después de un valor entre comillas solo puede venir un comentario
function resto(texto, ruta) {
  if (texto.trim() && !/^\s+#/.test(texto)) throw new Error(`${ruta}: texto de más después del valor`);
}

// ["a", "b"] | [a, b] | []
function lista(crudo, ruta) {
  const v = crudo.trim().replace(/\]\s+#.*$/, ']');
  if (!v.startsWith('[') || !v.endsWith(']')) throw new Error(`${ruta}: se esperaba una lista [ ... ]`);
  const interior = v.slice(1, -1).trim();
  if (!interior) return [];
  const items = [];
  let actual = '';
  let comillas = null;
  for (let i = 0; i < interior.length; i++) {
    const c = interior[i];
    if (comillas) {
      actual += c;
      if (c === '\\' && comillas === '"') actual += interior[++i] ?? '';
      else if (c === comillas) comillas = null;
    } else if (c === '"' || c === "'") {
      comillas = c;
      actual += c;
    } else if (c === ',') {
      items.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  if (comillas) throw new Error(`${ruta}: comillas sin cerrar`);
  items.push(actual);
  return items.map((it, i) => escalar(it, `${ruta}[${i}]`));
}

function fecha(valor, ruta) {
  if (!valor) return null;
  const ms = Date.parse(valor);
  if (Number.isNaN(ms)) throw new Error(`${ruta}: fecha inválida (${valor})`);
  return new Date(ms).toISOString();
}

// texto del .md → { titulo, resumen, tags, creado, publicado, cuerpo }. Tira Error si el formato es inválido.
export function parsear(texto) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/);
  if (lineas[0].trim() !== '---') throw new Error('falta el front matter (la primera línea debe ser ---)');
  const fin = lineas.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (fin < 0) throw new Error('front matter sin cerrar (falta ---)');

  const crudos = {};
  lineas.slice(1, fin).forEach((linea, i) => {
    if (!linea.trim() || linea.trim().startsWith('#')) return;
    const m = LINEA.exec(linea);
    if (!m) throw new Error(`línea ${i + 2}: formato inválido`);
    if (m[1] in crudos) throw new Error(`línea ${i + 2}: "${m[1]}" repetido`);
    crudos[m[1]] = m[2];
  });

  const titulo = escalar(crudos.titulo ?? '', 'titulo');
  if (!titulo) throw new Error('titulo: es obligatorio');

  return {
    titulo,
    resumen: escalar(crudos.resumen ?? '', 'resumen'),
    tags: normalizarTags(crudos.tags === undefined ? [] : lista(crudos.tags, 'tags')),
    creado: fecha(escalar(crudos.creado ?? '', 'creado'), 'creado'),
    publicado: fecha(escalar(crudos.publicado ?? '', 'publicado'), 'publicado'),
    // el cuerpo arranca después de la línea en blanco que sigue al front matter
    cuerpo: lineas.slice(fin + 1).join('\n').replace(/^\n/, '').trimEnd()
  };
}

// JSON.stringify produce strings YAML válidos (comillas dobles con escapes)
const yaml = (valor) => JSON.stringify(valor);

// nota → texto del .md (campos vacíos/opcionales se omiten; orden fijo)
export function serializar(nota) {
  const lineas = [
    '---',
    `titulo: ${yaml(nota.titulo)}`,
    nota.resumen ? `resumen: ${yaml(nota.resumen)}` : null,
    `tags: [${(nota.tags ?? []).map(yaml).join(', ')}]`,
    nota.creado ? `creado: ${nota.creado}` : null,
    nota.publicado ? `publicado: ${nota.publicado}` : null,
    '---'
  ].filter(Boolean);
  const cuerpo = (nota.cuerpo ?? '').trimEnd();
  return `${lineas.join('\n')}\n${cuerpo ? `\n${cuerpo}\n` : ''}`;
}
