/**
 * Reglas del contrato para guardar y publicar una plantilla (VariableFormJson, cuerpo y membrete).
 * Las usan el servidor y el mock; cada falla es `{ campo, mensaje }`.
 */
import { VARIABLES_SISTEMA } from './ejemplo.js';
import { claveOtro } from './formato.js';

export const PATRON_ID_VARIABLE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
export const TIPOS_CAMPO = ['text', 'textarea', 'number', 'date', 'select', 'checkbox'];
// Formatos de `text` que ofrece el constructor; otros patrones podrían trabar el servidor (ReDoS)
export const PATRONES_TEXTO = ['^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$', '^[A-Za-z0-9 ]+$', '^[^a-z]+$'];
const IDS_SISTEMA = new Set(VARIABLES_SISTEMA.map((v) => v.id));
const LINEAS_MEMBRETE = ['linea1', 'linea2', 'linea3', 'linea4'];
const MARCADOR = /\{\{\s*([\w.]+)\s*\}\}/g;

const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);
const texto = (v) => String(v ?? '').trim();

/** Ids de las variables del cuerpo, bloques de firmas y si hay algo que imprimir. */
export function analizarCuerpo(doc) {
  const ids = new Set();
  let firmas = 0;
  let contenido = false;
  const recorrer = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return;
    if (nodo.type === 'variable' && nodo.attrs?.id) {
      ids.add(nodo.attrs.id);
      contenido = true;
    }
    if (nodo.type === 'text' && texto(nodo.text)) contenido = true;
    if (nodo.type === 'signatureBlock') firmas += 1;
    (nodo.content || []).forEach(recorrer);
  };
  recorrer(doc);
  return { ids, firmas, contenido };
}

/** Reglas al guardar: definición de las variables, su relación con el cuerpo y marcadores del membrete. */
export function validarDefinicion(variableFormJson, disenoFormJson) {
  const variables = variableFormJson?.variables;
  if (!Array.isArray(variables)) return [{ campo: 'variableFormJson.variables', mensaje: 'Debe ser una lista.' }];
  const cuerpo = disenoFormJson?.cuerpoDocumento;
  if (!cuerpo || typeof cuerpo !== 'object') return [{ campo: 'disenoFormJson.cuerpoDocumento', mensaje: 'Es obligatorio.' }];

  const detalles = [];
  const ids = new Set(variables.map((v) => v?.id));
  const vistos = new Set();
  variables.forEach((v, i) => {
    const campo = `variableFormJson.variables[${i}]`;
    if (!PATRON_ID_VARIABLE.test(v?.id || '')) {
      detalles.push({ campo: `${campo}.id`, mensaje: 'Empieza con una letra y usa solo letras, números o «_».' });
      return;
    }
    if (vistos.has(v.id) || IDS_SISTEMA.has(v.id)) detalles.push({ campo: `${campo}.id`, mensaje: `El id «${v.id}» está repetido.` });
    vistos.add(v.id);
    if (!TIPOS_CAMPO.includes(v.tipo)) detalles.push({ campo: `${campo}.tipo`, mensaje: `Tipo «${v.tipo}» no válido.` });
    if (!texto(v.etiqueta)) detalles.push({ campo: `${campo}.etiqueta`, mensaje: 'La etiqueta es obligatoria.' });
    if (v.tipo === 'select') {
      if (!Array.isArray(v.opciones) || v.opciones.length === 0) {
        detalles.push({ campo: `${campo}.opciones`, mensaje: 'Un select necesita al menos una opción.' });
      }
      if (v.opcionOtro && ids.has(claveOtro(v.id))) {
        detalles.push({ campo: `${campo}.id`, mensaje: `«Otro» usa la clave «${claveOtro(v.id)}», que ya es otra variable.` });
      }
    }
    if (v.tipo === 'checkbox' && !texto(v.textoLegal)) {
      detalles.push({ campo: `${campo}.textoLegal`, mensaje: 'La declaración necesita su texto legal.' });
    }
    const { min, max, patron } = v.validaciones || {};
    if (patron !== undefined && patron !== '' && !PATRONES_TEXTO.includes(patron)) {
      detalles.push({ campo: `${campo}.validaciones.patron`, mensaje: 'Use uno de los formatos predefinidos.' });
    }
    if (esNumero(min) && esNumero(max) && min > max) {
      detalles.push({ campo: `${campo}.validaciones`, mensaje: 'El mínimo no puede ser mayor que el máximo.' });
    }
  });

  const { ids: usados, firmas } = analizarCuerpo(cuerpo);
  usados.forEach((id) => {
    if (!IDS_SISTEMA.has(id) && !vistos.has(id)) {
      detalles.push({ campo: 'disenoFormJson.cuerpoDocumento', mensaje: `La variable «${id}» no está definida en el formulario.` });
    }
  });
  vistos.forEach((id) => {
    if (!usados.has(id)) detalles.push({ campo: 'variableFormJson', mensaje: `La variable «${id}» no se usa en el documento.` });
  });
  if (firmas > 1) detalles.push({ campo: 'disenoFormJson.cuerpoDocumento', mensaje: 'Hay más de un bloque de firmas.' });

  LINEAS_MEMBRETE.forEach((linea) => {
    [...texto(disenoFormJson.encabezado?.[linea]).matchAll(MARCADOR)].forEach(([, id]) => {
      if (!IDS_SISTEMA.has(id)) {
        detalles.push({ campo: `disenoFormJson.encabezado.${linea}`, mensaje: `«{{${id}}}» no es una variable automática.` });
      }
    });
  });
  return detalles;
}

/** Reglas al publicar: las de guardar, cuerpo con contenido y bloque de firmas si algún paso firma. */
export function validarPublicacion(variableFormJson, disenoFormJson, { conFirma = false } = {}) {
  const detalles = validarDefinicion(variableFormJson, disenoFormJson);
  const { firmas, contenido } = analizarCuerpo(disenoFormJson?.cuerpoDocumento);
  if (!contenido) detalles.push({ campo: 'disenoFormJson.cuerpoDocumento', mensaje: 'El documento está vacío.' });
  if (conFirma && firmas === 0) {
    detalles.push({ campo: 'disenoFormJson.cuerpoDocumento', mensaje: 'El flujo pide firmas y el documento no tiene bloque de firmas.' });
  }
  return detalles;
}
