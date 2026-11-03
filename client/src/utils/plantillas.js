/** Utilidades del constructor de plantillas: borrador, validaciones y cargas de la API. */
import { contenidoDelPie, contenidoPieDesdeCampos } from '@siadu/documento';
import { nombreCompletoUnidad } from './formatters';
import { documentoTieneContenido, problemasDeVariables, variablesDelFormulario } from './variables';
import { LOGO_UP, LOGO_FIEC } from './logos';

export const AUDIENCIAS = [
  { valor: 'ESTUDIANTE', etiqueta: 'Estudiantes', descripcion: 'Pregrado, postgrado y egresados' },
  { valor: 'PROFESOR', etiqueta: 'Profesores', descripcion: 'Docentes regulares y especiales' },
  { valor: 'ADMINISTRATIVO', etiqueta: 'Administrativos', descripcion: 'Personal técnico y de soporte' },
];

/** Logos disponibles para el encabezado. */
export const LOGOS = [
  { valor: LOGO_UP, etiqueta: 'Escudo UP' },
  { valor: LOGO_FIEC, etiqueta: 'Logo FIEC' },
];

/** Tipografía base por defecto (`disenoFormJson.formato`). */
const FORMATO_INSTITUCIONAL = { fuente: 'Arial', tamano: '11pt', interlineado: '1.15' };

/**
 * Encabezado institucional por defecto; el logo de la FIEC solo se propone a la FIEC.
 * @param {Object} [unidad] - Unidad del usuario en sesión
 */
const encabezadoInstitucional = (unidad) => ({
  activo: true,
  logoIzqUrl: LOGO_UP,
  logoDerUrl: !unidad || unidad.abrev === 'FIEC' ? LOGO_FIEC : null,
  linea1: 'UNIVERSIDAD DE PANAMÁ',
  linea2: unidad ? nombreCompletoUnidad(unidad).toUpperCase() : 'FACULTAD DE INFORMÁTICA, ELECTRÓNICA Y COMUNICACIÓN',
  linea3: null,
  linea4: null,
});

/** Pie de página institucional por defecto. */
const pieInstitucional = () => ({
  activo: true,
  contenido: contenidoPieDesdeCampos({
    lemaOficial:
      '2026: “Año del Fortalecimiento de la Autonomía Universitaria, mediante la Elección Democrática de sus Autoridades”',
    direccion: 'Estafeta Universitario, Panamá, República de Panamá',
    telefonos: 'Teléfono 523-6008-6001',
  }),
  mostrarPaginacion: true,
});

/**
 * Pie en formato `contenido`; convierte el formato anterior por campos.
 * @param {Object} [pie] - disenoFormJson.piePagina
 */
const pieDesdeDetalle = (pie) => {
  if (!pie) return pieInstitucional();
  return {
    activo: pie.activo !== false,
    contenido: contenidoDelPie(pie),
    mostrarPaginacion: Boolean(pie.mostrarPaginacion),
  };
};

/** Documento mínimo válido: un párrafo vacío. */
const cuerpoVacio = () => ({
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { textAlign: 'justify', lineHeight: '1.15' } }],
});

/**
 * Borrador de una plantilla nueva.
 * @param {number|null} codUnidad - Unidad del administrador en sesión
 * @param {Object} [unidad] - UnidadResumen del administrador, para el membrete
 */
export const borradorVacio = (codUnidad, unidad) => ({
  idPlantilla: null,
  idVersion: null,
  numeroVersion: 1,
  estado: 'BORRADOR',
  nombre: '',
  descripcion: '',
  codUnidad: codUnidad ?? null,
  audiencia: [],
  variables: [],
  cuerpoDocumento: cuerpoVacio(),
  formato: { ...FORMATO_INSTITUCIONAL },
  encabezado: encabezadoInstitucional(unidad),
  piePagina: pieInstitucional(),
  versionBorrador: null,
  idFlujo: null,
  // Pasos en edición; `flujoBase` identifica los del flujo guardado para reutilizarlo si no cambian
  pasosFlujo: [],
  flujoBase: null,
  // Un flujo en BORRADOR se edita; uno ACTIVO no se modifica
  estadoFlujo: null,
  // Datos del flujo nuevo que se piden al guardar
  nombreFlujo: '',
  descripcionFlujo: '',
  nombreFlujoOrigen: '', // flujo de origen, para sugerir «(copia)»
});

/** Convierte el detalle de `GET /templates/{id}` en un borrador editable. */
export const borradorDesdeDetalle = (detalle) => ({
  idPlantilla: detalle.idPlantilla,
  idVersion: detalle.idVersion,
  numeroVersion: detalle.numeroVersion,
  estado: detalle.estado,
  nombre: detalle.nombre ?? '',
  descripcion: detalle.descripcion ?? '',
  codUnidad: detalle.codUnidad,
  audiencia: detalle.audiencia ?? [],
  variables: detalle.variableFormJson?.variables ?? [],
  cuerpoDocumento: detalle.disenoFormJson?.cuerpoDocumento ?? cuerpoVacio(),
  formato: { ...FORMATO_INSTITUCIONAL, ...(detalle.disenoFormJson?.formato ?? {}) },
  encabezado: { ...encabezadoInstitucional(), ...(detalle.disenoFormJson?.encabezado ?? {}) },
  piePagina: pieDesdeDetalle(detalle.disenoFormJson?.piePagina),
  // Borrador en curso, que puede ser otra versión que la cargada
  versionBorrador: detalle.versionBorrador ?? null,
  idFlujo: detalle.flujo?.idFlujo ?? null,
  estadoFlujo: detalle.flujo?.estado ?? null,
  nombreFlujo: '',
  descripcionFlujo: '',
  nombreFlujoOrigen: detalle.flujo?.nombre ?? '',
  ...pasosDesdeFlujo(detalle.flujo),
});

/** Alcance de un paso cuyo titular es el del cargo en la escuela del solicitante. */
export const ALCANCE_ESCUELA = 'ESCUELA_SOLICITANTE';

/** Paso nuevo, sin autoridad elegida. */
export const pasoVacio = () => ({ alcance: 'FIJO', idAsignacion: null, idCargo: null, reqFirma: true });

export const esPasoEscuela = (paso) => paso?.alcance === ALCANCE_ESCUELA;

/** Indica si el paso tiene una autoridad o un cargo por escuela elegido. */
export const pasoDefinido = (paso) => (esPasoEscuela(paso) ? Boolean(paso.idCargo) : Boolean(paso.idAsignacion));

/** Paso del borrador tal como lo pide `POST /flows` y `PUT /flows/{id}`. */
export const pasoParaApi = (paso, indice) => ({
  secuencia: indice + 1,
  reqFirma: paso.reqFirma,
  ...(esPasoEscuela(paso) ? { alcance: ALCANCE_ESCUELA, idCargo: paso.idCargo } : { idAsignacion: paso.idAsignacion }),
});

/** Pasos editables y su firma de referencia a partir de un flujo del servidor. */
export function pasosDesdeFlujo(flujo) {
  const pasosFlujo = (flujo?.pasos ?? [])
    .slice()
    .sort((a, b) => a.secuencia - b.secuencia)
    .map((p) =>
      p.alcance === ALCANCE_ESCUELA
        ? { alcance: ALCANCE_ESCUELA, idAsignacion: null, idCargo: p.idCargo ?? null, reqFirma: p.reqFirma !== false }
        : { alcance: 'FIJO', idAsignacion: p.idAsignacion, idCargo: null, reqFirma: p.reqFirma !== false }
    );
  return { pasosFlujo, flujoBase: flujo ? firmaPasos(pasosFlujo) : null };
}

/** Firma de una lista de pasos, para detectar cambios respecto del flujo guardado. */
export function firmaPasos(pasos) {
  return pasos.map((p) => `${esPasoEscuela(p) ? `e${p.idCargo}` : p.idAsignacion}:${p.reqFirma ? 1 : 0}`).join('|');
}

/** `variableFormJson` con las variables que usa el documento, en orden de aparición y normalizadas. */
export const construirVariableFormJson = (borrador) => ({
  variables: variablesDelFormulario(borrador.variables, borrador.cuerpoDocumento),
});

export const construirDisenoFormJson = (borrador) => ({
  formato: borrador.formato,
  encabezado: borrador.encabezado,
  cuerpoDocumento: borrador.cuerpoDocumento,
  piePagina: borrador.piePagina,
});

/** Carga de `POST /templates`. */
export const payloadCrear = (borrador) => ({
  nombre: borrador.nombre.trim(),
  descripcion: borrador.descripcion.trim(),
  codUnidad: borrador.codUnidad,
  audiencia: borrador.audiencia,
  idFlujo: borrador.idFlujo,
  variableFormJson: construirVariableFormJson(borrador),
  disenoFormJson: construirDisenoFormJson(borrador),
});

/** Carga de `PUT /templates/{id}`. `audiencia` y `codUnidad` no se pueden cambiar. */
/** La audiencia solo se puede cambiar en una plantilla nunca publicada (versión 1 en borrador). */
export const audienciaEditable = (borrador) => borrador.estado === 'BORRADOR' && borrador.numeroVersion === 1;

export const payloadActualizar = (borrador) => ({
  idVersion: borrador.idVersion,
  nombre: borrador.nombre.trim(),
  descripcion: borrador.descripcion.trim(),
  // En una plantilla ya publicada el servidor la rechaza; no se envía
  ...(audienciaEditable(borrador) ? { audiencia: borrador.audiencia } : {}),
  idFlujo: borrador.idFlujo,
  variableFormJson: construirVariableFormJson(borrador),
  disenoFormJson: construirDisenoFormJson(borrador),
});

/** Paso 1: nombre obligatorio y al menos un estamento. Devuelve `{ campo: mensaje }`. */
export const validarDatosBasicos = (borrador) => {
  const errores = {};
  if (!borrador.nombre.trim()) errores.nombre = 'Escribe el nombre de la plantilla.';
  if (borrador.audiencia.length === 0) errores.audiencia = 'Elige al menos un grupo que pueda solicitar este documento.';
  return errores;
};

/**
 * Titular de un cargo, para no repetirlo en el flujo: por `idUsuarioTitular` o por el nombre normalizado.
 * Un cargo vacante devuelve null.
 */
export const personaDelCargo = (cargo) => {
  if (!cargo) return null;
  if (cargo.idUsuarioTitular !== undefined) {
    return cargo.idUsuarioTitular === null ? null : `id:${cargo.idUsuarioTitular}`;
  }
  const nombre = String(cargo.titularActual ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return nombre ? `nombre:${nombre}` : null;
};

/**
 * Índice del otro paso donde ya está esta autoridad o su titular, o -1.
 * @param {Array} pasosFlujo
 * @param {Array} cargos - CargoResumen[]
 * @param {number} idAsignacion
 * @param {number} indice - Paso que se está eligiendo
 */
export const pasoQueLaTiene = (pasosFlujo, cargos, idAsignacion, indice) => {
  const persona = personaDelCargo(cargos.find((c) => c.idAsignacion === idAsignacion));
  return pasosFlujo.findIndex((p, k) => {
    if (k === indice || !p.idAsignacion) return false;
    if (p.idAsignacion === idAsignacion) return true;
    return persona !== null && personaDelCargo(cargos.find((c) => c.idAsignacion === p.idAsignacion)) === persona;
  });
};

/**
 * Errores del flujo: cada paso necesita una autoridad que pueda aprobar, sin repetir autoridad ni persona.
 * Devuelve `{ [indice]: mensaje }`.
 * @param {Array} pasosFlujo
 * @param {Array} [cargos] - CargoResumen[]; sin ellos solo se compara la asignación
 */
export const validarFlujo = (pasosFlujo, cargos = []) => {
  const errores = {};
  pasosFlujo.forEach((p, i) => {
    if (!pasoDefinido(p)) {
      errores[i] = 'Elige la autoridad de este paso.';
      return;
    }
    // El titular de un paso por escuela se conoce al radicar
    if (esPasoEscuela(p)) return;
    const cargo = cargos.find((c) => c.idAsignacion === p.idAsignacion);
    if (cargo && cargo.esAprobador === false) {
      errores[i] = `${cargo.titularActual} no puede aprobar: necesita una cuenta activa y el rol de aprobador.`;
      return;
    }
    const anterior = pasoQueLaTiene(pasosFlujo.slice(0, i), cargos, p.idAsignacion, -1);
    if (anterior === -1) return;
    const repetida = pasosFlujo[anterior].idAsignacion === p.idAsignacion;
    const titular = cargos.find((c) => c.idAsignacion === p.idAsignacion)?.titularActual;
    errores[i] = repetida
      ? `Esta autoridad ya está en el paso ${anterior + 1}.`
      : `${titular} ya está en el paso ${anterior + 1}: una persona aprueba y firma una sola vez.`;
  });
  return errores;
};

/** Indica si hay que crear un flujo nuevo: no hay uno guardado o los pasos cambiaron. */
export const requiereFlujoNuevo = (borrador) =>
  borrador.pasosFlujo.length > 0 &&
  !(borrador.idFlujo !== null && firmaPasos(borrador.pasosFlujo) === borrador.flujoBase);

/** Código del flujo a partir de su nombre, con un sufijo aleatorio. */
export const codigoFlujo = (nombreFlujo) => {
  const base = nombreFlujo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/, '');
  const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FLUJO-${base || 'APROBACION'}-${sufijo}`;
};

/** Indica si el documento tiene el bloque de firmas. */
export const tieneBloqueFirmas = (nodo) =>
  Boolean(nodo && typeof nodo === 'object') &&
  (nodo.type === 'signatureBlock' || (nodo.content || []).some(tieneBloqueFirmas));

/**
 * Pasos del borrador como `PasoDocumento`, todos pendientes, para dibujar el bloque de firmas.
 * @param {Array<{ alcance: string, idAsignacion: number|null, idCargo: number|null, reqFirma: boolean }>} pasosFlujo
 * @param {Array} cargos - CargoResumen[]
 * @returns {Array} PasoDocumento[]
 */
export const pasosDelDocumento = (pasosFlujo = [], cargos = []) =>
  pasosFlujo.map((paso, i) => {
    // Paso por escuela: el titular depende del solicitante
    const cargo = esPasoEscuela(paso)
      ? cargos.find((c) => c.idCargo === paso.idCargo)
      : cargos.find((c) => c.idAsignacion === paso.idAsignacion);
    return {
      secuencia: i + 1,
      nombreCargo: cargo?.nombreCargo ?? 'Autoridad por definir',
      titular: esPasoEscuela(paso) ? null : cargo?.titularActual ?? null,
      area: esPasoEscuela(paso) ? 'Escuela del solicitante' : cargo?.area ?? null,
      reqFirma: Boolean(paso.reqFirma),
      estado: null,
    };
  });

/**
 * Paso 2: problemas de las variables que impiden guardar.
 * @returns {Array<{ id: string, mensaje: string }>}
 */
export const validarDocumento = (borrador) => problemasDeVariables(borrador.variables, borrador.cuerpoDocumento);

/**
 * Lo que falta para publicar, con el paso del asistente donde se resuelve; vacío si está listo.
 * @param {Object} borrador
 * @param {Array} [cargos] - CargoResumen[]
 * @returns {Array<{ mensaje: string, paso: number }>}
 */
export const pendientesParaPublicar = (borrador, cargos = []) => {
  const pendientes = [];
  if (!borrador.nombre.trim()) pendientes.push({ mensaje: 'Falta el nombre de la plantilla.', paso: 0 });
  if (borrador.audiencia.length === 0) pendientes.push({ mensaje: 'Falta elegir a quién va dirigida.', paso: 0 });
  if (!documentoTieneContenido(borrador.cuerpoDocumento)) {
    pendientes.push({ mensaje: 'Falta redactar el documento.', paso: 1 });
  }
  validarDocumento(borrador).forEach((p) => pendientes.push({ mensaje: p.mensaje, paso: 1 }));
  if (borrador.pasosFlujo.length === 0) {
    pendientes.push({ mensaje: 'Falta definir el flujo de aprobación.', paso: 1 });
  } else if (borrador.pasosFlujo.some((p) => !pasoDefinido(p))) {
    pendientes.push({ mensaje: 'Hay pasos del flujo sin autoridad asignada.', paso: 1 });
  } else if (Object.keys(validarFlujo(borrador.pasosFlujo, cargos)).length > 0) {
    pendientes.push({ mensaje: 'Una misma autoridad o persona aparece en más de un paso del flujo.', paso: 1 });
  }
  if (
    borrador.pasosFlujo.some(esPasoEscuela) &&
    !(borrador.audiencia.length === 1 && borrador.audiencia[0] === 'ESTUDIANTE')
  ) {
    pendientes.push({ mensaje: 'Un paso por escuela solo sirve en plantillas dirigidas únicamente a estudiantes.', paso: 0 });
  }
  const conFirma = borrador.pasosFlujo.some((p) => p.reqFirma);
  const conBloque = tieneBloqueFirmas(borrador.cuerpoDocumento);
  if (conFirma && !conBloque) {
    pendientes.push({ mensaje: 'El flujo pide firmas, pero el documento no tiene el bloque de firmas.', paso: 1 });
  } else if (!conFirma && conBloque && borrador.pasosFlujo.length > 0) {
    pendientes.push({ mensaje: 'El documento tiene bloque de firmas, pero ningún paso del flujo firma.', paso: 1 });
  }
  return pendientes;
};
