// Ciclo completo contra PostgreSQL real con el usuario restringido de la aplicación: plantilla, solicitud,
// aprobación, rechazo, permisos, PDF y revocación de sesión. Requiere DATABASE_URL_TEST.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { Client } = require('pg');
const { prepararBase, iniciarServidor, PERSONAS, UNIDAD } = require('./entorno');

const SIN_BASE = !process.env.DATABASE_URL_TEST && 'Sin DATABASE_URL_TEST';
const HAY_CHROMIUM = [process.env.PUPPETEER_EXECUTABLE_PATH, '/usr/bin/chromium', '/usr/bin/google-chrome']
  .some((ruta) => ruta && fs.existsSync(ruta));

const DOCUMENTO = {
  formato: { fuente: 'Arial', tamano: '11pt', interlineado: '1.15' },
  cuerpoDocumento: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Motivo: ' }, { type: 'variable', attrs: { id: 'motivo' } }] },
      { type: 'signatureBlock' },
    ],
  },
};
const FORMULARIO = { variables: [{ id: 'motivo', etiqueta: 'Motivo', pregunta: 'Motivo', tipo: 'text', requerido: true }] };

describe('ciclo de un documento', { skip: SIN_BASE }, () => {
  let api;
  const t = {};
  const estado = {};

  before(async () => {
    api = await iniciarServidor(await prepararBase());
    t.admin = await api.entrar(PERSONAS.admin, 'ADMINISTRATIVO');
    t.decano = await api.entrar(PERSONAS.decano, 'ADMINISTRATIVO');
    t.secretaria = await api.entrar(PERSONAS.secretaria, 'ADMINISTRATIVO');
    t.estudiante = await api.entrar(PERSONAS.estudiante, 'ESTUDIANTE');
    t.otro = await api.entrar(PERSONAS.otroEstudiante, 'ESTUDIANTE');
  });

  after(async () => {
    await api?.cerrar();
  });

  const pendientes = async (token) => (await api.pedir('GET', '/approvals/pending', { token })).datos;
  const solicitar = async (motivo) => {
    const r = await api.pedir('POST', '/requests', {
      token: t.estudiante,
      cuerpo: { idVersion: estado.idVersion, datosJson: { motivo } },
    });
    assert.equal(r.status, 201, JSON.stringify(r.datos));
    return r.datos;
  };

  it('el administrador crea un flujo de dos pasos y publica una plantilla', async () => {
    const cargos = await api.pedir('GET', '/catalogs/cargos?soloAprobadores=true', { token: t.admin });
    assert.equal(cargos.status, 200);
    const asignacion = (nombre) => cargos.datos.find((c) => c.nombreCargo === nombre)?.idAsignacion;
    assert.ok(asignacion('Decano') && asignacion('Secretaria Administrativa'), JSON.stringify(cargos.datos));

    const flujo = await api.pedir('POST', '/flows', {
      token: t.admin,
      cuerpo: {
        nombre: 'Flujo de prueba',
        codigo: 'F-PRUEBA',
        codUnidad: UNIDAD,
        pasos: [
          { secuencia: 1, idAsignacion: asignacion('Decano'), reqFirma: true },
          { secuencia: 2, idAsignacion: asignacion('Secretaria Administrativa'), reqFirma: true },
        ],
      },
    });
    assert.equal(flujo.status, 201, JSON.stringify(flujo.datos));
    assert.equal(flujo.datos.estado, 'BORRADOR');

    const plantilla = await api.pedir('POST', '/templates', {
      token: t.admin,
      cuerpo: {
        nombre: 'Constancia de prueba',
        descripcion: '',
        codUnidad: UNIDAD,
        audiencia: ['ESTUDIANTE'],
        idFlujo: flujo.datos.idFlujo,
        variableFormJson: FORMULARIO,
        disenoFormJson: DOCUMENTO,
      },
    });
    assert.equal(plantilla.status, 201, JSON.stringify(plantilla.datos));
    Object.assign(estado, { idPlantilla: plantilla.datos.idPlantilla, idVersion: plantilla.datos.idVersion });

    const publicada = await api.pedir('POST', `/templates/${estado.idPlantilla}/publish`, {
      token: t.admin,
      cuerpo: { idVersion: estado.idVersion },
    });
    assert.equal(publicada.status, 200, JSON.stringify(publicada.datos));
    assert.equal(publicada.datos.estado, 'ACTIVO');
  });

  it('el estudiante ve el trámite en su catálogo y lo solicita', async () => {
    const catalogo = await api.pedir('GET', '/templates/catalog', { token: t.estudiante });
    assert.ok(catalogo.datos.some((p) => p.idPlantilla === estado.idPlantilla));

    const solicitud = await solicitar('Prueba de integración');
    assert.equal(solicitud.estado, 'PENDIENTE');
    assert.match(solicitud.codigoDocumento, new RegExp(`^UP${UNIDAD}-\\d{4}-0001$`));
    estado.aprobada = solicitud.idSolicitud;
  });

  it('solo ve la solicitud su dueño y el aprobador del paso en curso', async () => {
    assert.equal((await pendientes(t.secretaria)).length, 0);
    assert.equal((await api.pedir('GET', `/requests/${estado.aprobada}`, { token: t.secretaria })).status, 404);
    assert.equal((await api.pedir('GET', `/requests/${estado.aprobada}`, { token: t.otro })).status, 404);
    assert.equal((await api.pedir('GET', `/requests/${estado.aprobada}`, { token: t.decano })).status, 200);
    assert.equal((await pendientes(t.decano)).filter((a) => a.idSolicitud === estado.aprobada).length, 1);
  });

  it('aprobar los dos pasos deja la solicitud APROBADO con las dos firmas', async () => {
    const paso1 = (await pendientes(t.decano)).find((a) => a.idSolicitud === estado.aprobada);
    const d1 = await api.pedir('POST', `/approvals/${paso1.idAprobacion}/decision`, { token: t.decano, cuerpo: { decision: 'APROBADO' } });
    assert.equal(d1.status, 200, JSON.stringify(d1.datos));
    assert.equal(d1.datos.solicitudFinalizada, false);
    estado.paso1 = paso1.idAprobacion;

    const paso2 = (await pendientes(t.secretaria)).find((a) => a.idSolicitud === estado.aprobada);
    assert.ok(paso2, 'el paso 2 debe llegar a la bandeja de la secretaria');
    const d2 = await api.pedir('POST', `/approvals/${paso2.idAprobacion}/decision`, { token: t.secretaria, cuerpo: { decision: 'APROBADO' } });
    assert.equal(d2.status, 200, JSON.stringify(d2.datos));
    assert.equal(d2.datos.estadoSolicitud, 'APROBADO');

    const detalle = (await api.pedir('GET', `/requests/${estado.aprobada}`, { token: t.estudiante })).datos;
    assert.equal(detalle.estado, 'APROBADO');
    assert.equal(detalle.pasosDocumento.length, 2);
    assert.ok(detalle.pasosDocumento.every((p) => p.estado === 'APROBADO' && p.firmaUrl?.startsWith('data:')));
  });

  it('una decisión ya tomada no se puede repetir', async () => {
    const r = await api.pedir('POST', `/approvals/${estado.paso1}/decision`, { token: t.decano, cuerpo: { decision: 'RECHAZADO', comentario: 'x' } });
    assert.equal(r.status, 409);
  });

  it('el PDF solo lo descarga el dueño', async (prueba) => {
    assert.equal((await api.pedir('GET', `/documents/${estado.aprobada}/pdf`, { token: t.decano })).status, 404);
    assert.equal((await api.pedir('GET', `/documents/${estado.aprobada}/pdf`, { token: t.otro })).status, 404);
    if (!HAY_CHROMIUM) return prueba.skip('Sin Chromium disponible');
    const pdf = await api.pedir('GET', `/documents/${estado.aprobada}/pdf`, { token: t.estudiante });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.datos.subarray(0, 4).toString(), '%PDF');
  });

  it('un rechazo exige motivo, cierra la solicitud y no deja PDF', async () => {
    const solicitud = await solicitar('Para rechazar');
    const paso1 = (await pendientes(t.decano)).find((a) => a.idSolicitud === solicitud.idSolicitud);

    const sinMotivo = await api.pedir('POST', `/approvals/${paso1.idAprobacion}/decision`, { token: t.decano, cuerpo: { decision: 'RECHAZADO' } });
    assert.equal(sinMotivo.status, 400);

    const rechazo = await api.pedir('POST', `/approvals/${paso1.idAprobacion}/decision`, {
      token: t.decano,
      cuerpo: { decision: 'RECHAZADO', comentario: 'Datos incompletos' },
    });
    assert.equal(rechazo.status, 200, JSON.stringify(rechazo.datos));
    assert.equal(rechazo.datos.estadoSolicitud, 'RECHAZADO');
    assert.equal((await pendientes(t.secretaria)).some((a) => a.idSolicitud === solicitud.idSolicitud), false);
    assert.equal((await api.pedir('GET', `/documents/${solicitud.idSolicitud}/pdf`, { token: t.estudiante })).status, 400);
  });

  it('el historial del aprobador registra sus decisiones', async () => {
    const r = await api.pedir('GET', '/approvals/history?limit=10', { token: t.decano });
    assert.equal(r.status, 200);
    assert.equal(r.datos.total, 2);
  });

  it('cerrar la sesión revoca el token', async () => {
    assert.equal((await api.pedir('POST', '/auth/logout', { token: t.estudiante })).status, 200);
    assert.equal((await api.pedir('GET', '/auth/me', { token: t.estudiante })).status, 401);
  });

  it('quitar un rol revoca las sesiones de esa cuenta', async () => {
    assert.equal((await api.pedir('GET', '/approvals/pending', { token: t.secretaria })).status, 200);
    const cliente = new Client({ connectionString: process.env.DATABASE_URL_TEST });
    await cliente.connect();
    try {
      await cliente.query(
        `DELETE FROM usuarios_roles WHERE id_usuario = (SELECT id_usuario FROM usuarios WHERE correo = $1)`,
        [PERSONAS.secretaria.correo]
      );
    } finally {
      await cliente.end();
    }
    assert.equal((await api.pedir('GET', '/approvals/pending', { token: t.secretaria })).status, 401);
  });
});
