// Decisiones concurrentes: la segunda responde 409 y no deja cambios. Datos simulados.
const test = require('node:test');
const assert = require('node:assert/strict');

let filasActualizadas = 1; // 0: otra petición ya decidió
const llamadas = { updateMany: [], solicitudUpdate: [] };

const aprobacionPendiente = () => ({
  idAprobacion: 7n,
  idUsuario: 4n,
  idSolicitud: 30n,
  idFlujo: 2n,
  secuencia: 1,
  estado: 'PENDIENTE',
  solicitud: { estado: 'PENDIENTE', flujo: { pasos: [{ secuencia: 1, reqFirma: true, asignacion: null }] } },
});

const tx = {
  aprobacion: {
    updateMany: async (a) => { llamadas.updateMany.push(a); return { count: filasActualizadas }; },
  },
  solicitud: {
    update: async (a) => { llamadas.solicitudUpdate.push(a); return {}; },
  },
};
const prismaFalso = {
  aprobacion: { findUnique: async () => aprobacionPendiente() },
  firma: { findFirst: async () => null },
  // Si falla, se revierte
  $transaction: async (fn) => {
    const antes = llamadas.solicitudUpdate.length;
    try {
      return await fn(tx);
    } catch (err) {
      llamadas.solicitudUpdate.length = antes;
      throw err;
    }
  },
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const approvalsService = require('../../modules/approvals/approvals.service');

const reiniciar = (filas) => {
  filasActualizadas = filas;
  Object.values(llamadas).forEach((l) => { l.length = 0; });
};

test('submitDecision solo decide una aprobación que sigue PENDIENTE', async () => {
  reiniciar(1);
  const r = await approvalsService.submitDecision(4, 7, { decision: 'APROBADO' });
  assert.equal(r.estadoSolicitud, 'APROBADO');
  assert.deepEqual(llamadas.updateMany[0].where, { idAprobacion: 7n, estado: 'PENDIENTE' });
  assert.equal(llamadas.solicitudUpdate.length, 1);
});

test('submitDecision: si otra petición ya la decidió, responde 409 y no cambia la solicitud', async () => {
  for (const decision of ['APROBADO', 'RECHAZADO']) {
    reiniciar(0);
    await assert.rejects(
      approvalsService.submitDecision(4, 7, { decision, comentario: 'Motivo del rechazo' }),
      (e) => e.codigo === 'CONFLICTO_ESTADO' && e.status === 409
    );
    assert.equal(llamadas.solicitudUpdate.length, 0);
  }
});

test('submitDecision: un comentario de más de 1000 caracteres responde 400 sin decidir', async () => {
  reiniciar(1);
  await assert.rejects(
    approvalsService.submitDecision(4, 7, { decision: 'RECHAZADO', comentario: 'x'.repeat(1001) }),
    (e) => e.codigo === 'VALIDACION_FALLIDA' && e.detalles[0].campo === 'comentario'
  );
  assert.equal(llamadas.updateMany.length, 0);
});

test('listApprovalHistory: decisión o fechas inválidas responden VALIDACION_FALLIDA', async () => {
  for (const params of [{ decision: 'PENDIENTE' }, { desde: 'ayer' }, { hasta: '2026-13-45' }]) {
    await assert.rejects(approvalsService.listApprovalHistory(4, params), (e) => e.codigo === 'VALIDACION_FALLIDA');
  }
});
