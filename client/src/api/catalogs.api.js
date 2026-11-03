import http from './http';

/** Cargos y flujos de aprobación que usa el constructor. */
export const catalogsApi = {
  /**
   * Cargos con su titular actual; `esAprobador` indica si puede ser paso de un flujo.
   * @param {Object} [params]
   * @param {number} [params.codUnidad] - Sin ella, la unidad del usuario
   * @param {boolean} [params.soloAprobadores=false]
   * @returns {Promise<import('./tipos').CargoResumen[]>}
   */
  async getCargos(params = {}) {
    return http.get('/catalogs/cargos', { params });
  },

  /**
   * Flujos ACTIVO de la unidad.
   * @param {Object} [params]
   * @param {number} [params.codUnidad]
   * @returns {Promise<import('./tipos').FlujoResumen[]>}
   */
  async getFlows(params = {}) {
    return http.get('/flows', { params });
  },

  /**
   * Un flujo con sus pasos.
   * @param {number|string} id - idFlujo
   * @returns {Promise<import('./tipos').FlujoDetalle>}
   */
  async getFlowById(id) {
    return http.get(`/flows/${id}`);
  },

  /**
   * Crea un flujo en BORRADOR con código único; pasa a ACTIVO al publicar la plantilla que lo usa.
   * @param {Object} payload
   * @param {string} payload.nombre
   * @param {string} payload.codigo
   * @param {string} [payload.descripcion]
   * @param {number} payload.codUnidad
   * @param {Array<{ secuencia: number, idAsignacion?: number, alcance?: string, idCargo?: number, reqFirma?: boolean }>} payload.pasos
   * @returns {Promise<import('./tipos').FlujoEscrito>}
   */
  async createFlow(payload) {
    return http.post('/flows', payload);
  },

  /**
   * Reemplaza nombre, descripción y pasos de un flujo en BORRADOR; un flujo ACTIVO no se edita.
   * @param {number|string} id - idFlujo
   * @param {Object} payload
   * @param {string} payload.nombre
   * @param {string|null} [payload.descripcion]
   * @param {Array<{ secuencia: number, idAsignacion?: number, alcance?: string, idCargo?: number, reqFirma?: boolean }>} payload.pasos
   * @returns {Promise<import('./tipos').FlujoEscrito>}
   */
  async updateFlow(id, payload) {
    return http.put(`/flows/${id}`, payload);
  },
};

export default catalogsApi;
