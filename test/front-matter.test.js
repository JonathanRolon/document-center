import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsear, serializar } from '../lib/front-matter.js';

const NOTA = {
  titulo: 'ABAP "moderno": SQL',
  resumen: 'Línea: con dos puntos',
  tags: ['abap', 'sap-btp'],
  creado: '2026-10-21T21:00:00.000Z',
  publicado: '2026-10-22T10:00:00.000Z',
  cuerpo: '## Hola\n\ntexto'
};

test('serializar: orden fijo, escapes y cuerpo separado por línea en blanco', () => {
  assert.equal(serializar(NOTA), [
    '---',
    'titulo: "ABAP \\"moderno\\": SQL"',
    'resumen: "Línea: con dos puntos"',
    'tags: ["abap", "sap-btp"]',
    'creado: 2026-10-21T21:00:00.000Z',
    'publicado: 2026-10-22T10:00:00.000Z',
    '---',
    '',
    '## Hola',
    '',
    'texto',
    ''
  ].join('\n'));
});

test('serializar: omite resumen y publicado vacíos', () => {
  const md = serializar({ titulo: 'T', tags: [], creado: '2026-01-01T00:00:00.000Z', cuerpo: '' });
  assert.equal(md, '---\ntitulo: "T"\ntags: []\ncreado: 2026-01-01T00:00:00.000Z\n---\n');
});

test('ida y vuelta', () => {
  assert.deepEqual(parsear(serializar(NOTA)), NOTA);
  const borrador = { ...NOTA, publicado: null, resumen: '' };
  assert.deepEqual(parsear(serializar(borrador)), borrador);
});

test('parsear: CRLF, BOM, comentarios, comillas simples y listas sin comillas', () => {
  const texto = [
    '﻿---',
    "titulo: 'It''s ABAP'",
    'resumen: sin comillas   # comentario',
    'tags: [ABAP, Sap BTP, abap]',
    '# comentario suelto',
    'creado: 2026-10-21T21:00:00Z',
    'publicado: 2026-10-22T10:00:00.000Z   # si existe, la nota es pública',
    '---',
    '',
    'cuerpo'
  ].join('\r\n');
  assert.deepEqual(parsear(texto), {
    titulo: "It's ABAP",
    resumen: 'sin comillas',
    tags: ['abap', 'sap-btp'],
    creado: '2026-10-21T21:00:00.000Z',
    publicado: '2026-10-22T10:00:00.000Z',
    cuerpo: 'cuerpo'
  });
});

test('parsear: errores claros', () => {
  assert.throws(() => parsear('sin front matter'), /primera línea/);
  assert.throws(() => parsear('---\ntitulo: "x"\n'), /sin cerrar/);
  assert.throws(() => parsear('---\nresumen: "x"\n---\n'), /titulo: es obligatorio/);
  assert.throws(() => parsear('---\ntitulo: "x\n---\n'), /comillas sin cerrar/);
  assert.throws(() => parsear('---\ntitulo: "x" y más\n---\n'), /texto de más/);
  assert.throws(() => parsear('---\ntitulo: x\ntitulo: y\n---\n'), /repetido/);
  assert.throws(() => parsear('---\ntitulo: x\ntags: abap\n---\n'), /lista/);
  assert.throws(() => parsear('---\ntitulo: x\ncreado: ayer\n---\n'), /fecha inválida/);
  assert.throws(() => parsear('---\ntitulo x\n---\n'), /formato inválido/);
});
