/** Tamaño y opciones del pool, y precalentamiento. Sin base de datos. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { tamanoDePool, opcionesDePool, POR_DEFECTO, MAXIMO, ESPERA_CONEXION_MS } = require('../../config/pool');

const entorno = (clave, valor, fn) => {
  const antes = process.env[clave];
  if (valor === undefined) delete process.env[clave]; else process.env[clave] = valor;
  try { return fn(); } finally { if (antes === undefined) delete process.env[clave]; else process.env[clave] = antes; }
};

// Tamaño del pool
test('tamanoDePool: 8 por defecto, nunca más de 15 (el límite del pooler) y valores inválidos usan el defecto', () => {
  assert.equal(POR_DEFECTO, 8);
  assert.equal(MAXIMO, 15);
  assert.equal(tamanoDePool(undefined), 8);
  assert.equal(tamanoDePool(''), 8);
  assert.equal(tamanoDePool('5'), 5);
  assert.equal(tamanoDePool('40'), 15);
  assert.equal(tamanoDePool('0'), 8);
  assert.equal(tamanoDePool('-3'), 8);
  assert.equal(tamanoDePool('abc'), 8);
  assert.equal(tamanoDePool('2.5'), 8);
});

// Opciones del pool
test('opcionesDePool: tamaño, espera por una conexión libre y URL sin tocar', () => {
  const o = opcionesDePool('postgresql://u:p%24@db.ejemplo.com:5432/postgres', 8);
  assert.equal(o.max, 8);
  assert.equal(o.connectionTimeoutMillis, ESPERA_CONEXION_MS);
  assert.equal(o.connectionString, 'postgresql://u:p%24@db.ejemplo.com:5432/postgres');
});

test('opcionesDePool: cifra una base remota y no una local ni con sslmode=disable', () => {
  assert.deepEqual(opcionesDePool('postgresql://u:p@db.ejemplo.com/postgres').ssl, { rejectUnauthorized: false });
  assert.equal(opcionesDePool('postgresql://u:p@localhost:5432/siadu_test').ssl, false);
  assert.equal(opcionesDePool('postgresql://u:p@127.0.0.1/siadu_test').ssl, false);
  const sinSsl = opcionesDePool('postgresql://u:p@db.ejemplo.com/postgres?sslmode=disable&x=1');
  assert.equal(sinSsl.ssl, false);
  assert.equal(sinSsl.connectionString, 'postgresql://u:p@db.ejemplo.com/postgres?x=1');
});

test('opcionesDePool: sin URL devuelve null y usa DB_POOL_SIZE cuando no se indica el tamaño', () => {
  assert.equal(opcionesDePool(undefined), null);
  assert.equal(opcionesDePool(''), null);
  entorno('DB_POOL_SIZE', '6', () => {
    assert.equal(opcionesDePool('postgresql://u:p@h/db').max, 6);
  });
});

// Precalentamiento
const precalentar = require('../../config/precalentar');

const clienteFalso = (resolver) => {
  const registro = { consultas: 0 };
  return { registro, $queryRaw: (...a) => { registro.consultas++; return resolver(a); } };
};

test('precalentar abre 5 conexiones por defecto', async () => {
  const c = clienteFalso(async () => [{ '?column?': 1 }]);
  const r = await entorno('DB_WARM_CONNECTIONS', undefined, () => precalentar(c));
  assert.equal(c.registro.consultas, 5);
  assert.equal(r.conexiones, 5);
});

test('precalentar: 0 lo desactiva y nunca pasa del tamaño del pool', async () => {
  const apagado = clienteFalso(async () => 1);
  assert.deepEqual(await entorno('DB_WARM_CONNECTIONS', '0', () => precalentar(apagado)), { conexiones: 0, ms: 0 });
  assert.equal(apagado.registro.consultas, 0);

  const limitado = clienteFalso(async () => 1);
  await entorno('DB_WARM_CONNECTIONS', '12', () => entorno('DB_POOL_SIZE', '4', () => precalentar(limitado)));
  assert.equal(limitado.registro.consultas, 4);
});

test('precalentar: un fallo de la base no impide arrancar; informa cuántas se abrieron', async () => {
  let n = 0;
  const c = clienteFalso(async () => { n++; if (n > 3) throw new Error('FATAL: max clients reached'); return 1; });
  const avisos = [];
  const original = console.warn; console.warn = (...a) => avisos.push(a.join(' '));
  try {
    const r = await entorno('DB_WARM_CONNECTIONS', undefined, () => precalentar(c));
    assert.equal(r.conexiones, 3);
  } finally { console.warn = original; }
  assert.ok(avisos.some((a) => a.includes('Solo se abrieron 3 de 5')));
});

test('precalentar: valores inválidos de DB_WARM_CONNECTIONS usan el defecto', () => {
  assert.equal(entorno('DB_WARM_CONNECTIONS', 'abc', () => precalentar.cuantas()), 5);
  assert.equal(entorno('DB_WARM_CONNECTIONS', '-2', () => precalentar.cuantas()), 5);
  assert.equal(entorno('DB_WARM_CONNECTIONS', '3', () => precalentar.cuantas()), 3);
});
