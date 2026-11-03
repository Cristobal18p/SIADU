import http from './http';

/** Plantillas: inventario, catálogo, detalle y escritura del constructor. */
export const templatesApi = {
  /**
   * Lista las plantillas con su versión vigente.
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10] - Máximo 50
   * @param {'TODOS'|'ACTIVO'|'BORRADOR'|'INACTIVO'} [params.estado='TODOS']
   * @param {string} [params.search] - Texto en nombre o descripción
   * @param {number} [params.codUnidad]
   * @returns {Promise<import('./tipos').Pagina<import('./tipos').PlantillaInventarioItem>>}
   */
  async getTemplates(params = {}) {
    return http.get('/templates', { params });
  },

  /**
   * Cantidad de plantillas por estado de su versión vigente.
   * @param {Object} [params]
   * @param {number} [params.codUnidad] - Unidad del administrador
   * @returns {Promise<import('./tipos').ResumenPlantillas>}
   */
  async getTemplatesSummary(params = {}) {
    return http.get('/templates/summary', { params });
  },

  /**
   * Plantillas que el solicitante puede iniciar.
   * @returns {Promise<import('./tipos').PlantillaCatalogoItem[]>}
   */
  async getCatalog() {
    return http.get('/templates/catalog');
  },

  /**
   * Carga una plantilla con su formulario, diseño y flujo.
   * @param {number|string} id - idPlantilla
   * @param {Object} [params]
   * @param {number} [params.idVersion] - Sin ella, la versión activa o el último borrador
   * @returns {Promise<import('./tipos').PlantillaCompleta>}
   */
  async getTemplateById(id, params = {}) {
    return http.get(`/templates/${id}`, { params });
  },

  /**
   * Crea la plantilla y su versión 1 en borrador.
   * @param {Object} payload
   * @param {string} payload.nombre
   * @param {string} [payload.descripcion]
   * @param {number} payload.codUnidad
   * @param {import('./tipos').Estamento[]} payload.audiencia
   * @param {number|null} [payload.idFlujo]
   * @param {import('./tipos').VariableFormJson} payload.variableFormJson
   * @param {import('./tipos').DisenoFormJson} payload.disenoFormJson
   * @returns {Promise<import('./tipos').PlantillaEscrita>}
   */
  async createTemplate(payload) {
    return http.post('/templates', payload);
  },

  /**
   * Guarda una versión en borrador. Sin `idFlujo` conserva el flujo; con `null` lo quita.
   * @param {number|string} id - idPlantilla
   * @param {Object} payload
   * @param {number} payload.idVersion
   * @param {string} [payload.nombre]
   * @param {string} [payload.descripcion]
   * @param {Array<'ESTUDIANTE'|'PROFESOR'|'ADMINISTRATIVO'>} [payload.audiencia] - Solo en una plantilla nunca publicada
   * @param {number|null} [payload.idFlujo]
   * @param {import('./tipos').VariableFormJson} payload.variableFormJson
   * @param {import('./tipos').DisenoFormJson} payload.disenoFormJson
   * @returns {Promise<{ idPlantilla: number, idVersion: number, mensaje: string }>}
   */
  async updateTemplate(id, payload) {
    return http.put(`/templates/${id}`, payload);
  },

  /**
   * Elimina una plantilla nunca publicada y su flujo en borrador. Una plantilla ya publicada responde 409.
   * @param {number|string} id - idPlantilla
   * @returns {Promise<void>}
   */
  async deleteTemplate(id) {
    return http.delete(`/templates/${id}`);
  },

  /**
   * Crea un borrador nuevo a partir de la versión activa o, si no hay, de la de mayor número.
   * @param {number|string} id - idPlantilla
   * @returns {Promise<import('./tipos').PlantillaEscrita>}
   */
  async createVersion(id) {
    return http.post(`/templates/${id}/versions`);
  },

  /**
   * Publica una versión en borrador; requiere un flujo con al menos un paso y titulares que puedan aprobar.
   * El flujo pasa a ACTIVO y las solicitudes en proceso conservan su versión.
   * @param {number|string} id - idPlantilla
   * @param {number} idVersion
   * @returns {Promise<import('./tipos').PlantillaEscrita>}
   */
  async publishTemplate(id, idVersion) {
    return http.post(`/templates/${id}/publish`, { idVersion });
  },

  /**
   * Desactiva una versión ACTIVO; las solicitudes en proceso continúan con ella.
   * @param {number|string} id - idPlantilla
   * @param {number} idVersion - Versión ACTIVO
   * @returns {Promise<import('./tipos').PlantillaEscrita>}
   */
  async deactivateTemplate(id, idVersion) {
    return http.post(`/templates/${id}/deactivate`, { idVersion });
  },
};

export default templatesApi;
