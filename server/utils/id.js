/** Id positivo de hasta 15 dígitos (entero seguro); si no lo es, null. */
const idDe = (valor) => {
  const texto = String(valor ?? '').trim();
  if (!/^\d{1,15}$/.test(texto)) return null;
  const n = Number(texto);
  return n > 0 ? n : null;
};

module.exports = { idDe };
