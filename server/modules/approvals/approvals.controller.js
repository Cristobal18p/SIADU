const approvalsService = require('./approvals.service');
const { errorResponse, errorInterno } = require('../../utils/errorResponse');
const { idDe } = require('../../utils/id');
const logger = require('../../utils/logger');
const { ipDe } = require('../../utils/ip');

class ApprovalsController {
  async listPendingApprovals(req, res) {
    try {
      const items = await approvalsService.listPendingApprovals(req.user.idUsuario);
      return res.status(200).json(items);
    } catch (err) {
      return errorInterno(res, 'listPendingApprovals', err, 'Error al consultar la bandeja de pendientes.');
    }
  }

  async listApprovalHistory(req, res) {
    try {
      const resultado = await approvalsService.listApprovalHistory(req.user.idUsuario, req.query);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, 400, err.codigo, err.message, err.detalles);
      }
      return errorInterno(res, 'listApprovalHistory', err, 'Error al consultar el historial de resoluciones.');
    }
  }

  async submitDecision(req, res) {
    try {
      const { id } = req.params;
      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El id de la aprobación debe ser numérico.');
      }

      const { decision, comentario } = req.body || {};
      const resultado = await approvalsService.submitDecision(req.user.idUsuario, idNum, {
        decision,
        comentario,
      });
      logger.evento('DECISION_REGISTRADA', { ip: ipDe(req), idUsuario: Number(req.user.idUsuario), idAprobacion: idNum, decision });
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, 400, err.codigo, err.message, err.detalles);
      }
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'CONFLICTO_ESTADO' || err.codigo === 'APROBADOR_INVALIDO') {
        return errorResponse(res, 409, err.codigo, err.message, err.detalles);
      }
      return errorInterno(res, 'submitDecision', err, 'Error al registrar la decisión del trámite.');
    }
  }
}

module.exports = new ApprovalsController();
