/** El servicio de plantillas usa el contexto del token y no carga el perfil completo. Datos simulados. */
const test = require('node:test');
const assert = require('node:assert/strict');

// Prisma simulado, inyectado antes de cargar el servicio
const consultas = { plantillaCount: [], plantillaFindMany: [], plantillaFindUnique: [] };
let plantillaDetalle = null;

const prismaFalso = {
  plantilla: {
    count: async (args) => { consultas.plantillaCount.push(args); return 1; },
    findMany: async (args) => {
      consultas.plantillaFindMany.push(args);
      return [{
        idPlantilla: 5n, nombre: 'Retiro', descripcion: 'd', codUnidad: 24, audiencia: ['ESTUDIANTE'], estado: 'A',
        fechaRegistrado: new Date('2026-10-01T00:00:00Z'),
        versiones: [{ idVersion: 9n, numeroVersion: 1, estado: 'ACTIVO', fechaPublic: null }],
      }];
    },
    findUnique: async (args) => { consultas.plantillaFindUnique.push(args); return plantillaDetalle; },
  },
  version: { findFirst: async () => null },
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const authService = require('../../modules/auth/auth.service');
let llamadasGetMe = 0;
authService.getMe = async () => {
  llamadasGetMe++;
  return {
    idUsuario: 1, correo: 'a@up.ac.pa', cedula: '8-1-1', nombre: 'Ana', apellido: 'Pérez', nombreCompleto: 'Ana Pérez',
    roles: ['SOLICITANTE'], estamentos: ['ESTUDIANTE'], unidad: { codUnidad: 24, nombre: 'Informática', tipoUnidad: 'FACULTAD', abrev: 'FIEC' },
    carrera: { idCarrera: 1, descripcion: 'Ingeniería' }, cargos: [],
  };
};

const templatesService = require('../../modules/templates/templates.service');

const TOKEN_ESTUDIANTE = { idUsuario: 1, roles: ['SOLICITANTE'], estamentos: ['ESTUDIANTE'], codUnidad: 24 };
const TOKEN_ADMIN = { idUsuario: 2, roles: ['ADMINISTRADOR', 'SOLICITANTE'], estamentos: ['ADMINISTRATIVO'], codUnidad: 24 };

const detalle = (extra = {}) => ({
  idPlantilla: 5n, nombre: 'Retiro', descripcion: 'd', codUnidad: 24, audiencia: ['ESTUDIANTE'], estado: 'A',
  versiones: [{
    idVersion: 9n, numeroVersion: 1, estado: 'ACTIVO', variableFormJson: { variables: [] }, disenoFormJson: {},
    fechaPublic: new Date('2026-10-02T00:00:00Z'), flujo: null,
  }],
  ...extra,
});

const reiniciar = () => {
  llamadasGetMe = 0;
  Object.values(consultas).forEach((l) => { l.length = 0; });
  plantillaDetalle = detalle();
};

test('getTemplates usa la unidad del token y no carga el perfil', async () => {
  reiniciar();
  const r = await templatesService.getTemplates(2, { page: 1, limit: 10, estado: 'TODOS' }, TOKEN_ADMIN);
  assert.equal(llamadasGetMe, 0);
  assert.equal(consultas.plantillaFindMany[0].where.codUnidad, 24);
  assert.equal(r.total, 1);
  assert.equal(r.datos[0].idPlantilla, 5);
});

test('getTemplates con codUnidad explícito tampoco necesita el perfil ni el contexto', async () => {
  reiniciar();
  await templatesService.getTemplates(2, { codUnidad: '31' });
  assert.equal(llamadasGetMe, 0);
  assert.equal(consultas.plantillaFindMany[0].where.codUnidad, 31);
});

test('getTemplates sin contexto sigue funcionando: carga el perfil como antes', async () => {
  reiniciar();
  await templatesService.getTemplates(1, {});
  assert.equal(llamadasGetMe, 1);
  assert.equal(consultas.plantillaFindMany[0].where.codUnidad, 24);
});

test('getCatalog filtra por unidad y estamentos del token, sin cargar el perfil', async () => {
  reiniciar();
  const soloProfesor = { ...TOKEN_ESTUDIANTE, estamentos: ['PROFESOR'] };
  assert.equal((await templatesService.getCatalog(1, TOKEN_ESTUDIANTE)).length, 1);
  assert.equal((await templatesService.getCatalog(1, soloProfesor)).length, 0); // la plantilla es para ESTUDIANTE
  assert.equal(llamadasGetMe, 0);
  assert.equal(consultas.plantillaFindMany[0].where.codUnidad, 24);
});

test('getTemplateById: el administrador no carga el perfil y variablesSistema vale null', async () => {
  reiniciar();
  const r = await templatesService.getTemplateById(2, 5, null, TOKEN_ADMIN);
  assert.equal(llamadasGetMe, 0);
  assert.equal(r.variablesSistema, null);
  assert.equal(r.idPlantilla, 5);
});

test('getTemplateById: el solicitante carga el perfil una vez y recibe sus datos automáticos', async () => {
  reiniciar();
  const r = await templatesService.getTemplateById(1, 5, null, TOKEN_ESTUDIANTE);
  assert.equal(llamadasGetMe, 1);
  assert.equal(r.variablesSistema['auth.nombre_completo'], 'Ana Pérez');
  assert.equal(r.variablesSistema['estudiante.carrera'], 'Ingeniería');
  assert.equal(r.variablesSistema['solicitud.codigo'], null);
});

test('getTemplateById: plantilla de otra unidad o de otra audiencia responde 404 sin dejar rechazos sin atender', async () => {
  reiniciar();
  plantillaDetalle = detalle({ codUnidad: 31 });
  await assert.rejects(templatesService.getTemplateById(1, 5, null, TOKEN_ESTUDIANTE), (e) => e.codigo === 'NO_ENCONTRADO' && e.status === 404);

  reiniciar();
  plantillaDetalle = detalle({ audiencia: ['PROFESOR'] });
  await assert.rejects(templatesService.getTemplateById(1, 5, null, TOKEN_ESTUDIANTE), (e) => e.codigo === 'NO_ENCONTRADO');

  // Un ciclo de espera: un rechazo sin atender haría fallar la prueba
  await new Promise((resolve) => setImmediate(resolve));
});

test('getTemplateById: plantilla inexistente responde 404 y el administrador la ve aunque no esté activa', async () => {
  reiniciar();
  plantillaDetalle = null;
  await assert.rejects(templatesService.getTemplateById(2, 99, null, TOKEN_ADMIN), (e) => e.codigo === 'NO_ENCONTRADO');

  reiniciar();
  plantillaDetalle = detalle();
  plantillaDetalle.versiones[0].estado = 'BORRADOR';
  const r = await templatesService.getTemplateById(2, 5, null, TOKEN_ADMIN);
  assert.equal(r.estado, 'BORRADOR');
});

test('getTemplateById: el solicitante no ve una versión que no está activa', async () => {
  reiniciar();
  plantillaDetalle = detalle();
  plantillaDetalle.versiones[0].estado = 'INACTIVO';
  await assert.rejects(templatesService.getTemplateById(1, 5, null, TOKEN_ESTUDIANTE), (e) => e.codigo === 'NO_ENCONTRADO');
});
