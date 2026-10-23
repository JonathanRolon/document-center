// notas/*.md publicadas → dist/datos/indice.json + dist/datos/notas/<slug>.json
// Corre después de `vite build`. Nunca lee borradores/.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aDetalle, aResumen, crearRepositorio } from '../lib/archivos.js';
import { ordenarNotas } from '../lib/busqueda.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

export async function generarDatos(raiz = RAIZ, salida = join(raiz, 'dist')) {
  const { notas, errores } = await crearRepositorio(raiz).listar(['notas']);
  if (errores.length) {
    throw new Error(`Hay notas con errores:\n${errores.map((e) => `  ✗ ${e.archivo}: ${e.error}`).join('\n')}`);
  }
  const publicadas = ordenarNotas(notas.filter((n) => n.publicado));

  const datos = join(salida, 'datos');
  await rm(datos, { recursive: true, force: true });
  await mkdir(join(datos, 'notas'), { recursive: true });
  await writeFile(join(datos, 'indice.json'), JSON.stringify(publicadas.map(aResumen)));
  for (const n of publicadas) {
    await writeFile(join(datos, 'notas', `${n.slug}.json`), JSON.stringify(aDetalle(n)));
  }
  return { publicadas, sinPublicar: notas.length - publicadas.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { publicadas, sinPublicar } = await generarDatos();
    console.log(`✓ ${publicadas.length} notas publicadas en dist/datos${sinPublicar ? ` (${sinPublicar} en notas/ sin fecha "publicado": no se incluyen)` : ''}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
