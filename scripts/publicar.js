// npm run publicar            → checks + build + commit en gh-pages + push a origin
// npm run publicar -- --prueba → solo checks + build (no toca git)
// Sin GitHub Actions: Pages sirve la rama gh-pages ("Deploy from a branch").
import { execFileSync } from 'node:child_process';
import { cp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { generarDatos } from './generar-datos.js';
import { formatearProblema, revisarArchivos, revisarNotas } from '../lib/checks-publicar.js';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(RAIZ, 'dist');
const WORKTREE = join(RAIZ, '.publicar');
const RAMA = 'gh-pages';
const PRUEBA = process.argv.includes('--prueba');
const TEXTO = /\.(html|js|mjs|css|json|txt|md|svg|xml|map|webmanifest)$/i;

const git = (args, opciones = {}) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', ...opciones }).trim();

class Frenado extends Error {}

async function listarArchivos(dir) {
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await listarArchivos(ruta)));
    else salida.push(ruta);
  }
  return salida;
}

async function slugsBorradores() {
  try {
    return new Set((await readdir(join(RAIZ, 'borradores'))).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3)));
  } catch {
    return new Set();
  }
}

// el repo es público: borradores/ no puede estar versionado, y lo que se publica tiene que estar commiteado
function revisarRepo() {
  const versionados = git(['ls-files', '--', 'borradores', '.env*', '*default-env*']);
  if (versionados) throw new Frenado(`Hay archivos privados versionados en git:\n${versionados}`);
  const pendientes = git(['status', '--porcelain', '--', 'notas']);
  if (pendientes && !PRUEBA) {
    throw new Frenado(`notas/ tiene cambios sin commitear (el historial del sitio es el de git):\n${pendientes}`);
  }
}

async function revisarBuild(publicadas) {
  const archivos = [];
  for (const ruta of await listarArchivos(DIST)) {
    const rel = relative(DIST, ruta).split(sep).join('/');
    archivos.push({ ruta: rel, contenido: TEXTO.test(rel) ? await readFile(ruta, 'utf8') : undefined });
  }
  const problemas = [...revisarArchivos(archivos), ...revisarNotas(publicadas, await slugsBorradores())];
  if (problemas.length) {
    throw new Frenado(`Se encontró contenido que no se puede publicar:\n${problemas.map(formatearProblema).join('\n')}`);
  }
  await stat(join(DIST, '.nojekyll')).catch(() => { throw new Frenado('Falta dist/.nojekyll'); });
  return archivos.length;
}

function prepararWorktree() {
  git(['worktree', 'prune']);
  rmWorktree();
  const existeLocal = git(['branch', '--list', RAMA]) !== '';
  const existeRemota = !existeLocal && git(['ls-remote', '--heads', 'origin', RAMA]) !== '';
  if (existeLocal) git(['worktree', 'add', WORKTREE, RAMA]);
  else if (existeRemota) {
    git(['fetch', 'origin', `${RAMA}:${RAMA}`]);
    git(['worktree', 'add', WORKTREE, RAMA]);
  } else git(['worktree', 'add', '--orphan', '-b', RAMA, WORKTREE]);
}

function rmWorktree() {
  try {
    git(['worktree', 'remove', '--force', WORKTREE], { stdio: 'pipe' });
  } catch {
    // no existía
  }
}

async function subir() {
  const origen = git(['rev-parse', '--short', 'HEAD']);
  prepararWorktree();
  try {
    // se reemplaza todo el contenido de la rama por el build
    for (const nombre of await readdir(WORKTREE)) {
      if (nombre !== '.git') await rm(join(WORKTREE, nombre), { recursive: true, force: true });
    }
    await cp(DIST, WORKTREE, { recursive: true });
    const g = (args) => execFileSync('git', args, { cwd: WORKTREE, encoding: 'utf8' }).trim();
    g(['add', '-A']);
    if (!g(['status', '--porcelain'])) {
      console.log('✓ Sin cambios respecto de lo publicado');
      return;
    }
    g(['commit', '-q', '-m', `Publica sitio desde ${origen}`]);
    execFileSync('git', ['push', 'origin', RAMA], { cwd: WORKTREE, stdio: 'inherit' });
    console.log(`✓ Publicado: https://jonathanrolon.github.io/document-center/ (puede tardar un minuto)`);
  } finally {
    rmWorktree();
  }
}

try {
  revisarRepo();
  await build({ root: RAIZ, logLevel: 'warn' });
  const { publicadas } = await generarDatos(RAIZ, DIST);
  const cantidad = await revisarBuild(publicadas);
  console.log(`✓ Checks OK: ${cantidad} archivos, ${publicadas.length} notas`);
  if (PRUEBA) console.log('Modo --prueba: no se sube nada.');
  else await subir();
} catch (e) {
  if (!(e instanceof Frenado)) throw e;
  console.error(`✗ Publicación frenada.\n${e.message}`);
  process.exit(1);
}
