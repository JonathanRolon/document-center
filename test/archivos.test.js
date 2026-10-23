import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crearRepositorio, ErrorValidacion } from '../lib/archivos.js';

async function conRepo(fn) {
  const raiz = await mkdtemp(join(tmpdir(), 'stacknotes-'));
  try {
    await fn(crearRepositorio(raiz), raiz);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
}
const archivos = async (raiz, carpeta) => readdir(join(raiz, carpeta)).catch(() => []);

test('crear → borrador; el slug sigue al título y no pisa otro', () => conRepo(async (repo, raiz) => {
  const a = await repo.crear({ titulo: 'Hola ABAP', tags: ['ABAP'] });
  assert.equal(a.slug, 'hola-abap');
  assert.equal(a.borrador, true);
  assert.deepEqual(a.tags, ['abap']);
  const b = await repo.crear({ titulo: 'Hola ABAP' });
  assert.equal(b.slug, 'hola-abap-2');

  const renombrada = await repo.actualizar('hola-abap-2', { titulo: 'Chau ABAP' });
  assert.equal(renombrada.slug, 'chau-abap');
  assert.deepEqual(await archivos(raiz, 'borradores'), ['chau-abap.md', 'hola-abap.md']);
}));

test('publicar mueve a notas/ y conserva el slug al editar', () => conRepo(async (repo, raiz) => {
  await repo.crear({ titulo: 'Nota', cuerpo: '## x' });
  const p = await repo.publicar('nota');
  assert.ok(p.publicado);
  assert.equal(p.borrador, false);
  assert.deepEqual(await archivos(raiz, 'notas'), ['nota.md']);
  assert.deepEqual(await archivos(raiz, 'borradores'), []);

  const editada = await repo.actualizar('nota', { titulo: 'Otro título' });
  assert.equal(editada.slug, 'nota');
  assert.equal(editada.publicado, p.publicado);

  const d = await repo.despublicar('nota');
  assert.equal(d.publicado, null);
  assert.deepEqual(await archivos(raiz, 'borradores'), ['nota.md']);
  assert.equal(await repo.eliminar('nota'), true);
  assert.equal(await repo.obtener('nota'), null);
}));

test('validación, slugs inválidos y archivos rotos', () => conRepo(async (repo, raiz) => {
  await assert.rejects(repo.crear({ titulo: '  ' }), ErrorValidacion);
  assert.equal(await repo.obtener('../etc'), null);
  await mkdir(join(raiz, 'notas'));
  await writeFile(join(raiz, 'notas', 'rota.md'), 'sin front matter');
  await writeFile(join(raiz, 'notas', 'Mal Nombre.md'), '---\ntitulo: x\n---\n');
  const { notas, errores } = await repo.listar();
  assert.equal(notas.length, 0);
  assert.deepEqual(errores.map((e) => e.archivo), ['notas/Mal Nombre.md', 'notas/rota.md']);
}));
