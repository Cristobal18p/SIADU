const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const documentsService = require('../../modules/documents/documents.service');
const requestsService = require('../../modules/requests/requests.service');

test('documents — rechaza con ESTADO_INVALIDO si la solicitud está PENDIENTE', async () => {
  const original = requestsService.getRequest;
  requestsService.getRequest = async () => ({
    idSolicitud: 1,
    codigoDocumento: 'UP24-2026-0001',
    solicitante: { idUsuario: 1 }, // dueño de la solicitud
    estado: 'PENDIENTE',
  });

  try {
    await assert.rejects(
      async () => {
        await documentsService.generateDocumentPdf(1, 1);
      },
      (err) => {
        assert.equal(err.codigo, 'ESTADO_INVALIDO');
        assert.equal(err.status, 400);
        return true;
      }
    );
  } finally {
    requestsService.getRequest = original;
  }
});

test('documents — rechaza con ESTADO_INVALIDO si la solicitud está RECHAZADO', async () => {
  const original = requestsService.getRequest;
  requestsService.getRequest = async () => ({
    idSolicitud: 1,
    codigoDocumento: 'UP24-2026-0001',
    solicitante: { idUsuario: 1 }, // dueño de la solicitud
    estado: 'RECHAZADO',
  });

  try {
    await assert.rejects(
      async () => {
        await documentsService.generateDocumentPdf(1, 1);
      },
      (err) => {
        assert.equal(err.codigo, 'ESTADO_INVALIDO');
        assert.equal(err.status, 400);
        return true;
      }
    );
  } finally {
    requestsService.getRequest = original;
  }
});

// Sin Chromium disponible, la prueba se omite
const hayChromium = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].some((ruta) => ruta && fs.existsSync(ruta));

test('documents — genera PDF vectorial (firma %PDF-) cuando la solicitud está APROBADO', {
  skip: hayChromium ? false : 'Sin Chromium en este equipo: defina PUPPETEER_EXECUTABLE_PATH',
}, async () => {
  const original = requestsService.getRequest;
  requestsService.getRequest = async () => ({
    idSolicitud: 1,
    codigoDocumento: 'UP24-2026-0001',
    solicitante: { idUsuario: 1 }, // dueño de la solicitud
    nombrePlantilla: 'Solicitud de Retiro de Asignatura',
    estado: 'APROBADO',
    disenoFormJson: {
      encabezado: { activo: false },
      cuerpoDocumento: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Documento aprobado de prueba.' }] }],
      },
      piePagina: { activo: false },
    },
    variableFormJson: { variables: [] },
    datosJson: {},
    variablesSistema: {
      'solicitud.codigo': 'UP24-2026-0001',
      'sistema.fecha_formal': 'Panamá, 16 de octubre de 2026',
    },
    pasosDocumento: [],
  });

  try {
    const res = await documentsService.generateDocumentPdf(1, 1);
    assert.ok(res.buffer instanceof Buffer, 'El resultado debe ser un Buffer');
    assert.ok(res.buffer.length > 500, 'El buffer del PDF debe tener contenido');
    // Los primeros 4 bytes de cualquier PDF son '%PDF'
    const header = res.buffer.slice(0, 4).toString('utf-8');
    assert.equal(header, '%PDF', 'El archivo debe comenzar con la firma mágica %PDF');
    assert.equal(res.codigoDocumento, 'UP24-2026-0001');
  } finally {
    requestsService.getRequest = original;
  }
});

test('resolverRecurso solo lee archivos de client/public', () => {
  const { resolverRecurso } = documentsService;
  assert.match(resolverRecurso('/logos/escudo_up.png'), /^data:image\/png;base64,/);
  assert.equal(resolverRecurso('/../../server/package.json'), '');
  assert.equal(resolverRecurso('../../../etc/passwd'), '');
});
