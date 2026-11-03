import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** Cliente HTTP de la API: añade el token y normaliza los errores. */
export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('siadu_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const manejarError = (error) => {
  const status = error.response?.status;
  const backendError = error.response?.data?.error;

  // Tiempo de espera agotado
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    const tiempoErr = new Error('El servidor tardó demasiado en responder. Inténtalo de nuevo en unos momentos.');
    tiempoErr.codigo = 'ERROR_TIEMPO_AGOTADO';
    return Promise.reject(tiempoErr);
  }

  if (error.code === 'ERR_NETWORK' || !error.response) {
    console.warn('[Error de Conexión de Red]:', error.message);

    const netErr = new Error(
      'No fue posible establecer conexión con el servidor. Verifique su conexión o intente más tarde.'
    );
    netErr.codigo = 'ERROR_CONEXION';
    netErr.isNetworkError = true;
    return Promise.reject(netErr);
  }

  // En desarrollo, el proxy de Vite responde 500 sin cuerpo si no hay backend
  if (import.meta.env.DEV && status >= 500 && !backendError && !error.response?.data) {
    const sinBackend = new Error(
      'No hay un servidor en http://localhost:7001. Para probar solo la interfaz, inicie el cliente con «npm run dev:mocks».'
    );
    sinBackend.codigo = 'ERROR_CONEXION';
    sinBackend.isNetworkError = true;
    return Promise.reject(sinBackend);
  }

  if (status >= 500) {
    console.error('[Error Técnico Servidor]:', {
      status,
      url: error.config?.url,
      data: error.response?.data,
      message: error.message,
    });

    const userErr = new Error(
      'Ocurrió un inconveniente temporal con el servicio. Por favor, intente más tarde.'
    );
    userErr.codigo = 'ERROR_INTERNO';
    userErr.status = status;
    return Promise.reject(userErr);
  }

  if (backendError) {
    // Contraseña inicial: App.jsx muestra la pantalla de cambio
    if (status === 403 && backendError.codigo === 'CAMBIO_PASSWORD_REQUERIDO') {
      window.dispatchEvent(new Event('siadu:cambio-password-requerido'));
    }
    const err = new Error(backendError.mensaje || 'Solicitud no procesada');
    err.codigo = backendError.codigo || 'ERROR_CLIENTE';
    err.detalles = backendError.detalles;
    err.status = status;
    return Promise.reject(err);
  }

  // Sin cuerpo de error: mensaje según el código HTTP
  const MENSAJES = {
    400: 'Los datos enviados no son válidos.',
    401: 'Credenciales incorrectas o sesión no autorizada.',
    403: 'No cuenta con los permisos necesarios para realizar esta acción.',
    404: 'No se encontró lo que buscas.',
    409: 'La operación no se puede realizar en el estado actual. Actualiza la pantalla e inténtalo de nuevo.',
  };
  const fallbackErr = new Error(MENSAJES[status] ?? 'No se pudo completar la solicitud.');
  fallbackErr.codigo = 'ERROR_SOLICITUD';
  fallbackErr.status = status;
  return Promise.reject(fallbackErr);
};

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // En descargas el error llega como blob; se lee para conservar el mensaje
    const data = error.response?.data;
    if (data instanceof Blob && data.type?.includes('json')) {
      return data
        .text()
        .then((texto) => {
          try {
            error.response.data = JSON.parse(texto);
          } catch {
            // se conserva la respuesta tal cual
          }
          return manejarError(error);
        });
    }
    return manejarError(error);
  }
);

export default http;
