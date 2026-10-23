import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugDe, slugUnico, esSlugValido } from '../lib/slug.js';
import { normalizarTags } from '../lib/tags.js';

test('slug sin acentos ni símbolos', () => {
  assert.equal(slugDe('ABAP SQL: del SELECT clásico a CDS'), 'abap-sql-del-select-clasico-a-cds');
  assert.equal(slugDe('  Ñandú & BTP  '), 'nandu-btp');
  assert.equal(slugDe('¿¡!?'), 'nota');
  assert.ok(slugDe('a'.repeat(79) + ' b').length <= 80);
  assert.ok(!slugDe('a'.repeat(79) + ' b').endsWith('-'));
});

test('slug único', () => {
  assert.equal(slugUnico('x', new Set()), 'x');
  assert.equal(slugUnico('x', new Set(['x', 'x-2'])), 'x-3');
});

test('slug válido: rechaza rutas y mayúsculas', () => {
  assert.ok(esSlugValido('abap-sql'));
  for (const s of ['../x', 'a/b', 'A', '', '-a', 'a--b', 'a.md', null]) assert.ok(!esSlugValido(s), String(s));
});

test('tags: normaliza, sin repetidos ni vacíos, máximo 10', () => {
  assert.deepEqual(normalizarTags([' ABAP ', 'Sap  BTP', 'abap', '']), ['abap', 'sap-btp']);
  assert.equal(normalizarTags(Array.from({ length: 15 }, (_, i) => `t${i}`)).length, 10);
});
