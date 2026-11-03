// Hilo de trabajo que calcula bcrypt
const { parentPort } = require('node:worker_threads');
const bcrypt = require('bcryptjs');

parentPort.on('message', async ({ id, tipo, args }) => {
  try {
    const valor = tipo === 'compare' ? await bcrypt.compare(args[0], args[1]) : await bcrypt.hash(args[0], args[1]);
    parentPort.postMessage({ id, ok: true, valor });
  } catch (err) {
    parentPort.postMessage({ id, ok: false, error: err.message });
  }
});
