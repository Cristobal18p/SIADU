import http from './http';

/** Documentos oficiales en PDF. */

// El PDF se genera en cada petición: puede tardar más que el resto de llamadas
const TIEMPO_MAXIMO_PDF_MS = 120000;

export const documentsApi = {
  /**
   * Descarga el PDF de una solicitud aprobada.
   * @param {number|string} requestId - idSolicitud
   * @param {string} [codigoDocumento='documento'] - Nombre del archivo, sin extensión
   * @returns {Promise<void>}
   */
  async downloadPdf(requestId, codigoDocumento = 'documento') {
    const response = await http.get(`/documents/${requestId}/pdf`, {
      responseType: 'blob',
      timeout: TIEMPO_MAXIMO_PDF_MS,
    });

    const blob = new Blob([response], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${codigoDocumento}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default documentsApi;
