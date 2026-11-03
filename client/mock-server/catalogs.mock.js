/** Datos de prueba de cargos, carreras y flujos; los `idAsignacion` coinciden con templates.mock.js. */

/** Carreras con su escuela; cada escuela tiene un director con cuenta de prueba. */
export const MOCK_CARRERAS = [
  { idCarrera: 1, descripcion: 'Licenciatura en Ingeniería en Informática', escuela: 'Escuela de Ingeniería Informática' },
  { idCarrera: 2, descripcion: 'Licenciatura en Gerencia de Comercio Electrónico', escuela: 'Escuela de Comercio Electrónico' },
];

export const carreraDe = (idCarrera) => MOCK_CARRERAS.find((c) => c.idCarrera === idCarrera) ?? null;

/**
 * Cargos de autoridad de la unidad. `idUsuarioTitular` es null si el titular no tiene cuenta;
 * `esAprobador` es false si no puede ser paso de un flujo.
 */
export const MOCK_CARGOS = [
  // Directores de escuela con cuenta
  { idAsignacion: 31, idCargo: 9, nombreCargo: 'Director/a de Escuela', titularActual: 'Leo Muestra', idUsuarioTitular: 4, area: 'Escuela de Ingeniería Informática', escuela: 'Escuela de Ingeniería Informática', departamento: null, esAprobador: true },
  { idAsignacion: 33, idCargo: 9, nombreCargo: 'Director/a de Escuela', titularActual: 'Karen Prueba', idUsuarioTitular: 9, area: 'Escuela de Comercio Electrónico', escuela: 'Escuela de Comercio Electrónico', departamento: null, esAprobador: true },
  // Secretaría Administrativa
  { idAsignacion: 32, idCargo: 4, nombreCargo: 'Secretaría Administrativa', titularActual: 'Mila Demo', idUsuarioTitular: 5, area: 'Secretaría Administrativa', escuela: null, departamento: null, esAprobador: true },
  // Decanato y Vicedecanato
  { idAsignacion: 39, idCargo: 1, nombreCargo: 'Decano/a', titularActual: 'Dr. Julio Demo', idUsuarioTitular: 13, area: 'Decanato', escuela: null, departamento: null, esAprobador: true },
  { idAsignacion: 40, idCargo: 3, nombreCargo: 'Vicedecano/a', titularActual: 'Dra. Irene Muestra', idUsuarioTitular: 12, area: 'Vicedecanato', escuela: null, departamento: null, esAprobador: true },
  // Autoridades sin cuenta: no pueden ser paso de un flujo
  { idAsignacion: 37, idCargo: 10, nombreCargo: 'Director/a de Departamento', titularActual: 'Dra. Nora Ejemplo', idUsuarioTitular: null, area: 'Departamento de Informática', escuela: null, departamento: 'Informática', esAprobador: false },
  { idAsignacion: 38, idCargo: 10, nombreCargo: 'Director/a de Departamento', titularActual: 'Dr. Pablo Prueba', idUsuarioTitular: null, area: 'Departamento de Electrónica y Comunicación', escuela: null, departamento: 'Electrónica y Comunicación', esAprobador: false },
  // Secretarías de departamento y de escuela
  { idAsignacion: 41, idCargo: 5, nombreCargo: 'Secretaria', titularActual: 'Rita Muestra', idUsuarioTitular: null, area: 'Departamento de Informática', escuela: null, departamento: 'Informática', esAprobador: false },
  { idAsignacion: 42, idCargo: 5, nombreCargo: 'Secretaria', titularActual: 'Sara Demo', idUsuarioTitular: null, area: 'Departamento de Electrónica y Comunicación', escuela: null, departamento: 'Electrónica y Comunicación', esAprobador: false },
  { idAsignacion: 43, idCargo: 5, nombreCargo: 'Secretaria', titularActual: 'Tania Ejemplo', idUsuarioTitular: null, area: 'Escuelas', escuela: null, departamento: null, esAprobador: false },
  { idAsignacion: 44, idCargo: 5, nombreCargo: 'Secretaria', titularActual: 'Olga Prueba', idUsuarioTitular: null, area: 'Escuelas', escuela: null, departamento: null, esAprobador: false },
];

/** Área de un paso por escuela antes de conocer al solicitante. */
export const AREA_ESCUELA_SOLICITANTE = 'Escuela del solicitante';

/**
 * Resuelve los pasos `ESCUELA_SOLICITANTE` con la escuela del usuario; los `FIJO` pasan igual.
 * Devuelve `error` si la escuela no tiene un titular que pueda aprobar.
 * @param {Array} pasos
 * @param {Object} usuario - Perfil del solicitante
 * @returns {{ pasos: Array, error: string|null }}
 */
export const resolverPasos = (pasos, usuario) => {
  const escuela = usuario?.carrera?.escuela ?? null;
  let error = null;
  const resueltos = pasos.map((paso) => {
    if (paso.alcance !== 'ESCUELA_SOLICITANTE') return paso;
    const cargo = MOCK_CARGOS.find((c) => c.idCargo === paso.idCargo && c.escuela === escuela);
    if (!cargo || !cargo.esAprobador) {
      error ??= escuela
        ? `La ${escuela} no tiene un titular de «${paso.nombreCargo}» que pueda aprobar.`
        : 'Los trámites con aprobación por escuela son solo para estudiantes con carrera.';
      return paso;
    }
    return { ...paso, idAsignacion: cargo.idAsignacion, nombreCargo: cargo.nombreCargo, titular: cargo.titularActual, area: cargo.area };
  });
  return { pasos: resueltos, error };
};

/** Flujos registrados. */
export const MOCK_FLOWS = [
  {
    // Director de la escuela del estudiante y Secretaría Administrativa
    idFlujo: 4,
    nombre: 'Práctica profesional (Escuela + Secretaría Administrativa)',
    codigo: 'FLUJO-FIEC-PRACTICA',
    descripcion: 'El director de la escuela del estudiante revisa y la Secretaría Administrativa firma la autorización',
    codUnidad: 24,
    estado: 'ACTIVO',
    pasos: [
      { secuencia: 1, alcance: 'ESCUELA_SOLICITANTE', idCargo: 9, reqFirma: true },
      { secuencia: 2, alcance: 'FIJO', idAsignacion: 32, reqFirma: true },
    ],
  },
  {
    idFlujo: 5,
    nombre: 'Aprobación de la Dirección de Escuela',
    codigo: 'FLUJO-FIEC-ESC',
    descripcion: 'Resuelve y firma el director de la escuela del estudiante',
    codUnidad: 24,
    estado: 'ACTIVO',
    pasos: [{ secuencia: 1, alcance: 'ESCUELA_SOLICITANTE', idCargo: 9, reqFirma: true }],
  },
  {
    idFlujo: 6,
    nombre: 'Aprobación de la Secretaría Administrativa',
    codigo: 'FLUJO-FIEC-SEC',
    descripcion: 'Emite y firma la Secretaría Administrativa',
    codUnidad: 24,
    estado: 'ACTIVO',
    pasos: [{ secuencia: 1, alcance: 'FIJO', idAsignacion: 32, reqFirma: true }],
  },
  {
    idFlujo: 7,
    nombre: 'Aprobación de Vicedecanato y Decanato',
    codigo: 'FLUJO-FIEC-VICE-DEC',
    descripcion: 'Revisa el Vicedecanato y firma el Decanato (permisos del personal docente)',
    codUnidad: 24,
    estado: 'ACTIVO',
    pasos: [
      { secuencia: 1, alcance: 'FIJO', idAsignacion: 40, reqFirma: true },
      { secuencia: 2, alcance: 'FIJO', idAsignacion: 39, reqFirma: true },
    ],
  },
  {
    idFlujo: 8,
    nombre: 'Aprobación de Secretaría Administrativa y Decanato',
    codigo: 'FLUJO-FIEC-SEC-DEC',
    descripcion: 'Revisa la Secretaría Administrativa y firma el Decanato (vacaciones del personal administrativo)',
    codUnidad: 24,
    estado: 'ACTIVO',
    pasos: [
      { secuencia: 1, alcance: 'FIJO', idAsignacion: 32, reqFirma: true },
      { secuencia: 2, alcance: 'FIJO', idAsignacion: 39, reqFirma: true },
    ],
  },
];
