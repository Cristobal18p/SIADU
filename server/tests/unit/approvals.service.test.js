const test = require('node:test');
const assert = require('node:assert/strict');

function validarDecisionInput(decision, comentario) {
  const decUpper = String(decision || '').trim().toUpperCase();
  if (!['APROBADO', 'RECHAZADO'].includes(decUpper)) {
    return { valido: false, campo: 'decision', mensaje: 'La decisión debe ser APROBADO o RECHAZADO.' };
  }
  const comentarioLimpio = comentario ? String(comentario).trim() : null;
  if (decUpper === 'RECHAZADO' && (!comentarioLimpio || comentarioLimpio === '')) {
    return { valido: false, campo: 'comentario', mensaje: 'El motivo de rechazo es obligatorio.' };
  }
  return { valido: true, decision: decUpper, comentario: comentarioLimpio };
}

test('approvals — valida que la decisión solo sea APROBADO o RECHAZADO', () => {
  assert.equal(validarDecisionInput('PENDIENTE').valido, false);
  assert.equal(validarDecisionInput('DEVUELTA').valido, false);
  assert.equal(validarDecisionInput('').valido, false);
  assert.equal(validarDecisionInput(null).valido, false);

  assert.equal(validarDecisionInput('APROBADO').valido, true);
  assert.equal(validarDecisionInput('aproBado').decision, 'APROBADO');
});

test('approvals — exige justificación obligatoria al rechazar', () => {
  assert.equal(validarDecisionInput('RECHAZADO').valido, false);
  assert.equal(validarDecisionInput('RECHAZADO', '').valido, false);
  assert.equal(validarDecisionInput('RECHAZADO', '   ').valido, false);
  assert.equal(validarDecisionInput('RECHAZADO', null).valido, false);

  const resValido = validarDecisionInput('RECHAZADO', 'No cumple con los créditos mínimos requeridos.');
  assert.equal(resValido.valido, true);
  assert.equal(resValido.decision, 'RECHAZADO');
  assert.equal(resValido.comentario, 'No cumple con los créditos mínimos requeridos.');
});

test('approvals — permite aprobar sin comentario o con comentario opcional', () => {
  const sinComentario = validarDecisionInput('APROBADO');
  assert.equal(sinComentario.valido, true);
  assert.equal(sinComentario.comentario, null);

  const conComentario = validarDecisionInput('APROBADO', 'Revisado y conforme.');
  assert.equal(conComentario.valido, true);
  assert.equal(conComentario.comentario, 'Revisado y conforme.');
});
