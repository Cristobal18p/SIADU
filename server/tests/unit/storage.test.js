// Firmas en Storage: URL firmada temporal (con caché) y rutas locales de prueba. fetch simulado.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://proyecto.supabase.co/';
process.env.SUPABASE_SERVICE_KEY = 'clave';
const storage = require('../../utils/storage');

const llamadas = [];
let respuesta;
globalThis.fetch = async (url, opciones) => {
  llamadas.push({ url, opciones });
  return respuesta;
};

test('rutas locales y URLs pasan tal cual, sin llamar a Storage', async () => {
  llamadas.length = 0;
  assert.equal(await storage.urlDeFirma('/firmas/31.svg'), '/firmas/31.svg');
  assert.equal(await storage.urlDeFirma(null), null);
  assert.equal(llamadas.length, 0);
});

test('una ruta de Storage se firma una vez y se reutiliza', async () => {
  llamadas.length = 0;
  respuesta = { ok: true, json: async () => ({ signedURL: '/object/sign/firmas/24/31/20261019.svg?token=abc' }) };
  const url = await storage.urlDeFirma('24/31/20261019.svg');
  assert.equal(url, 'https://proyecto.supabase.co/storage/v1/object/sign/firmas/24/31/20261019.svg?token=abc');
  assert.equal(llamadas[0].url, 'https://proyecto.supabase.co/storage/v1/object/sign/firmas/24/31/20261019.svg');
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer clave');
  assert.equal(await storage.urlDeFirma('24/31/20261019.svg'), url);
  assert.equal(llamadas.length, 1);
});

test('si Storage falla, no hay URL', async () => {
  respuesta = { ok: false, status: 404 };
  assert.equal(await storage.urlDeFirma('24/99/no-existe.svg'), null);
});

test('aDataUri convierte la imagen descargada', async () => {
  respuesta = { ok: true, headers: { get: () => 'image/svg+xml' }, arrayBuffer: async () => new TextEncoder().encode('<svg/>').buffer };
  assert.equal(await storage.aDataUri('https://x/firma'), `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`);
});
