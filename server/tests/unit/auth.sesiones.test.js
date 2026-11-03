const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'clave-de-prueba';

// Base y hash simulados
const actualizaciones = [];
let versionEnBase = 4;
const prismaFalso = {
  usuario: {
    findUnique: async () => ({ estado: 'A', passwordHash: 'hash-actual' }),
    update: async ({ data }) => {
      actualizaciones.push(data);
      if (data.versionSesion?.increment) versionEnBase += data.versionSesion.increment;
      return { versionSesion: versionEnBase, idUsuario: 7n };
    },
  },
};
const hashFalso = { compare: async (texto) => texto === 'Actual#2026', hash: async () => 'hash-nuevo' };
const simular = (ruta, exports) => {
  const r = require.resolve(ruta);
  require.cache[r] = { id: r, filename: r, loaded: true, exports };
};
simular('../../config/prisma', prismaFalso);
simular('../../utils/hashWorker', hashFalso);

const authService = require('../../modules/auth/auth.service');

test('cerrar sesión sube la versión de sesión del usuario', async () => {
  actualizaciones.length = 0;
  const r = await authService.logout(7);
  assert.equal(r.ok, true);
  assert.deepEqual(actualizaciones[0].versionSesion, { increment: 1 });
});

test('cambiar la contraseña revoca las demás sesiones y entrega un token nuevo con los mismos datos', async () => {
  actualizaciones.length = 0;
  const sesion = { idUsuario: 7, roles: ['SOLICITANTE'], codUnidad: 24, vs: 5, iat: 1, exp: 2, debeCambiarPassword: true };
  const r = await authService.changePassword(7, { passwordActual: 'Actual#2026', passwordNueva: 'Nueva#2026ok' }, sesion);
  assert.deepEqual(actualizaciones[0].versionSesion, { increment: 1 });
  assert.equal(actualizaciones[0].claveInicial, false);
  const nuevo = jwt.verify(r.token, process.env.JWT_SECRET);
  assert.equal(nuevo.vs, versionEnBase);
  assert.equal(nuevo.codUnidad, 24);
  assert.deepEqual(nuevo.roles, ['SOLICITANTE']);
  assert.equal(nuevo.debeCambiarPassword, undefined);
  assert.ok(nuevo.exp > 2);
});
