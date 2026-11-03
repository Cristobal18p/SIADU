// Contraseñas iniciales y de ejemplo que no se aceptan como contraseña nueva
const EJEMPLOS = new Set(['demo2026*', 'prueba2026*', 'admin123*', 'password1*']);

/** Contraseña nueva: 8 a 64 caracteres, máximo 72 bytes (bcrypt), mayúscula, minúscula, número y símbolo. */
const validarPasswordNueva = (password) => {
  const problemas = [];
  const texto = typeof password === 'string' ? password : '';

  if (EJEMPLOS.has(texto.toLowerCase())) problemas.push('No use la contraseña inicial ni una de ejemplo.');

  if (texto.length < 8 || texto.length > 64) {
    problemas.push('Debe tener entre 8 y 64 caracteres.');
  } else if (Buffer.byteLength(texto, 'utf8') > 72) {
    problemas.push('Contiene demasiados caracteres especiales; use una más corta.');
  }
  if (!/\p{Lu}/u.test(texto)) problemas.push('Debe incluir al menos una letra mayúscula.');
  if (!/\p{Ll}/u.test(texto)) problemas.push('Debe incluir al menos una letra minúscula.');
  if (!/\p{N}/u.test(texto)) problemas.push('Debe incluir al menos un número.');
  if (!/[^\p{L}\p{N}]/u.test(texto)) problemas.push('Debe incluir al menos un símbolo.');

  return problemas;
};

module.exports = { validarPasswordNueva };
