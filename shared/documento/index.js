/** @siadu/documento: motor único del documento oficial (vista previa, editor y PDF). */
export { renderDocumento, documentoHtml, encabezadoHtml, pieHtml, firmasHtml, formatoHoja, escapar } from './render.js';
export { ESTILOS_DOCUMENTO, HOJA, FUENTES, FORMATO_POR_DEFECTO, SANGRIA_POR_NIVEL } from './estilos.js';
export { fechaFormal, fechaHoraPanama, valorVariable, VALOR_OTRO, claveOtro } from './formato.js';
export { SISTEMA_EJEMPLO, VARIABLES_SISTEMA, datosEjemplo } from './ejemplo.js';
export { ALTO_UTIL_PX, capacidades, repartirPaginas, paginarDocumento, SCRIPT_PAGINACION } from './paginacion.js';
export { TAMANOS_PIE, ALINEACIONES_PIE, contenidoDelPie, contenidoPieDesdeCampos } from './pie.js';
export { PATRON_ID_VARIABLE, TIPOS_CAMPO, PATRONES_TEXTO, analizarCuerpo, validarDefinicion, validarPublicacion } from './validar.js';
