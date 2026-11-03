const catalogsService = require('./catalogs.service');
const { errorInterno } = require('../../utils/errorResponse');
const { esUnidadAjena, respuestaUnidadAjena } = require('../../utils/unidad');

class CatalogsController {
  async getCargos(req, res) {
    try {
      const { codUnidad, soloAprobadores } = req.query;
      if (esUnidadAjena(codUnidad, req)) return respuestaUnidadAjena(res);

      const cargos = await catalogsService.getCargos({
        codUnidad: req.user.codUnidad,
        soloAprobadores,
      });

      return res.status(200).json(cargos);
    } catch (err) {
      return errorInterno(res, 'getCargos', err, 'Error al consultar el catálogo de cargos.');
    }
  }
}

module.exports = new CatalogsController();
