/** Solicitudes de prueba y armado de su detalle. */
import { MOCK_TEMPLATE_DETAILS } from './templates.mock.js';
import { MOCK_CARGOS } from './catalogs.mock.js';

/** Asignaciones de aprobadores con cuenta y firma en mock-server/firmas. */
const ESCUELA = 31;
const ESCUELA_COMERCIO = 33;
const VICEDECANATO = 40;
const DECANATO = 39;
const SECRETARIA_ADMINISTRATIVA = 32;

/** Paso de la ruta de una solicitud, con su estado, fecha y comentario. */
const paso = (secuencia, idAsignacion, resto) => {
  const cargo = MOCK_CARGOS.find((c) => c.idAsignacion === idAsignacion);
  return {
    secuencia,
    idAsignacion,
    nombreCargo: cargo.nombreCargo,
    titular: cargo.titularActual,
    area: cargo.area,
    reqFirma: true,
    comentario: null,
    ...resto,
  };
};

const aprobado = (fechaAccion, comentario = null) => ({ estado: 'APROBADO', fechaAccion, comentario });
const resolucionDe = (p) => ({ nombreCargo: p.nombreCargo, titular: p.titular, fecha: p.fechaAccion });

/** Rutas con lo que hizo cada paso */
const RUTAS = {
  101: [paso(1, ESCUELA, aprobado('2026-10-09T10:00:00Z')), paso(2, SECRETARIA_ADMINISTRATIVA, aprobado('2026-10-10T15:30:00Z', 'Autorización emitida.'))],
  102: [paso(1, ESCUELA, aprobado('2026-10-07T09:20:00Z', 'Retiro dentro del plazo reglamentario.'))],
  103: [paso(1, SECRETARIA_ADMINISTRATIVA, aprobado('2026-10-13T08:45:00Z'))],
  104: [paso(1, ESCUELA, aprobado('2026-10-15T11:00:00Z')), paso(2, SECRETARIA_ADMINISTRATIVA, aprobado('2026-10-16T09:15:00Z'))],
  105: [paso(1, ESCUELA, { estado: 'PENDIENTE', fechaAccion: null })],
  // Estudiante de Comercio Electrónico: su trámite va a la directora de esa escuela
  107: [paso(1, ESCUELA_COMERCIO, aprobado('2026-10-10T09:00:00Z')), paso(2, SECRETARIA_ADMINISTRATIVA, aprobado('2026-10-11T14:20:00Z', 'Autorización emitida.'))],
  108: [paso(1, ESCUELA_COMERCIO, { estado: 'PENDIENTE', fechaAccion: null })],
  // Personal docente y administrativo
  109: [paso(1, SECRETARIA_ADMINISTRATIVA, aprobado('2026-10-06T11:15:00Z'))],
  110: [paso(1, VICEDECANATO, aprobado('2026-10-09T09:40:00Z', 'Clases cubiertas por el profesor suplente.')), paso(2, DECANATO, aprobado('2026-10-10T16:00:00Z'))],
  111: [paso(1, SECRETARIA_ADMINISTRATIVA, { estado: 'PENDIENTE', fechaAccion: null })],
  112: [paso(1, SECRETARIA_ADMINISTRATIVA, aprobado('2026-10-02T10:00:00Z')), paso(2, DECANATO, aprobado('2026-10-03T15:30:00Z', 'Aprobado.'))],
  113: [paso(1, SECRETARIA_ADMINISTRATIVA, aprobado('2026-10-18T09:15:00Z')), paso(2, DECANATO, { estado: 'PENDIENTE', fechaAccion: null })],
  114: [paso(1, SECRETARIA_ADMINISTRATIVA, { estado: 'RECHAZADO', fechaAccion: '2026-10-13T10:30:00Z', comentario: 'El auditorio ya está reservado en esa fecha.' })],
  106: [
    paso(1, ESCUELA, { estado: 'RECHAZADO', fechaAccion: '2026-10-14T10:10:00Z', comentario: 'El grupo solicitado ya alcanzó su cupo máximo.' }),
    paso(2, SECRETARIA_ADMINISTRATIVA, { estado: null, fechaAccion: null }),
  ],
};

/** Solicitudes de los estudiantes de prueba; sus aprobaciones están en approvals.mock.js. */
export const MOCK_USER_REQUESTS = [
  {
    idSolicitud: 101,
    idUsuario: 7,
    codigoDocumento: 'UP24-2026-0101',
    nombrePlantilla: 'Inscripción de Práctica Profesional',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-08T09:10:00Z',
    resolucion: resolucionDe(RUTAS[101][1]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 102,
    idUsuario: 7,
    codigoDocumento: 'UP24-2026-0102',
    nombrePlantilla: 'Solicitud de Retiro de Asignatura',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-06T08:00:00Z',
    resolucion: resolucionDe(RUTAS[102][0]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 103,
    idUsuario: 7,
    codigoDocumento: 'UP24-2026-0103',
    nombrePlantilla: 'Certificación de Matrícula Oficial',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-12T14:00:00Z',
    resolucion: resolucionDe(RUTAS[103][0]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 104,
    idUsuario: 7,
    codigoDocumento: 'UP24-2026-0104',
    nombrePlantilla: 'Solicitud de Cambio de Grupo',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-14T10:30:00Z',
    resolucion: resolucionDe(RUTAS[104][1]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 105,
    idUsuario: 7,
    codigoDocumento: 'UP24-2026-0105',
    nombrePlantilla: 'Solicitud de Retiro de Asignatura',
    estado: 'PENDIENTE',
    fechaCreacion: '2026-10-17T16:20:00Z',
    resolucion: null,
    motivoRechazo: null,
  },
  {
    idSolicitud: 106,
    idUsuario: 7,
    codigoDocumento: 'UP24-2026-0106',
    nombrePlantilla: 'Solicitud de Cambio de Grupo',
    estado: 'RECHAZADO',
    fechaCreacion: '2026-10-13T09:00:00Z',
    resolucion: resolucionDe(RUTAS[106][0]),
    motivoRechazo: 'El grupo solicitado ya alcanzó su cupo máximo.',
  },
  {
    idSolicitud: 107,
    idUsuario: 8,
    codigoDocumento: 'UP24-2026-0107',
    nombrePlantilla: 'Inscripción de Práctica Profesional',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-09T15:00:00Z',
    resolucion: resolucionDe(RUTAS[107][1]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 108,
    idUsuario: 8,
    codigoDocumento: 'UP24-2026-0108',
    nombrePlantilla: 'Solicitud de Retiro de Asignatura',
    estado: 'PENDIENTE',
    fechaCreacion: '2026-10-18T09:30:00Z',
    resolucion: null,
    motivoRechazo: null,
  },
  {
    idSolicitud: 109,
    idUsuario: 10,
    codigoDocumento: 'UP24-2026-0109',
    nombrePlantilla: 'Constancia de Trabajo',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-05T10:00:00Z',
    resolucion: resolucionDe(RUTAS[109][0]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 110,
    idUsuario: 10,
    codigoDocumento: 'UP24-2026-0110',
    nombrePlantilla: 'Solicitud de Permiso Temporal',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-08T08:30:00Z',
    resolucion: resolucionDe(RUTAS[110][1]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 111,
    idUsuario: 10,
    codigoDocumento: 'UP24-2026-0111',
    nombrePlantilla: 'Solicitud de Uso de Aula o Laboratorio',
    estado: 'PENDIENTE',
    fechaCreacion: '2026-10-18T14:10:00Z',
    resolucion: null,
    motivoRechazo: null,
  },
  {
    idSolicitud: 112,
    idUsuario: 11,
    codigoDocumento: 'UP24-2026-0112',
    nombrePlantilla: 'Solicitud de Vacaciones',
    estado: 'APROBADO',
    fechaCreacion: '2026-10-01T09:00:00Z',
    resolucion: resolucionDe(RUTAS[112][1]),
    motivoRechazo: null,
  },
  {
    idSolicitud: 113,
    idUsuario: 11,
    codigoDocumento: 'UP24-2026-0113',
    nombrePlantilla: 'Solicitud de Vacaciones',
    estado: 'PENDIENTE',
    fechaCreacion: '2026-10-17T11:00:00Z',
    resolucion: null,
    motivoRechazo: null,
  },
  {
    idSolicitud: 114,
    idUsuario: 11,
    codigoDocumento: 'UP24-2026-0114',
    nombrePlantilla: 'Solicitud de Uso de Aula o Laboratorio',
    estado: 'RECHAZADO',
    fechaCreacion: '2026-10-12T13:00:00Z',
    resolucion: resolucionDe(RUTAS[114][0]),
    motivoRechazo: 'El auditorio ya está reservado en esa fecha.',
  },
];

/** Datos del detalle que el listado no trae (versión, respuestas y ruta), por idSolicitud. */
export const MOCK_REQUEST_EXTRA = {
  101: {
    idVersion: 6,
    datosJson: {
      empresa: 'Logística Demo, S.A.',
      supervisor: 'Ing. Rafael Demo',
      correoSupervisor: 'rafael.demo@example.com',
      area: 'SOFTWARE',
      modalidad: 'HIBRIDA',
      fechaInicio: '2026-11-02',
      fechaFin: '2027-01-29',
      horasSemanales: 30,
      funciones: 'Desarrollo de módulos del sistema de inventario, pruebas de software y documentación técnica.',
      declaracion: true,
    },
    ruta: RUTAS[101],
  },
  102: {
    idVersion: 7,
    datosJson: {
      asignatura: 'INF-204 Base de Datos I',
      profesor: 'Dra. Olga Prueba',
      motivo: 'LABORAL',
      creditos: 4,
      justificacion: 'Cambio imprevisto de turno laboral en la empresa durante las horas de laboratorio.',
      conforme: true,
    },
    ruta: RUTAS[102],
  },
  103: {
    idVersion: 8,
    datosJson: {
      periodo: 'SEGUNDO_SEMESTRE_2026',
      dirigidoA: 'Caja de Seguro Social (CSS)',
      proposito: 'SEGURO',
      copias: 2,
      veracidad: true,
    },
    ruta: RUTAS[103],
  },
  104: {
    idVersion: 9,
    datosJson: {
      asignatura: 'INF-310 Redes II',
      grupoActual: '1IF-141',
      grupoSolicitado: '1IF-142',
      turno: 'NOCTURNO',
      fechaEfectiva: '2026-10-26',
      motivoCambio: 'Cambio de turno laboral que me impide asistir en el horario actual.',
    },
    ruta: RUTAS[104],
  },
  105: {
    idVersion: 7,
    datosJson: {
      asignatura: 'MAT-210 Cálculo II',
      profesor: 'Mgtr. Saúl Muestra',
      motivo: 'OTRO',
      motivoOtro: 'Cuidado de un familiar con tratamiento médico',
      creditos: 5,
      justificacion: 'Debo acompañar a un familiar a tratamientos médicos en el horario de la clase.',
      conforme: true,
    },
    ruta: RUTAS[105],
  },
  106: {
    idVersion: 9,
    datosJson: {
      asignatura: 'INF-220 Estructuras de Datos',
      grupoActual: '1IF-121',
      grupoSolicitado: '1IF-122',
      turno: 'VESPERTINO',
      fechaEfectiva: '2026-10-21',
      motivoCambio: 'Cruce de horario con otra asignatura obligatoria del semestre.',
    },
    ruta: RUTAS[106],
  },
  107: {
    idVersion: 6,
    datosJson: {
      empresa: 'Telecomunicaciones Ejemplo, S.A.',
      supervisor: 'Lic. Andrea Muestra',
      correoSupervisor: 'andrea.muestra@example.com',
      area: 'DATOS',
      modalidad: 'PRESENCIAL',
      fechaInicio: '2026-11-09',
      fechaFin: '2027-02-05',
      horasSemanales: 24,
      funciones: 'Análisis de datos de ventas en línea y elaboración de tableros para el equipo comercial.',
      declaracion: true,
    },
    ruta: RUTAS[107],
  },
  108: {
    idVersion: 7,
    datosJson: {
      asignatura: 'COM-215 Mercadeo Digital',
      profesor: 'Mgtr. Raquel Ábrego',
      motivo: 'SALUD',
      creditos: 3,
      justificacion: 'Tengo una incapacidad médica que me impedirá asistir al resto del semestre.',
      conforme: true,
    },
    ruta: RUTAS[108],
  },
  109: {
    idVersion: 10,
    datosJson: {
      dirigidoA: 'Banco Nacional de Panamá',
      proposito: 'BANCARIO',
      fechaIngreso: '2014-03-03',
      condicion: 'PERMANENTE',
      salario: 'INCLUIR',
      veracidad: true,
    },
    ruta: RUTAS[109],
  },
  110: {
    idVersion: 11,
    datosJson: {
      tipoPermiso: 'ACADEMICO',
      fechaInicio: '2026-10-19',
      fechaFin: '2026-10-23',
      horasClase: 12,
      asignaturas: 'INF-204 Base de Datos I (grupo 1IF-141) y INF-310 Redes II (grupo 1IF-142).',
      reemplazo: 'Mgtr. Saúl Muestra',
      justificacion: 'Asistiré a un congreso de bases de datos en Ciudad de México como ponente.',
      declaracion: true,
    },
    ruta: RUTAS[110],
  },
  111: {
    idVersion: 13,
    datosJson: {
      espacio: 'LAB_REDES',
      fecha: '2026-10-28',
      horaInicio: '14:00',
      horaFin: '16:30',
      asistentes: 25,
      actividad: 'Taller de configuración de redes para estudiantes de último año.',
    },
    ruta: RUTAS[111],
  },
  112: {
    idVersion: 12,
    datosJson: {
      periodoVacaciones: 'VIGENTE',
      fechaInicio: '2026-10-12',
      fechaFin: '2026-10-23',
      diasHabiles: 10,
      reemplazante: 'Melanie Alvarado',
      observaciones: 'Dejaré los informes del mes entregados antes de salir.',
      conforme: true,
    },
    ruta: RUTAS[112],
  },
  113: {
    idVersion: 12,
    datosJson: {
      periodoVacaciones: 'ACUMULADO',
      fechaInicio: '2026-12-14',
      fechaFin: '2026-12-31',
      diasHabiles: 12,
      reemplazante: 'Melissa Chuna',
      conforme: true,
    },
    ruta: RUTAS[113],
  },
  114: {
    idVersion: 13,
    datosJson: {
      espacio: 'AUDITORIO',
      fecha: '2026-10-20',
      horaInicio: '09:00',
      horaFin: '12:00',
      asistentes: 80,
      actividad: 'Charla de inducción para el personal administrativo nuevo.',
    },
    ruta: RUTAS[114],
  },
};

/** Construye el detalle de una solicitud a partir de su resumen, sus datos y el solicitante. */
export const buildRequestDetail = (
  resumen,
  extra,
  usuario,
  buscarVersion = (idVersion) => MOCK_TEMPLATE_DETAILS.find((t) => t.idVersion === idVersion)
) => {
  const plantilla = buscarVersion(extra.idVersion);
  const pasos = plantilla?.flujo?.pasos ?? [];

  // Ruta de la solicitud con el estado de cada paso
  const pasoDeRuta = (paso) => ({
    secuencia: paso.secuencia,
    nombreCargo: paso.nombreCargo,
    titular: paso.titular,
    area: paso.area ?? null,
    reqFirma: paso.reqFirma !== false,
    estado: paso.estado,
    fechaAccion: paso.fechaAccion,
    comentario: paso.comentario,
    firmaUrl: paso.estado === 'APROBADO' && paso.reqFirma !== false ? `/firmas/${paso.idAsignacion}.svg` : null,
  });

  const pasosDocumento = extra.ruta ? extra.ruta.map(pasoDeRuta) : pasos.map((paso) => {
    // PENDIENTE: el paso 1 en curso, los demás sin alcanzar
    let estado = paso.secuencia === 1 ? 'PENDIENTE' : null;
    let fechaAccion = null;
    let comentario = null;
    let firmaUrl = null;

    if (resumen.estado === 'APROBADO') {
      estado = 'APROBADO';
      fechaAccion = resumen.resolucion?.fecha ?? null;
      // Firmas de prueba de mock-server/firmas
      firmaUrl = paso.reqFirma !== false ? `/firmas/${paso.idAsignacion}.svg` : null;
    } else if (resumen.estado === 'RECHAZADO' && paso.secuencia === 1) {
      estado = 'RECHAZADO';
      fechaAccion = resumen.resolucion?.fecha ?? null;
      comentario = resumen.motivoRechazo;
    }

    return {
      secuencia: paso.secuencia,
      nombreCargo: paso.nombreCargo,
      titular: paso.titular,
      area: paso.area ?? null,
      reqFirma: paso.reqFirma !== false,
      estado,
      fechaAccion,
      comentario,
      firmaUrl,
    };
  });

  const lineaTiempo = pasosDocumento
    .filter((p) => p.estado !== null)
    .map(({ area: _a, reqFirma: _r, ...paso }) => paso);

  return {
    idSolicitud: resumen.idSolicitud,
    codigoDocumento: resumen.codigoDocumento,
    idPlantilla: plantilla?.idPlantilla ?? resumen.idPlantilla,
    nombrePlantilla: resumen.nombrePlantilla,
    idVersion: extra.idVersion,
    estado: resumen.estado,
    fechaCreacion: resumen.fechaCreacion,
    fechaResolucion: resumen.resolucion?.fecha ?? null,
    idAprobacionPendiente: null,
    solicitante: {
      idUsuario: usuario.idUsuario,
      nombreCompleto: `${usuario.nombre} ${usuario.apellido}`.trim(),
      cedula: usuario.cedula,
      correo: usuario.correo,
      carrera: usuario.carrera?.descripcion ?? null,
    },
    datosJson: extra.datosJson,
    variablesSistema: variablesSistemaDe(usuario, resumen),
    variableFormJson: plantilla?.variableFormJson ?? { variables: [] },
    disenoFormJson: plantilla?.disenoFormJson ?? { cuerpoDocumento: { type: 'doc', content: [] } },
    pasosDocumento,
    lineaTiempo,
  };
};

const TIPOS_UNIDAD = { FACULTAD: 'Facultad', DIRECCION: 'Dirección', INSTITUTO: 'Instituto', VICERRECTORIA: 'Vicerrectoría' };

/** Vista previa de las variables automáticas del solicitante, sin código de documento. */
export const variablesSistemaVista = (usuario) =>
  variablesSistemaDe(usuario, { fechaCreacion: new Date().toISOString(), codigoDocumento: null });

/** Variables automáticas (VariablesSistema) a partir del usuario y la solicitud. */
const variablesSistemaDe = (usuario, resumen) => {
  const unidad = usuario.unidad;
  const tipo = TIPOS_UNIDAD[String(unidad?.tipoUnidad || '').toUpperCase()];
  const cargo = usuario.cargos?.[0];
  const fecha = new Date(resumen.fechaCreacion).toLocaleDateString('es-PA', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    'auth.nombre_completo': `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim() || null,
    'auth.cedula': usuario.cedula ?? null,
    'auth.correo': usuario.correo ?? null,
    'estudiante.carrera': usuario.carrera?.descripcion ?? null,
    'estudiante.escuela': usuario.carrera?.escuela ?? null,
    'estudiante.facultad': unidad?.nombre ? (tipo ? `${tipo} de ${unidad.nombre}` : unidad.nombre) : null,
    'personal.cargo': cargo?.nombreCargo ?? null,
    'personal.departamento': cargo?.departamento ?? null,
    'sistema.fecha_formal': `Panamá, ${fecha}`,
    'solicitud.codigo': resumen.codigoDocumento,
  };
};
