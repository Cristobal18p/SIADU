const MINIMO_SEGUNDOS = 2 * 60 * 60;
const POR_DEFECTO_SEGUNDOS = 8 * 60 * 60;

const UNIDADES = { s: 1, m: 60, h: 3600, d: 86400 };

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definida en las variables de entorno.');
  }
  return secret;
};

/** Duración del token en segundos según EXPIRESIN; 8 horas si falta o no es válido, nunca menos de 2. */
const getTokenDuration = (valor = process.env.EXPIRESIN) => {
  const texto = String(valor ?? '').trim().toLowerCase();
  const m = /^(\d+)\s*([smhd])?$/.exec(texto);
  if (!m) return POR_DEFECTO_SEGUNDOS;

  const segundos = Number(m[1]) * UNIDADES[m[2] || 's'];
  return Math.max(segundos, MINIMO_SEGUNDOS);
};

module.exports = { getJwtSecret, getTokenDuration, MINIMO_SEGUNDOS, POR_DEFECTO_SEGUNDOS };
