const templatesService = require('./templates.service');
const { errorResponse, errorInterno } = require('../../utils/errorResponse');
const { idDe } = require('../../utils/id');
const { esUnidadAjena: unidadAjena, respuestaUnidadAjena } = require('../../utils/unidad');

/** Un `codUnidad` ajeno responde 403. */
const esUnidadAjena = (req) => unidadAjena(req.query.codUnidad, req);

class TemplatesController {
  async getCatalog(req, res) {
    try {
      const catalogo = await templatesService.getCatalog(req.user.idUsuario, req.user);
      return res.status(200).json(catalogo);
    } catch (err) {
      return errorInterno(res, 'getCatalog', err, 'Error al consultar el catálogo de trámites.');
    }
  }

  async getSummary(req, res) {
    try {
      if (esUnidadAjena(req)) return respuestaUnidadAjena(res);
      const resultado = await templatesService.getSummary(
        req.user.idUsuario,
        { codUnidad: req.query.codUnidad },
        req.user
      );
      return res.status(200).json(resultado);
    } catch (err) {
      return errorInterno(res, 'getSummary', err, 'Error al consultar el resumen de plantillas.');
    }
  }

  async getTemplates(req, res) {
    try {
      if (esUnidadAjena(req)) return respuestaUnidadAjena(res);
      const { page, limit, estado, search, codUnidad } = req.query;
      const resultado = await templatesService.getTemplates(
        req.user.idUsuario,
        { page, limit, estado, search, codUnidad },
        req.user
      );
      return res.status(200).json(resultado);
    } catch (err) {
      return errorInterno(res, 'getTemplates', err, 'Error al consultar el inventario de plantillas.');
    }
  }

  async getTemplate(req, res) {
    try {
      const { id } = req.params;
      const { idVersion } = req.query;

      const idPlantillaNum = idDe(id);
      if (!idPlantillaNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El id de la plantilla debe ser numérico.');
      }
      if (idVersion !== undefined && !idDe(idVersion)) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El idVersion debe ser numérico.');
      }

      const plantilla = await templatesService.getTemplateById(
        req.user.idUsuario,
        idPlantillaNum,
        idVersion ? Number(idVersion) : null,
        req.user
      );
      return res.status(200).json(plantilla);
    } catch (err) {
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      return errorInterno(res, 'getTemplate', err, 'Error al cargar la plantilla.');
    }
  }

  async createTemplate(req, res) {
    try {
      if (unidadAjena(req.body?.codUnidad, req)) return respuestaUnidadAjena(res);
      const payload = {
        ...req.body,
        codUnidad: req.user.codUnidad,
      };
      const resultado = await templatesService.createTemplate(req.user.idUsuario, payload);
      return res.status(201).json(resultado);
    } catch (err) {
      if (err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, 400, err.codigo, err.message, err.detalles);
      }
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, 409, err.codigo, err.message);
      }
      return errorInterno(res, 'createTemplate', err, 'Error al crear la plantilla.');
    }
  }

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El id de la plantilla debe ser numérico.');
      }

      if (!idDe(req.body?.idVersion)) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El idVersion es requerido para guardar.');
      }

      const resultado = await templatesService.updateTemplate(req.user.idUsuario, idNum, req.body, req.user);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, 400, err.codigo, err.message, err.detalles);
      }
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, 409, err.codigo, err.message);
      }
      return errorInterno(res, 'updateTemplate', err, 'Error al actualizar la plantilla.');
    }
  }

  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El id de la plantilla debe ser numérico.');
      }

      await templatesService.deleteTemplate(req.user.idUsuario, idNum, req.user);
      return res.status(204).end();
    } catch (err) {
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, 409, err.codigo, err.message);
      }
      return errorInterno(res, 'deleteTemplate', err, 'Error al eliminar la plantilla.');
    }
  }

  async createVersion(req, res) {
    try {
      const { id } = req.params;
      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El id de la plantilla debe ser numérico.');
      }

      const resultado = await templatesService.createVersion(req.user.idUsuario, idNum, req.user);
      return res.status(201).json(resultado);
    } catch (err) {
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, 409, err.codigo, err.message, err.detalles);
      }
      return errorInterno(res, 'createVersion', err, 'Error al crear la nueva versión.');
    }
  }

  async publishTemplate(req, res) {
    try {
      const { id } = req.params;
      const { idVersion } = req.body || {};

      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El id de la plantilla debe ser numérico.');
      }
      if (!idDe(idVersion)) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El idVersion es requerido para publicar.');
      }

      const resultado = await templatesService.publishTemplate(req.user.idUsuario, idNum, idVersion, req.user);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, 400, err.codigo, err.message, err.detalles);
      }
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'APROBADOR_INVALIDO' || err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, 409, err.codigo, err.message);
      }
      return errorInterno(res, 'publishTemplate', err, 'Error al publicar la plantilla.');
    }
  }

  async deactivateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { idVersion } = req.body || {};

      const idNum = idDe(id);
      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El id de la plantilla debe ser numérico.');
      }
      if (!idDe(idVersion)) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El idVersion es requerido para desactivar.');
      }

      const resultado = await templatesService.deactivateTemplate(req.user.idUsuario, idNum, idVersion, req.user);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      if (err.codigo === 'CONFLICTO_ESTADO') {
        return errorResponse(res, 409, err.codigo, err.message);
      }
      return errorInterno(res, 'deactivateTemplate', err, 'Error al desactivar la plantilla.');
    }
  }
}

module.exports = new TemplatesController();
