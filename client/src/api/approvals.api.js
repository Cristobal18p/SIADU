import http from './http';

/** Bandeja, historial y decisiones del aprobador. */
export const approvalsApi = {
  /**
   * Trámites pendientes de resolver por el aprobador.
   * @returns {Promise<import('./tipos').AprobacionPendiente[]>}
   */
  async getPendingApprovals() {
    return http.get('/approvals/pending');
  },

  /**
   * Resoluciones emitidas, la más reciente primero. Con `limit: 1` sirve para contar (`total`).
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10] - Máximo 50
   * @param {'APROBADO'|'RECHAZADO'} [params.decision]
   * @param {string} [params.desde] - Fecha ISO, incluida
   * @param {string} [params.hasta] - Fecha ISO, excluida
   * @returns {Promise<import('./tipos').Pagina<import('./tipos').AprobacionHistorial>>}
   */
  async getHistory(params = {}) {
    return http.get('/approvals/history', { params });
  },

  /**
   * Aprueba o rechaza un paso. Rechazar exige `comentario`.
   * @param {number|string} idAprobacion
   * @param {Object} payload
   * @param {'APROBADO'|'RECHAZADO'} payload.decision
   * @param {string} [payload.comentario]
   * @returns {Promise<import('./tipos').DecisionRegistrada>}
   */
  async submitDecision(idAprobacion, payload) {
    return http.post(`/approvals/${idAprobacion}/decision`, payload);
  },
};

export default approvalsApi;
