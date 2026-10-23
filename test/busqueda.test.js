import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarNotas, contarTags, ordenarNotas } from '../lib/busqueda.js';

const NOTAS = [
  { slug: 'a', titulo: 'Configuración de XSUAA', resumen: '', tags: ['sap-btp'], creado: '2026-01-01', publicado: '2026-01-02', texto: 'roles y scopes' },
  { slug: 'b', titulo: 'ABAP SQL', resumen: 'SELECT moderno', tags: ['abap', 'sql'], creado: '2026-02-01', publicado: null, texto: 'INTO TABLE @DATA(t)' },
  { slug: 'c', titulo: 'CDS views', resumen: '', tags: ['abap'], creado: '2026-03-01', publicado: '2026-03-02', texto: '' }
];
const slugs = (ns) => ns.map((n) => n.slug);

test('búsqueda sin acentos ni mayúsculas, en todos los campos', () => {
  assert.deepEqual(slugs(filtrarNotas(NOTAS, { q: 'configuracion' })), ['a']);
  assert.deepEqual(slugs(filtrarNotas(NOTAS, { q: 'select' })), ['b']);
  assert.deepEqual(slugs(filtrarNotas(NOTAS, { q: 'scopes' })), ['a']);
  assert.deepEqual(slugs(filtrarNotas(NOTAS, { q: 'SQL' })), ['b']);
});

test('todas las palabras tienen que estar; combina con tag', () => {
  assert.deepEqual(slugs(filtrarNotas(NOTAS, { q: 'abap cds' })), ['c']);
  assert.deepEqual(slugs(filtrarNotas(NOTAS, { tag: 'abap' })), ['b', 'c']);
  assert.deepEqual(slugs(filtrarNotas(NOTAS, { q: 'sql', tag: 'sap-btp' })), []);
  assert.equal(filtrarNotas(NOTAS, { q: '   ' }).length, 3);
});

test('tags contados y ordenados', () => {
  assert.deepEqual(contarTags(NOTAS), [
    { tag: 'abap', cantidad: 2 },
    { tag: 'sap-btp', cantidad: 1 },
    { tag: 'sql', cantidad: 1 }
  ]);
});

test('orden: más recientes primero', () => {
  assert.deepEqual(slugs(ordenarNotas(NOTAS)), ['c', 'b', 'a']);
});
