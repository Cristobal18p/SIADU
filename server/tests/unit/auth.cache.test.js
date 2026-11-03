const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'clave-de-prueba';

// Base simulada que cuenta las consultas del estado de la cuenta
let consultas = 0;
let cuentaEnBase = { estado: 'A', claveInicial: false };
const prismaFalso = {
  usuario: {
    findUnique: async () => { consultas++; return cuentaEnBase; },
  },
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const cuentaCache = require('../../utils/cuentaCache');
const authMiddleware = require('../../middleware/auth');

const reiniciar = (cuenta = { estado: 'A', claveInicial: false }) => {
  consultas = 0;
  cuentaEnBase = cuenta;
  cuentaCache.limpiar();
  delete process.env.ACCOUNT_CACHE_SECONDS;
};

const token = (idUsuario = 7) => jwt.sign({ idUsuario, roles: ['SOLICITANTE'] }, process.env.JWT_SECRET, { expiresIn: '1h' });

/** Ejecuta el middleware y devuelve { estado, cuerpo, paso } */
const llamar = async (mw, bearer = token()) => {
  const res = { codigo: null, cuerpo: null, status(c) { this.codigo = c; return this; }, json(b) { this.cuerpo = b; return this; } };
  const req = { headers: { authorization: `Bearer ${bearer}` } };
  let paso = false;
  await mw(req, res, () => { paso = true; });
  return { estado: res.codigo, cuerpo: res.cuerpo, paso, req };
};

// ---------- la caché sola
test('cuentaCache: guarda y devuelve mientras no venza', () => {
  reiniciar();
  cuentaCache.guardar(1, { estado: 'A', claveInicial: true }, 1000);
  assert.deepEqual(cuentaCache.obtener(1, 1000 + 9_999), { estado: 'A', claveInicial: true, versionSesion: 0 });
  assert.equal(cuentaCache.obtener(1, 1000 + 10_000), null); // vence a los 10 s por defecto
  assert.equal(cuentaCache.tamano(), 0); // la vencida se descarta
});

test('cuentaCache: invalidar olvida al usuario al instante', () => {
  reiniciar();
  cuentaCache.guardar(5, { estado: 'A', claveInicial: true }, 0);
  cuentaCache.invalidar(5);
  assert.equal(cuentaCache.obtener(5, 1), null);
});

test('cuentaCache: ACCOUNT_CACHE_SECONDS=0 la desactiva; un valor inválido usa el valor por defecto; hay tope de 60 s', () => {
  reiniciar();
  process.env.ACCOUNT_CACHE_SECONDS = '0';
  cuentaCache.guardar(1, { estado: 'A', claveInicial: false }, 0);
  assert.equal(cuentaCache.obtener(1, 1), null);

  process.env.ACCOUNT_CACHE_SECONDS = 'abc';
  cuentaCache.guardar(2, { estado: 'A', claveInicial: false }, 0);
  assert.notEqual(cuentaCache.obtener(2, 9_000), null);
  assert.equal(cuentaCache.obtener(2, 10_000), null);

  process.env.ACCOUNT_CACHE_SECONDS = '5000';
  cuentaCache.guardar(3, { estado: 'A', claveInicial: false }, 0);
  assert.notEqual(cuentaCache.obtener(3, 59_000), null);
  assert.equal(cuentaCache.obtener(3, 60_000), null);
  delete process.env.ACCOUNT_CACHE_SECONDS;
});

test('cuentaCache: no crece sin límite', () => {
  reiniciar();
  for (let i = 0; i < 5200; i++) cuentaCache.guardar(i, { estado: 'A', claveInicial: false }, 0);
  assert.ok(cuentaCache.tamano() <= 5000);
});

// ---------- el middleware
test('middleware: la segunda petición del mismo usuario no consulta la base', async () => {
  reiniciar();
  const t = token(7);
  assert.equal((await llamar(authMiddleware, t)).paso, true);
  assert.equal((await llamar(authMiddleware, t)).paso, true);
  assert.equal((await llamar(authMiddleware, t)).paso, true);
  assert.equal(consultas, 1);
});

test('middleware: usuarios distintos consultan por separado', async () => {
  reiniciar();
  await llamar(authMiddleware, token(1));
  await llamar(authMiddleware, token(2));
  await llamar(authMiddleware, token(1));
  assert.equal(consultas, 2);
});

test('middleware: con la caché desactivada consulta en cada petición', async () => {
  reiniciar();
  process.env.ACCOUNT_CACHE_SECONDS = '0';
  await llamar(authMiddleware);
  await llamar(authMiddleware);
  assert.equal(consultas, 2);
});

test('middleware: una cuenta inactiva responde 401 y no se guarda como válida', async () => {
  reiniciar({ estado: 'I', claveInicial: false });
  const r = await llamar(authMiddleware);
  assert.equal(r.estado, 401);
  assert.equal(r.cuerpo.error.codigo, 'NO_AUTENTICADO');
  // Reactivada la cuenta y vaciada la caché, la siguiente petición pasa
  cuentaCache.limpiar();
  cuentaEnBase = { estado: 'A', claveInicial: false };
  assert.equal((await llamar(authMiddleware)).paso, true);
});

test('middleware: una cuenta que no existe responde 401 y no se guarda en la caché', async () => {
  reiniciar();
  cuentaEnBase = null;
  assert.equal((await llamar(authMiddleware)).estado, 401);
  assert.equal(cuentaCache.tamano(), 0);
});

test('middleware: la contraseña inicial bloquea con 403 salvo en las rutas permitidas', async () => {
  reiniciar({ estado: 'A', claveInicial: true });
  const bloqueado = await llamar(authMiddleware);
  assert.equal(bloqueado.estado, 403);
  assert.equal(bloqueado.cuerpo.error.codigo, 'CAMBIO_PASSWORD_REQUERIDO');
  const permitido = await llamar(authMiddleware.permitirClaveInicial);
  assert.equal(permitido.paso, true);
  assert.equal(permitido.req.user.debeCambiarPassword, true);
});

test('middleware: al cambiar la contraseña (invalidar) el mismo token queda habilitado en la siguiente petición', async () => {
  reiniciar({ estado: 'A', claveInicial: true });
  const t = token(9);
  assert.equal((await llamar(authMiddleware, t)).estado, 403); // la caché guardó claveInicial = true
  cuentaEnBase = { estado: 'A', claveInicial: false };          // el usuario cambia su contraseña…
  cuentaCache.invalidar(9);                                       // …y changePassword invalida la caché
  assert.equal((await llamar(authMiddleware, t)).paso, true);
});

test('middleware: sin token o con un token falso responde 401 sin tocar la base', async () => {
  reiniciar();
  const sinToken = { codigo: null, status(c) { this.codigo = c; return this; }, json() { return this; } };
  await authMiddleware({ headers: {} }, sinToken, () => assert.fail('no debía pasar'));
  assert.equal(sinToken.codigo, 401);
  assert.equal((await llamar(authMiddleware, 'abc.def.ghi')).estado, 401);
  assert.equal((await llamar(authMiddleware, jwt.sign({ idUsuario: 1 }, 'otra-clave'))).estado, 401);
  assert.equal(consultas, 0);
});

// ---------- sesiones revocables
const tokenConVersion = (vs) =>
  jwt.sign({ idUsuario: 7, roles: ['SOLICITANTE'], ...(vs === undefined ? {} : { vs }) }, process.env.JWT_SECRET, { expiresIn: '1h' });

test('un token sin versión vale mientras la cuenta siga en la versión 0 (tokens anteriores a la migración)', async () => {
  reiniciar({ estado: 'A', claveInicial: false, versionSesion: 0 });
  assert.equal((await llamar(authMiddleware, tokenConVersion(undefined))).paso, true);
});

test('un token de una versión anterior queda revocado tras cerrar sesión o cambiar la contraseña', async () => {
  reiniciar({ estado: 'A', claveInicial: false, versionSesion: 3 });
  const viejo = await llamar(authMiddleware, tokenConVersion(2));
  assert.equal(viejo.paso, false);
  assert.equal(viejo.estado, 401);
  assert.equal(viejo.cuerpo.error.codigo, 'NO_AUTENTICADO');
  assert.equal((await llamar(authMiddleware, tokenConVersion(3))).paso, true);
});
