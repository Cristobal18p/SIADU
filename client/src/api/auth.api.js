import http from './http';
import { validateIdentifierFormat } from '../utils/validators';

/** Autenticación y sesión. */
export const authApi = {
  /**
   * Inicia sesión (POST /auth/login) y guarda el token.
   * @param {Object} credentials
   * @param {string} credentials.identificador - Cédula o correo institucional
   * @param {string} credentials.password
   * @param {string} credentials.estamento - ESTUDIANTE, PROFESOR o ADMINISTRATIVO
   * @returns {Promise<{ token: string, usuario: import('./tipos').UsuarioLogin }>}
   */
  async login({ identificador, password, estamento }) {
    const cleanId = (identificador || '').trim();

    const idValidation = validateIdentifierFormat(cleanId);
    if (!idValidation.isValid) {
      const err = new Error(idValidation.error);
      err.codigo = 'VALIDACION_FALLIDA';
      throw err;
    }

    if (!password || !password.trim()) {
      const err = new Error('La contraseña es obligatoria.');
      err.codigo = 'VALIDACION_FALLIDA';
      throw err;
    }

    const response = await http.post('/auth/login', {
      identificador: idValidation.cleanValue,
      password,
      estamento: (estamento || 'estudiante').toUpperCase(),
    });

    if (response?.token) {
      localStorage.setItem('siadu_token', response.token);
    }

    return response;
  },

  /**
   * Perfil del usuario en sesión (GET /auth/me). Sin token o ante un 401 devuelve `null` y cierra la sesión local.
   * @returns {Promise<import('./tipos').UsuarioPerfil|null>}
   */
  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await http.get('/auth/me');
      return response;
    } catch (error) {
      if (error.status === 401) {
        this.logout();
        return null;
      }
      throw error;
    }
  },

  /**
   * Cambia la contraseña (POST /auth/password) y guarda el token nuevo que entrega el servidor.
   * @param {{ passwordActual: string, passwordNueva: string }} datos
   * @returns {Promise<{ ok: boolean, mensaje: string, token?: string }>}
   */
  async cambiarPassword({ passwordActual, passwordNueva }) {
    const response = await http.post('/auth/password', { passwordActual, passwordNueva });
    if (response?.token) {
      localStorage.setItem('siadu_token', response.token);
    }
    return response;
  },

  /**
   * Cierra la sesión: descarta el token y avisa al servidor, que revoca las sesiones del usuario.
   */
  logout() {
    const token = this.getToken();
    localStorage.removeItem('siadu_token');
    if (token) {
      http
        .post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => {});
    }
  },

  /**
   * Token JWT guardado en el navegador.
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('siadu_token');
  },
};

export default authApi;
