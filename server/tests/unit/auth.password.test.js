const test = require('node:test');
const assert = require('node:assert/strict');
const { validarPasswordNueva } = require('../../utils/password');

test('una contraseña que cumple la política no tiene problemas', () => {
  assert.deepEqual(validarPasswordNueva('Fiec#2026seguro'), []);
});

test('rechaza menos de 8 y más de 64 caracteres', () => {
  assert.ok(validarPasswordNueva('Ab1#xyz').length > 0);
  assert.ok(validarPasswordNueva('Ab1#' + 'x'.repeat(61)).length > 0);
  assert.deepEqual(validarPasswordNueva('Ab1#' + 'x'.repeat(60)), []);
});

test('exige mayúscula, minúscula, número y símbolo', () => {
  assert.equal(validarPasswordNueva('fiec#2026seguro').length, 1); // sin mayúscula
  assert.equal(validarPasswordNueva('FIEC#2026SEGURO').length, 1); // sin minúscula
  assert.equal(validarPasswordNueva('Fiec#seguroOk').length, 1);   // sin número
  assert.equal(validarPasswordNueva('Fiec2026seguro').length, 1);  // sin símbolo
});

test('acepta letras con tilde y la ñ', () => {
  assert.deepEqual(validarPasswordNueva('Ñandú#2026ok'), []);
});

test('no es una cadena: queda rechazada', () => {
  assert.ok(validarPasswordNueva(undefined).length > 0);
});

test('rechaza la contraseña inicial y las de ejemplo', () => {
  assert.equal(validarPasswordNueva('Demo2026*').length, 1);
  assert.equal(validarPasswordNueva('Prueba2026*').length, 1);
});
