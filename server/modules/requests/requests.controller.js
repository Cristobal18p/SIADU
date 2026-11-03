const requestsService = require('./requests.service');
const { errorResponse, errorInterno } = require('../../utils/errorResponse');
const { idDe } = require('../../utils/id');

class RequestsController {
  async listMyRequests(req, res) {
    try {
      const solicitudes = await requestsService.listMyRequests(req.user.idUsuario);
      return res.status(200).json(solicitudes);
    } catch (err) {
      return errorInterno(res, 'listMyRequests', err, 'Error al consultar las solicitudes del usuario.');
    }
  }

  async getRequest(req, res) {
    try {
      const { id } = req.params;
      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El identificador de solicitud debe ser numérico.');
      }

      const solicitud = await requestsService.getRequest(req.user.idUsuario, idNum);
      return res.status(200).json(solicitud);
    } catch (err) {
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      return errorInterno(res, 'getRequest', err, 'Error al consultar el detalle de la solicitud.');
    }
  }

  async createRequest(req, res) {
    try {
      const { idVersion, datosJson } = req.body || {};
      const resultado = await requestsService.createRequest(req.user.idUsuario, {
        idVersion,
        datosJson,
      });
      return res.status(201).json(resultado);
    } catch (err) {
      if (err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, 400, err.codigo, err.message, err.detalles);
      }
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message, err.detalles);
      }
      if (err.codigo === 'CONFLICTO_ESTADO' || err.codigo === 'APROBADOR_INVALIDO') {
        return errorResponse(res, 409, err.codigo, err.message, err.detalles);
      }
      return errorInterno(res, 'createRequest', err, 'Error al registrar la solicitud.');
    }
  }
}

module.exports = new RequestsController();
