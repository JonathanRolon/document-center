// notas/*.md publicadas → dist/datos/indice.json + dist/datos/notas/<slug>.json
// + dist/imagenes/... (solo las que usan las notas publicadas, desde notas/imagenes/).
// Corre después de `vite build`. Nunca lee borradores/.
import { access, copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aDetalle, aResumen, crearRepositorio } from '../lib/archivos.js';
import { ordenarNotas } from '../lib/busqueda.js';
import { imagenesDe } from '../lib/imagenes.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));

export async function generarDatos(raiz = RAIZ, salida = join(raiz, 'dist')) {
  const { notas, errores } = await crearRepositorio(raiz).listar(['notas']);
  if (errores.length) {
    throw new Error(`Hay notas con errores:\n${errores.map((e) => `  ✗ ${e.archivo}: ${e.error}`).join('\n')}`);
  }
  const publicadas = ordenarNotas(notas.filter((n) => n.publicado));

  // imágenes: rutas válidas y presentes en notas/ (una que quedó en borradores/ rompe el build)
  const imagenes = new Set();
  const problemas = [];
  for (const n of publicadas) {
    const { validas, invalidas } = imagenesDe(n.cuerpo);
    invalidas.forEach((r) => problemas.push(`  ✗ notas/${n.slug}.md: ruta de imagen inválida "${r}" (usar imagenes/<carpeta>/<archivo>)`));
    for (const r of validas) {
      if (await access(join(raiz, 'notas', r)).then(() => true, () => false)) imagenes.add(r);
      else problemas.push(`  ✗ notas/${n.slug}.md: falta notas/${r} (¿quedó en borradores/? publicala desde el editor)`);
    }
  }
  if (problemas.length) throw new Error(`Hay imágenes con problemas:\n${problemas.join('\n')}`);

  await rm(join(salida, 'imagenes'), { recursive: true, force: true });
  for (const r of imagenes) {
    await mkdir(dirname(join(salida, r)), { recursive: true });
    await copyFile(join(raiz, 'notas', r), join(salida, r));
  }

  const datos = join(salida, 'datos');
  await rm(datos, { recursive: true, force: true });
  await mkdir(join(datos, 'notas'), { recursive: true });
  await writeFile(join(datos, 'indice.json'), JSON.stringify(publicadas.map(aResumen)));
  for (const n of publicadas) {
    await writeFile(join(datos, 'notas', `${n.slug}.json`), JSON.stringify(aDetalle(n)));
  }
  return { publicadas, sinPublicar: notas.length - publicadas.length, imagenes: imagenes.size };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { publicadas, sinPublicar, imagenes } = await generarDatos();
    console.log(`✓ ${publicadas.length} notas publicadas y ${imagenes} imágenes en dist${sinPublicar ? ` (${sinPublicar} en notas/ sin fecha "publicado": no se incluyen)` : ''}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
