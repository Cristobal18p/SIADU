// Respuestas que se guardan al radicar: solo las variables de la plantilla y sus «…Otro».
const test = require('node:test');
const assert = require('node:assert/strict');
const { respuestasDeLaPlantilla } = require('../../utils/validarRespuestas');

test('respuestasDeLaPlantilla descarta las claves que no son variables de la plantilla', () => {
  const variables = [
    { id: 'motivo', tipo: 'select', opcionOtro: true },
    { id: 'detalle', tipo: 'text' },
    { id: 'carrera', tipo: 'select' },
  ];
  const datos = { motivo: 'OTRO', motivoOtro: 'Viaje', detalle: 'x', carreraOtro: 'no', ajena: 1 };
  assert.deepEqual(respuestasDeLaPlantilla(variables, datos), { motivo: 'OTRO', motivoOtro: 'Viaje', detalle: 'x' });
});
