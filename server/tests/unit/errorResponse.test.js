/** Errores de capacidad: 503 reintentable; cualquier otro error inesperado: 500. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { errorInterno, esErrorDeCapacidad } = require('../../utils/errorResponse');

const respuestaFalsa = () => {
  const r = { cabeceras: {}, status(c) { r.codigo = c; return r; }, json(b) { r.cuerpo = b; return r; }, set(k, v) { r.cabeceras[k] = v; return r; } };
  return r;
};
const silenciar = (fn) => {
  const { warn, error } = console;
  console.warn = () => {}; console.error = () => {};
  try { return fn(); } finally { console.warn = warn; console.error = error; }
};

test('un pool agotado (P2024) responde 503 SERVICIO_NO_DISPONIBLE con Retry-After', () => {
  const r = respuestaFalsa();
  silenciar(() => errorInterno(r, 'x', Object.assign(new Error('Timed out fetching a new connection'), { code: 'P2024' })));
  assert.equal(r.codigo, 503);
  assert.equal(r.cuerpo.error.codigo, 'SERVICIO_NO_DISPONIBLE');
  assert.equal(r.cabeceras['Retry-After'], '3');
});

test('EMAXCONNSESSION del pooler también responde 503', () => {
  const r = respuestaFalsa();
  silenciar(() => errorInterno(r, 'x', new Error('FATAL: EMAXCONNSESSION max clients reached in session mode')));
  assert.equal(r.codigo, 503);
});

test('la base inaccesible (P1001, ETIMEDOUT) y la espera agotada del pool se tratan como capacidad', () => {
  assert.equal(esErrorDeCapacidad({ code: 'P1001', message: '' }), true);
  assert.equal(esErrorDeCapacidad(new Error('connect ETIMEDOUT')), true);
  assert.equal(esErrorDeCapacidad(new Error('timeout exceeded when trying to connect')), true);
});

test('un error de código sigue siendo 500 ERROR_INTERNO y no lleva Retry-After', () => {
  const r = respuestaFalsa();
  silenciar(() => errorInterno(r, 'x', new TypeError('undefined is not a function'), 'Mensaje propio'));
  assert.equal(r.codigo, 500);
  assert.equal(r.cuerpo.error.codigo, 'ERROR_INTERNO');
  assert.equal(r.cuerpo.error.mensaje, 'Mensaje propio');
  assert.equal(r.cabeceras['Retry-After'], undefined);
  assert.equal(esErrorDeCapacidad(null), false);
});
