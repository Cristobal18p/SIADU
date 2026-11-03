/** Flujos: pasos en una sola inserción, código repetido con 409 y errores en orden. Datos simulados. */
const test = require('node:test');
const assert = require('node:assert/strict');

let codigoExistente = null;
let aprobadores = new Map(); // idAsignacion -> true si el titular puede aprobar
let unidadDe = new Map(); // idAsignacion -> codUnidad (24 por defecto)
let titularDe = new Map(); // idAsignacion -> idUsuario del titular
const llamadas = { flujoCreate: [], pasoCreateMany: [], pasoCreate: [], deleteMany: [], flujoUpdate: [] };
let errorEnTransaccion = null;
let flujoGuardado = { idFlujo: 1n, nombre: 'F', codigo: 'F-1', estado: 'B', descripcion: null };

const asignacion = (id) => ({
  idAsignacion: BigInt(id),
  codUnidad: unidadDe.get(id) ?? 24,
  administrativo: {
    personal: {
      nombre: 'Ana', apellido: `Titular${id}`,
      usuario: aprobadores.get(id)
        ? { idUsuario: BigInt(titularDe.get(id) ?? id), estado: 'A', rolesUsuario: [{ rol: { descripcion: 'Aprobador' } }] }
        : { idUsuario: BigInt(titularDe.get(id) ?? id), estado: 'A', rolesUsuario: [] },
    },
  },
});

const tx = {
  flujo: {
    create: async ({ data }) => { llamadas.flujoCreate.push(data); if (errorEnTransaccion) throw errorEnTransaccion; return { idFlujo: 9n, codigo: data.codigo }; },
    update: async (a) => { llamadas.flujoUpdate.push(a); return {}; },
  },
  flujoPaso: {
    createMany: async ({ data }) => { llamadas.pasoCreateMany.push(data); return { count: data.length }; },
    create: async (a) => { llamadas.pasoCreate.push(a); return {}; },
    deleteMany: async (a) => { llamadas.deleteMany.push(a); return {}; },
  },
};
const prismaFalso = {
  flujo: {
    findUnique: async ({ where }) => {
      if (where.codigo !== undefined) return codigoExistente === where.codigo ? { idFlujo: 5n } : null;
      return where.idFlujo === 1n ? flujoGuardado : null;
    },
  },
  asignacionAdministrativo: {
    findMany: async ({ where }) => (where.idCargo
      ? where.idCargo.in.filter((c) => c === 14).map((idCargo) => ({ idCargo }))
      : where.idAsignacion.in.filter((i) => aprobadores.has(Number(i))).map((i) => asignacion(Number(i)))),
  },
  $transaction: async (fn) => fn(tx),
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const flowsService = require('../../modules/flows/flows.service');

const reiniciar = () => {
  codigoExistente = null;
  aprobadores = new Map([[2, true], [13, true], [1, false], [5, true], [6, true]]);
  unidadDe = new Map([[5, 9]]);
  titularDe = new Map([[6, 2]]);
  Object.values(llamadas).forEach((l) => { l.length = 0; });
  errorEnTransaccion = null;
  flujoGuardado = { idFlujo: 1n, nombre: 'F', codigo: 'F-1', estado: 'B', descripcion: null };
};
const datos = (extra = {}) => ({
  nombre: 'Nuevo', codigo: 'f-nuevo', codUnidad: 24,
  pasos: [{ secuencia: 1, idAsignacion: 2, reqFirma: true }, { secuencia: 2, idAsignacion: 13, reqFirma: false }],
  ...extra,
});

test('createFlow guarda todos los pasos en una sola inserción', async () => {
  reiniciar();
  const r = await flowsService.createFlow(datos());
  assert.equal(llamadas.pasoCreate.length, 0); // sin una inserción por paso
  assert.equal(llamadas.pasoCreateMany.length, 1);
  assert.deepEqual(llamadas.pasoCreateMany[0].map((p) => [p.secuencia, p.idAsignacion, p.reqFirma]), [[1, 2n, true], [2, 13n, false]]);
  assert.equal(llamadas.flujoCreate[0].estado, 'B');
  assert.equal(llamadas.flujoCreate[0].codigo, 'F-NUEVO'); // el código se guarda en mayúsculas
  assert.equal(r.estado, 'BORRADOR');
  assert.equal(r.totalPasos, 2);
});

test('createFlow: un código repetido responde 409 CONFLICTO_ESTADO y no inserta nada', async () => {
  reiniciar();
  codigoExistente = 'F-NUEVO';
  await assert.rejects(flowsService.createFlow(datos()), (e) => e.codigo === 'CONFLICTO_ESTADO' && e.status === 409);
  assert.equal(llamadas.flujoCreate.length, 0);
});

test('createFlow: si el código se repite en una carrera (restricción de la base) también responde 409', async () => {
  reiniciar();
  errorEnTransaccion = Object.assign(new Error('unique'), { code: 'P2002', meta: { driverAdapterError: { cause: { constraint: { index: 'flujos_codigo_key' } } } } });
  await assert.rejects(flowsService.createFlow(datos()), (e) => e.codigo === 'CONFLICTO_ESTADO' && e.status === 409);
});

test('createFlow: otros errores de la base no se disfrazan de código repetido', async () => {
  reiniciar();
  errorEnTransaccion = Object.assign(new Error('otra cosa'), { code: 'P2003' });
  await assert.rejects(flowsService.createFlow(datos()), (e) => e.code === 'P2003');
});

test('createFlow: un titular que no aprueba responde 400 APROBADOR_INVALIDO con el paso en detalles', async () => {
  reiniciar();
  await assert.rejects(
    flowsService.createFlow(datos({ pasos: [{ secuencia: 1, idAsignacion: 2 }, { secuencia: 2, idAsignacion: 1 }] })),
    (e) => e.codigo === 'APROBADOR_INVALIDO' && e.status === 400 && e.detalles[0].campo === 'pasos[1].idAsignacion'
  );
  assert.equal(llamadas.flujoCreate.length, 0);
});

test('createFlow: si fallan las dos comprobaciones se informa primero el código repetido, como antes', async () => {
  reiniciar();
  codigoExistente = 'F-NUEVO';
  await assert.rejects(
    flowsService.createFlow(datos({ pasos: [{ secuencia: 1, idAsignacion: 1 }] })),
    (e) => e.codigo === 'CONFLICTO_ESTADO'
  );
});

test('createFlow: sin nombre, código, unidad o pasos responde 400 VALIDACION_FALLIDA', async () => {
  reiniciar();
  await assert.rejects(flowsService.createFlow(datos({ nombre: '' })), (e) => e.codigo === 'VALIDACION_FALLIDA');
  await assert.rejects(flowsService.createFlow(datos({ pasos: [] })), (e) => e.codigo === 'VALIDACION_FALLIDA');
});

test('updateFlow: reemplaza los pasos con una sola inserción', async () => {
  reiniciar();
  const r = await flowsService.updateFlow(1, { nombre: 'Editado', pasos: [{ secuencia: 1, idAsignacion: 13 }, { secuencia: 2, idAsignacion: 2 }] });
  assert.equal(llamadas.deleteMany.length, 1);
  assert.equal(llamadas.pasoCreateMany.length, 1);
  assert.equal(llamadas.pasoCreate.length, 0);
  assert.equal(r.totalPasos, 2);
});

test('updateFlow: errores en el orden de siempre (no existe, activo, sin pasos, aprobador inválido)', async () => {
  reiniciar();
  await assert.rejects(flowsService.updateFlow(99, { nombre: 'x', pasos: [{ idAsignacion: 1 }] }), (e) => e.codigo === 'NO_ENCONTRADO' && e.status === 404);

  flujoGuardado.estado = 'A';
  await assert.rejects(flowsService.updateFlow(1, { nombre: 'x', pasos: [{ idAsignacion: 1 }] }), (e) => e.codigo === 'CONFLICTO_ESTADO' && e.status === 409);

  flujoGuardado.estado = 'B';
  await assert.rejects(flowsService.updateFlow(1, { nombre: 'x', pasos: [] }), (e) => e.codigo === 'VALIDACION_FALLIDA');
  await assert.rejects(flowsService.updateFlow(1, { nombre: 'x', pasos: [{ secuencia: 1, idAsignacion: 1 }] }), (e) => e.codigo === 'APROBADOR_INVALIDO');
  assert.equal(llamadas.pasoCreateMany.length, 0); // nada se guardó en ningún caso de error
});

test('getFlowById y updateFlow: un flujo de otra unidad responde 404, como si no existiera', async () => {
  reiniciar();
  flujoGuardado.codUnidad = 24;
  await assert.rejects(flowsService.updateFlow(1, { nombre: 'x', pasos: [{ secuencia: 1, idAsignacion: 2 }] }, 7), (e) => e.codigo === 'NO_ENCONTRADO' && e.status === 404);
  assert.equal(llamadas.pasoCreateMany.length, 0);
  const r = await flowsService.updateFlow(1, { nombre: 'x', pasos: [{ secuencia: 1, idAsignacion: 2 }] }, 24);
  assert.equal(r.totalPasos, 1);
});

test('pasos: secuencias desordenadas, otra unidad, autoridad o persona repetida responden 400 VALIDACION_FALLIDA', async () => {
  const casos = [
    [[{ secuencia: 2, idAsignacion: 2 }], 'pasos[0].secuencia'],
    [[{ secuencia: 1, idAsignacion: 5 }], 'pasos[0].idAsignacion'],
    [[{ secuencia: 1, idAsignacion: 2 }, { secuencia: 2, idAsignacion: 2 }], 'pasos[1].idAsignacion'],
    [[{ secuencia: 1, idAsignacion: 2 }, { secuencia: 2, idAsignacion: 6 }], 'pasos[1].idAsignacion'],
  ];
  for (const [pasos, campo] of casos) {
    reiniciar();
    await assert.rejects(
      flowsService.createFlow(datos({ pasos })),
      (e) => e.codigo === 'VALIDACION_FALLIDA' && e.status === 400 && e.detalles[0].campo === campo
    );
    assert.equal(llamadas.flujoCreate.length, 0);
  }
});

test('pasos por escuela: se guardan con su cargo; cargo sin escuela, repetido o con idAsignacion responde 400', async () => {
  reiniciar();
  await flowsService.createFlow(datos({ pasos: [{ secuencia: 1, alcance: 'ESCUELA_SOLICITANTE', idCargo: 14 }, { secuencia: 2, idAsignacion: 2 }] }));
  assert.deepEqual(llamadas.pasoCreateMany[0].map((p) => [p.alcance, p.idAsignacion, p.idCargo]), [['ESCUELA_SOLICITANTE', null, 14], ['FIJO', 2n, null]]);

  const escuela = (extra) => ({ secuencia: 1, alcance: 'ESCUELA_SOLICITANTE', idCargo: 14, ...extra });
  const casos = [
    [[escuela({ idCargo: 99 })], 'pasos[0].idCargo'],
    [[escuela({ idAsignacion: 2 })], 'pasos[0].idCargo'],
    [[escuela(), escuela({ secuencia: 2 })], 'pasos[1].idCargo'],
  ];
  for (const [pasos, campo] of casos) {
    reiniciar();
    await assert.rejects(
      flowsService.createFlow(datos({ pasos })),
      (e) => e.codigo === 'VALIDACION_FALLIDA' && e.detalles[0].campo === campo
    );
    assert.equal(llamadas.flujoCreate.length, 0);
  }
});
