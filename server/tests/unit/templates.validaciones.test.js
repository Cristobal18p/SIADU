// Validaciones de plantillas al guardar y al publicar. Datos simulados.
const test = require('node:test');
const assert = require('node:assert/strict');

let estado;
const prismaFalso = {
  flujo: { findUnique: async () => estado.flujo, updateMany: async () => ({ count: 1 }) },
  plantilla: { findUnique: async () => ({ codUnidad: 24 }) },
  version: { findUnique: async () => estado.version, updateMany: async () => ({}), update: async () => ({}) },
  flujoPaso: { findMany: async () => estado.pasos },
  $transaction: async () => { estado.guardado = true; },
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const templatesService = require('../../modules/templates/templates.service');

const aprobador = (idUsuario) => ({
  asignacion: { administrativo: { personal: { usuario: { idUsuario: BigInt(idUsuario), estado: 'A', rolesUsuario: [{ rol: { descripcion: 'Aprobador' } }] } } } },
});
const cuerpo = (...content) => ({ cuerpoDocumento: { type: 'doc', content: [{ type: 'paragraph', content }] } });
const conFirmas = { cuerpoDocumento: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }, { type: 'signatureBlock' }] } };

const reiniciar = (extra = {}) => {
  estado = {
    flujo: { codUnidad: 24, estado: 'A', idVersionBorrador: null },
    version: { idVersion: 13n, idPlantilla: 6n, estado: 'BORRADOR', idFlujo: 4n, numeroVersion: 1, variableFormJson: { variables: [] }, disenoFormJson: conFirmas },
    pasos: [{ secuencia: 1, reqFirma: true, ...aprobador(4) }, { secuencia: 2, reqFirma: true, ...aprobador(5) }],
    guardado: false,
    ...extra,
  };
};
const crear = (extra = {}) =>
  templatesService.createTemplate(2, { nombre: 'P', codUnidad: 24, variableFormJson: { variables: [] }, disenoFormJson: cuerpo(), ...extra });
const rechaza = (promesa, codigo, status) =>
  assert.rejects(promesa, (e) => e.codigo === codigo && e.status === status);

test('crear: el documento debe cumplir las reglas del formulario', async () => {
  reiniciar();
  await rechaza(crear({ disenoFormJson: cuerpo({ type: 'variable', attrs: { id: 'sinDefinir' } }) }), 'VALIDACION_FALLIDA', 400);
  await rechaza(crear({ disenoFormJson: { ...cuerpo(), encabezado: { linea3: '{{inventada}}' } } }), 'VALIDACION_FALLIDA', 400);
  assert.equal(estado.guardado, false);
});

test('crear con flujo: inexistente 404, de otra unidad 400, borrador de otra versión 409', async () => {
  reiniciar({ flujo: null });
  await rechaza(crear({ idFlujo: 4 }), 'NO_ENCONTRADO', 404);
  reiniciar({ flujo: { codUnidad: 7, estado: 'A', idVersionBorrador: null } });
  await rechaza(crear({ idFlujo: 4 }), 'VALIDACION_FALLIDA', 400);
  reiniciar({ flujo: { codUnidad: 24, estado: 'B', idVersionBorrador: 99n } });
  await rechaza(crear({ idFlujo: 4 }), 'CONFLICTO_ESTADO', 409);
  assert.equal(estado.guardado, false);
});

test('guardar: el borrador de flujo propio de la versión sí se acepta', async () => {
  reiniciar({ flujo: { codUnidad: 24, estado: 'B', idVersionBorrador: 13n } });
  await templatesService.updateTemplate(2, 6, { idVersion: 13, idFlujo: 4, variableFormJson: { variables: [] }, disenoFormJson: cuerpo() });
  assert.equal(estado.guardado, true);
});

test('publicar: documento vacío o sin bloque de firmas responde 400 y no publica', async () => {
  reiniciar();
  estado.version.disenoFormJson = { cuerpoDocumento: { type: 'doc', content: [] } };
  await rechaza(templatesService.publishTemplate(2, 6, 13), 'VALIDACION_FALLIDA', 400);
  reiniciar();
  estado.version.disenoFormJson = cuerpo({ type: 'text', text: 'Sin firmas' });
  await rechaza(templatesService.publishTemplate(2, 6, 13), 'VALIDACION_FALLIDA', 400);
  assert.equal(estado.guardado, false);
});

test('publicar: una persona en dos pasos responde 409 CONFLICTO_ESTADO', async () => {
  reiniciar({ pasos: [{ secuencia: 1, reqFirma: true, ...aprobador(4) }, { secuencia: 2, reqFirma: true, ...aprobador(4) }] });
  await rechaza(templatesService.publishTemplate(2, 6, 13), 'CONFLICTO_ESTADO', 409);
  assert.equal(estado.guardado, false);
});

test('publicar: una versión correcta se publica', async () => {
  reiniciar();
  const r = await templatesService.publishTemplate(2, 6, 13);
  assert.equal(r.estado, 'ACTIVO');
  assert.equal(estado.guardado, true);
});
