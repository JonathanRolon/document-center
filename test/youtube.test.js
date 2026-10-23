import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraerYoutube, urlEmbed } from '../src/youtube.js';

const ID = 'dQw4w9WgXcQ';

test('formatos de link soportados', () => {
  for (const href of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&list=abc`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`
  ]) {
    assert.deepEqual(extraerYoutube(href), { id: ID, inicio: 0 }, href);
  }
});

test('tiempo de inicio', () => {
  assert.equal(extraerYoutube(`https://youtu.be/${ID}?t=90`).inicio, 90);
  assert.equal(extraerYoutube(`https://youtu.be/${ID}?t=1m30s`).inicio, 90);
  assert.equal(extraerYoutube(`https://www.youtube.com/watch?v=${ID}&t=1h2m3s`).inicio, 3723);
  assert.equal(urlEmbed({ id: ID, inicio: 90 }), `https://www.youtube-nocookie.com/embed/${ID}?start=90`);
  assert.equal(urlEmbed({ id: ID, inicio: 0 }), `https://www.youtube-nocookie.com/embed/${ID}`);
});

test('rechaza otros sitios, http, ids inválidos y basura', () => {
  for (const href of [
    `https://evil.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `http://www.youtube.com/watch?v=${ID}`,
    'https://www.youtube.com/watch?v=corto',
    'https://www.youtube.com/watch?v=<script>alert</s',
    'https://www.youtube.com/channel/UC123',
    'no es una url'
  ]) {
    assert.equal(extraerYoutube(href), null, href);
  }
});
