/** Caché en memoria, por proceso, del estado de la cuenta. ACCOUNT_CACHE_SECONDS: 10 por defecto, 0 la desactiva. */
const SEGUNDOS_POR_DEFECTO = 10;
const SEGUNDOS_MAXIMOS = 60;
const MAX_ENTRADAS = 5000;

const entradas = new Map();

const duracionMs = () => {
  const bruto = process.env.ACCOUNT_CACHE_SECONDS;
  if (bruto === undefined || bruto === '') return SEGUNDOS_POR_DEFECTO * 1000;
  const n = Number(bruto);
  if (!Number.isFinite(n) || n < 0) return SEGUNDOS_POR_DEFECTO * 1000;
  return Math.min(n, SEGUNDOS_MAXIMOS) * 1000;
};

/** Devuelve `{ estado, claveInicial, versionSesion }` si hay una entrada vigente; si no, `null`. */
const obtener = (idUsuario, ahora = Date.now()) => {
  const clave = String(idUsuario);
  const e = entradas.get(clave);
  if (!e) return null;
  if (e.vence <= ahora) {
    entradas.delete(clave);
    return null;
  }
  return e.cuenta;
};

/** Guarda el estado de la cuenta. Con la caché desactivada no hace nada. */
const guardar = (idUsuario, cuenta, ahora = Date.now()) => {
  const ms = duracionMs();
  if (ms === 0 || !cuenta) return;
  if (entradas.size >= MAX_ENTRADAS) {
    // Se descartan primero las vencidas y, si sigue llena, la más antigua
    for (const [k, e] of entradas) if (e.vence <= ahora) entradas.delete(k);
    if (entradas.size >= MAX_ENTRADAS) entradas.delete(entradas.keys().next().value);
  }
  entradas.set(String(idUsuario), {
    cuenta: { estado: cuenta.estado, claveInicial: cuenta.claveInicial, versionSesion: cuenta.versionSesion ?? 0 },
    vence: ahora + ms,
  });
};

const invalidar = (idUsuario) => {
  entradas.delete(String(idUsuario));
};

/** Solo para las pruebas. */
const limpiar = () => entradas.clear();

const tamano = () => entradas.size;

module.exports = { obtener, guardar, invalidar, limpiar, tamano, SEGUNDOS_POR_DEFECTO, SEGUNDOS_MAXIMOS };
