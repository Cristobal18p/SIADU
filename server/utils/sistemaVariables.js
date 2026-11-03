const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const TIPOS_UNIDAD = {
  FACULTAD: 'Facultad',
  DIRECCION: 'Dirección',
  INSTITUTO: 'Instituto',
  VICERRECTORIA: 'Vicerrectoría',
  SECRETARIA: 'Secretaría',
};

/** Fecha en formato formal de Panamá (UTC-5). */
function getFechaFormalPanama(fecha = new Date()) {
  const d = new Date(fecha);
  const panamaMs = d.getTime() - 5 * 60 * 60 * 1000;
  const pd = new Date(panamaMs);
  const dia = pd.getUTCDate();
  const mes = MESES[pd.getUTCMonth()];
  const anio = pd.getUTCFullYear();
  return `Panamá, ${dia} de ${mes} de ${anio}`;
}

/** Variables automáticas del solicitante; sin código en la vista previa. */
function generarVariablesSistema(perfilUsuario, codigoDocumento = null, fechaReferencia = new Date()) {
  const nombre = perfilUsuario.nombre || '';
  const apellido = perfilUsuario.apellido || '';
  const nombreCompleto = `${nombre} ${apellido}`.trim() || null;

  const unidad = perfilUsuario.unidad || {};
  const tipoRaw = String(unidad.tipoUnidad || '').toUpperCase();
  const tipoPrefijo = TIPOS_UNIDAD[tipoRaw] || unidad.tipoUnidad || 'Facultad';
  const facultadNombre = unidad.nombre
    ? (unidad.nombre.toLowerCase().startsWith('facultad') ? unidad.nombre : `${tipoPrefijo} de ${unidad.nombre}`)
    : null;

  // Cargo mayor; vienen ordenados por jerarquía
  const asignacion = perfilUsuario.cargos?.[0] ?? null;

  return {
    'auth.nombre_completo': nombreCompleto,
    'auth.cedula': perfilUsuario.cedula || null,
    'auth.correo': perfilUsuario.correo || null,
    'estudiante.carrera': perfilUsuario.carrera?.descripcion || null,
    'estudiante.escuela': perfilUsuario.carrera?.escuela || null,
    'estudiante.facultad': facultadNombre,
    'personal.cargo': asignacion?.nombreCargo || null,
    'personal.departamento': asignacion?.departamento || null,
    'sistema.fecha_formal': getFechaFormalPanama(fechaReferencia),
    'solicitud.codigo': codigoDocumento,
  };
}

module.exports = {
  generarVariablesSistema,
  getFechaFormalPanama,
};
