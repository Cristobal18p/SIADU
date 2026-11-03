/** Usuarios de prueba para el login y el perfil; todos tienen el rol SOLICITANTE. */
import { validateIdentifierFormat } from '../src/utils/validators.js';
import { carreraDe } from './catalogs.mock.js';

const UNIDAD_FIEC = {
  codUnidad: 24,
  nombre: 'Informática, Electrónica y Comunicación',
  tipoUnidad: 'FACULTAD',
  abrev: 'FIEC',
};

export const MOCK_USERS_BY_ROLE = {
  // Estudiante con los tres roles
  estudiante: {
    idUsuario: 1,
    correo: 'alex.demo@up.ac.pa',
    cedula: '9-000-0001',
    nombre: 'Alex',
    apellido: 'Demo',
     roles: ['ADMINISTRADOR', 'SOLICITANTE', 'APROBADOR'],
    estamentos: ['ESTUDIANTE'],
    unidad: UNIDAD_FIEC,
    carrera: carreraDe(1),
    departamentos: [],
    cargos: [],
    ultimoAcceso: '2026-10-11T18:30:00Z',
    password: 'admin',
    debeCambiarPassword: false,
  },

  // Profesor
  profesor_regular: {
    idUsuario: 2,
    correo: 'bea.ejemplo@up.ac.pa',
    cedula: '9-000-0002',
    nombre: 'Bea',
    apellido: 'Ejemplo',
    roles: ['SOLICITANTE'],
    estamentos: ['PROFESOR'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [],
    ultimoAcceso: '2026-10-10T14:05:00Z',
    password: 'Demo2026*',
    debeCambiarPassword: true, // primer acceso
  },

  // Administrativo en su primer acceso
  administrativo_regular: {
    idUsuario: 3,
    correo: 'carla.prueba@up.ac.pa',
    cedula: '9-000-0003',
    nombre: 'Carla',
    apellido: 'Prueba',
    roles: ['SOLICITANTE'],
    estamentos: ['ADMINISTRATIVO'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [],
    ultimoAcceso: null,
    password: 'Demo2026*',
    debeCambiarPassword: true, // primer acceso
  },

  // Estudiante en su primer acceso
  estudiante_primer_acceso: {
    idUsuario: 6,
    correo: 'dario.muestra@up.ac.pa',
    cedula: '9-000-0004',
    nombre: 'Dario',
    apellido: 'Muestra',
    roles: ['SOLICITANTE'],
    estamentos: ['ESTUDIANTE'],
    unidad: UNIDAD_FIEC,
    carrera: carreraDe(1),
    departamentos: [],
    cargos: [],
    ultimoAcceso: null,
    password: 'Demo2026*',
    debeCambiarPassword: true, // primer acceso
  },

  // Estudiante de la Escuela de Ingeniería Informática
  estudiante_pruebas: {
    idUsuario: 7,
    correo: 'elena.demo@up.ac.pa',
    cedula: '9-000-0005',
    nombre: 'Elena',
    apellido: 'Demo',
    roles: ['SOLICITANTE'],
    estamentos: ['ESTUDIANTE'],
    unidad: UNIDAD_FIEC,
    carrera: carreraDe(1),
    departamentos: [],
    cargos: [],
    ultimoAcceso: '2026-10-15T10:05:00Z',
    password: 'Prueba2026*',
    debeCambiarPassword: false,
  },

  // Personal docente
  profesor_pruebas: {
    idUsuario: 10,
    correo: 'fabio.ejemplo@up.ac.pa',
    cedula: '9-000-0006',
    nombre: 'Fabio',
    apellido: 'Ejemplo',
    roles: ['SOLICITANTE'],
    estamentos: ['PROFESOR'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [],
    ultimoAcceso: '2026-10-18T14:00:00Z',
    password: 'Prueba2026*',
    debeCambiarPassword: false,
  },

  // Personal administrativo
  administrativo_pruebas: {
    idUsuario: 11,
    correo: 'gina.prueba@up.ac.pa',
    cedula: '9-000-0007',
    nombre: 'Gina',
    apellido: 'Prueba',
    roles: ['SOLICITANTE'],
    estamentos: ['ADMINISTRATIVO'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [],
    ultimoAcceso: '2026-10-18T09:10:00Z',
    password: 'Prueba2026*',
    debeCambiarPassword: false,
  },

  // Vicedecana
  aprobador_vicedecano: {
    idUsuario: 12,
    correo: 'irene.muestra@up.ac.pa',
    cedula: '9-000-0009',
    nombre: 'Irene',
    apellido: 'Muestra',
    roles: ['APROBADOR', 'SOLICITANTE'],
    estamentos: ['PROFESOR'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [{ idCargo: 3, nombreCargo: 'Vicedecano/a', titularActual: 'Dra. Irene Muestra', area: 'Vicedecanato' }],
    ultimoAcceso: '2026-10-17T16:45:00Z',
    password: 'admin',
    debeCambiarPassword: false,
  },

  // Decano
  aprobador_decano: {
    idUsuario: 13,
    correo: 'julio.demo@up.ac.pa',
    cedula: '9-000-0010',
    nombre: 'Julio',
    apellido: 'Demo',
    roles: ['APROBADOR', 'SOLICITANTE'],
    estamentos: ['PROFESOR'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [{ idCargo: 1, nombreCargo: 'Decano/a', titularActual: 'Dr. Julio Demo', area: 'Decanato' }],
    ultimoAcceso: '2026-10-18T07:55:00Z',
    password: 'admin',
    debeCambiarPassword: false,
  },

  // Estudiante de la Escuela de Comercio Electrónico
  estudiante_comercio: {
    idUsuario: 8,
    correo: 'hugo.ejemplo@up.ac.pa',
    cedula: '9-000-0008',
    nombre: 'Hugo',
    apellido: 'Ejemplo',
    roles: ['SOLICITANTE'],
    estamentos: ['ESTUDIANTE'],
    unidad: UNIDAD_FIEC,
    carrera: carreraDe(2),
    departamentos: [],
    cargos: [],
    ultimoAcceso: '2026-10-17T15:20:00Z',
    password: 'Prueba2026*',
    debeCambiarPassword: false,
  },

  // Directora de la Escuela de Comercio Electrónico
  aprobador_comercio: {
    idUsuario: 9,
    correo: 'karen.prueba@up.ac.pa',
    cedula: '9-000-0011',
    nombre: 'Karen',
    apellido: 'Prueba',
    roles: ['APROBADOR', 'SOLICITANTE'],
    estamentos: ['PROFESOR'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [
      {
        idCargo: 9,
        nombreCargo: 'Director/a de Escuela',
        titularActual: 'Karen Prueba',
        area: 'Escuela de Comercio Electrónico',
      },
    ],
    ultimoAcceso: '2026-10-16T08:30:00Z',
    password: 'admin',
    debeCambiarPassword: false,
  },

  aprobador_director: {
    idUsuario: 4,
    correo: 'leo.muestra@up.ac.pa',
    cedula: '1-234-567',
    nombre: 'Leo',
    apellido: 'Muestra',
    roles: ['APROBADOR', 'SOLICITANTE'],
    estamentos: ['PROFESOR'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [
      {
        idCargo: 9,
        nombreCargo: 'Director/a de Escuela',
        titularActual: 'Leo Muestra',
        area: 'Escuela de Ingeniería Informática',
      },
    ],
    ultimoAcceso: '2026-10-12T09:40:00Z',
    password: 'admin',
    debeCambiarPassword: false,
  },

  // Administrador de plantillas
  admin_plantillas: {
    idUsuario: 5,
    correo: 'mila.demo@up.ac.pa',
    cedula: '1-987-654',
    nombre: 'Mila',
    apellido: 'Demo',
    roles: ['ADMINISTRADOR', 'SOLICITANTE', 'APROBADOR'],
    estamentos: ['ADMINISTRATIVO'],
    unidad: UNIDAD_FIEC,
    carrera: null,
    departamentos: [],
    cargos: [
      {
        idCargo: 4,
        nombreCargo: 'Secretaría Administrativa',
        titularActual: 'Mila Demo',
        area: 'Secretaría Administrativa',
      },
    ],
    ultimoAcceso: '2026-10-12T08:15:00Z',
    password: 'admin',
    debeCambiarPassword: false,
  },
};

/** Usuario resumido que devuelve POST /auth/login */
export const toLoginUser = (user) => ({
  idUsuario: user.idUsuario,
  correo: user.correo,
  cedula: user.cedula,
  nombreCompleto: `${user.nombre} ${user.apellido}`.trim(),
  roles: user.roles,
  estamentos: user.estamentos,
  codUnidad: user.unidad.codUnidad,
  debeCambiarPassword: Boolean(user.debeCambiarPassword),
});

/** Perfil completo que devuelve GET /auth/me */
export const toMeUser = (user) => {
  const { password: _password, ...perfil } = user;
  return {
    ...perfil,
    nombreCompleto: `${user.nombre} ${user.apellido}`.trim(),
    debeCambiarPassword: Boolean(user.debeCambiarPassword),
  };
};

/** Busca un usuario de prueba y valida sus credenciales. */
export const findMockUser = (estamento, identifier, password) => {
  const validation = validateIdentifierFormat(identifier);
  if (!validation.isValid) {
    const err = new Error(validation.error);
    err.codigo = 'VALIDACION_FALLIDA';
    throw err;
  }

  if (!password || !password.trim()) {
    const err = new Error('La contraseña es obligatoria.');
    err.codigo = 'VALIDACION_FALLIDA';
    throw err;
  }

  const cleanId = validation.cleanValue;
  const estamentoNorm = (estamento || '').trim().toUpperCase();

  const user = Object.values(MOCK_USERS_BY_ROLE).find((u) => {
    return u.correo.toLowerCase() === cleanId || u.cedula.toUpperCase() === cleanId;
  });

  if (!user) {
    const err = new Error('Usuario no encontrado. Verifique la cédula o correo ingresado.');
    err.codigo = 'CREDENCIALES_INVALIDAS';
    throw err;
  }

  if (!user.estamentos.includes(estamentoNorm)) {
    const err = new Error(
      `El usuario no pertenece al estamento seleccionado (${estamentoNorm}). Seleccione la pestaña correcta.`
    );
    err.codigo = 'CREDENCIALES_INVALIDAS';
    throw err;
  }

  if (user.password !== password) {
    const err = new Error('Contraseña incorrecta. Verifique sus credenciales.');
    err.codigo = 'CREDENCIALES_INVALIDAS';
    throw err;
  }

  return user;
};
