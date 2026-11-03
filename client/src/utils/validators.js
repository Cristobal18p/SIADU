/** Validación del correo institucional (@up.ac.pa). */

export const isValidInstitutionalEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@up\.ac\.pa$/i;
  return regex.test(email.trim());
};

/** Validación de la cédula panameña. */
export const isValidPanamaCedula = (cedula) => {
  if (!cedula || typeof cedula !== 'string') return false;
  const regex = /^(?:[1-9]|1[0-3]|PE|E|N|AV)-\d{1,4}-\d{1,6}$/i;
  return regex.test(cedula.trim());
};

/** Valida un identificador de acceso: correo institucional o cédula. */
export const validateIdentifierFormat = (identifier) => {
  const clean = (identifier || '').trim();
  if (!clean) {
    return { isValid: false, tipo: null, error: 'El identificador es requerido.' };
  }

  if (clean.includes('@')) {
    if (!isValidInstitutionalEmail(clean)) {
      return {
        isValid: false,
        tipo: 'email_invalido',
        error: 'El correo electrónico no es válido.',
      };
    }
    return { isValid: true, tipo: 'email', cleanValue: clean.toLowerCase() };
  }

  if (!isValidPanamaCedula(clean)) {
    return {
      isValid: false,
      tipo: 'cedula_invalida',
      error: 'La cédula no es válida.',
    };
  }

  return { isValid: true, tipo: 'cedula', cleanValue: clean.toUpperCase() };
};
