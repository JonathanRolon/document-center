// Editor local: API sobre los .md + Vite (modo "editor") en un solo proceso.
// Sin login: escucha solo en 127.0.0.1 y rechaza pedidos de otros orígenes.
import { createServer as crearHttp } from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as crearVite } from 'vite';
import { aDetalle, aResumen, crearRepositorio, ErrorValidacion } from '../lib/archivos.js';

const HOST = '127.0.0.1';
const PUERTO = Number(process.env.PUERTO ?? 4004);
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PERMITIDOS = new Set([`${HOST}:${PUERTO}`, `localhost:${PUERTO}`]);

const repo = crearRepositorio(RAIZ);
const app = express();
app.disable('x-powered-by');

// Otra pestaña del navegador (cualquier sitio web) puede pedirle cosas a 127.0.0.1:
// Host frena DNS rebinding; Origin frena formularios/fetch de otros sitios.
app.use((req, res, next) => {
  const origen = req.headers.origin;
  if (!PERMITIDOS.has(req.headers.host) || (origen && !PERMITIDOS.has(origen.replace(/^https?:\/\//, '')))) {
    return res.status(403).json({ error: 'Origen no permitido' });
  }
  next();
});

const api = express.Router();
api.use(express.json({ limit: '2mb' }));

// envuelve handlers async: null → 404, ErrorValidacion → 400
const manejar = (fn) => async (req, res) => {
  try {
    const r = await fn(req);
    if (r === null || r === false) return res.status(404).json({ error: 'Nota no encontrada' });
    if (r === true) return res.status(204).end();
    res.json(r);
  } catch (e) {
    if (e instanceof ErrorValidacion) return res.status(400).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

api.get('/notas', manejar(async () => {
  const { notas, errores } = await repo.listar();
  errores.forEach((e) => console.warn(`⚠ ${e.archivo}: ${e.error}`));
  return notas.map(aResumen);
}));
api.get('/notas/:slug', manejar(async (req) => {
  const n = await repo.obtener(req.params.slug);
  return n && aDetalle(n);
}));
api.post('/notas', manejar(async (req) => aDetalle(await repo.crear(req.body))));
api.put('/notas/:slug', manejar(async (req) => {
  const n = await repo.actualizar(req.params.slug, req.body);
  return n && aDetalle(n);
}));
for (const paso of ['publicar', 'despublicar']) {
  api.post(`/notas/:slug/${paso}`, manejar(async (req) => {
    const n = await repo[paso](req.params.slug);
    return n && aDetalle(n);
  }));
}
api.delete('/notas/:slug', manejar((req) => repo.eliminar(req.params.slug)));
api.use((req, res) => res.status(404).json({ error: 'Ruta inexistente' }));

app.use('/api', api);

const http = crearHttp(app);
const vite = await crearVite({
  root: RAIZ,
  mode: 'editor',
  appType: 'spa',
  server: { middlewareMode: true, hmr: { server: http } }
});
app.use(vite.middlewares);

http.listen(PUERTO, HOST, () => {
  console.log(`Stack Notes · editor local en http://${HOST}:${PUERTO}/`);
});
