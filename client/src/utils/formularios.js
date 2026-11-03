/**
 * Validación y formato de los formularios dinámicos.
 * `number` se captura como cadena y se envía como número; `checkbox` es booleano; el resto son cadenas.
 * El texto libre de «Otro» se guarda en la clave `{id}Otro`.
 */
import { formatDate } from './formatters';

/** Valor que toma un select cuando se elige «Otro». */
export const VALOR_OTRO = 'OTRO';

/** Clave del texto libre de «Otro». */
export const claveOtro = (id) => `${id}Otro`;

/** Texto del campo: la pregunta de la variable o, si no tiene, su etiqueta. */
export const etiquetaCampo = (variable) => String(variable.pregunta ?? '').trim() || variable.etiqueta;

const estaVacio = (valor) => valor === undefined || valor === null || String(valor).trim() === '';

/** Opciones de un select, con «Otro» si está habilitado. */
export const opcionesDe = (variable) => [
  ...(variable.opciones || []),
  ...(variable.opcionOtro ? [{ valor: VALOR_OTRO, etiqueta: 'Otro' }] : []),
];

/** Fecha de hoy como «AAAA-MM-DD», en hora local. */
export const hoyISO = () => {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

/** Convierte «AAAA-MM-DD» en una fecha local, sin desfase por zona horaria. */
const fechaLocal = (texto) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/**
 * Valida un valor contra la definición de su variable.
 * @param {Object} variable - VariableFormulario
 * @param {*} valor
 * @returns {string|null} Mensaje de error o null
 */
export const validarCampo = (variable, valor) => {
  // La confirmación legal debe estar marcada
  if (variable.tipo === 'checkbox') {
    return valor === true ? null : 'Debes aceptar esta declaración para continuar.';
  }

  if (estaVacio(valor)) {
    return variable.requerido ? 'Este campo es obligatorio.' : null;
  }

  const { min, max, patron, decimales, reglaTemporal, soloDiasHabiles } = variable.validaciones || {};

  switch (variable.tipo) {
    case 'select':
      return opcionesDe(variable).some((o) => o.valor === valor) ? null : 'Selecciona una opción de la lista.';

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
      if (!fecha) return 'Ingresa una fecha válida.';
      const hoy = fechaLocal(hoyISO());
      if (reglaTemporal === 'pasadas' && fecha > hoy) return 'Solo se permiten fechas pasadas o la de hoy.';
      if (reglaTemporal === 'futuras' && fecha < hoy) return 'Solo se permiten fechas desde hoy en adelante.';
      if (soloDiasHabiles && [0, 6].includes(fecha.getDay())) return 'Elige un día hábil (de lunes a viernes).';
      return null;
    }

    default: {
      const largo = String(valor).trim().length;
      if (min !== undefined && largo < min) return `Debe tener al menos ${min} caracteres.`;
      if (max !== undefined && largo > max) return `No puede superar ${max} caracteres.`;
      if (patron && !new RegExp(patron).test(String(valor))) return 'El formato no es válido.';
      return null;
    }
  }
};

/**
 * Valida el formulario; con «Otro» exige también su texto.
 * @param {Array} variables
 * @param {Object} valores - Valores por id de variable
 * @returns {Object} Errores por id de variable
 */
export const validarFormulario = (variables, valores) =>
  variables.reduce((errores, v) => {
    const error = validarCampo(v, valores[v.id]);
    if (error) errores[v.id] = error;
    else if (v.tipo === 'select' && valores[v.id] === VALOR_OTRO && estaVacio(valores[claveOtro(v.id)])) {
      errores[claveOtro(v.id)] = 'Escribe cuál es la otra opción.';
    }
    return errores;
  }, {});

/**
 * Arma el `datosJson` de la solicitud: normaliza los valores y omite los opcionales vacíos.
 * @param {Array} variables
 * @param {Object} valores
 * @returns {Object}
 */
export const construirDatosJson = (variables, valores) =>
  variables.reduce((datos, v) => {
    const valor = valores[v.id];
    if (v.tipo === 'checkbox') {
      if (valor === true) datos[v.id] = true;
      return datos;
    }
    if (estaVacio(valor)) return datos;
    datos[v.id] = v.tipo === 'number' ? Number(valor) : String(valor).trim();
    if (v.tipo === 'select' && valor === VALOR_OTRO) datos[claveOtro(v.id)] = String(valores[claveOtro(v.id)] ?? '').trim();
    return datos;
  }, {});

/**
 * Texto legible de una respuesta según el tipo de su variable.
 * @param {Object} variable
 * @param {*} valor
 * @param {Object} [datos] - Respuestas completas, para el texto de «Otro»
 * @returns {string}
 */
export const formatearRespuesta = (variable, valor, datos = {}) => {
  if (variable?.tipo === 'checkbox') return valor === true ? 'Aceptado' : '—';
  if (estaVacio(valor)) return '—';
  if (variable?.tipo === 'select') {
    if (valor === VALOR_OTRO) {
      const texto = String(datos[claveOtro(variable.id)] ?? '').trim();
      return texto ? `Otro: ${texto}` : 'Otro';
    }
    return variable.opciones?.find((o) => o.valor === valor)?.etiqueta ?? String(valor);
  }
  if (variable?.tipo === 'date') {
    const fecha = fechaLocal(valor);
    return fecha ? formatDate(fecha) : formatDate(valor);
  }
  return String(valor);
};
