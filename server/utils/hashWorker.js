/** bcrypt en hilos de trabajo (HASH_WORKERS, 0 lo desactiva); si un hilo falla, se calcula en el principal. */
const { Worker } = require('node:worker_threads');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const hilosConfigurados = () => {
  const bruto = process.env.HASH_WORKERS;
  if (bruto !== undefined && bruto !== '') {
    const n = Number(bruto);
    if (Number.isInteger(n) && n >= 0) return Math.min(n, 16);
  }
  return Math.max(1, Math.min(os.cpus().length, 4));
};

let hilos = null;
const pendientes = new Map(); // id -> { resolve, reject, hilo, tipo, args }
let contador = 0;

const crearHilo = () => {
  const hilo = new Worker(path.join(__dirname, 'hashWorker.thread.js'));
  hilo.cargas = 0;
  hilo.on('message', ({ id, ok, valor, error }) => {
    const p = pendientes.get(id);
    if (!p) return;
    pendientes.delete(id);
    hilo.cargas--;
    if (hilo.cargas === 0) hilo.unref(); // un hilo ocioso no mantiene vivo el proceso
    if (ok) p.resolve(valor); else p.reject(new Error(error));
  });
  // Si el hilo se cae, sus tareas pasan al hilo principal y se reemplaza
  const alCaer = () => {
    const idx = hilos ? hilos.indexOf(hilo) : -1;
    if (idx !== -1) hilos[idx] = crearHilo();
    for (const [id, p] of pendientes) {
      if (p.hilo !== hilo) continue;
      pendientes.delete(id);
      directo(p.tipo, p.args).then(p.resolve, p.reject);
    }
  };
  hilo.on('error', alCaer);
  hilo.on('exit', (codigo) => { if (codigo !== 0 && hilos && hilos.includes(hilo)) alCaer(); });
  hilo.unref(); // un hilo ocioso no impide que el proceso termine
  return hilo;
};

const directo = (tipo, args) => (tipo === 'compare' ? bcrypt.compare(args[0], args[1]) : bcrypt.hash(args[0], args[1]));

const enviar = (tipo, args) => {
  const n = hilosConfigurados();
  if (n === 0) return directo(tipo, args);
  if (!hilos) hilos = Array.from({ length: n }, crearHilo);
  const hilo = hilos.reduce((mejor, h) => (h.cargas < mejor.cargas ? h : mejor));
  return new Promise((resolve, reject) => {
    const id = ++contador;
    pendientes.set(id, { resolve, reject, hilo, tipo, args });
    hilo.cargas++;
    hilo.ref(); // con trabajo pendiente, el proceso no se cierra
    hilo.postMessage({ id, tipo, args });
  });
};

const compare = (texto, hash) => enviar('compare', [texto, hash]);

const hash = (texto, vueltas = 10) => enviar('hash', [texto, vueltas]);

/** Detiene los hilos. */
const cerrar = async () => {
  const activos = hilos;
  hilos = null;
  if (activos) await Promise.all(activos.map((h) => h.terminate()));
};

module.exports = { compare, hash, cerrar, hilosConfigurados };
