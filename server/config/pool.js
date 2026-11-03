/** Pool de pg: DB_POOL_SIZE entre 1 y 15 (8 por defecto), dentro del límite de 15 del pooler de Supabase. */
const POR_DEFECTO = 8;
const MAXIMO = 15;
const ESPERA_CONEXION_MS = 10000;
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const tamanoDePool = (bruto = process.env.DB_POOL_SIZE) => {
  if (bruto === undefined || bruto === '') return POR_DEFECTO;
  const n = Number(bruto);
  if (!Number.isInteger(n) || n < 1) return POR_DEFECTO;
  return Math.min(n, MAXIMO);
};

/**
 * Opciones del pool para una URL de PostgreSQL. Cifra la conexión salvo en una base local o con
 * `sslmode=disable`; no verifica el certificado, igual que el motor anterior de Prisma.
 */
const opcionesDePool = (url, tamano = tamanoDePool()) => {
  if (!url || typeof url !== 'string') return null;
  const u = new URL(url);
  const modo = u.searchParams.get('sslmode');
  // pg aplicaría su propia interpretación de sslmode por encima de `ssl`
  u.searchParams.delete('sslmode');
  const sinCifrado = modo === 'disable' || HOSTS_LOCALES.has(u.hostname);
  return {
    connectionString: u.toString(),
    max: tamano,
    connectionTimeoutMillis: ESPERA_CONEXION_MS,
    ssl: sinCifrado ? false : { rejectUnauthorized: false },
  };
};

module.exports = { tamanoDePool, opcionesDePool, POR_DEFECTO, MAXIMO, ESPERA_CONEXION_MS };
