/** bcrypt en hilos de trabajo: mismos resultados que bcryptjs sin bloquear el hilo principal. Sin base de datos. */
const test = require('node:test');
const assert = require('node:assert/strict');
const bcryptjs = require('bcryptjs');
const hashWorker = require('../../utils/hashWorker');

const conEntorno = async (valor, fn) => {
  const antes = process.env.HASH_WORKERS;
  if (valor === undefined) delete process.env.HASH_WORKERS; else process.env.HASH_WORKERS = valor;
  await hashWorker.cerrar();
  try { return await fn(); } finally {
    await hashWorker.cerrar();
    if (antes === undefined) delete process.env.HASH_WORKERS; else process.env.HASH_WORKERS = antes;
  }
};

const HASH = bcryptjs.hashSync('Demo2026*', 10);

test('hilosConfigurados: entre 1 y 4 por defecto; 0 los desactiva; un valor inválido usa el defecto', async () => {
  await conEntorno(undefined, () => { const n = hashWorker.hilosConfigurados(); assert.ok(n >= 1 && n <= 4); });
  await conEntorno('0', () => assert.equal(hashWorker.hilosConfigurados(), 0));
  await conEntorno('3', () => assert.equal(hashWorker.hilosConfigurados(), 3));
  await conEntorno('999', () => assert.equal(hashWorker.hilosConfigurados(), 16));
  await conEntorno('abc', () => assert.ok(hashWorker.hilosConfigurados() >= 1));
  await conEntorno('-2', () => assert.ok(hashWorker.hilosConfigurados() >= 1));
});

test('compare: acierta con la contraseña correcta y falla con la incorrecta (en hilos y en el hilo principal)', async () => {
  for (const valor of ['2', '0']) {
    await conEntorno(valor, async () => {
      assert.equal(await hashWorker.compare('Demo2026*', HASH), true);
      assert.equal(await hashWorker.compare('otra', HASH), false);
      assert.equal(await hashWorker.compare('x', 'no-es-un-hash'), false);
    });
  }
});

test('hash: produce un hash bcrypt válido que bcryptjs verifica', async () => {
  await conEntorno('2', async () => {
    const h = await hashWorker.hash('Fiec#2026seguro', 10);
    assert.match(h, /^\$2[aby]\$10\$/);
    assert.equal(bcryptjs.compareSync('Fiec#2026seguro', h), true);
    assert.equal(bcryptjs.compareSync('otra', h), false);
  });
});

test('muchas comparaciones a la vez devuelven cada una su resultado correcto', async () => {
  await conEntorno('3', async () => {
    const tareas = Array.from({ length: 24 }, (_, i) => (i % 2 === 0
      ? hashWorker.compare('Demo2026*', HASH)
      : hashWorker.compare('incorrecta', HASH)));
    const r = await Promise.all(tareas);
    r.forEach((v, i) => assert.equal(v, i % 2 === 0, `la tarea ${i} devolvió un resultado cruzado`));
  });
});

test('el hilo principal sigue libre mientras se calculan muchos bcrypt (un temporizador de 5 ms dispara a tiempo)', async () => {
  // En el hilo principal, cada comparación de bcryptjs es síncrona y bloquea el procesador
  const medir = async () => {
    const t = Date.now(); // antes de lanzar: sin hilos, compare calcula de forma síncrona
    const calculos = Promise.all(Array.from({ length: 24 }, () => hashWorker.compare('Demo2026*', HASH)));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const tardo = Date.now() - t;
    await calculos;
    return tardo;
  };
  const enHilos = await conEntorno('2', async () => { await hashWorker.compare('x', HASH); return medir(); });
  const enPrincipal = await conEntorno('0', medir);
  // Proporción y no tiempos fijos: el resultado no depende de la velocidad del equipo
  assert.ok(enPrincipal > 100, `se esperaba que el hilo principal se bloqueara (${enPrincipal} ms)`);
  assert.ok(enHilos * 3 < enPrincipal, `con hilos tardó ${enHilos} ms; en el hilo principal, ${enPrincipal} ms`);
});

test('un script que solo espera un cálculo no se cierra antes de recibir el resultado', async () => {
  const { spawnSync } = require('node:child_process');
  const codigo = `
    process.env.HASH_WORKERS = '2';
    const hw = require(${JSON.stringify(require.resolve('../../utils/hashWorker'))});
    const bcryptjs = require(${JSON.stringify(require.resolve('bcryptjs'))});
    hw.compare('Demo2026*', bcryptjs.hashSync('Demo2026*', 10)).then((ok) => console.log('RESULTADO:' + ok));
  `;
  const r = spawnSync(process.execPath, ['-e', codigo], { encoding: 'utf8', timeout: 20000 });
  assert.match(r.stdout, /RESULTADO:true/, `salida: ${r.stdout} ${r.stderr}`);
});

test('cerrar detiene los hilos y una llamada posterior los vuelve a crear', async () => {
  await conEntorno('2', async () => {
    assert.equal(await hashWorker.compare('Demo2026*', HASH), true);
    await hashWorker.cerrar();
    assert.equal(await hashWorker.compare('Demo2026*', HASH), true);
  });
});
