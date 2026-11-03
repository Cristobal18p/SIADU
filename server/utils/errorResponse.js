/** Respuestas de error con el formato `{ error: { codigo, mensaje, detalles } }`. */

const errorBody = (codigo, mensaje, detalles) => ({
  error: {
    codigo,
    mensaje,
    ...(Array.isArray(detalles) && detalles.length > 0 ? { detalles } : {}),
  },
});

const errorResponse = (res, status, codigo, mensaje, detalles) => {
  return res.status(status).json(errorBody(codigo, mensaje, detalles));
};

const validacionFallida = (res, detalles, mensaje = 'Hay campos requeridos o con formato incorrecto') => {
  return res.status(400).json(errorBody('VALIDACION_FALLIDA', mensaje, detalles));
};

// Errores de capacidad (pool lleno o base sin respuesta): se responde 503 reintentable
const CODIGOS_DE_CAPACIDAD = new Set(['P2024', 'P1001', 'P1002', 'P1008', 'P1017']);
const PATRON_DE_CAPACIDAD = /EMAXCONNSESSION|max clients reached|Timed out fetching a new connection|timeout exceeded when trying to connect|too many connections|ECONNRESET|ETIMEDOUT/i;

const esErrorDeCapacidad = (err) =>
  Boolean(err) && (CODIGOS_DE_CAPACIDAD.has(err.code) || PATRON_DE_CAPACIDAD.test(String(err.message ?? '')));

const errorInterno = (res, etiqueta, err, mensaje = 'Ocurrió un error interno en el servidor.') => {
  if (esErrorDeCapacidad(err)) {
    const detalle = String(err.message ?? '').split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? '';
    console.warn(`[${etiqueta}] Servicio saturado (${err.code ?? 'sin código'}): ${detalle.slice(0, 160)}`);
    if (typeof res.set === 'function') res.set('Retry-After', '3');
    return res.status(503).json(errorBody('SERVICIO_NO_DISPONIBLE', 'El servicio está ocupado en este momento. Intente de nuevo en unos segundos.'));
  }
  console.error(`[${etiqueta} error]`, err);
  return res.status(500).json(errorBody('ERROR_INTERNO', mensaje));
};

module.exports = {
  errorBody,
  errorResponse,
  validacionFallida,
  errorInterno,
  esErrorDeCapacidad,
};
