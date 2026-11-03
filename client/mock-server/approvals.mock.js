/** Datos de prueba de la bandeja, el historial y las solicitudes del aprobador. */

// Las solicitudes resueltas van al historial de quien decidió; las pendientes, a la bandeja del director de la escuela
const LEO = 4;
const MILA = 5;
const KAREN = 9;
const IRENE = 12;
const JULIO = 13;
const SOLICITANTE = { solicitanteNombre: 'Elena Demo', solicitanteCedula: '9-000-0005' };
const SOLICITANTE_FABIO = { solicitanteNombre: 'Fabio Ejemplo', solicitanteCedula: '9-000-0006' };
const SOLICITANTE_GINA = { solicitanteNombre: 'Gina Prueba', solicitanteCedula: '9-000-0007' };
const SOLICITANTE_HUGO = { solicitanteNombre: 'Hugo Ejemplo', solicitanteCedula: '9-000-0008' };
const PRACTICA = 'Inscripción de Práctica Profesional';
const RETIRO = 'Solicitud de Retiro de Asignatura';
const MATRICULA = 'Certificación de Matrícula Oficial';
const CAMBIO = 'Solicitud de Cambio de Grupo';
const CONSTANCIA = 'Constancia de Trabajo';
const PERMISO = 'Solicitud de Permiso Temporal';
const VACACIONES = 'Solicitud de Vacaciones';
const USO_ESPACIO = 'Solicitud de Uso de Aula o Laboratorio';

export const MOCK_PENDING_APPROVALS = [
  {
    idAprobacion: 48,
    idSolicitud: 105,
    codigoDocumento: 'UP24-2026-0105',
    nombrePlantilla: RETIRO,
    ...SOLICITANTE,
    fechaAsignacion: '2026-10-17T16:20:00Z',
    idUsuarioAprobador: LEO,
    secuencia: 1,
  },
  {
    idAprobacion: 51,
    idSolicitud: 108,
    codigoDocumento: 'UP24-2026-0108',
    nombrePlantilla: RETIRO,
    ...SOLICITANTE_HUGO,
    fechaAsignacion: '2026-10-18T09:30:00Z',
    idUsuarioAprobador: KAREN,
    secuencia: 1,
  },
  {
    idAprobacion: 59,
    idSolicitud: 111,
    codigoDocumento: 'UP24-2026-0111',
    nombrePlantilla: USO_ESPACIO,
    ...SOLICITANTE_FABIO,
    fechaAsignacion: '2026-10-18T14:10:00Z',
    idUsuarioAprobador: MILA,
    secuencia: 1,
  },
  {
    idAprobacion: 60,
    idSolicitud: 113,
    codigoDocumento: 'UP24-2026-0113',
    nombrePlantilla: VACACIONES,
    ...SOLICITANTE_GINA,
    fechaAsignacion: '2026-10-18T09:15:00Z',
    idUsuarioAprobador: JULIO,
    secuencia: 2,
  },
];

export const MOCK_APPROVALS_HISTORY = [
  { idAprobacion: 41, idSolicitud: 101, codigoDocumento: 'UP24-2026-0101', nombrePlantilla: PRACTICA, ...SOLICITANTE, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-09T10:00:00Z', idUsuarioAprobador: LEO, secuencia: 1 },
  { idAprobacion: 42, idSolicitud: 101, codigoDocumento: 'UP24-2026-0101', nombrePlantilla: PRACTICA, ...SOLICITANTE, decision: 'APROBADO', comentario: 'Autorización emitida.', fechaAccion: '2026-10-10T15:30:00Z', idUsuarioAprobador: MILA, secuencia: 2 },
  { idAprobacion: 43, idSolicitud: 102, codigoDocumento: 'UP24-2026-0102', nombrePlantilla: RETIRO, ...SOLICITANTE, decision: 'APROBADO', comentario: 'Retiro dentro del plazo reglamentario.', fechaAccion: '2026-10-07T09:20:00Z', idUsuarioAprobador: LEO, secuencia: 1 },
  { idAprobacion: 44, idSolicitud: 103, codigoDocumento: 'UP24-2026-0103', nombrePlantilla: MATRICULA, ...SOLICITANTE, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-13T08:45:00Z', idUsuarioAprobador: MILA, secuencia: 1 },
  { idAprobacion: 45, idSolicitud: 104, codigoDocumento: 'UP24-2026-0104', nombrePlantilla: CAMBIO, ...SOLICITANTE, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-15T11:00:00Z', idUsuarioAprobador: LEO, secuencia: 1 },
  { idAprobacion: 46, idSolicitud: 104, codigoDocumento: 'UP24-2026-0104', nombrePlantilla: CAMBIO, ...SOLICITANTE, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-16T09:15:00Z', idUsuarioAprobador: MILA, secuencia: 2 },
  { idAprobacion: 47, idSolicitud: 106, codigoDocumento: 'UP24-2026-0106', nombrePlantilla: CAMBIO, ...SOLICITANTE, decision: 'RECHAZADO', comentario: 'El grupo solicitado ya alcanzó su cupo máximo.', fechaAccion: '2026-10-14T10:10:00Z', idUsuarioAprobador: LEO, secuencia: 1 },
  { idAprobacion: 49, idSolicitud: 107, codigoDocumento: 'UP24-2026-0107', nombrePlantilla: PRACTICA, ...SOLICITANTE_HUGO, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-10T09:00:00Z', idUsuarioAprobador: KAREN, secuencia: 1 },
  { idAprobacion: 50, idSolicitud: 107, codigoDocumento: 'UP24-2026-0107', nombrePlantilla: PRACTICA, ...SOLICITANTE_HUGO, decision: 'APROBADO', comentario: 'Autorización emitida.', fechaAccion: '2026-10-11T14:20:00Z', idUsuarioAprobador: MILA, secuencia: 2 },
  { idAprobacion: 52, idSolicitud: 109, codigoDocumento: 'UP24-2026-0109', nombrePlantilla: CONSTANCIA, ...SOLICITANTE_FABIO, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-06T11:15:00Z', idUsuarioAprobador: MILA, secuencia: 1 },
  { idAprobacion: 53, idSolicitud: 110, codigoDocumento: 'UP24-2026-0110', nombrePlantilla: PERMISO, ...SOLICITANTE_FABIO, decision: 'APROBADO', comentario: 'Clases cubiertas por el profesor suplente.', fechaAccion: '2026-10-09T09:40:00Z', idUsuarioAprobador: IRENE, secuencia: 1 },
  { idAprobacion: 54, idSolicitud: 110, codigoDocumento: 'UP24-2026-0110', nombrePlantilla: PERMISO, ...SOLICITANTE_FABIO, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-10T16:00:00Z', idUsuarioAprobador: JULIO, secuencia: 2 },
  { idAprobacion: 55, idSolicitud: 112, codigoDocumento: 'UP24-2026-0112', nombrePlantilla: VACACIONES, ...SOLICITANTE_GINA, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-02T10:00:00Z', idUsuarioAprobador: MILA, secuencia: 1 },
  { idAprobacion: 56, idSolicitud: 112, codigoDocumento: 'UP24-2026-0112', nombrePlantilla: VACACIONES, ...SOLICITANTE_GINA, decision: 'APROBADO', comentario: 'Aprobado.', fechaAccion: '2026-10-03T15:30:00Z', idUsuarioAprobador: JULIO, secuencia: 2 },
  { idAprobacion: 57, idSolicitud: 113, codigoDocumento: 'UP24-2026-0113', nombrePlantilla: VACACIONES, ...SOLICITANTE_GINA, decision: 'APROBADO', comentario: null, fechaAccion: '2026-10-18T09:15:00Z', idUsuarioAprobador: MILA, secuencia: 1 },
  { idAprobacion: 58, idSolicitud: 114, codigoDocumento: 'UP24-2026-0114', nombrePlantilla: USO_ESPACIO, ...SOLICITANTE_GINA, decision: 'RECHAZADO', comentario: 'El auditorio ya está reservado en esa fecha.', fechaAccion: '2026-10-13T10:30:00Z', idUsuarioAprobador: MILA, secuencia: 1 },
];

/** Solicitudes de otros usuarios que abre el aprobador, por idSolicitud. */
export const MOCK_APPROVER_REQUESTS = {};
