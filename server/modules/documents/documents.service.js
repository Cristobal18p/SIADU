const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const requestsService = require('../requests/requests.service');
const { aDataUri } = require('../../utils/storage');

const errorServicio = (codigo, mensaje, detalles = null, status = null) => {
  const err = new Error(mensaje);
  err.codigo = codigo;
  if (detalles) err.detalles = detalles;
  if (status) err.status = status;
  return err;
};

const PUBLIC_DIR = path.resolve(__dirname, '../../../client/public');

/** Caché de imágenes locales como data URI. */
const cacheDataUri = new Map();

/** Convierte una imagen local (logo o firma) en data URI; las URL externas se devuelven igual. */
function resolverRecurso(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (cacheDataUri.has(url)) {
    return cacheDataUri.get(url);
  }

  try {
    const rutaRelativa = url.startsWith('/') ? url.slice(1) : url;
    const rutaAbsoluta = path.resolve(PUBLIC_DIR, rutaRelativa);
    // Solo archivos dentro de client/public
    if (!rutaAbsoluta.startsWith(PUBLIC_DIR + path.sep)) return '';
    if (fs.existsSync(rutaAbsoluta)) {
      const ext = path.extname(rutaAbsoluta).toLowerCase().replace('.', '') || 'png';
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
      const base64 = fs.readFileSync(rutaAbsoluta).toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;
      cacheDataUri.set(url, dataUri);
      return dataUri;
    }
  } catch (err) {
    console.warn(`[documents.service] No se pudo leer el recurso local: ${url}`, err.message);
  }

  return url;
}

let browserInstance = null;
let lanzando = null;

// Pestañas de Chromium a la vez; el resto espera turno
const MAX_PAGINAS = Number(process.env.PDF_MAX_PAGINAS) || 3;
let paginasAbiertas = 0;
const enEspera = [];

const tomarTurno = () => {
  if (paginasAbiertas < MAX_PAGINAS) {
    paginasAbiertas += 1;
    return Promise.resolve();
  }
  return new Promise((resolver) => enEspera.push(resolver));
};

const liberarTurno = () => {
  const siguiente = enEspera.shift();
  if (siguiente) siguiente();
  else paginasAbiertas -= 1;
};

/** Instancia única de Chromium. */
async function getBrowser() {
  if (browserInstance?.connected) return browserInstance;
  // Varias descargas a la vez comparten un solo arranque
  lanzando ??= lanzarBrowser().finally(() => { lanzando = null; });
  return lanzando;
}

async function lanzarBrowser() {
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);

  const executablePath = possiblePaths.find((p) => fs.existsSync(p));

  if (!executablePath) {
    throw errorServicio(
      'CONFIGURACION_ERROR',
      'No se encontró un binario de Chromium/Chrome ejecutable en el servidor.',
      null,
      500
    );
  }

  browserInstance = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=medium',
    ],
  });
  return browserInstance;
}

class DocumentsService {
  /** Genera el PDF oficial de una solicitud aprobada con Chromium. */
  async generateDocumentPdf(idUsuario, idSolicitud) {
    const solicitud = await requestsService.getRequest(idUsuario, idSolicitud);

    // Solo el dueño descarga el PDF; para cualquier otro, 404
    if (Number(solicitud.solicitante?.idUsuario) !== Number(idUsuario)) {
      throw errorServicio('NO_ENCONTRADO', 'La solicitud no existe o no tiene permisos para descargarla.', null, 404);
    }

    if (solicitud.estado !== 'APROBADO') {
      throw errorServicio(
        'ESTADO_INVALIDO',
        'Solo se pueden descargar documentos oficiales de solicitudes en estado APROBADO.',
        null,
        400
      );
    }

    // Motor compartido del documento (ESM)
    const { documentoHtml } = await import('../../../shared/documento/index.js');

    // Firmas de Storage: se descargan y se incrustan
    const pasos = await Promise.all((solicitud.pasosDocumento || []).map(async (p) => (
      /^https?:/.test(p.firmaUrl ?? '') ? { ...p, firmaUrl: (await aDataUri(p.firmaUrl).catch(() => null)) ?? p.firmaUrl } : p
    )));

    const htmlCompilado = documentoHtml({
      diseno: solicitud.disenoFormJson,
      variables: solicitud.variableFormJson?.variables || [],
      datos: solicitud.datosJson || {},
      sistema: solicitud.variablesSistema || {},
      pasos,
      estado: 'APROBADO',
      titulo: `${solicitud.codigoDocumento} — ${solicitud.nombrePlantilla}`,
      recurso: resolverRecurso,
    });

    const browser = await getBrowser();
    await tomarTurno();
    let page;

    try {
      page = await browser.newPage();
      // Solo se permiten recursos incrustados (data:)
      await page.setRequestInterception(true);
      page.on('request', (r) => {
        const url = r.url();
        if (url.startsWith('data:') || url === 'about:blank') return r.continue();
        console.warn(`[documents.service] Recurso bloqueado en el PDF: ${url.split(/[?#]/)[0].slice(0, 120)}`);
        return r.abort('blockedbyclient');
      });
      await page.setContent(htmlCompilado, { waitUntil: 'load', timeout: 60000 });

      // Espera a que el script reparta las hojas
      await page.waitForSelector('.doc-paginas[data-paginado="listo"]', { timeout: 10000 });

      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true, // tamaño de página de @page
      });

      return {
        buffer: Buffer.from(pdfBuffer),
        codigoDocumento: solicitud.codigoDocumento || `solicitud-${idSolicitud}`,
      };
    } finally {
      await page?.close().catch(() => {});
      liberarTurno();
    }
  }
}

module.exports = new DocumentsService();
module.exports.resolverRecurso = resolverRecurso;
