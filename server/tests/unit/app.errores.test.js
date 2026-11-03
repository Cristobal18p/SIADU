// Cuerpo de la petición: JSON mal formado o demasiado grande responde con el formato de error.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { lectoresDelCuerpo, manejarErrores } = require('../../middleware/errores');

// Misma cadena que app.js
const app = express();
app.use(lectoresDelCuerpo());
app.post('/api/auth/login', (req, res) => res.json({ ok: true }));
app.use(manejarErrores);

let servidor;
let base;
test.before(async () => {
  servidor = app.listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => {
  servidor.closeAllConnections();
  await new Promise((r) => servidor.close(r));
});

// node:http, porque fetch impide el cierre forzado de las pruebas en Windows
const enviar = (cuerpo) =>
  new Promise((resolver, rechazar) => {
    const peticion = http.request(
      `${base}/api/auth/login`,
      { method: 'POST', agent: false, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let texto = '';
        res.setEncoding('utf8');
        res.on('data', (parte) => { texto += parte; });
        res.on('end', () => resolver({ status: res.statusCode, tipo: res.headers['content-type'], cuerpo: JSON.parse(texto) }));
      }
    );
    peticion.on('error', rechazar);
    peticion.end(cuerpo);
  });

test('un JSON válido llega a la ruta', async () => {
  const r = await enviar(JSON.stringify({ correo: 'a@up.ac.pa' }));
  assert.equal(r.status, 200);
});

test('JSON mal formado: 400 VALIDACION_FALLIDA en JSON', async () => {
  const r = await enviar('{"correo": ');
  assert.equal(r.status, 400);
  assert.match(r.tipo, /application\/json/);
  assert.equal(r.cuerpo.error.codigo, 'VALIDACION_FALLIDA');
});

test('cuerpo de más de 512 KB: 413 VALIDACION_FALLIDA en JSON', async () => {
  const r = await enviar(JSON.stringify({ relleno: 'x'.repeat(600 * 1024) }));
  assert.equal(r.status, 413);
  assert.equal(r.cuerpo.error.codigo, 'VALIDACION_FALLIDA');
});
