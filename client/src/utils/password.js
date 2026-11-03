/** Política de la contraseña nueva; el servidor aplica la misma. */

export const LARGO_MIN_PASSWORD = 8;
export const LARGO_MAX_PASSWORD = 64;

/** Reglas en el orden en que se muestran. */
export const REGLAS_PASSWORD = [
  {
    id: 'largo',
    texto: `Entre ${LARGO_MIN_PASSWORD} y ${LARGO_MAX_PASSWORD} caracteres`,
    cumple: (p) => p.length >= LARGO_MIN_PASSWORD && p.length <= LARGO_MAX_PASSWORD,
  },
  { id: 'mayuscula', texto: 'Una letra mayúscula', cumple: (p) => /\p{Lu}/u.test(p) },
  { id: 'minuscula', texto: 'Una letra minúscula', cumple: (p) => /\p{Ll}/u.test(p) },
  { id: 'numero', texto: 'Un número', cumple: (p) => /\d/.test(p) },
  { id: 'simbolo', texto: 'Un símbolo (por ejemplo # * ! @ -)', cumple: (p) => /[^\p{L}\d\s]/u.test(p) },
];

/**
 * Errores del formulario de cambio de contraseña, por campo.
 * @param {{ actual: string, nueva: string, confirmacion: string }} valores
 * @returns {Object<string, string>}
 */
export const erroresCambioPassword = ({ actual, nueva, confirmacion }) => {
  const errores = {};
  if (!actual) errores.actual = 'Escribe tu contraseña actual.';
  if (!nueva) errores.nueva = 'Escribe la contraseña nueva.';
  else if (REGLAS_PASSWORD.some((r) => !r.cumple(nueva))) errores.nueva = 'La contraseña nueva no cumple todos los requisitos.';
  else if (nueva === actual) errores.nueva = 'La contraseña nueva debe ser distinta de la actual.';
  if (!confirmacion) errores.confirmacion = 'Repite la contraseña nueva.';
  else if (nueva && confirmacion !== nueva) errores.confirmacion = 'No coincide con la contraseña nueva.';
  return errores;
};
