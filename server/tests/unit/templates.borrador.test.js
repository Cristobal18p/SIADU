/**
 * Plantilla nunca publicada: mientras su única versión es la 1 en BORRADOR se puede cambiar la audiencia y
 * eliminar; después, ambas responden 409. Prisma simulado.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

// Prisma simulado, inyectado antes de cargar el servicio
let estado;
const ops = [];

const registrar = (nombre) => async (args) => {
  ops.push({ nombre, args });
  return { count: 1 };
};

const delegados = {
  plantilla: {
    findUnique: async () => estado.plantilla,
    update: registrar('plantilla.update'),
    delete: registrar('plantilla.delete'),
  },
  version: {
    findUnique: async () => estado.version,
    findMany: async () => estado.plantilla?.versiones ?? [],
    update: registrar('version.update'),
    deleteMany: registrar('version.deleteMany'),
  },
  flujo: {
    findMany: async () => estado.flujosPropios,
    updateMany: registrar('flujo.updateMany'),
    deleteMany: registrar('flujo.deleteMany'),
  },
  flujoPaso: { deleteMany: registrar('flujoPaso.deleteMany') },
  solicitud: { count: async () => estado.solicitudes },
};

const prismaFalso = { ...delegados, $transaction: async (fn) => fn(delegados) };
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const templatesService = require('../../modules/templates/templates.service');

const TOKEN_ADMIN = { idUsuario: 2, roles: ['ADMINISTRADOR', 'SOLICITANTE'], estamentos: ['ADMINISTRATIVO'], codUnidad: 24 };

const v1Borrador = { idVersion: 13n, numeroVersion: 1, estado: 'BORRADOR' };

const reiniciar = (extra = {}) => {
  ops.length = 0;
  estado = {
    plantilla: { codUnidad: 24, versiones: [v1Borrador] },
    version: {
      idVersion: 13n, idPlantilla: 6n, estado: 'BORRADOR', idFlujo: null,
      variableFormJson: { variables: [] }, disenoFormJson: { cuerpoDocumento: { type: 'doc', content: [] } },
    },
    flujosPropios: [{ idFlujo: 40n }],
    solicitudes: 0,
    ...extra,
  };
};

const nombres = () => ops.map((o) => o.nombre);

const rechazaCon = async (promesa, codigo) => {
  await assert.rejects(promesa, (err) => {
    assert.equal(err.codigo, codigo);
    return true;
  });
};

// ---------- audiencia en PUT

test('PUT con audiencia en una plantilla nunca publicada la guarda', async () => {
  reiniciar();
  await templatesService.updateTemplate(2, 6, { idVersion: 13, audiencia: ['ESTUDIANTE', 'PROFESOR'] });
  const update = ops.find((o) => o.nombre === 'plantilla.update');
  assert.deepEqual(update.args.data.audiencia, ['ESTUDIANTE', 'PROFESOR']);
});

test('PUT sin audiencia la conserva: no la toca', async () => {
  reiniciar();
  await templatesService.updateTemplate(2, 6, { idVersion: 13, variableFormJson: { variables: [] } });
  assert.equal(nombres().includes('plantilla.update'), false);
});

test('PUT con audiencia en una plantilla ya publicada responde CONFLICTO_ESTADO y no guarda nada', async () => {
  reiniciar({
    plantilla: {
      codUnidad: 24,
      versiones: [{ idVersion: 9n, numeroVersion: 1, estado: 'ACTIVO' }, { idVersion: 13n, numeroVersion: 2, estado: 'BORRADOR' }],
    },
  });
  await rechazaCon(templatesService.updateTemplate(2, 6, { idVersion: 13, audiencia: ['PROFESOR'] }), 'CONFLICTO_ESTADO');
  assert.equal(ops.length, 0);
});

test('PUT con audiencia vacía, repetida o con un grupo inválido responde VALIDACION_FALLIDA', async () => {
  for (const audiencia of [[], ['ESTUDIANTE', 'ESTUDIANTE'], ['DOCENTE'], 'ESTUDIANTE']) {
    reiniciar();
    await rechazaCon(templatesService.updateTemplate(2, 6, { idVersion: 13, audiencia }), 'VALIDACION_FALLIDA');
    assert.equal(ops.length, 0);
  }
});

// ---------- DELETE

test('DELETE borra la plantilla, su versión y su flujo en borrador, en ese orden', async () => {
  reiniciar();
  await templatesService.deleteTemplate(2, 6, TOKEN_ADMIN);
  assert.deepEqual(nombres(), [
    'flujo.updateMany',
    'version.deleteMany',
    'plantilla.delete',
    'flujoPaso.deleteMany',
    'flujo.deleteMany',
  ]);
  assert.deepEqual(ops.find((o) => o.nombre === 'flujo.deleteMany').args.where.idFlujo.in, [40n]);
});

test('DELETE sin flujo propio no borra flujos', async () => {
  reiniciar({ flujosPropios: [] });
  await templatesService.deleteTemplate(2, 6, TOKEN_ADMIN);
  assert.equal(nombres().includes('flujo.deleteMany'), false);
  assert.equal(nombres().includes('plantilla.delete'), true);
});

test('DELETE de una plantilla ya publicada responde CONFLICTO_ESTADO y no borra nada', async () => {
  reiniciar({ plantilla: { codUnidad: 24, versiones: [{ idVersion: 9n, numeroVersion: 1, estado: 'INACTIVO' }] } });
  await rechazaCon(templatesService.deleteTemplate(2, 6, TOKEN_ADMIN), 'CONFLICTO_ESTADO');
  assert.equal(ops.length, 0);
});

test('DELETE de una plantilla de otra unidad o inexistente responde NO_ENCONTRADO', async () => {
  reiniciar({ plantilla: { codUnidad: 31, versiones: [v1Borrador] } });
  await rechazaCon(templatesService.deleteTemplate(2, 6, TOKEN_ADMIN), 'NO_ENCONTRADO');
  reiniciar({ plantilla: null });
  await rechazaCon(templatesService.deleteTemplate(2, 6, TOKEN_ADMIN), 'NO_ENCONTRADO');
  assert.equal(ops.length, 0);
});

test('DELETE con solicitudes registradas no borra nada', async () => {
  reiniciar({ solicitudes: 1 });
  await rechazaCon(templatesService.deleteTemplate(2, 6, TOKEN_ADMIN), 'CONFLICTO_ESTADO');
  assert.equal(ops.length, 0);
});
