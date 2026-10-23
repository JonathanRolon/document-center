import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertirRespaldo } from '../lib/migrar.js';
import { parsear } from '../lib/front-matter.js';

const respaldo = (notas) => ({ formato: 'stacknotes-respaldo', formatVersion: 1, exportadoEn: '2026-10-01T00:00:00.000Z', notas });
const NOTA = { id: 'a1', titulo: 'ABAP SQL', resumen: 'r', cuerpo: '## x', tags: ['abap'], creadoEn: '2026-01-01T00:00:00.000Z' };

test('PUBLICADO → notas/, BORRADOR → borradores/, slugs únicos', () => {
  const { archivos, errores } = convertirRespaldo(respaldo([
    { ...NOTA, estado: 'PUBLICADO', publicadoEn: '2026-01-02T00:00:00.000Z', versiones: [{ numero: 1 }] },
    { ...NOTA, id: 'a2', estado: 'BORRADOR' }
  ]), new Set(['abap-sql']));
  assert.deepEqual(errores, []);
  assert.deepEqual(archivos.map((a) => `${a.carpeta}/${a.slug}`), ['notas/abap-sql-2', 'borradores/abap-sql-3']);

  const publicada = parsear(archivos[0].contenido);
  assert.deepEqual(publicada, {
    titulo: 'ABAP SQL', resumen: 'r', tags: ['abap'], creado: '2026-01-01T00:00:00.000Z',
    publicado: '2026-01-02T00:00:00.000Z', cuerpo: '## x'
  });
  assert.equal(parsear(archivos[1].contenido).publicado, null);
});

test('publicada sin fecha usa modificadoEn o creadoEn', () => {
  const { archivos } = convertirRespaldo(respaldo([{ ...NOTA, estado: 'PUBLICADO', modificadoEn: '2026-03-01T00:00:00.000Z' }]));
  assert.equal(parsear(archivos[0].contenido).publicado, '2026-03-01T00:00:00.000Z');
});

test('errores: formato, versión y notas inválidas', () => {
  assert.match(convertirRespaldo({ formato: 'otro' }).errores[0], /formato/);
  assert.match(convertirRespaldo({ ...respaldo([]), formatVersion: 2 }).errores[0], /no soportada/);
  const { errores } = convertirRespaldo(respaldo([
    { ...NOTA, titulo: '', estado: 'BORRADOR' },
    { ...NOTA, estado: 'ARCHIVADO' },
    { ...NOTA, estado: 'BORRADOR', creadoEn: 'ayer' }
  ]));
  assert.equal(errores.length, 3);
});
