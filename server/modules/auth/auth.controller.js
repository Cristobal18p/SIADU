const authService = require('./auth.service');
const { errorInterno } = require('../../utils/errorResponse');
const logger = require('../../utils/logger');
const { ipDe } = require('../../utils/ip');

const ESTAMENTOS = ['ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO'];

const errorBody = (codigo, mensaje, detalles) => ({
  error: { codigo, mensaje, ...(detalles ? { detalles } : {}) },
});

const validacionFallida = (res, detalles) =>
  res.status(400).json(errorBody('VALIDACION_FALLIDA', 'Hay campos requeridos o con formato incorrecto', detalles));

const textoVacio = (valor) => typeof valor !== 'string' || valor.trim() === '';


class AuthController {

  async login(req, res) {
    try {
      const { identificador, password, estamento } = req.body || {};
      const detalles = [];

      if (textoVacio(identificador)) {
        detalles.push({ campo: 'identificador', mensaje: 'El identificador (cédula o correo) es obligatorio.' });
      }
      if (textoVacio(password)) {
        detalles.push({ campo: 'password', mensaje: 'La contraseña es obligatoria.' });
      }
      if (textoVacio(estamento)) {
        detalles.push({ campo: 'estamento', mensaje: 'El estamento institucional es obligatorio.' });
      } else if (!ESTAMENTOS.includes(estamento.trim().toUpperCase())) {
        detalles.push({ campo: 'estamento', mensaje: `El estamento debe ser uno de: ${ESTAMENTOS.join(', ')}.` });
      }

      if (detalles.length > 0) return validacionFallida(res, detalles);

      const result = await authService.login({
        identificador,
        password,
        estamento: estamento.trim().toUpperCase(),
      });
      logger.evento('LOGIN_OK', { ip: ipDe(req), idUsuario: result?.usuario?.idUsuario ?? null });
      return res.status(200).json(result);
    } catch (err) {
      if (err.codigo === 'CREDENCIALES_INVALIDAS') {
        logger.evento('LOGIN_FALLIDO', { ip: ipDe(req), identificador: logger.enmascarar(req.body?.identificador) });
        return res.status(401).json(errorBody(err.codigo, err.message));
      }
      return errorInterno(res, 'AuthController.login', err, 'Ocurrió un error al procesar el inicio de sesión.');
    }
  }

  async getMe(req, res) {
    try {
      const perfil = await authService.getMe(req.user.idUsuario, req.user.ultimoAcceso ?? null);
      return res.status(200).json(perfil);
    } catch (err) {
      if (err.codigo === 'NO_AUTENTICADO') {
        return res.status(401).json(errorBody(err.codigo, err.message));
      }
      return errorInterno(res, 'AuthController.getMe', err, 'Error al consultar el perfil del usuario autenticado.');
    }
  }

  async changePassword(req, res) {
    try {
      const { passwordActual, passwordNueva } = req.body || {};
      const detalles = [];

      if (textoVacio(passwordActual)) {
        detalles.push({ campo: 'passwordActual', mensaje: 'La contraseña actual es obligatoria.' });
      }
      if (textoVacio(passwordNueva)) {
        detalles.push({ campo: 'passwordNueva', mensaje: 'La contraseña nueva es obligatoria.' });
      }
      if (detalles.length > 0) return validacionFallida(res, detalles);

      const result = await authService.changePassword(req.user.idUsuario, { passwordActual, passwordNueva }, req.user);
      logger.evento('PASSWORD_CAMBIADA', { ip: ipDe(req), idUsuario: Number(req.user.idUsuario) });
      return res.status(200).json(result);
    } catch (err) {
      if (err.codigo === 'PASSWORD_ACTUAL_INCORRECTA' || err.codigo === 'VALIDACION_FALLIDA') {
        logger.evento('PASSWORD_RECHAZADA', { ip: ipDe(req), idUsuario: Number(req.user?.idUsuario), motivo: err.codigo });
        return res.status(400).json(errorBody(err.codigo, err.message, err.detalles));
      }
      if (err.codigo === 'NO_AUTENTICADO') {
        return res.status(401).json(errorBody(err.codigo, err.message));
      }
      return errorInterno(res, 'AuthController.changePassword', err, 'Error al cambiar la contraseña.');
    }
  }

  async logout(req, res) {
    try {
      const result = await authService.logout(req.user.idUsuario);
      logger.evento('LOGOUT', { ip: ipDe(req), idUsuario: Number(req.user.idUsuario) });
      return res.status(200).json(result);
    } catch (err) {
      return errorInterno(res, 'AuthController.logout', err, 'Error al cerrar la sesión.');
    }
  }
}

module.exports = new AuthController();
