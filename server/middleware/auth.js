const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { getJwtSecret } = require('../config/token');
const cuentaCache = require('../utils/cuentaCache');
const { errorInterno } = require('../utils/errorResponse');

const noAutenticado = (res) =>
  res.status(401).json({
    error: {
      codigo: 'NO_AUTENTICADO',
      mensaje: 'Sesión no válida o expirada. Inicie sesión nuevamente.',
    },
  });

/** Valida el JWT, que no esté revocado (`vs` = `version_sesion`), la cuenta activa y la contraseña inicial cambiada. */
const autenticar = ({ permitirClaveInicial = false } = {}) =>
  async function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return noAutenticado(res);
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.substring(7).trim(), getJwtSecret(), { algorithms: ['HS256'] });
    } catch (err) {
      return noAutenticado(res);
    }

    try {
      let cuenta = cuentaCache.obtener(decoded.idUsuario);
      if (!cuenta) {
        cuenta = await prisma.usuario.findUnique({
          where: { idUsuario: BigInt(decoded.idUsuario) },
          select: { estado: true, claveInicial: true, versionSesion: true },
        });
        if (cuenta) cuentaCache.guardar(decoded.idUsuario, cuenta);
      }

      if (!cuenta || cuenta.estado !== 'A' || (decoded.vs ?? 0) !== (cuenta.versionSesion ?? 0)) {
        return noAutenticado(res);
      }

      if (cuenta.claveInicial && !permitirClaveInicial) {
        return res.status(403).json({
          error: {
            codigo: 'CAMBIO_PASSWORD_REQUERIDO',
            mensaje: 'Debe cambiar su contraseña inicial antes de continuar.',
          },
        });
      }

      req.user = { ...decoded, debeCambiarPassword: cuenta.claveInicial };
      return next();
    } catch (err) {
      return errorInterno(res, 'authMiddleware', err, 'Error al validar la sesión.');
    }
  };

module.exports = autenticar();
module.exports.permitirClaveInicial = autenticar({ permitirClaveInicial: true });
