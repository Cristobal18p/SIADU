const test = require('node:test');
const assert = require('node:assert/strict');
const { validarRespuestas, VALOR_OTRO } = require('../../utils/validarRespuestas');
const { generarVariablesSistema } = require('../../utils/sistemaVariables');

test('validarRespuestas — rechaza claves reservadas que comienzan con guion bajo', () => {
  const variables = [{ id: 'motivo', tipo: 'text', requerido: false }];
  const datos = { motivo: 'Trabajo', _sistema: {}, _otro: 123 };
  const detalles = validarRespuestas(variables, datos);
  assert.equal(detalles.length, 2);
  assert.equal(detalles[0].campo, '_sistema');
  assert.equal(detalles[1].campo, '_otro');
});

test('validarRespuestas — campos requeridos no pueden estar vacíos', () => {
  const variables = [
    { id: 'justificacion', tipo: 'textarea', requerido: true },
    { id: 'opcional', tipo: 'text', requerido: false },
  ];
  const detalles = validarRespuestas(variables, { justificacion: '   ', opcional: '' });
  assert.equal(detalles.length, 1);
  assert.equal(detalles[0].campo, 'justificacion');
});

test('validarRespuestas — validación de tipo select y opción Otro', () => {
  const variables = [
    {
      id: 'motivo',
      tipo: 'select',
      requerido: true,
      opciones: [{ valor: 'SALUD', etiqueta: 'Salud' }],
      opcionOtro: true,
    },
  ];

  // Opción inválida
  const errInvalido = validarRespuestas(variables, { motivo: 'VIAJE' });
  assert.equal(errInvalido.length, 1);
  assert.equal(errInvalido[0].campo, 'motivo');

  // Opción OTRO sin especificar {id}Otro
  const errOtroVacio = validarRespuestas(variables, { motivo: VALOR_OTRO, motivoOtro: '  ' });
  assert.equal(errOtroVacio.length, 1);
  assert.equal(errOtroVacio[0].campo, 'motivoOtro');

  // Opción OTRO completa
  const okOtro = validarRespuestas(variables, { motivo: VALOR_OTRO, motivoOtro: 'Motivo personal' });
  assert.equal(okOtro.length, 0);

  // Opción regular válida
  const okNormal = validarRespuestas(variables, { motivo: 'SALUD' });
  assert.equal(okNormal.length, 0);
});

test('validarRespuestas — validación de números, enteros y rangos min/max', () => {
  const variables = [
    {
      id: 'creditos',
      tipo: 'number',
      requerido: true,
      validaciones: { min: 1, max: 10, decimales: false },
    },
  ];

  assert.equal(validarRespuestas(variables, { creditos: 'abc' })[0].campo, 'creditos');
  assert.equal(validarRespuestas(variables, { creditos: 3.5 })[0].campo, 'creditos');
  assert.equal(validarRespuestas(variables, { creditos: 0 })[0].campo, 'creditos');
  assert.equal(validarRespuestas(variables, { creditos: 15 })[0].campo, 'creditos');
  assert.equal(validarRespuestas(variables, { creditos: 5 }).length, 0);
});

test('validarRespuestas — validación de checkbox legal (siempre true)', () => {
  const variables = [{ id: 'declaracion', tipo: 'checkbox', requerido: true }];
  assert.equal(validarRespuestas(variables, { declaracion: false })[0].campo, 'declaracion');
  assert.equal(validarRespuestas(variables, { declaracion: true }).length, 0);
});

test('validarRespuestas — validación de fechas y reglas temporales', () => {
  const variables = [
    {
      id: 'fechaInicio',
      tipo: 'date',
      requerido: true,
      validaciones: { reglaTemporal: 'futuras' },
    },
  ];

  // Fecha pasada rechazada
  const errPasada = validarRespuestas(variables, { fechaInicio: '2020-01-01' });
  assert.equal(errPasada.length, 1);
  assert.equal(errPasada[0].campo, 'fechaInicio');

  // Formato no válido
  assert.equal(validarRespuestas(variables, { fechaInicio: '01/01/2026' })[0].campo, 'fechaInicio');
});

test('sistemaVariables — genera todas las claves requeridas por el contrato', () => {
  const mockUsuario = {
    nombre: 'Ulises',
    apellido: 'Demo',
    cedula: '9-000-0012',
    correo: 'ulises.demo@up.ac.pa',
    carrera: { descripcion: 'Licenciatura en Informática', escuela: 'Escuela de Ingeniería Informática' },
    unidad: { nombre: 'Informática, Electrónica y Comunicación', tipoUnidad: 'FACULTAD' },
    cargos: [],
  };

  const variables = generarVariablesSistema(mockUsuario, 'UP24-2026-0001', new Date('2026-10-16T12:00:00Z'));

  assert.equal(variables['auth.nombre_completo'], 'Ulises Demo');
  assert.equal(variables['auth.cedula'], '9-000-0012');
  assert.equal(variables['auth.correo'], 'ulises.demo@up.ac.pa');
  assert.equal(variables['estudiante.carrera'], 'Licenciatura en Informática');
  assert.equal(variables['estudiante.escuela'], 'Escuela de Ingeniería Informática');
  assert.equal(variables['estudiante.facultad'], 'Facultad de Informática, Electrónica y Comunicación');
  assert.equal(variables['personal.cargo'], null);
  assert.equal(variables['personal.departamento'], null);
  assert.match(variables['sistema.fecha_formal'], /^Panamá, \d+ de \w+ de 2026$/);
  assert.equal(variables['solicitud.codigo'], 'UP24-2026-0001');
});

test('sistemaVariables — personal.cargo y personal.departamento salen de la primera asignación activa', () => {
  const variables = generarVariablesSistema({
    nombre: 'Gina',
    apellido: 'Prueba',
    unidad: { nombre: 'Informática, Electrónica y Comunicación', tipoUnidad: 'FACULTAD' },
    carrera: null,
    cargos: [
      { idAsignacion: 3, nombreCargo: 'Secretaria', departamento: 'Informática' },
      { idAsignacion: 9, nombreCargo: 'Coordinadora', departamento: null },
    ],
  });
  assert.equal(variables['personal.cargo'], 'Secretaria');
  assert.equal(variables['personal.departamento'], 'Informática');
  assert.equal(variables['estudiante.escuela'], null);
});
