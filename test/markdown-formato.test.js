import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATOS } from '../src/markdown-formato.js';

const ap = (tipo, t, i, f) => FORMATOS[tipo].aplicar(t, i, f);
const seleccion = (r) => r.texto.slice(r.inicio, r.fin);

test('envolver: usa la selección o un texto de ejemplo seleccionado', () => {
  let r = ap('negrita', 'hola mundo', 5, 10);
  assert.equal(r.texto, 'hola **mundo**');
  assert.equal(seleccion(r), 'mundo');

  r = ap('negrita', 'hola ', 5, 5);
  assert.equal(r.texto, 'hola **texto**');
  assert.equal(seleccion(r), 'texto');
});

test('prefijo por línea: cubre todas las líneas tocadas', () => {
  assert.equal(ap('lista', 'a\nb\nc', 2, 5).texto, 'a\n- b\n- c');
  assert.equal(ap('titulo', 'uno\ndos', 5, 5).texto, 'uno\n## dos');
});

test('bloques: en líneas propias, separados por línea en blanco', () => {
  let r = ap('bloqueCodigo', 'texto', 5, 5);
  assert.equal(r.texto, 'texto\n\n```abap\ncódigo\n```\n');
  assert.equal(seleccion(r), 'código');

  assert.equal(ap('bloqueCodigo', '', 0, 0).texto, '```abap\ncódigo\n```\n');
  assert.equal(ap('tabla', 'x\n', 2, 2).texto, 'x\n\n| Columna | Columna |\n| --- | --- |\n| valor | valor |\n');
});

test('link: deja seleccionada la URL para reemplazarla', () => {
  const r = ap('link', 'ver doc', 4, 7);
  assert.equal(r.texto, 'ver [doc](https://)');
  assert.equal(seleccion(r), 'https://');
});
