import http from './http';

/** Solicitudes del usuario. */
export const requestsApi = {
  /**
   * Solicitudes del usuario en sesión, de la más reciente a la más antigua.
   * @returns {Promise<import('./tipos').SolicitudResumen[]>}
   */
  async getMyRequests() {
    return http.get('/requests/me');
  },

  /**
   * Detalle de una solicitud con sus respuestas y su línea de tiempo.
   * @param {number|string} id - idSolicitud
   * @returns {Promise<import('./tipos').SolicitudDetalle>}
   */
  async getRequestById(id) {
    return http.get(`/requests/${id}`);
  },

  /**
   * Envía una solicitud nueva sobre una versión activa de plantilla.
   * @param {Object} payload
   * @param {number} payload.idVersion
   * @param {Object<string, *>} payload.datosJson - Respuestas por id de variable
   * @returns {Promise<import('./tipos').SolicitudCreada>}
   */
  async createRequest(payload) {
    return http.post('/requests', payload);
  },
};

export default requestsApi;
