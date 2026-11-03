const VALOR_OTRO = 'OTRO';
const claveOtro = (id) => `${id}Otro`;

const estaVacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

/** Convierte «AAAA-MM-DD» en fecha sin desfase horario. */
const fechaLocal = (texto) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Fecha de hoy como «AAAA-MM-DD» en hora de Panamá (UTC-5). */
const hoyPanamaISO = () => {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const dos = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
};

/** Valida un valor contra la definición de su variable. */
function validarCampo(variable, valor) {
  if (variable.tipo === 'checkbox') {
    return valor === true ? null : 'Debes aceptar esta declaración para continuar.';
  }

  if (estaVacio(valor)) {
    return variable.requerido ? 'Este campo es obligatorio.' : null;
  }

  const { min, max, patron, decimales, reglaTemporal, soloDiasHabiles } = variable.validaciones || {};

  switch (variable.tipo) {
    case 'select': {
      const opciones = [
        ...(variable.opciones || []),
        ...(variable.opcionOtro ? [{ valor: VALOR_OTRO }] : []),
      ];
      const existe = opciones.some((o) => o.valor === valor);
      return existe ? null : 'Selecciona una opción válida de la lista.';
    }

    case 'number': {
      const n = Number(valor);
      if (Number.isNaN(n)) return 'Ingresa un número válido.';
      if (decimales !== true && !Number.isInteger(n)) return 'Ingresa un número entero, sin decimales.';
      if (min !== undefined && n < min) return `El valor mínimo es ${min}.`;
      if (max !== undefined && n > max) return `El valor máximo es ${max}.`;
      return null;
    }

    case 'date': {
      const fecha = fechaLocal(valor);
      if (!fecha) return 'Ingresa una fecha válida en formato AAAA-MM-DD.';
      const hoy = fechaLocal(hoyPanamaISO());
      if (reglaTemporal === 'pasadas' && fecha > hoy) return 'Solo se permiten fechas pasadas o la de hoy.';
      if (reglaTemporal === 'futuras' && fecha < hoy) return 'Solo se permiten fechas desde hoy en adelante.';
      if (soloDiasHabiles && [0, 6].includes(fecha.getDay())) return 'Elige un día hábil (de lunes a viernes).';
      return null;
    }

    default: {
      const largo = String(valor).trim().length;
      if (min !== undefined && largo < min) return `Debe tener al menos ${min} caracteres.`;
      if (max !== undefined && largo > max) return `No puede superar ${max} caracteres.`;
      if (patron) {
        try {
          const reg = new RegExp(patron);
          if (!reg.test(String(valor))) return 'El formato no es válido.';
        } catch {
          // Se ignoran patrones inválidos
        }
      }
      return null;
    }
  }
}

/** Valida `datosJson` contra las variables de la plantilla. */
function validarRespuestas(variables = [], datosJson = {}) {
  const detalles = [];

  // Claves reservadas: las que empiezan con «_»
  for (const key of Object.keys(datosJson)) {
    if (key.startsWith('_')) {
      detalles.push({
        campo: key,
        mensaje: 'Las claves de datosJson no pueden comenzar con guion bajo (_).',
      });
    }
  }

  for (const variable of variables) {
    const error = validarCampo(variable, datosJson[variable.id]);
    if (error) {
      detalles.push({ campo: variable.id, mensaje: error });
    } else if (
      variable.tipo === 'select' &&
      datosJson[variable.id] === VALOR_OTRO &&
      estaVacio(datosJson[claveOtro(variable.id)])
    ) {
      detalles.push({
        campo: claveOtro(variable.id),
        mensaje: 'Escribe cuál es la otra opción.',
      });
    }
  }

  return detalles;
}

/** Solo las respuestas de variables de la plantilla y sus «…Otro»; el resto se descarta. */
function respuestasDeLaPlantilla(variables = [], datosJson = {}) {
  const claves = new Set();
  for (const v of variables) {
    claves.add(v.id);
    if (v.tipo === 'select' && v.opcionOtro) claves.add(claveOtro(v.id));
  }
  return Object.fromEntries(Object.entries(datosJson).filter(([clave]) => claves.has(clave)));
}

module.exports = {
  validarRespuestas,
  respuestasDeLaPlantilla,
  validarCampo,
  VALOR_OTRO,
  claveOtro,
};
