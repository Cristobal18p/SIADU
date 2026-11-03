const flowsService = require('./flows.service');
const { errorResponse, errorInterno } = require('../../utils/errorResponse');
const { idDe } = require('../../utils/id');
const { esUnidadAjena, respuestaUnidadAjena } = require('../../utils/unidad');

class FlowsController {
  async getFlows(req, res) {
    try {
      if (esUnidadAjena(req.query.codUnidad, req)) return respuestaUnidadAjena(res);

      const flujos = await flowsService.getFlows({ codUnidad: req.user.codUnidad });
      return res.status(200).json(flujos);
    } catch (err) {
      return errorInterno(res, 'getFlows', err, 'Error al consultar los flujos de aprobación.');
    }
  }

  async getFlowById(req, res) {
    try {
      const { id } = req.params;
      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El ID del flujo debe ser numérico.');
      }

      const flujo = await flowsService.getFlowById(idNum, req.user.codUnidad);
      return res.status(200).json(flujo);
    } catch (err) {
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      return errorInterno(res, 'getFlowById', err, 'Error al obtener el flujo.');
    }
  }

  async createFlow(req, res) {
    try {
      if (esUnidadAjena(req.body?.codUnidad, req)) return respuestaUnidadAjena(res);
      const resultado = await flowsService.createFlow({
        ...req.body,
        codUnidad: req.user.codUnidad,
      });
      return res.status(201).json(resultado);
    } catch (err) {
      if (err.codigo === 'APROBADOR_INVALIDO' || err.codigo === 'VALIDACION_FALLIDA' || err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, err.status || 400, err.codigo, err.message, err.detalles);
      }
      return errorInterno(res, 'createFlow', err, 'Error al crear el flujo de aprobación.');
    }
  }

  async updateFlow(req, res) {
    try {
      const { id } = req.params;
      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El ID del flujo debe ser numérico.');
      }

      const resultado = await flowsService.updateFlow(idNum, req.body, req.user.codUnidad);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, 409, err.codigo, err.message);
      }
      if (err.codigo === 'APROBADOR_INVALIDO' || err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, err.status || 400, err.codigo, err.message, err.detalles);
      }
      return errorInterno(res, 'updateFlow', err, 'Error al actualizar el flujo.');
    }
  }
}

module.exports = new FlowsController();
