// npm run migrar -- <respaldo.json>
// Convierte un respaldo del proyecto anterior a notas/ y borradores/. Nunca pisa archivos existentes:
// si un slug ya existe, la nota migrada queda como <slug>-2.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearRepositorio } from '../lib/archivos.js';
import { convertirRespaldo } from '../lib/migrar.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const archivo = process.argv[2];
if (!archivo) {
  console.error('Uso: npm run migrar -- <respaldo.json>');
  process.exit(1);
}

let json;
try {
  json = JSON.parse(await readFile(archivo, 'utf8'));
} catch (e) {
  console.error(`No se pudo leer ${archivo}: ${e.message}`);
  process.exit(1);
}

const { notas } = await crearRepositorio(RAIZ).listar();
const { archivos, errores } = convertirRespaldo(json, new Set(notas.map((n) => n.slug)));
if (errores.length) {
  console.error(`El respaldo tiene errores; no se escribió nada:\n${errores.map((e) => `  ✗ ${e}`).join('\n')}`);
  process.exit(1);
}

for (const { carpeta, slug, contenido } of archivos) {
  await mkdir(join(RAIZ, carpeta), { recursive: true });
  // flag wx: falla si el archivo ya existe (no debería, los slugs ocupados se evitan)
  await writeFile(join(RAIZ, carpeta, `${slug}.md`), contenido, { encoding: 'utf8', flag: 'wx' });
  console.log(`  ✓ ${carpeta}/${slug}.md`);
}
const publicadas = archivos.filter((a) => a.carpeta === 'notas').length;
console.log(`✓ ${publicadas} notas publicadas y ${archivos.length - publicadas} borradores migrados. Revisalos y commiteá notas/.`);
