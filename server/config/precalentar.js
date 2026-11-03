/** Abre al arrancar DB_WARM_CONNECTIONS conexiones (5 por defecto, 0 lo desactiva); un fallo solo se registra. */
const prisma = require('./prisma');
const { tamanoDePool } = require('./pool');

const POR_DEFECTO = 5;
const TIEMPO_MAXIMO_MS = 5000;

const cuantas = () => {
  const bruto = process.env.DB_WARM_CONNECTIONS;
  if (bruto === undefined || bruto === '') return POR_DEFECTO;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < 0) return POR_DEFECTO;
  return Math.min(n, tamanoDePool());
};

const precalentar = async (cliente = prisma) => {
  const n = cuantas();
  if (n === 0) return { conexiones: 0, ms: 0 };
  const inicio = Date.now();
  const abrir = Promise.allSettled(Array.from({ length: n }, () => cliente.$queryRaw`SELECT 1`));
  let reloj;
  const tope = new Promise((resolve) => { reloj = setTimeout(() => resolve(null), TIEMPO_MAXIMO_MS); });
  const resultados = await Promise.race([abrir, tope]);
  clearTimeout(reloj);
  if (resultados === null) {
    console.warn(`[precalentar] La base no respondió en ${TIEMPO_MAXIMO_MS / 1000} s; el servidor arranca igual.`);
    return { conexiones: 0, ms: Date.now() - inicio };
  }
  const abiertas = resultados.filter((r) => r.status === 'fulfilled').length;
  if (abiertas < n) {
    const motivo = resultados.find((r) => r.status === 'rejected')?.reason?.message?.split('\n').filter(Boolean).pop();
    console.warn(`[precalentar] Solo se abrieron ${abiertas} de ${n} conexiones a la base: ${motivo ?? 'sin detalle'}`);
  }
  return { conexiones: abiertas, ms: Date.now() - inicio };
};

module.exports = precalentar;
module.exports.cuantas = cuantas;
