/** El resumen y el filtro `estado` del inventario usan el mismo criterio de versión vigente. Datos simulados. */
const test = require('node:test');
const assert = require('node:assert/strict');

const cuentas = [];
const buscadas = [];
const prismaFalso = {
  plantilla: {
    count: async ({ where }) => { cuentas.push(where); return 100 + cuentas.length; },
    findMany: async (args) => { buscadas.push(args); return []; },
  },
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };
require('../../modules/auth/auth.service').getMe = async () => { throw new Error('No debía cargarse el perfil'); };

const templatesService = require('../../modules/templates/templates.service');
const TOKEN_ADMIN = { idUsuario: 2, roles: ['ADMINISTRADOR'], estamentos: ['ADMINISTRATIVO'], codUnidad: 24 };

const limpiar = () => { cuentas.length = 0; buscadas.length = 0; };

test('getSummary devuelve total, activas, borradores e inactivas desde el contexto del token', async () => {
  limpiar();
  const r = await templatesService.getSummary(2, {}, TOKEN_ADMIN);
  assert.equal(cuentas.length, 4);
  // Orden de las cuentas: total, activas, borradores, inactivas
  assert.deepEqual(r, { total: 101, activas: 102, borradores: 103, inactivas: 104 });
  cuentas.forEach((w) => assert.equal(w.codUnidad, 24));
});

test('getSummary: cada cuenta usa el criterio de la versión vigente', async () => {
  limpiar();
  await templatesService.getSummary(2, {}, TOKEN_ADMIN);
  const [total, activas, borradores, inactivas] = cuentas;
  assert.equal(total.versiones, undefined);
  assert.equal(total.AND, undefined);
  assert.deepEqual(activas.versiones, { some: { estado: 'ACTIVO' } });
  // borrador: sin versión ACTIVO y con un BORRADOR
  assert.deepEqual(borradores.AND, [
    { versiones: { none: { estado: 'ACTIVO' } } },
    { versiones: { some: { estado: 'BORRADOR' } } },
  ]);
  // inactiva: sin ACTIVO ni BORRADOR, y con al menos una versión
  assert.deepEqual(inactivas.AND, [
    { versiones: { none: { estado: { in: ['ACTIVO', 'BORRADOR'] } } } },
    { versiones: { some: {} } },
  ]);
});

test('el inventario filtra con exactamente el mismo criterio que el resumen', async () => {
  limpiar();
  await templatesService.getSummary(2, {}, TOKEN_ADMIN);
  const delResumen = { ACTIVO: cuentas[1], BORRADOR: cuentas[2], INACTIVO: cuentas[3] };

  for (const estado of ['ACTIVO', 'BORRADOR', 'INACTIVO']) {
    buscadas.length = 0; cuentas.length = 0;
    await templatesService.getTemplates(2, { estado }, TOKEN_ADMIN);
    assert.deepEqual(cuentas[0], delResumen[estado], `el filtro ${estado} del inventario difiere del resumen`);
    assert.deepEqual(buscadas[0].where, delResumen[estado]);
  }
});

test('el inventario con TODOS no filtra por estado; la búsqueda se combina con el estado', async () => {
  limpiar();
  await templatesService.getTemplates(2, { estado: 'TODOS', search: 'retiro' }, TOKEN_ADMIN);
  assert.equal(cuentas[0].versiones, undefined);
  assert.equal(cuentas[0].AND, undefined);
  assert.equal(cuentas[0].OR.length, 2);

  limpiar();
  await templatesService.getTemplates(2, { estado: 'BORRADOR', search: 'retiro' }, TOKEN_ADMIN);
  assert.equal(cuentas[0].OR.length, 2);
  assert.equal(cuentas[0].AND.length, 2);
});

test('un estado que no existe no coincide con ninguna plantilla (como antes)', async () => {
  limpiar();
  await templatesService.getTemplates(2, { estado: 'inexistente' }, TOKEN_ADMIN);
  assert.deepEqual(cuentas[0].versiones, { some: { estado: 'INEXISTENTE' } });
});

test('el inventario solo pide de cada versión lo que muestra (sin los JSON del documento)', async () => {
  limpiar();
  await templatesService.getTemplates(2, {}, TOKEN_ADMIN);
  const sel = buscadas[0].include.versiones.select;
  assert.deepEqual(Object.keys(sel).sort(), ['estado', 'fechaPublic', 'idVersion', 'numeroVersion']);
  assert.equal(sel.variableFormJson, undefined);
  assert.equal(sel.disenoFormJson, undefined);
});

test('con codUnidad explícito el resumen y el inventario lo respetan sin necesitar el contexto', async () => {
  limpiar();
  await templatesService.getSummary(2, { codUnidad: '31' });
  assert.ok(cuentas.every((w) => w.codUnidad === 31));
});
