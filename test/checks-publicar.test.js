import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarArchivos, revisarNotas } from '../lib/checks-publicar.js';

const motivos = (archivos) => revisarArchivos(archivos).map((p) => `${p.ruta}: ${p.motivo}`);

test('rutas prohibidas', () => {
  for (const ruta of [
    'borradores/x.md', 'datos/borradores/x.json', '.env', '.env.local', 'app/default-env.json',
    'claves/server.pem', 'a.key', 'id_rsa', 'id_ed25519.pub', '.git/config'
  ]) {
    assert.equal(revisarArchivos([{ ruta }]).length, 1, ruta);
  }
  for (const ruta of ['index.html', 'assets/index-abc.js', 'datos/notas/env-vars.json', 'fonts/72/LICENSE.txt', 'keys.html']) {
    assert.deepEqual(revisarArchivos([{ ruta }]), [], ruta);
  }
});

test('credenciales en el contenido, con línea', () => {
  const contenido = 'linea 1\n{"clientsecret": "a1B2c3D4e5F6g7H8"}\n';
  assert.deepEqual(revisarArchivos([{ ruta: 'datos/notas/x.json', contenido }]), [
    { ruta: 'datos/notas/x.json', linea: 2, motivo: 'posible secreto asignado' }
  ]);
  for (const contenido of [
    '-----BEGIN RSA PRIVATE KEY-----',
    'AKIAABCDEFGHIJKLMNOP',
    `ghp_${'a'.repeat(36)}`,
    'xoxb-1234567890-abcdef',
    'password = "SuperSecreto123"',
    JSON.stringify({ cuerpo: '{"clientsecret": "a1B2c3D4e5F6g7H8"}' }),
    `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.${'s'.repeat(20)}`
  ]) {
    assert.equal(motivos([{ ruta: 'x.js', contenido }]).length, 1, contenido);
  }
});

test('valores de ejemplo no frenan la publicación', () => {
  for (const contenido of [
    '"clientsecret": "<tu-secreto>"',
    'password: "xxxxxxxx"',
    "api_key = '${API_KEY}'",
    '"password": "********"',
    'el campo password se configura en el destination'
  ]) {
    assert.deepEqual(motivos([{ ruta: 'x.json', contenido }]), [], contenido);
  }
});

test('notas: sin publicado o repetidas en borradores', () => {
  const problemas = revisarNotas(
    [{ slug: 'ok', publicado: '2026-01-01T00:00:00.000Z' }, { slug: 'sin-fecha', publicado: null }, { slug: 'dup', publicado: '2026-01-01T00:00:00.000Z' }],
    new Set(['dup'])
  );
  assert.deepEqual(problemas.map((p) => p.ruta), ['notas/sin-fecha.md', 'notas/dup.md']);
});
