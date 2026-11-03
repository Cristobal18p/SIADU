/**
 * Variables del formulario en el constructor: tipos, identificadores, normalización y validación.
 *
 * - `id` con el patrón `^[a-zA-Z][a-zA-Z0-9_]*$`, único y distinto de las claves `{id}Otro`.
 * - `etiqueta` es el nombre corto; `pregunta`, el texto del formulario. Ambas son obligatorias.
 * - `select` necesita al menos una opción; `checkbox` es requerido y lleva `textoLegal`; `min` ≤ `max`.
 */
import { PATRONES_TEXTO, VARIABLES_SISTEMA } from '@siadu/documento';
import { VALOR_OTRO, claveOtro } from './formularios';

export const PATRON_ID = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const LARGO_MAX_ID = 40;

/** Tipos de campo del constructor. */
export const TIPOS_VARIABLE = [
  { valor: 'text', etiqueta: 'Texto corto' },
  { valor: 'textarea', etiqueta: 'Texto largo' },
  { valor: 'number', etiqueta: 'Número' },
  { valor: 'date', etiqueta: 'Fecha' },
  { valor: 'select', etiqueta: 'Selector de opciones' },
  { valor: 'checkbox', etiqueta: 'Confirmación legal' },
];

export const nombreTipo = (tipo) => TIPOS_VARIABLE.find((t) => t.valor === tipo)?.etiqueta ?? tipo;

/** Formatos predefinidos de `text`; se guardan en `validaciones.patron`. */
const [SOLO_LETRAS, ALFANUMERICO, MAYUSCULAS] = PATRONES_TEXTO;
export const FORMATOS_TEXTO = [
  { valor: '', etiqueta: 'Libre' },
  { valor: SOLO_LETRAS, etiqueta: 'Solo letras' },
  { valor: ALFANUMERICO, etiqueta: 'Alfanumérico' },
  { valor: MAYUSCULAS, etiqueta: 'Mayúsculas obligatorias' },
];

export const REGLAS_TEMPORALES = [
  { valor: 'libre', etiqueta: 'Cualquier fecha' },
  { valor: 'pasadas', etiqueta: 'Solo fechas pasadas (o hoy)' },
  { valor: 'futuras', etiqueta: 'Solo fechas futuras (o hoy)' },
];

/** Datos automáticos agrupados según a quién aplican. */
export const GRUPOS_AUTOMATICOS = [
  {
    titulo: 'Del solicitante',
    descripcion: 'De cualquier persona que solicite.',
    ids: ['auth.nombre_completo', 'auth.cedula', 'auth.correo', 'estudiante.facultad'],
  },
  { titulo: 'Si es estudiante', descripcion: 'Queda vacío si solicita un profesor o administrativo.', ids: ['estudiante.carrera', 'estudiante.escuela'] },
  {
    titulo: 'Si es profesor o administrativo',
    descripcion: 'Quedan vacíos si solicita un estudiante o alguien sin cargo.',
    ids: ['personal.cargo', 'personal.departamento'],
  },
  { titulo: 'Del documento', descripcion: 'Se fijan al enviar la solicitud.', ids: ['sistema.fecha_formal', 'solicitud.codigo'] },
].map(({ ids, ...g }) => ({ ...g, variables: VARIABLES_SISTEMA.filter((v) => ids.includes(v.id)) }));

const IDS_SISTEMA = new Set(VARIABLES_SISTEMA.map((v) => v.id));
export const esVariableSistema = (id) => IDS_SISTEMA.has(id);

/** Palabras de un texto, sin tildes ni signos. */
const palabras = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

/** Claves ocupadas: los ids y las claves `{id}Otro` de los select con «Otro». */
export const clavesOcupadas = (variables, excepto) => {
  const ocupadas = new Set();
  variables.forEach((v) => {
    if (v === excepto) return;
    ocupadas.add(v.id);
    if (v.tipo === 'select' && v.opcionOtro) ocupadas.add(claveOtro(v.id));
  });
  return ocupadas;
};

/**
 * Identificador camelCase único a partir de la etiqueta.
 * @param {string} etiqueta
 * @param {Set<string>} ocupadas
 */
export const generarId = (etiqueta, ocupadas = new Set()) => {
  const partes = palabras(etiqueta);
  let base = partes
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join('')
    .slice(0, LARGO_MAX_ID);
  if (!base) base = 'variable';
  if (!/^[a-zA-Z]/.test(base)) base = `campo${base}`.slice(0, LARGO_MAX_ID);
  let id = base;
  for (let n = 2; ocupadas.has(id) || esVariableSistema(id); n += 1) id = `${base}${n}`;
  return id;
};

/** Valor técnico de una opción a partir de su etiqueta, en mayúsculas y con guiones bajos. */
export const generarValorOpcion = (etiqueta, ocupados = new Set()) => {
  let base = palabras(etiqueta).join('_').toUpperCase().slice(0, 40) || 'OPCION';
  // «OTRO» está reservado para la opción «Otro»
  let valor = base;
  for (let n = 2; ocupados.has(valor) || valor === VALOR_OTRO; n += 1) valor = `${base}_${n}`;
  return valor;
};

/** Etiqueta legible a partir de un texto del documento: recorta, colapsa espacios y pone mayúscula inicial. */
export const etiquetaDesdeTexto = (texto) => {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
};

/** Variable nueva de tipo texto corto (requerida), con id único. */
export const variableNueva = (etiqueta, variables) => {
  const texto = etiquetaDesdeTexto(etiqueta) || 'Nueva variable';
  return { id: generarId(texto, clavesOcupadas(variables)), etiqueta: texto, pregunta: '', tipo: 'text', requerido: true };
};

/** Cambia el tipo y descarta lo que el tipo nuevo no admite. */
export const cambiarTipo = (variable, tipo) => {
  const { opciones, presentacion, opcionOtro, textoLegal, validaciones, placeholder, ...comun } = variable;
  const nueva = { ...comun, tipo };
  if (tipo === 'checkbox') nueva.requerido = true;
  if (['text', 'textarea', 'number'].includes(tipo) && placeholder) nueva.placeholder = placeholder;
  if (tipo === 'select') {
    nueva.opciones = opciones?.length ? opciones : [{ valor: 'OPCION', etiqueta: '' }];
    nueva.presentacion = presentacion ?? 'lista';
    nueva.opcionOtro = Boolean(opcionOtro);
  }
  if (tipo === 'checkbox') nueva.textoLegal = textoLegal ?? '';
  return nueva;
};

const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);

/** Restricciones que aplican a cada tipo. */
const VALIDACIONES_POR_TIPO = {
  text: ['min', 'max', 'patron'],
  textarea: ['min', 'max'],
  number: ['min', 'max', 'decimales'],
  date: ['reglaTemporal', 'soloDiasHabiles'],
};

/** Variable lista para guardar: solo los campos de su tipo, sin valores vacíos ni por defecto. */
export const normalizarVariable = (v) => {
  const salida = {
    id: v.id,
    etiqueta: String(v.etiqueta ?? '').trim(),
    ...(String(v.pregunta ?? '').trim() ? { pregunta: String(v.pregunta).trim() } : {}),
    tipo: v.tipo,
    requerido: v.tipo === 'checkbox' ? true : Boolean(v.requerido),
  };
  const placeholder = String(v.placeholder ?? '').trim();
  if (placeholder && ['text', 'textarea', 'number'].includes(v.tipo)) salida.placeholder = placeholder;

  if (v.tipo === 'select') {
    salida.opciones = (v.opciones || []).map((o) => ({ valor: o.valor, etiqueta: String(o.etiqueta ?? '').trim() }));
    if (v.presentacion === 'radio') salida.presentacion = 'radio';
    if (v.opcionOtro) salida.opcionOtro = true;
  }
  if (v.tipo === 'checkbox') salida.textoLegal = String(v.textoLegal ?? '').trim();

  const permitidas = VALIDACIONES_POR_TIPO[v.tipo] || [];
  const origen = v.validaciones || {};
  const validaciones = {};
  permitidas.forEach((clave) => {
    const valor = origen[clave];
    if (clave === 'min' || clave === 'max') {
      if (esNumero(valor)) validaciones[clave] = valor;
    } else if (clave === 'patron') {
      if (valor) validaciones.patron = valor;
    } else if (clave === 'reglaTemporal') {
      if (valor === 'pasadas' || valor === 'futuras') validaciones.reglaTemporal = valor;
    } else if (valor === true) {
      validaciones[clave] = true; // decimales, soloDiasHabiles
    }
  });
  if (Object.keys(validaciones).length > 0) salida.validaciones = validaciones;
  return salida;
};

/**
 * Errores de la definición de una variable, por campo del panel de configuración.
 * @param {Object} v
 * @param {Array} variables - Todas las variables del borrador (para ids repetidos y choques con `{id}Otro`)
 * @returns {Object<string, string>} Vacío si la variable es válida
 */
export const erroresVariable = (v, variables) => {
  const e = {};
  if (!String(v.etiqueta ?? '').trim()) e.etiqueta = 'Escribe el nombre de la variable.';
  if (!String(v.pregunta ?? '').trim()) e.pregunta = 'Escribe qué se le pide al solicitante en este campo.';

  const otras = clavesOcupadas(variables, v);
  if (!PATRON_ID.test(v.id || '')) {
    e.id = 'Empieza con una letra y usa solo letras sin tilde, números o «_».';
  } else if (esVariableSistema(v.id) || otras.has(v.id)) {
    e.id = 'Ya hay otra variable con este identificador.';
  } else if (v.tipo === 'select' && v.opcionOtro && variables.some((o) => o !== v && o.id === claveOtro(v.id))) {
    e.id = `La opción «Otro» usa la clave «${claveOtro(v.id)}», que ya es otra variable.`;
  }

  const { min, max } = v.validaciones || {};
  if (['text', 'textarea', 'number'].includes(v.tipo)) {
    if (v.tipo !== 'number') {
      if (esNumero(min) && (min < 0 || !Number.isInteger(min))) e.min = 'Usa un número entero mayor o igual que 0.';
      if (esNumero(max) && (max < 1 || !Number.isInteger(max))) e.max = 'Usa un número entero mayor que 0.';
    }
    if (!e.min && !e.max && esNumero(min) && esNumero(max) && min > max) e.max = 'El máximo no puede ser menor que el mínimo.';
  }

  if (v.tipo === 'select') {
    const opciones = v.opciones || [];
    if (opciones.length === 0) e.opciones = 'Agrega al menos una opción.';
    else if (opciones.some((o) => !String(o.etiqueta ?? '').trim())) e.opciones = 'Hay opciones sin texto.';
    else if (new Set(opciones.map((o) => String(o.etiqueta).trim().toLowerCase())).size !== opciones.length) {
      e.opciones = 'Hay opciones repetidas.';
    }
  }
  if (v.tipo === 'checkbox' && !String(v.textoLegal ?? '').trim()) {
    e.textoLegal = 'Escribe el texto de la declaración que se acepta.';
  }
  return e;
};

/** Ids de los nodos `variable` del documento, en orden de aparición, con cuántas veces aparece cada uno. */
export const usosEnDocumento = (doc) => {
  const usos = new Map();
  const recorrer = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return;
    if (nodo.type === 'variable' && nodo.attrs?.id) usos.set(nodo.attrs.id, (usos.get(nodo.attrs.id) ?? 0) + 1);
    (nodo.content || []).forEach(recorrer);
  };
  recorrer(doc);
  return usos;
};

/** Variables que usa el documento, en orden de aparición y normalizadas. */
export const variablesDelFormulario = (variables, doc) => {
  const usos = usosEnDocumento(doc);
  const porId = new Map(variables.map((v) => [v.id, v]));
  return [...usos.keys()].filter((id) => porId.has(id)).map((id) => normalizarVariable(porId.get(id)));
};

/** Indica si el documento tiene texto o alguna variable. */
export const documentoTieneContenido = (doc) => {
  const recorrer = (nodo) => {
    if (!nodo || typeof nodo !== 'object') return false;
    if (nodo.type === 'variable') return true;
    if (nodo.type === 'text' && String(nodo.text ?? '').trim()) return true;
    return (nodo.content || []).some(recorrer);
  };
  return recorrer(doc);
};

/** Ids usados en el documento sin definición ni dato automático. */
export const variablesSinDefinir = (variables, doc) => {
  const definidas = new Set(variables.map((v) => v.id));
  return [...usosEnDocumento(doc).keys()].filter((id) => !esVariableSistema(id) && !definidas.has(id));
};

/**
 * Problemas de las variables usadas en el documento.
 * @returns {Array<{ id: string, mensaje: string }>}
 */
export const problemasDeVariables = (variables, doc) => {
  const usos = usosEnDocumento(doc);
  const problemas = variablesSinDefinir(variables, doc).map((id) => ({
    id,
    mensaje: `La variable «${id}» del documento no tiene configuración.`,
  }));
  variables
    .filter((v) => usos.has(v.id))
    .forEach((v) => {
      const errores = Object.values(erroresVariable(v, variables));
      if (errores.length > 0) {
        problemas.push({ id: v.id, mensaje: `La variable «${v.etiqueta?.trim() || v.id}»: ${errores[0]}` });
      }
    });
  return problemas;
};
