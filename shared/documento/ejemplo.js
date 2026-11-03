/** Datos de ejemplo para la vista previa del constructor. */

/** Variables automáticas con valores de muestra (mismas claves que `VariablesSistema`). */
export const SISTEMA_EJEMPLO = {
  'auth.nombre_completo': 'Bea Ejemplo',
  'auth.cedula': '9-000-0013',
  'auth.correo': 'bea.ejemplo@up.ac.pa',
  'estudiante.carrera': 'Licenciatura en Ingeniería en Informática',
  'estudiante.escuela': 'Escuela de Ingeniería Informática',
  'estudiante.facultad': 'Facultad de Informática, Electrónica y Comunicación',
  'personal.cargo': 'Secretaria Administrativa',
  'personal.departamento': 'Arquitectura y Redes de Computadoras',
  'sistema.fecha_formal': 'Panamá, 5 de octubre de 2026',
  'solicitud.codigo': 'UP24-2026-0001',
};

/** Variables automáticas que acepta el contrato, con su etiqueta para el editor. */
export const VARIABLES_SISTEMA = [
  { id: 'auth.nombre_completo', etiqueta: 'Nombre completo' },
  { id: 'auth.cedula', etiqueta: 'Cédula' },
  { id: 'auth.correo', etiqueta: 'Correo institucional' },
  { id: 'estudiante.carrera', etiqueta: 'Carrera' },
  { id: 'estudiante.escuela', etiqueta: 'Escuela de la carrera' },
  { id: 'estudiante.facultad', etiqueta: 'Facultad o unidad' },
  { id: 'personal.cargo', etiqueta: 'Cargo' },
  { id: 'personal.departamento', etiqueta: 'Departamento' },
  { id: 'sistema.fecha_formal', etiqueta: 'Fecha de emisión' },
  { id: 'solicitud.codigo', etiqueta: 'Código del documento' },
];

/** Respuesta de muestra por variable: su placeholder o un valor según el tipo. */
export function datosEjemplo(variables = []) {
  return variables.reduce((datos, v) => {
    switch (v.tipo) {
      case 'number':
        datos[v.id] = v.validaciones?.min ?? 1;
        break;
      case 'date':
        datos[v.id] = '2026-10-05';
        break;
      case 'select':
        if (v.opciones?.[0]) datos[v.id] = v.opciones[0].valor;
        break;
      case 'checkbox':
        datos[v.id] = true;
        break;
      default:
        datos[v.id] = v.placeholder?.replace(/^Ej(emplo)?:\s*/i, '') || `[${v.etiqueta || v.id}]`;
    }
    return datos;
  }, {});
}
