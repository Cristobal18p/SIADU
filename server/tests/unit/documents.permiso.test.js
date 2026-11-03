/** Solo el solicitante dueño descarga el PDF; cualquier otra persona, incluso un aprobador, recibe 404. */
const test = require('node:test');
const assert = require('node:assert/strict');

const requestsService = require('../../modules/requests/requests.service');
const documentsService = require('../../modules/documents/documents.service');

const solicitud = (estado) => ({ idSolicitud: 10, estado, codigoDocumento: 'UP24-2026-0001', solicitante: { idUsuario: 97 } });

test('un aprobador del trámite recibe 404 al pedir el PDF', async () => {
  requestsService.getRequest = async () => solicitud('APROBADO'); // getRequest deja pasar al aprobador (id 42)
  await assert.rejects(documentsService.generateDocumentPdf(42, 10), (e) => e.codigo === 'NO_ENCONTRADO' && e.status === 404);
});

test('el solicitante dueño con la solicitud pendiente o rechazada recibe 400', async () => {
  for (const estado of ['PENDIENTE', 'RECHAZADO']) {
    requestsService.getRequest = async () => solicitud(estado);
    await assert.rejects(documentsService.generateDocumentPdf(97, 10), (e) => e.codigo === 'ESTADO_INVALIDO' && e.status === 400);
  }
});

test('el 404 del dueño ajeno no revela si la solicitud está aprobada', async () => {
  for (const estado of ['PENDIENTE', 'APROBADO', 'RECHAZADO']) {
    requestsService.getRequest = async () => solicitud(estado);
    await assert.rejects(documentsService.generateDocumentPdf(42, 10), (e) => e.status === 404);
  }
});
