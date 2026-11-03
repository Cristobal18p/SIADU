const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { cabeceras, limitarLogin, INTENTOS_POR_CUENTA } = require('../../middleware/seguridad');
const logger = require('../../utils/logger');

const levantar = (app) =>
  new Promise((resolver) => {
    const servidor = app.listen(0, () => resolver({ servidor, url: `http://127.0.0.1:${servidor.address().port}` }));
  });

test('las cabeceras traen una CSP con nonce distinto en cada respuesta y no exponen Express', async () => {
  const app = express();
  app.use(cabeceras());
  app.get('/', (req, res) => res.send('ok'));
  const { servidor, url } = await levantar(app);
  try {
    const a = await fetch(url);
    const b = await fetch(url);
    const nonce = (r) => /'nonce-([^']+)'/.exec(r.headers.get('content-security-policy'))[1];
    assert.notEqual(nonce(a), nonce(b));
    assert.match(a.headers.get('content-security-policy'), /object-src 'none'/);
    assert.match(a.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(a.headers.get('x-powered-by'), null);
    assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
  } finally {
    servidor.close();
  }
});

test('el login se bloquea tras los intentos fallidos de una cuenta, sin afectar a otra', async () => {
  const app = express();
  app.use(express.json());
  app.post('/login', limitarLogin(), (req, res) => res.status(401).json({ error: { codigo: 'CREDENCIALES_INVALIDAS' } }));
  const { servidor, url } = await levantar(app);
  const intentar = (identificador) =>
    fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identificador }),
    });
  try {
    for (let i = 0; i < INTENTOS_POR_CUENTA; i += 1) assert.equal((await intentar('a@up.ac.pa')).status, 401);
    const bloqueada = await intentar('a@up.ac.pa');
    assert.equal(bloqueada.status, 429);
    assert.equal((await bloqueada.json()).error.codigo, 'DEMASIADOS_INTENTOS');
    assert.equal((await intentar('b@up.ac.pa')).status, 401);
  } finally {
    servidor.close();
  }
});

test('el identificador se enmascara en los registros', () => {
  assert.equal(logger.enmascarar('9-000-0005'), '9-0***');
  assert.equal(logger.enmascarar(undefined), '');
});

test('la IP del cliente se toma sin el puerto que añaden algunos balanceadores', () => {
  const { ipDe } = require('../../utils/ip');
  assert.equal(ipDe({ ip: '138.84.47.226:34700' }), '138.84.47.226');
  assert.equal(ipDe({ ip: '138.84.47.226' }), '138.84.47.226');
  assert.equal(ipDe({ ip: '[2001:db8::1]:443' }), '2001:db8::1');
  assert.equal(ipDe({ ip: '::1' }), '::1');
});

test('el límite de intentos no se reinicia al cambiar el puerto de origen', async () => {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', 1);
  app.post('/login', limitarLogin(), (req, res) => res.status(401).json({ error: { codigo: 'CREDENCIALES_INVALIDAS' } }));
  const { servidor, url } = await levantar(app);
  const intentar = (puerto) =>
    fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `203.0.113.9:${puerto}` },
      body: JSON.stringify({ identificador: 'a@up.ac.pa' }),
    });
  try {
    for (let i = 0; i < INTENTOS_POR_CUENTA; i += 1) assert.equal((await intentar(10000 + i)).status, 401);
    assert.equal((await intentar(55555)).status, 429);
  } finally {
    servidor.close();
  }
});

test('el PDF se limita por usuario: al pasar el tope responde 429 y otro usuario sigue pudiendo', async () => {
  const { limitarPdf, PDF_POR_USUARIO } = require('../../middleware/seguridad');
  const app = express();
  app.get('/pdf', (req, res, next) => { req.user = { idUsuario: Number(req.query.u) }; next(); }, limitarPdf(), (req, res) => res.send('pdf'));
  const { servidor, url } = await levantar(app);
  try {
    for (let i = 0; i < PDF_POR_USUARIO; i += 1) assert.equal((await fetch(`${url}/pdf?u=1`)).status, 200);
    const limitado = await fetch(`${url}/pdf?u=1`);
    assert.equal(limitado.status, 429);
    assert.equal((await limitado.json()).error.codigo, 'DEMASIADAS_SOLICITUDES');
    assert.equal((await fetch(`${url}/pdf?u=2`)).status, 200);
  } finally {
    servidor.close();
  }
});

test('el límite de la API cuenta por usuario con token válido; un token falsificado cuenta por IP', async () => {
  const jwt = require('jsonwebtoken');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave-de-prueba';
  const { limitarApi, PETICIONES_API } = require('../../middleware/seguridad');
  const app = express();
  app.use('/api', limitarApi());
  app.get('/api/x', (req, res) => res.send('ok'));
  const { servidor, url } = await levantar(app);
  const con = (token) => fetch(`${url}/api/x`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const valido = (id) => jwt.sign({ idUsuario: id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  try {
    for (let i = 0; i < PETICIONES_API; i += 1) await con(valido(1));
    assert.equal((await con(valido(1))).status, 429);
    assert.equal((await con(valido(2))).status, 200); // otro usuario desde la misma IP no se ve afectado
    // Un token con id inventado y firma falsa no abre un contador nuevo: cae en el de la IP
    for (let i = 0; i < PETICIONES_API; i += 1) await con(`${valido(99).slice(0, -3)}xxx`);
    assert.equal((await con(null)).status, 429);
  } finally {
    servidor.close();
  }
});
