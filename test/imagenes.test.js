import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { imagenesDe } from '../lib/imagenes.js';
import { crearRepositorio } from '../lib/archivos.js';
import { generarDatos } from '../scripts/generar-datos.js';

test('imagenesDe: locales válidas, inválidas y externas', () => {
  const cuerpo = [
    '![a](imagenes/mi-nota/captura-1.png)',
    '![a](imagenes/mi-nota/captura-1.png "repetida")',
    '![b](<imagenes/mi-nota/foto.final.JPG>)',
    '![c](https://example.com/x.png)',
    '![d](imagenes/../../.env)',
    '![e](imagenes/mi-nota/script.js)',
    '![f](otra/carpeta/x.png)',
    '[link](imagenes/mi-nota/no-es-imagen.png)'
  ].join('\n');
  assert.deepEqual(imagenesDe(cuerpo), {
    validas: ['imagenes/mi-nota/captura-1.png', 'imagenes/mi-nota/foto.final.JPG'],
    invalidas: ['imagenes/../../.env', 'imagenes/mi-nota/script.js', 'otra/carpeta/x.png']
  });
});

async function conRaiz(fn) {
  const raiz = await mkdtemp(join(tmpdir(), 'stacknotes-img-'));
  try {
    await fn(raiz);
  } finally {
    await rm(raiz, { recursive: true, force: true });
  }
}

test('publicar mueve las imágenes usadas; el build copia solo esas', () => conRaiz(async (raiz) => {
  const repo = crearRepositorio(raiz);
  await mkdir(join(raiz, 'borradores', 'imagenes', 'n'), { recursive: true });
  await writeFile(join(raiz, 'borradores', 'imagenes', 'n', 'usada.png'), 'x');
  await writeFile(join(raiz, 'borradores', 'imagenes', 'n', 'suelta.png'), 'x');
  await repo.crear({ titulo: 'N', cuerpo: '![x](imagenes/n/usada.png)' });

  await repo.publicar('n');
  assert.deepEqual(await readdir(join(raiz, 'notas', 'imagenes', 'n')), ['usada.png']);
  assert.deepEqual(await readdir(join(raiz, 'borradores', 'imagenes', 'n')), ['suelta.png']);

  const dist = join(raiz, 'dist');
  const r = await generarDatos(raiz, dist);
  assert.equal(r.imagenes, 1);
  assert.deepEqual(await readdir(join(dist, 'imagenes', 'n')), ['usada.png']);
}));

test('el build falla si una nota publicada usa una imagen que no está en notas/', () => conRaiz(async (raiz) => {
  await mkdir(join(raiz, 'notas'));
  await writeFile(join(raiz, 'notas', 'n.md'), '---\ntitulo: N\npublicado: 2026-01-01T00:00:00Z\n---\n\n![x](imagenes/n/falta.png)\n![y](imagenes/../secreto.png)\n');
  await assert.rejects(generarDatos(raiz, join(raiz, 'dist')), /ruta de imagen inválida[\s\S]*falta notas\/imagenes\/n\/falta\.png/);
}));
