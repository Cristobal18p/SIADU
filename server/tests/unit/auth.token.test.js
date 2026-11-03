const test = require('node:test');
const assert = require('node:assert/strict');
const { getTokenDuration, MINIMO_SEGUNDOS, POR_DEFECTO_SEGUNDOS } = require('../../config/token');

test('sin EXPIRESIN dura 8 horas', () => {
  assert.equal(getTokenDuration(undefined), POR_DEFECTO_SEGUNDOS);
  assert.equal(getTokenDuration(''), 8 * 3600);
});

test('acepta horas, minutos, días y segundos', () => {
  assert.equal(getTokenDuration('2h'), 7200);
  assert.equal(getTokenDuration('10h'), 36000);
  assert.equal(getTokenDuration('180m'), 10800);
  assert.equal(getTokenDuration('1d'), 86400);
  assert.equal(getTokenDuration('9000'), 9000);
});

test('nunca baja de 2 horas', () => {
  assert.equal(getTokenDuration('30m'), MINIMO_SEGUNDOS);
  assert.equal(getTokenDuration('1h'), MINIMO_SEGUNDOS);
  assert.equal(getTokenDuration('60'), MINIMO_SEGUNDOS);
});

test('un valor que no se entiende usa las 8 horas', () => {
  assert.equal(getTokenDuration('ocho horas'), POR_DEFECTO_SEGUNDOS);
});
