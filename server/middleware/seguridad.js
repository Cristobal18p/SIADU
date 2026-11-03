const crypto = require('crypto');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { errorResponse } = require('../utils/errorResponse');
const { getJwtSecret } = require('../config/token');
const logger = require('../utils/logger');
const { ipDe } = require('../utils/ip');

const VENTANA_LOGIN_MS = 15 * 60 * 1000;
const INTENTOS_POR_CUENTA = 8;
const INTENTOS_POR_IP = 100;

const VENTANA_PDF_MS = 10 * 60 * 1000;
const PDF_POR_USUARIO = 30;
const VENTANA_API_MS = 60 * 1000;
const PETICIONES_API = 300;

/** Nonce nuevo por respuesta, para el script de la vista previa. */
const generarNonce = (req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
};

const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    // Firmas: URLs firmadas de Supabase Storage
    imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    // Permite http en local
    upgradeInsecureRequests: null,
  },
};

/** Cabeceras de seguridad, sin `X-Powered-By`. */
const cabeceras = () => [
  generarNonce,
  helmet({ contentSecurityPolicy, crossOriginEmbedderPolicy: false }),
];

const identificadorDe = (req) => String(req.body?.identificador ?? '').trim().toLowerCase();

const bloqueado = (req, res) => {
  logger.evento('LOGIN_BLOQUEADO', { ip: ipDe(req), identificador: logger.enmascarar(req.body?.identificador) });
  return errorResponse(res, 429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.');
};

const opciones = {
  windowMs: VENTANA_LOGIN_MS,
  skipSuccessfulRequests: true, // solo cuentan los intentos fallidos
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: bloqueado,
};

/**
 * Límite de intentos fallidos de login: 8 por cuenta e IP y 100 por IP, en memoria del proceso.
 */
const limitarLogin = () => [
  rateLimit({ ...opciones, limit: INTENTOS_POR_IP, keyGenerator: (req) => ipKeyGenerator(ipDe(req)) }),
  rateLimit({
    ...opciones,
    limit: INTENTOS_POR_CUENTA,
    keyGenerator: (req) => `${ipKeyGenerator(ipDe(req))}|${identificadorDe(req)}`,
  }),
];

const demasiadas = (tipo) => (req, res) => {
  logger.evento(tipo, { ip: ipDe(req), idUsuario: req.user ? Number(req.user.idUsuario) : null });
  return errorResponse(res, 429, 'DEMASIADAS_SOLICITUDES', 'Ha hecho demasiadas solicitudes seguidas. Espere un momento e intente de nuevo.');
};

/** Clave del límite: el usuario del token verificado o, si no, la IP. */
const usuarioOIp = (req) => {
  const cabecera = req.headers.authorization ?? '';
  if (cabecera.startsWith('Bearer ')) {
    try {
      const { idUsuario } = jwt.verify(cabecera.slice(7).trim(), getJwtSecret(), { algorithms: ['HS256'] });
      if (idUsuario) return `u:${idUsuario}`;
    } catch {
      // token inválido o vencido: cuenta por IP
    }
  }
  return `ip:${ipKeyGenerator(ipDe(req))}`;
};

/** Límite general de la API: 300 peticiones por minuto por usuario o IP. */
const limitarApi = () =>
  rateLimit({
    windowMs: VENTANA_API_MS,
    limit: PETICIONES_API,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: usuarioOIp,
    handler: demasiadas('API_LIMITADA'),
  });

/** Límite de PDF: 30 cada 10 minutos por usuario. */
const limitarPdf = () =>
  rateLimit({
    windowMs: VENTANA_PDF_MS,
    limit: PDF_POR_USUARIO,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `u:${req.user.idUsuario}`,
    handler: demasiadas('PDF_LIMITADO'),
  });

module.exports = {
  cabeceras,
  limitarLogin,
  limitarApi,
  limitarPdf,
  INTENTOS_POR_CUENTA,
  INTENTOS_POR_IP,
  PDF_POR_USUARIO,
  PETICIONES_API,
};
