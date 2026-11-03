import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findMockUser, toLoginUser, toMeUser, MOCK_USERS_BY_ROLE } from './roles.mock.js';
import { REGLAS_PASSWORD } from '../src/utils/password.js';
import { createTemplatesStore } from './templates.store.js';
import { MOCK_USER_REQUESTS, MOCK_REQUEST_EXTRA, buildRequestDetail, variablesSistemaVista } from './requests.mock.js';
import {
  MOCK_PENDING_APPROVALS,
  MOCK_APPROVALS_HISTORY,
  MOCK_APPROVER_REQUESTS,
} from './approvals.mock.js';
import { MOCK_CARGOS, resolverPasos } from './catalogs.mock.js';

// Firmas de prueba; fuera de public/ para no publicarse con la aplicación
const CARPETA_FIRMAS = fileURLToPath(new URL('./firmas/', import.meta.url));

/** Valor de un `select` con «Otro»; el texto libre va en `{id}Otro`. */
const VALOR_OTRO = 'OTRO';

const usuarioPorId = (idUsuario) => Object.values(MOCK_USERS_BY_ROLE).find((u) => u.idUsuario === idUsuario) ?? null;

/** Usuario titular de una asignación, o null. */
const titularDe = (idAsignacion) => MOCK_CARGOS.find((c) => c.idAsignacion === idAsignacion)?.idUsuarioTitular ?? null;

/** Dueño de una solicitud; por defecto, el usuario 1. */
const duenioDe = (solicitud) => solicitud.idUsuario ?? 1;

/** Aprobación tal como la entrega la API: sin los campos internos del mock */
const aprobacionPublica = ({ idUsuarioAprobador: _u, secuencia: _s, ...publica }) => publica;

/** Indica si la aprobación es del usuario; las que no tienen dueño las ve cualquier aprobador. */
const esDe = (aprobacion, usuario) =>
  aprobacion.idUsuarioAprobador == null || aprobacion.idUsuarioAprobador === usuario?.idUsuario;

const sendJson = (res, status, body) => {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(body));
};

/** Responde un error con la forma { error: { codigo, mensaje, detalles } }. */
const sendError = (res, status, codigo, mensaje) =>
  sendJson(res, status, { error: { codigo, mensaje, detalles: [] } });

/** Arma la respuesta paginada de una lista. */
const paginate = (items, searchParams) => {
  const limite = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 50);
  const pagina = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
  const total = items.length;
  const totalPaginas = Math.ceil(total / limite);
  return {
    total,
    pagina,
    limite,
    totalPaginas,
    datos: items.slice((pagina - 1) * limite, pagina * limite),
  };
};

/** Usuario mock a partir del token `mock-jwt-token-siadu-{id}` */
const getMockUser = (req) => {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  const idMatch = token.match(/mock-jwt-token-siadu-(\d+)/);
  if (!idMatch) return null;
  const userId = parseInt(idMatch[1], 10);
  return Object.values(MOCK_USERS_BY_ROLE).find((u) => u.idUsuario === userId) || null;
};

/** Responde 401/403 y devuelve false si la petición no es de un administrador. */
const requireAdmin = (req, res) => {
  const usuario = getMockUser(req);
  if (!usuario) {
    sendError(res, 401, 'NO_AUTENTICADO', 'Sesión no válida o expirada. Inicie sesión nuevamente.');
    return false;
  }
  if (!usuario.roles?.includes('ADMINISTRADOR')) {
    sendError(res, 403, 'SIN_PERMISO', 'No cuenta con los permisos necesarios para realizar esta acción.');
    return false;
  }
  return true;
};

const readJsonBody = (req) =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve(null);
      }
    });
  });

/** Valida `datosJson` contra las variables; devuelve los `detalles` por campo. */
const validarDatosFormulario = (variables, datosJson) => {
  const detalles = [];
  variables.forEach((v) => {
    const valor = datosJson?.[v.id];
    // La confirmación legal debe estar marcada
    if (v.tipo === 'checkbox') {
      if (v.requerido && valor !== true) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} es obligatorio.` });
      return;
    }
    const vacio = valor === undefined || valor === null || String(valor).trim() === '';

    if (vacio) {
      if (v.requerido) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} es obligatorio.` });
      return;
    }

    const { min, max, patron } = v.validaciones || {};
    if (v.tipo === 'select' && v.opcionOtro && valor === VALOR_OTRO) {
      if (String(datosJson?.[`${v.id}Otro`] ?? '').trim() === '') {
        detalles.push({ campo: `${v.id}Otro`, mensaje: `Indica cuál es la opción de ${v.etiqueta}.` });
      }
    } else if (v.tipo === 'select' && !(v.opciones || []).some((o) => o.valor === valor)) {
      detalles.push({ campo: v.id, mensaje: `${v.etiqueta} tiene una opción no válida.` });
    } else if (v.tipo === 'number') {
      const n = Number(valor);
      if (Number.isNaN(n)) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} debe ser un número.` });
      else if (min !== undefined && n < min) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} debe ser al menos ${min}.` });
      else if (max !== undefined && n > max) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} no puede ser mayor que ${max}.` });
    } else if (v.tipo === 'text' || v.tipo === 'textarea') {
      const largo = String(valor).trim().length;
      if (min !== undefined && largo < min) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} debe tener al menos ${min} caracteres.` });
      else if (max !== undefined && largo > max) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} no puede superar ${max} caracteres.` });
      else if (patron && !new RegExp(patron).test(String(valor))) detalles.push({ campo: v.id, mensaje: `${v.etiqueta} no tiene el formato esperado.` });
    }
  });
  return detalles;
};

// Solicitudes creadas durante la sesión de desarrollo
const requestsStore = MOCK_USER_REQUESTS.map((r) => ({ ...r }));
const requestsExtra = { ...MOCK_REQUEST_EXTRA };

/** API simulada para el servidor de desarrollo de Vite; no entra en el build. */
export function viteDevMockPlugin() {
  const templatesStore = createTemplatesStore();
  const pendingStore = [...MOCK_PENDING_APPROVALS];
  const historyStore = [...MOCK_APPROVALS_HISTORY];
  let siguienteAprobacion = Math.max(0, ...pendingStore.map((a) => a.idAprobacion), ...historyStore.map((a) => a.idAprobacion)) + 1;

  /** Asigna un paso de la ruta a la bandeja de su titular. */
  const asignarPaso = (solicitud, paso) => {
    const solicitante = usuarioPorId(duenioDe(solicitud));
    pendingStore.push({
      idAprobacion: siguienteAprobacion++,
      idSolicitud: solicitud.idSolicitud,
      codigoDocumento: solicitud.codigoDocumento,
      nombrePlantilla: solicitud.nombrePlantilla,
      solicitanteNombre: solicitante ? `${solicitante.nombre} ${solicitante.apellido}`.trim() : 'Solicitante',
      solicitanteCedula: solicitante?.cedula ?? '',
      fechaAsignacion: new Date().toISOString(),
      idUsuarioAprobador: titularDe(paso.idAsignacion),
      secuencia: paso.secuencia,
    });
  };

  return {
    name: 'vite-dev-mock-server',
    apply: 'serve', // Solo activo en 'npm run dev', ignorado completamente en 'npm run build'
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const parsedUrl = new URL(req.url, 'http://localhost:5173');
        const pathname = parsedUrl.pathname;
        const searchParams = parsedUrl.searchParams;

        // `?mockEmpty=true` o la cabecera x-mock-empty simulan listas vacías
        const isMockEmpty =
          searchParams.get('mockEmpty') === 'true' ||
          req.headers['x-mock-empty'] === 'true';

        // GET /firmas/{archivo}.svg
        if (pathname.startsWith('/firmas/') && req.method === 'GET') {
          const archivo = path.join(CARPETA_FIRMAS, path.basename(pathname));
          if (archivo.endsWith('.svg') && fs.existsSync(archivo)) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.end(fs.readFileSync(archivo));
            return;
          }
        }

        // POST /api/auth/login
        if (pathname === '/api/auth/login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const { identificador, password, estamento } = JSON.parse(body || '{}');
              const usuario = findMockUser(estamento, identificador, password);

              sendJson(res, 200, {
                token: `mock-jwt-token-siadu-${usuario.idUsuario}`,
                usuario: toLoginUser(usuario),
              });
            } catch (err) {
              sendError(
                res,
                err.codigo === 'VALIDACION_FALLIDA' ? 400 : 401,
                err.codigo || 'CREDENCIALES_INVALIDAS',
                err.message || 'Error de autenticación.'
              );
            }
          });
          return;
        }

        // POST /api/auth/logout
        if (pathname === '/api/auth/logout' && req.method === 'POST') {
          if (!getMockUser(req)) {
            sendError(res, 401, 'NO_AUTENTICADO', 'Sesión no válida o expirada. Inicie sesión nuevamente.');
            return;
          }
          sendJson(res, 200, { ok: true, mensaje: 'Sesión finalizada exitosamente.' });
          return;
        }

        // GET /api/auth/me
        if (pathname === '/api/auth/me' && req.method === 'GET') {
          const authHeader = req.headers['authorization'] || '';
          const token = authHeader.replace(/^Bearer\s+/i, '').trim();

          if (!token) {
            sendError(res, 401, 'NO_AUTENTICADO', 'Sesión no válida o expirada. Inicie sesión nuevamente.');
            return;
          }

          const idMatch = token.match(/mock-jwt-token-siadu-(\d+)/);
          const userId = idMatch ? parseInt(idMatch[1], 10) : 1;
          const userEntry =
            Object.values(MOCK_USERS_BY_ROLE).find((u) => u.idUsuario === userId) ||
            MOCK_USERS_BY_ROLE.estudiante;

          sendJson(res, 200, toMeUser(userEntry));
          return;
        }

        // POST /api/auth/password
        if (pathname === '/api/auth/password' && req.method === 'POST') {
          const usuario = getMockUser(req);
          if (!usuario) {
            sendError(res, 401, 'NO_AUTENTICADO', 'Sesión no válida o expirada. Inicie sesión nuevamente.');
            return;
          }
          readJsonBody(req).then((body) => {
            const { passwordActual = '', passwordNueva = '' } = body || {};
            const detalle = (codigo, campo, mensaje) =>
              sendJson(res, 400, { error: { codigo, mensaje, detalles: [{ campo, mensaje }] } });
            if (passwordActual !== usuario.password) {
              detalle('PASSWORD_ACTUAL_INCORRECTA', 'passwordActual', 'La contraseña actual no es correcta.');
              return;
            }
            const faltan = REGLAS_PASSWORD.filter((r) => !r.cumple(passwordNueva));
            if (faltan.length > 0) {
              detalle('VALIDACION_FALLIDA', 'passwordNueva', `Falta: ${faltan.map((r) => r.texto.toLowerCase()).join(', ')}.`);
              return;
            }
            if (passwordNueva === passwordActual) {
              detalle('VALIDACION_FALLIDA', 'passwordNueva', 'La contraseña nueva debe ser distinta de la actual.');
              return;
            }
            // En memoria, hasta reiniciar el servidor
            usuario.password = passwordNueva;
            usuario.debeCambiarPassword = false;
            sendJson(res, 200, { ok: true, mensaje: 'Contraseña actualizada correctamente.', token: `mock-jwt-token-siadu-${usuario.idUsuario}` });
          });
          return;
        }

        // Con la contraseña inicial solo se permiten me, password y logout
        if (pathname.startsWith('/api/') && getMockUser(req)?.debeCambiarPassword) {
          sendError(res, 403, 'CAMBIO_PASSWORD_REQUERIDO', 'Debe cambiar su contraseña inicial antes de continuar.');
          return;
        }

        // GET /api/templates
        if (pathname === '/api/templates' && req.method === 'GET') {
          if (isMockEmpty) {
            sendJson(res, 200, paginate([], searchParams));
            return;
          }
          const items = templatesStore.inventario({
            estado: (searchParams.get('estado') || 'TODOS').toUpperCase(),
            search: searchParams.get('search') || '',
          });
          sendJson(res, 200, paginate(items, searchParams));
          return;
        }

        // GET /api/templates/summary
        if (pathname === '/api/templates/summary' && req.method === 'GET') {
          sendJson(res, 200, isMockEmpty ? { total: 0, activas: 0, borradores: 0, inactivas: 0 } : templatesStore.resumen());
          return;
        }

        // POST /api/templates
        if (pathname === '/api/templates' && req.method === 'POST') {
          if (!requireAdmin(req, res)) return;
          readJsonBody(req).then((body) => {
            const r = templatesStore.crear(body);
            sendJson(res, r.status, r.body);
          });
          return;
        }

        // GET /api/templates/catalog
        if (pathname === '/api/templates/catalog' && req.method === 'GET') {
          sendJson(res, 200, isMockEmpty ? [] : templatesStore.catalogo(getMockUser(req)?.estamentos ?? null));
          return;
        }

        // GET /api/templates/{id}?idVersion=
        const templateMatch = pathname.match(/^\/api\/templates\/(\d+)$/);
        if (templateMatch && req.method === 'GET') {
          const usuario = getMockUser(req);
          const idVersion = searchParams.get('idVersion');
          const r = templatesStore.detalle(
            parseInt(templateMatch[1], 10),
            idVersion ? parseInt(idVersion, 10) : null,
            !!usuario?.roles?.includes('ADMINISTRADOR'),
            usuario?.estamentos ?? null
          );
          // Solo el solicitante recibe la vista previa de sus datos automáticos
          if (r.status === 200) {
            const solicitante = usuario && !usuario.roles?.includes('ADMINISTRADOR');
            r.body = { ...r.body, variablesSistema: solicitante ? variablesSistemaVista(usuario) : null };
            // Pasos por escuela resueltos para el solicitante
            if (solicitante && r.body.flujo) {
              r.body.flujo = { ...r.body.flujo, pasos: resolverPasos(r.body.flujo.pasos, usuario).pasos };
            }
          }
          sendJson(res, r.status, r.body);
          return;
        }

        // PUT /api/templates/{id}
        if (templateMatch && req.method === 'PUT') {
          if (!requireAdmin(req, res)) return;
          readJsonBody(req).then((body) => {
            const r = templatesStore.actualizar(parseInt(templateMatch[1], 10), body || {});
            sendJson(res, r.status, r.body);
          });
          return;
        }

        // DELETE /api/templates/{id}
        if (templateMatch && req.method === 'DELETE') {
          if (!requireAdmin(req, res)) return;
          const r = templatesStore.eliminar(parseInt(templateMatch[1], 10));
          if (r.status === 204) {
            res.statusCode = 204;
            res.end();
          } else {
            sendJson(res, r.status, r.body);
          }
          return;
        }

        // POST /api/templates/{id}/versions
        const versionsMatch = pathname.match(/^\/api\/templates\/(\d+)\/versions$/);
        if (versionsMatch && req.method === 'POST') {
          if (!requireAdmin(req, res)) return;
          const r = templatesStore.nuevaVersion(parseInt(versionsMatch[1], 10));
          sendJson(res, r.status, r.body);
          return;
        }

        // POST /api/templates/{id}/publish
        const publishMatch = pathname.match(/^\/api\/templates\/(\d+)\/publish$/);
        if (publishMatch && req.method === 'POST') {
          if (!requireAdmin(req, res)) return;
          readJsonBody(req).then((body) => {
            const r = templatesStore.publicar(parseInt(publishMatch[1], 10), body || {});
            sendJson(res, r.status, r.body);
          });
          return;
        }

        // POST /api/templates/{id}/deactivate
        const deactivateMatch = pathname.match(/^\/api\/templates\/(\d+)\/deactivate$/);
        if (deactivateMatch && req.method === 'POST') {
          if (!requireAdmin(req, res)) return;
          readJsonBody(req).then((body) => {
            const r = templatesStore.desactivar(parseInt(deactivateMatch[1], 10), body || {});
            sendJson(res, r.status, r.body);
          });
          return;
        }

        // GET /api/catalogs/cargos y /api/flows
        if (pathname === '/api/catalogs/cargos' && req.method === 'GET') {
          sendJson(res, 200, templatesStore.cargos({ soloAprobadores: searchParams.get('soloAprobadores') === 'true' }));
          return;
        }
        if (pathname === '/api/flows' && req.method === 'GET') {
          sendJson(res, 200, templatesStore.listarFlujos());
          return;
        }
        if (pathname === '/api/flows' && req.method === 'POST') {
          if (!requireAdmin(req, res)) return;
          readJsonBody(req).then((body) => {
            const r = templatesStore.crearFlujo(body || {});
            sendJson(res, r.status, r.body);
          });
          return;
        }
        const flowMatch = pathname.match(/^\/api\/flows\/(\d+)$/);
        if (flowMatch && req.method === 'GET') {
          const r = templatesStore.obtenerFlujo(parseInt(flowMatch[1], 10));
          sendJson(res, r.status, r.body);
          return;
        }
        if (flowMatch && req.method === 'PUT') {
          if (!requireAdmin(req, res)) return;
          readJsonBody(req).then((body) => {
            const r = templatesStore.actualizarFlujo(parseInt(flowMatch[1], 10), body || {});
            sendJson(res, r.status, r.body);
          });
          return;
        }

        // GET /api/requests/me
        if (pathname === '/api/requests/me' && req.method === 'GET') {
          if (isMockEmpty) {
            sendJson(res, 200, []);
            return;
          }
          const usuario = getMockUser(req);
          const ordenadas = requestsStore.filter((r) => duenioDe(r) === usuario?.idUsuario).map(({ idUsuario: _u, ...r }) => r).sort(
            (a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)
          );
          sendJson(res, 200, ordenadas);
          return;
        }

        // POST /api/requests
        if (pathname === '/api/requests' && req.method === 'POST') {
          readJsonBody(req).then((body) => {
            const usuario = getMockUser(req);
            if (!usuario) {
              sendError(res, 401, 'NO_AUTENTICADO', 'Sesión no válida o expirada. Inicie sesión nuevamente.');
              return;
            }

            const idVersion = Number(body?.idVersion);
            if (!body || !Number.isInteger(idVersion) || typeof body.datosJson !== 'object' || body.datosJson === null) {
              sendJson(res, 400, {
                error: {
                  codigo: 'VALIDACION_FALLIDA',
                  mensaje: 'Hay campos requeridos o con formato incorrecto',
                  detalles: [{ campo: 'idVersion', mensaje: 'idVersion y datosJson son obligatorios.' }],
                },
              });
              return;
            }

            const plantilla = templatesStore.buscarVersion(idVersion);
            if (!plantilla) {
              sendError(res, 404, 'NO_ENCONTRADO', 'La versión de la plantilla no existe.');
              return;
            }
            if (!plantilla.audiencia.some((a) => usuario.estamentos?.includes(a))) {
              sendError(res, 404, 'NO_ENCONTRADO', 'La versión de la plantilla no existe.');
              return;
            }
            if (plantilla.estado !== 'ACTIVO') {
              sendError(res, 409, 'CONFLICTO_ESTADO', 'La plantilla cambió. Recarga el catálogo y vuelve a llenar el formulario.');
              return;
            }

            const detalles = validarDatosFormulario(plantilla.variableFormJson.variables, body.datosJson);
            if (detalles.length > 0) {
              sendJson(res, 400, {
                error: {
                  codigo: 'VALIDACION_FALLIDA',
                  mensaje: 'Hay campos requeridos o con formato incorrecto',
                  detalles,
                },
              });
              return;
            }

            const idSolicitud = Math.max(100, ...requestsStore.map((r) => r.idSolicitud)) + 1;
            const ahora = new Date().toISOString();
            const anio = new Date().getFullYear();
            // Los pasos por escuela se resuelven al radicar
            const { pasos: pasosRuta, error: errorRuta } = resolverPasos(plantilla.flujo?.pasos ?? [], usuario);
            if (errorRuta) {
              sendError(res, 409, 'APROBADOR_INVALIDO', errorRuta);
              return;
            }
            const primerPaso = pasosRuta[0];
            const codUnidadStr = String(plantilla.codUnidad || 24).padStart(2, '0');
            const nueva = {
              idSolicitud,
              codigoDocumento: `UP${codUnidadStr}-${anio}-${String(idSolicitud).padStart(4, '0')}`,
              nombrePlantilla: plantilla.nombre,
              estado: 'PENDIENTE',
              fechaCreacion: ahora,
              resolucion: null,
              motivoRechazo: null,
            };
            nueva.idUsuario = usuario.idUsuario;
            requestsStore.push(nueva);
            // El primer paso de la ruta queda en curso
            const ruta = pasosRuta.map((p, i) => ({
              ...p,
              estado: i === 0 ? 'PENDIENTE' : null,
              fechaAccion: null,
              comentario: null,
            }));
            // Solo las variables de la versión y sus «…Otro»
            const claves = new Set(plantilla.variableFormJson.variables.flatMap((v) => (v.tipo === 'select' && v.opcionOtro ? [v.id, `${v.id}Otro`] : [v.id])));
            const datosJson = Object.fromEntries(Object.entries(body.datosJson).filter(([clave]) => claves.has(clave)));
            requestsExtra[idSolicitud] = { idVersion, datosJson, ...(ruta.length ? { ruta } : {}) };
            if (ruta.length) asignarPaso(nueva, ruta[0]);

            sendJson(res, 201, {
              idSolicitud,
              codigoDocumento: nueva.codigoDocumento,
              estado: nueva.estado,
              fechaCreacion: nueva.fechaCreacion,
              mensaje: primerPaso
                ? `Su solicitud ha sido enviada con éxito al ${primerPaso.nombreCargo}.`
                : 'Su solicitud ha sido enviada con éxito.',
            });
          });
          return;
        }

        // GET /api/requests/{id}
        const requestMatch = pathname.match(/^\/api\/requests\/(\d+)$/);
        if (requestMatch && req.method === 'GET') {
          const usuario = getMockUser(req);
          if (!usuario) {
            sendError(res, 401, 'NO_AUTENTICADO', 'Sesión no válida o expirada. Inicie sesión nuevamente.');
            return;
          }
          const idSolicitud = parseInt(requestMatch[1], 10);

          // Solicitudes de otros usuarios
          const ajena = MOCK_APPROVER_REQUESTS[idSolicitud];
          if (ajena) {
            const pendiente = pendingStore.find((a) => a.idSolicitud === idSolicitud);
            const resuelta = historyStore.find((a) => a.idSolicitud === idSolicitud);
            const base = pendiente || resuelta;
            const resumen = {
              idSolicitud,
              codigoDocumento: base.codigoDocumento,
              nombrePlantilla: base.nombrePlantilla,
              estado: pendiente ? 'PENDIENTE' : resuelta.decision,
              fechaCreacion: ajena.fechaCreacion,
              resolucion: resuelta ? { nombreCargo: 'Director/a de Escuela', titular: null, fecha: resuelta.fechaAccion } : null,
              motivoRechazo: resuelta?.decision === 'RECHAZADO' ? resuelta.comentario : null,
            };
            const detalle = buildRequestDetail(resumen, ajena, ajena.solicitante, templatesStore.buscarVersion);
            detalle.solicitante.idUsuario = 900 + idSolicitud;
            detalle.idAprobacionPendiente =
              pendiente && usuario.roles?.includes('APROBADOR') ? pendiente.idAprobacion : null;
            sendJson(res, 200, detalle);
            return;
          }

          const resumen = requestsStore.find((r) => r.idSolicitud === idSolicitud);
          const extra = requestsExtra[idSolicitud];
          // Solo la ven su dueño y los aprobadores de su ruta
          const participa = extra?.ruta?.some((p) => titularDe(p.idAsignacion) === usuario.idUsuario);
          if (!resumen || !extra || (duenioDe(resumen) !== usuario.idUsuario && !participa)) {
            sendError(res, 404, 'NO_ENCONTRADO', 'La solicitud no existe.');
            return;
          }
          const { idUsuario: _u, ...resumenPublico } = resumen;
          const detalle = buildRequestDetail(resumenPublico, extra, usuarioPorId(duenioDe(resumen)) ?? usuario, templatesStore.buscarVersion);
          const pendiente = pendingStore.find((a) => a.idSolicitud === idSolicitud && a.idUsuarioAprobador === usuario.idUsuario);
          detalle.idAprobacionPendiente = pendiente?.idAprobacion ?? null;
          sendJson(res, 200, detalle);
          return;
        }

        // GET /api/approvals/pending
        if (pathname === '/api/approvals/pending' && req.method === 'GET') {
          const usuario = getMockUser(req);
          sendJson(res, 200, isMockEmpty ? [] : pendingStore.filter((a) => esDe(a, usuario)).map(aprobacionPublica));
          return;
        }

        // GET /api/approvals/history
        if (pathname === '/api/approvals/history' && req.method === 'GET') {
          if (isMockEmpty) {
            sendJson(res, 200, paginate([], searchParams));
            return;
          }

          const decision = (searchParams.get('decision') || '').toUpperCase();
          const desde = searchParams.get('desde');
          const hasta = searchParams.get('hasta');

          const detalles = [];
          if (decision && decision !== 'APROBADO' && decision !== 'RECHAZADO') {
            detalles.push({ campo: 'decision', mensaje: 'La decisión debe ser APROBADO o RECHAZADO.' });
          }
          if (desde && Number.isNaN(new Date(desde).getTime())) detalles.push({ campo: 'desde', mensaje: 'Fecha inválida.' });
          if (hasta && Number.isNaN(new Date(hasta).getTime())) detalles.push({ campo: 'hasta', mensaje: 'Fecha inválida.' });
          if (detalles.length) {
            sendJson(res, 400, { error: { codigo: 'VALIDACION_FALLIDA', mensaje: 'Hay filtros con formato incorrecto.', detalles } });
            return;
          }

          const usuario = getMockUser(req);
          const filtradas = historyStore.filter((a) => {
            const t = new Date(a.fechaAccion).getTime();
            return (
              esDe(a, usuario) &&
              (!decision || a.decision === decision) &&
              (!desde || t >= new Date(desde).getTime()) &&
              (!hasta || t < new Date(hasta).getTime())
            );
          }).sort((a, b) => new Date(b.fechaAccion) - new Date(a.fechaAccion));

          sendJson(res, 200, paginate(filtradas.map(aprobacionPublica), searchParams));
          return;
        }

        // POST /api/approvals/{id}/decision
        const decisionMatch = pathname.match(/^\/api\/approvals\/(\d+)\/decision$/);
        if (decisionMatch && req.method === 'POST') {
          readJsonBody(req).then((body) => {
            const idAprobacion = parseInt(decisionMatch[1], 10);
            const usuario = getMockUser(req);
            const idx = pendingStore.findIndex((a) => a.idAprobacion === idAprobacion && esDe(a, usuario));
            if (idx === -1) {
              sendError(res, 404, 'NO_ENCONTRADO', 'La aprobación no existe o ya fue resuelta.');
              return;
            }
            const decision = body?.decision;
            const comentario = (body?.comentario || '').trim();
            if (decision !== 'APROBADO' && decision !== 'RECHAZADO') {
              sendError(res, 400, 'VALIDACION_FALLIDA', 'La decisión debe ser APROBADO o RECHAZADO.');
              return;
            }
            if (comentario.length > 1000) {
              sendJson(res, 400, {
                error: {
                  codigo: 'VALIDACION_FALLIDA',
                  mensaje: 'El comentario no puede superar 1000 caracteres.',
                  detalles: [{ campo: 'comentario', mensaje: 'Máximo 1000 caracteres.' }],
                },
              });
              return;
            }
            if (decision === 'RECHAZADO' && !comentario) {
              sendJson(res, 400, {
                error: {
                  codigo: 'VALIDACION_FALLIDA',
                  mensaje: 'El comentario es obligatorio al rechazar.',
                  detalles: [{ campo: 'comentario', mensaje: 'Indica el motivo del rechazo.' }],
                },
              });
              return;
            }
            const [{ fechaAsignacion: _fechaAsignacion, ...item }] = pendingStore.splice(idx, 1);
            const fechaAccion = new Date().toISOString();
            historyStore.unshift({
              ...item,
              decision,
              comentario: comentario || null,
              fechaAccion,
            });

            // Resuelve el paso y avanza o cierra la solicitud
            let estadoSolicitud = decision;
            const solicitud = requestsStore.find((r) => r.idSolicitud === item.idSolicitud);
            const ruta = requestsExtra[item.idSolicitud]?.ruta;
            const paso = ruta?.find((p) => p.secuencia === item.secuencia);
            if (solicitud && paso) {
              Object.assign(paso, { estado: decision, fechaAccion, comentario: comentario || null });
              const siguiente = ruta.find((p) => p.secuencia === paso.secuencia + 1);
              const resolucion = { nombreCargo: paso.nombreCargo, titular: paso.titular ?? null, fecha: fechaAccion };
              if (decision === 'APROBADO' && siguiente) {
                siguiente.estado = 'PENDIENTE';
                asignarPaso(solicitud, siguiente);
                estadoSolicitud = 'PENDIENTE';
              } else {
                Object.assign(solicitud, {
                  estado: decision,
                  resolucion,
                  motivoRechazo: decision === 'RECHAZADO' ? comentario : null,
                });
              }
            }

            sendJson(res, 200, {
              idAprobacion,
              estadoAprobacion: decision,
              estadoSolicitud,
              fechaAccion,
              solicitudFinalizada: estadoSolicitud !== 'PENDIENTE',
              mensaje: 'Decisión registrada exitosamente.',
            });
          });
          return;
        }

        // GET /api/documents/:requestId/pdf
        const pdfMatch = pathname.match(/^\/api\/documents\/(\d+)\/pdf$/);
        if (pdfMatch && req.method === 'GET') {
          const reqId = pdfMatch[1];
          const dummyPdf = Buffer.from(
            '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n'
          );
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="DOC-FIEC-${reqId}.pdf"`);
          res.statusCode = 200;
          res.end(dummyPdf);
          return;
        }

        // Rutas no simuladas pasan al proxy
        next();
      });
    },
  };
}
