// Aislamiento por unidad: unidad ajena en la petición, 403; recurso de otra unidad, 404
const { errorResponse } = require('./errorResponse');

const esUnidadAjena = (codUnidad, req) =>
  codUnidad !== undefined && codUnidad !== null && codUnidad !== '' && Number(codUnidad) !== Number(req.user.codUnidad);

const respuestaUnidadAjena = (res) =>
  errorResponse(res, 403, 'SIN_PERMISO', 'Solo puede trabajar con la unidad a la que pertenece.');

module.exports = { esUnidadAjena, respuestaUnidadAjena };
