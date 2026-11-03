// Catálogo de cargos: solo autoridades, con escuela y departamento. Datos simulados.
const test = require('node:test');
const assert = require('node:assert/strict');

let consulta = null;
const asignaciones = [
  {
    idAsignacion: 31n, idCargo: 14, cargo: { nombre: 'Director/a de Escuela' }, area: { nombre: 'Escuelas' },
    escuela: { nombre: 'Escuela de Ciencia de Datos' }, departamento: { nombre: 'Informática' },
    administrativo: { personal: { nombre: 'Lia', apellido: 'Muestra', usuario: { idUsuario: 31n, estado: 'A', rolesUsuario: [{ rol: { descripcion: 'Aprobador' } }] } } },
  },
  {
    idAsignacion: 39n, idCargo: 1, cargo: { nombre: 'Decano' }, area: { nombre: 'Decanato' },
    escuela: null, departamento: null,
    administrativo: { personal: { nombre: 'Julio', apellido: 'Demo', usuario: null } },
  },
];
const prismaFalso = {
  asignacionAdministrativo: {
    findMany: async (args) => { consulta = args; return asignaciones; },
  },
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const catalogsService = require('../../modules/catalogs/catalogs.service');

test('getCargos pide solo los cargos de autoridad y las secretarias de los directores', async () => {
  await catalogsService.getCargos({ codUnidad: 24 });
  const [autoridades, secretarias] = consulta.where.OR;
  assert.ok(autoridades.cargo.nombre.in.includes('Director/a de Escuela'));
  assert.ok(!autoridades.cargo.nombre.in.includes('Cajero/a'));
  assert.equal(secretarias.cargo.nombre, 'Secretaria');
  assert.deepEqual(secretarias.area.nombre.in, ['Departamentos', 'Escuelas']);
  assert.equal(consulta.where.codUnidad, 24);
});

test('getCargos devuelve la escuela y el departamento de cada asignación', async () => {
  const cargos = await catalogsService.getCargos({ codUnidad: 24 });
  const director = cargos.find((c) => c.idAsignacion === 31);
  const decano = cargos.find((c) => c.idAsignacion === 39);
  assert.equal(director.escuela, 'Escuela de Ciencia de Datos');
  assert.equal(director.departamento, 'Informática');
  assert.equal(director.esAprobador, true);
  assert.equal(decano.escuela, null);
  assert.equal(decano.departamento, null);
  assert.equal(decano.esAprobador, false);
});
