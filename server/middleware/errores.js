const express = require('express');
const { errorResponse, errorInterno } = require('../utils/errorResponse');

const LIMITE_CUERPO = '512kb';

const lectoresDelCuerpo = () => [
  express.json({ limit: LIMITE_CUERPO }),
  express.urlencoded({ extended: false, limit: LIMITE_CUERPO }),
];

/** Errores del cuerpo de la petición y errores no controlados. */
// eslint-disable-next-line no-unused-vars
const manejarErrores = (err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return errorResponse(res, 413, 'VALIDACION_FALLIDA', 'El contenido enviado supera el tamaño permitido.');
  }
  if (err.type === 'entity.parse.failed') {
    return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El contenido enviado no es un JSON válido.');
  }
  return errorInterno(res, 'app', err);
};

module.exports = { LIMITE_CUERPO, lectoresDelCuerpo, manejarErrores };
