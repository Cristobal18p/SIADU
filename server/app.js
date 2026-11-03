const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const { lectoresDelCuerpo, manejarErrores } = require('./middleware/errores');
const { cabeceras, limitarApi } = require('./middleware/seguridad');

const app = express();

// Proxies de confianza, para que req.ip sea la del cliente
const saltosDeProxy = Number(process.env.TRUST_PROXY);
if (Number.isInteger(saltosDeProxy) && saltosDeProxy > 0) app.set('trust proxy', saltosDeProxy);

app.use(cabeceras());
app.use(compression());

app.use(lectoresDelCuerpo());

const clientDistPath = path.join(__dirname, '../client/dist');
// Los archivos de assets/ llevan hash en el nombre: se guardan un año
const CACHE_ASSETS = 'public, max-age=31536000, immutable';
app.use(express.static(clientDistPath, {
  index: false,
  setHeaders: (res, ruta) => {
    if (ruta.startsWith(path.join(clientDistPath, 'assets') + path.sep)) res.set('Cache-Control', CACHE_ASSETS);
  },
}));

// index.html con el nonce de la respuesta
let plantillaIndex = null;
const enviarIndex = (req, res, next) => {
  try {
    plantillaIndex ??= fs.readFileSync(path.join(clientDistPath, 'index.html'), 'utf8');
  } catch {
    return next();
  }
  res.set('Cache-Control', 'no-cache').type('html').send(plantillaIndex.replaceAll('__CSP_NONCE__', res.locals.cspNonce));
};

// Límite general de peticiones; el login y el PDF tienen además el suyo
app.use('/api', limitarApi());

app.use('/api/auth',      require('./modules/auth/auth.routes'));
app.use('/api/catalogs',  require('./modules/catalogs/catalogs.routes'));
app.use('/api/flows',      require('./modules/flows/flows.routes'));
app.use('/api/templates', require('./modules/templates/templates.routes'));
app.use('/api/requests',  require('./modules/requests/requests.routes'));
app.use('/api/approvals', require('./modules/approvals/approvals.routes'));
app.use('/api/documents', require('./modules/documents/documents.routes'));

// Las rutas que no son /api devuelven index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  enviarIndex(req, res, next);
});

app.use(manejarErrores);

module.exports = app;
