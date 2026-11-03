const documentsService = require('./documents.service');
const { errorResponse, errorInterno } = require('../../utils/errorResponse');
const { idDe } = require('../../utils/id');

class DocumentsController {
  async downloadPdf(req, res) {
    try {
      const { requestId } = req.params;
      const idNum = idDe(requestId);

      if (!idNum) {
        return errorResponse(res, 400, 'VALIDACION_FALLIDA', 'El ID de la solicitud debe ser numérico.');
      }

      const { buffer, codigoDocumento } = await documentsService.generateDocumentPdf(
        req.user.idUsuario,
        idNum
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${codigoDocumento}.pdf"`);
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } catch (err) {
      if (err.codigo === 'ESTADO_INVALIDO' || err.codigo === 'VALIDACION_FALLIDA') {
        return errorResponse(res, 400, err.codigo, err.message);
      }
      if (err.codigo === 'NO_ENCONTRADO') {
        return errorResponse(res, 404, err.codigo, err.message);
      }
      return errorInterno(res, 'downloadPdf', err, 'Error al generar el documento oficial en PDF.');
    }
  }
}

module.exports = new DocumentsController();
