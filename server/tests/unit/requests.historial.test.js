// Historial inmutable: pasos decididos con datos congelados; pendientes con los vigentes. Datos simulados.
const test = require('node:test');
const assert = require('node:assert/strict');

// Paso 1 decidido por Ana; hoy el cargo lo ocupa Luis
const asignacionHoy = (cargo, nombre) => ({
  cargo: { nombre: cargo },
  area: { nombre: 'Escuela de Ingeniería Informática' },
  administrativo: { personal: { nombre, apellido: 'Actual' } },
});
const solicitud = {
  idSolicitud: 30n,
  idUsuario: 9n,
  idVersion: 3n,
  codigoDocumento: 'UP24-2026-0030',
  estado: 'APROBADO',
  fechaCreacion: new Date('2026-10-01T10:00:00Z'),
  fechaResolucion: new Date('2026-10-03T10:00:00Z'),
  datosJson: {},
  usuario: { correo: 'e@up.ac.pa', cedula: '8-1-1', estudiante: null, personal: { nombre: 'Eva', apellido: 'Solis' } },
  version: { plantilla: { idPlantilla: 1n, nombre: 'Constancia' }, variableFormJson: null, disenoFormJson: null },
  aprobaciones: [
    {
      idAprobacion: 1n, idUsuario: 4n, secuencia: 1, estado: 'APROBADO', comentario: null,
      fechaAccion: new Date('2026-10-02T10:00:00Z'), firma: null,
      cargoNombre: 'Directora de Escuela', areaNombre: 'Escuela de Informática', aprobadorNombre: 'Ana Pérez',
      usuario: { personal: { nombre: 'Luis', apellido: 'Actual' } },
    },
  ],
  flujo: {
    pasos: [
      { secuencia: 1, reqFirma: true, asignacion: asignacionHoy('Director/a de Escuela', 'Luis') },
      { secuencia: 2, reqFirma: true, asignacion: asignacionHoy('Decano/a', 'Julio') },
    ],
  },
};
const prismaFalso = {
  solicitud: {
    findUnique: async () => solicitud,
    findMany: async () => [{
      idSolicitud: 30n, codigoDocumento: 'UP24-2026-0030', estado: 'APROBADO', fechaCreacion: solicitud.fechaCreacion,
      version: { plantilla: { nombre: 'Constancia' } },
      aprobaciones: [{ ...solicitud.aprobaciones[0] }],
    }],
  },
};
const rutaPrisma = require.resolve('../../config/prisma');
require.cache[rutaPrisma] = { id: rutaPrisma, filename: rutaPrisma, loaded: true, exports: prismaFalso };

const requestsService = require('../../modules/requests/requests.service');

test('getRequest: el paso decidido muestra lo copiado al decidir; el pendiente, lo vigente', async () => {
  const d = await requestsService.getRequest(9, 30);
  const [decidido, pendiente] = d.pasosDocumento;
  assert.equal(decidido.nombreCargo, 'Directora de Escuela');
  assert.equal(decidido.titular, 'Ana Pérez');
  assert.equal(decidido.area, 'Escuela de Informática');
  assert.equal(pendiente.nombreCargo, 'Decano/a');
  assert.equal(pendiente.titular, 'Julio Actual');
  assert.equal(d.lineaTiempo[0].titular, 'Ana Pérez');
});

test('listMyRequests: la resolución usa el titular copiado al decidir', async () => {
  const [s] = await requestsService.listMyRequests(9);
  assert.equal(s.resolucion.titular, 'Ana Pérez');
  assert.equal(s.resolucion.nombreCargo, 'Directora de Escuela');
});
