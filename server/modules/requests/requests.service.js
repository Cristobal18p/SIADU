const prisma = require('../../config/prisma');
const authService = require('../auth/auth.service');
const { generarVariablesSistema } = require('../../utils/sistemaVariables');
const { validarRespuestas, respuestasDeLaPlantilla } = require('../../utils/validarRespuestas');
const { areaDe, esPasoEscuela, titularAprobador, asignacionEnEscuela } = require('../../utils/pasosFlujo');
const { urlDeFirma } = require('../../utils/storage');
const { idDe } = require('../../utils/id');

const errorServicio = (codigo, mensaje, detalles = null, status = null) => {
  const err = new Error(mensaje);
  err.codigo = codigo;
  if (detalles) err.detalles = detalles;
  if (status) err.status = status;
  return err;
};

class RequestsService {
  /** Solicitudes del usuario, de la más reciente a la más antigua. */
  async listMyRequests(idUsuario) {
    // Solo los campos de la lista, sin los JSON de la versión
    const solicitudes = await prisma.solicitud.findMany({
      where: { idUsuario: BigInt(idUsuario) },
      select: {
        idSolicitud: true,
        codigoDocumento: true,
        estado: true,
        fechaCreacion: true,
        version: { select: { plantilla: { select: { nombre: true } } } },
        aprobaciones: {
          orderBy: { secuencia: 'desc' },
          select: {
            estado: true,
            comentario: true,
            fechaAccion: true,
            cargoNombre: true,
            aprobadorNombre: true,
            usuario: { select: { personal: { select: { nombre: true, apellido: true } } } },
          },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });

    return solicitudes.map((s) => {
      const ultimaAprobacion = s.aprobaciones.find(
        (a) => a.estado === 'APROBADO' || a.estado === 'RECHAZADO'
      );
      let resolucion = null;
      if (s.estado === 'APROBADO' || s.estado === 'RECHAZADO') {
        // Primero, el titular guardado al decidir
        const per = ultimaAprobacion?.usuario?.personal;
        resolucion = {
          nombreCargo: ultimaAprobacion?.cargoNombre || '',
          titular: ultimaAprobacion?.aprobadorNombre || (per ? `${per.nombre} ${per.apellido}`.trim() : null),
          fecha: ultimaAprobacion?.fechaAccion ? new Date(ultimaAprobacion.fechaAccion).toISOString() : null,
        };
      }

      return {
        idSolicitud: Number(s.idSolicitud),
        codigoDocumento: s.codigoDocumento,
        nombrePlantilla: s.version.plantilla.nombre,
        estado: s.estado,
        fechaCreacion: new Date(s.fechaCreacion).toISOString(),
        resolucion,
        motivoRechazo: s.estado === 'RECHAZADO' ? ultimaAprobacion?.comentario || null : null,
      };
    });
  }

  /** Detalle de una solicitud; solo lo consultan su dueño y los aprobadores de su ruta. */
  async getRequest(idUsuario, idSolicitud) {
    const numId = BigInt(idSolicitud);

    const solicitud = await prisma.solicitud.findUnique({
      where: { idSolicitud: numId },
      include: {
        usuario: {
          include: {
            estudiante: { include: { carrera: true } },
            personal: true,
          },
        },
        version: {
          include: {
            plantilla: true,
          },
        },
        pasosResueltos: {
          include: {
            asignacion: { include: { cargo: true, area: true, escuela: true, departamento: true, administrativo: { include: { personal: true } } } },
          },
        },
        aprobaciones: {
          orderBy: { secuencia: 'asc' },
          include: {
            firma: true,
            usuario: {
              include: { personal: true },
            },
          },
        },
        flujo: {
          include: {
            pasos: {
              orderBy: { secuencia: 'asc' },
              include: {
                asignacion: {
                  include: {
                    cargo: true,
                    area: true,
                    escuela: true,
                    departamento: true,
                    administrativo: {
                      include: { personal: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!solicitud) {
      throw errorServicio('NO_ENCONTRADO', 'La solicitud no existe.', null, 404);
    }

    const esSolicitante = idUsuario && BigInt(solicitud.idUsuario) === BigInt(idUsuario);
    const esAprobador = idUsuario && solicitud.aprobaciones.some(
      (a) => BigInt(a.idUsuario) === BigInt(idUsuario)
    );

    if (idUsuario && !esSolicitante && !esAprobador) {
      throw errorServicio('NO_ENCONTRADO', 'La solicitud no existe o no tiene permisos para consultarla.', null, 404);
    }

    let idAprobacionPendiente = null;
    if (idUsuario) {
      const pasoPendiente = solicitud.aprobaciones.find(
        (a) => a.estado === 'PENDIENTE' && BigInt(a.idUsuario) === BigInt(idUsuario)
      );
      if (pasoPendiente) {
        idAprobacionPendiente = Number(pasoPendiente.idAprobacion);
      }
    }

    const rawDatos = solicitud.datosJson || {};
    const variablesSistema = rawDatos._sistema || null;
    const datosJson = { ...rawDatos };
    delete datosJson._sistema;

    // pasosDocumento: datos guardados en los pasos decididos; vigentes en los demás
    const aprobacionesMap = new Map(solicitud.aprobaciones.map((a) => [a.secuencia, a]));
    const resueltos = new Map((solicitud.pasosResueltos || []).map((r) => [r.secuencia, r.asignacion]));
    const pasosDocumento = (solicitud.flujo?.pasos || []).map((p) => {
      const aprob = aprobacionesMap.get(p.secuencia);
      const asig = resueltos.get(p.secuencia) ?? p.asignacion;
      const per = asig?.administrativo?.personal;
      return {
        secuencia: Number(p.secuencia),
        nombreCargo: aprob?.cargoNombre || asig?.cargo?.nombre || '',
        titular: aprob?.aprobadorNombre || (per ? `${per.nombre} ${per.apellido}`.trim() : null),
        area: aprob?.areaNombre || areaDe(asig),
        reqFirma: p.reqFirma !== false,
        estado: aprob ? aprob.estado : null,
        fechaAccion: aprob?.fechaAccion ? new Date(aprob.fechaAccion).toISOString() : null,
        comentario: aprob?.comentario || null,
        firmaUrl: aprob?.firma?.urlFirma || null,
      };
    });

    // Línea de tiempo: pasos alcanzados
    const lineaTiempo = solicitud.aprobaciones.map((a) => {
      const pasoFlujo = solicitud.flujo?.pasos.find((p) => p.secuencia === a.secuencia);
      const asig = resueltos.get(a.secuencia) ?? pasoFlujo?.asignacion;
      const per = asig?.administrativo?.personal || a.usuario?.personal;
      return {
        secuencia: Number(a.secuencia),
        nombreCargo: a.cargoNombre || asig?.cargo?.nombre || '',
        titular: a.aprobadorNombre || (per ? `${per.nombre} ${per.apellido}`.trim() : null),
        estado: a.estado,
        fechaAccion: a.fechaAccion ? new Date(a.fechaAccion).toISOString() : null,
        comentario: a.comentario || null,
        firmaUrl: a.firma?.urlFirma || null,
      };
    });

    // Firmas de Storage: URL firmada temporal
    await Promise.all([...pasosDocumento, ...lineaTiempo].map(async (p) => {
      p.firmaUrl = await urlDeFirma(p.firmaUrl);
    }));

    const usr = solicitud.usuario;
    const est = usr.estudiante;
    const per = usr.personal;
    const nombreCompleto = est
      ? `${est.nombre} ${est.apellido}`.trim()
      : (per ? `${per.nombre} ${per.apellido}`.trim() : usr.correo);
    const cedula = est?.cedula || per?.cedula || usr.cedula;

    return {
      idSolicitud: Number(solicitud.idSolicitud),
      codigoDocumento: solicitud.codigoDocumento,
      idPlantilla: Number(solicitud.version.plantilla.idPlantilla),
      nombrePlantilla: solicitud.version.plantilla.nombre,
      idVersion: Number(solicitud.idVersion),
      estado: solicitud.estado,
      fechaCreacion: new Date(solicitud.fechaCreacion).toISOString(),
      fechaResolucion: solicitud.fechaResolucion ? new Date(solicitud.fechaResolucion).toISOString() : null,
      idAprobacionPendiente,
      solicitante: {
        idUsuario: Number(solicitud.idUsuario),
        nombreCompleto,
        cedula,
        correo: usr.correo,
        carrera: est?.carrera?.descripcion || null,
      },
      datosJson,
      variablesSistema,
      variableFormJson: solicitud.version.variableFormJson || { variables: [] },
      disenoFormJson: solicitud.version.disenoFormJson || { cuerpoDocumento: { type: 'doc', content: [] } },
      pasosDocumento,
      lineaTiempo,
    };
  }

  /** Versión a radicar con su plantilla y su flujo. */
  async _cargarVersionParaRadicar(idVersion) {
    return prisma.version.findUnique({
      where: { idVersion: BigInt(idVersion) },
      include: {
        plantilla: true,
        flujo: {
          include: {
            pasos: {
              orderBy: { secuencia: 'asc' },
              include: {
                cargo: true,
                asignacion: {
                  include: {
                    cargo: true,
                    administrativo: {
                      include: {
                        personal: {
                          include: {
                            usuario: {
                              include: {
                                rolesUsuario: { include: { rol: true } },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /** Radica una solicitud: valida versión, audiencia, respuestas y aprobador del paso 1, y congela las variables. */
  async createRequest(idUsuario, { idVersion, datosJson }) {
    if (!idDe(idVersion)) {
      throw errorServicio('VALIDACION_FALLIDA', 'El parámetro idVersion es obligatorio y debe ser numérico.', [
        { campo: 'idVersion', mensaje: 'Versión inválida.' },
      ]);
    }

    if (!datosJson || typeof datosJson !== 'object' || Array.isArray(datosJson)) {
      throw errorServicio('VALIDACION_FALLIDA', 'El parámetro datosJson debe ser un objeto.', [
        { campo: 'datosJson', mensaje: 'Respuestas requeridas.' },
      ]);
    }

    // Perfil y versión en paralelo; si fallan ambos, se informa primero el del perfil
    const [rPerfil, rVersion] = await Promise.allSettled([
      authService.getMe(idUsuario),
      this._cargarVersionParaRadicar(idVersion),
    ]);
    if (rPerfil.status === 'rejected') throw rPerfil.reason;
    if (rVersion.status === 'rejected') throw rVersion.reason;
    const perfil = rPerfil.value;
    const version = rVersion.value;
    const codUnidadUsuario = perfil.codUnidad || perfil.unidad?.codUnidad;

    if (!version || !version.plantilla) {
      throw errorServicio('NO_ENCONTRADO', 'La plantilla o versión solicitada no existe.', null, 404);
    }

    if (version.plantilla.codUnidad !== codUnidadUsuario) {
      throw errorServicio('NO_ENCONTRADO', 'La plantilla solicitada no pertenece a su unidad académica.', null, 404);
    }

    const tieneAudiencia = (version.plantilla.audiencia || []).some((est) =>
      perfil.estamentos.includes(est)
    );
    if (!tieneAudiencia) {
      throw errorServicio('NO_ENCONTRADO', 'Este trámite no está disponible para su estamento universitario.', null, 404);
    }

    if (version.estado !== 'ACTIVO') {
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'La versión de la plantilla no se encuentra activa o fue actualizada. Recargue el catálogo.',
        null,
        409
      );
    }

    const variablesDef = version.variableFormJson?.variables || [];
    const detallesValidacion = validarRespuestas(variablesDef, datosJson);
    if (detallesValidacion.length > 0) {
      throw errorServicio(
        'VALIDACION_FALLIDA',
        'Hay respuestas requeridas o con formato incorrecto en el formulario.',
        detallesValidacion,
        400
      );
    }

    const pasos = version.flujo?.pasos || [];
    if (!version.idFlujo || pasos.length === 0) {
      throw errorServicio('CONFLICTO_ESTADO', 'La plantilla no tiene un flujo de aprobación válido.', null, 409);
    }

    // Pasos por escuela: titular del cargo en la escuela del solicitante
    const resueltos = new Map();
    for (const p of pasos.filter(esPasoEscuela)) {
      const asig = await asignacionEnEscuela(prisma, p.idCargo, idUsuario);
      if (!titularAprobador(asig)) {
        throw errorServicio(
          'APROBADOR_INVALIDO',
          `Su escuela no tiene un titular de «${p.cargo?.nombre ?? 'este cargo'}» que pueda aprobar.`,
          [{ campo: 'idVersion', mensaje: 'Falta el titular de su escuela.' }],
          409
        );
      }
      resueltos.set(p.secuencia, asig);
    }
    const asignacionDe = (p) => resueltos.get(p.secuencia) ?? p.asignacion;

    // Una persona aprueba una sola vez
    const titulares = pasos.map((p) => titularAprobador(asignacionDe(p))?.idUsuario).filter(Boolean).map(String);
    if (new Set(titulares).size !== titulares.length) {
      throw errorServicio('CONFLICTO_ESTADO', 'Una misma persona aparece en dos pasos de este trámite.', null, 409);
    }

    const paso1 = pasos.find((p) => p.secuencia === 1);
    const asignacion1 = paso1 ? asignacionDe(paso1) : null;
    const usuario1 = titularAprobador(asignacion1);

    if (!paso1 || !usuario1) {
      throw errorServicio(
        'APROBADOR_INVALIDO',
        'El titular asignado en el primer paso del trámite no puede aprobar solicitudes en este momento.',
        [{ campo: 'idVersion', mensaje: 'El aprobador del paso inicial está inactivo o sin permisos.' }],
        409
      );
    }

    const respuestas = respuestasDeLaPlantilla(variablesDef, datosJson);
    const fechaCreacion = new Date();
    const variablesSistema = generarVariablesSistema(perfil, null, fechaCreacion);
    const datosConSistema = {
      ...respuestas,
      _sistema: variablesSistema,
    };

    const resultado = await prisma.$transaction(async (tx) => {
      // El trigger genera codigo_documento
      const nuevaSolicitud = await tx.solicitud.create({
        data: {
          idVersion: version.idVersion,
          idUsuario: BigInt(idUsuario),
          codUnidad: version.plantilla.codUnidad,
          idFlujo: version.idFlujo,
          datosJson: datosConSistema,
          estado: 'PENDIENTE',
          fechaCreacion,
        },
      });

      // Agrega el código generado a las variables
      const datosActualizados = {
        ...respuestas,
        _sistema: {
          ...variablesSistema,
          'solicitud.codigo': nuevaSolicitud.codigoDocumento,
        },
      };

      await tx.solicitud.update({
        where: { idSolicitud: nuevaSolicitud.idSolicitud },
        data: {
          datosJson: datosActualizados,
        },
      });

      if (resueltos.size) {
        await tx.solicitudPaso.createMany({
          data: [...resueltos].map(([secuencia, asig]) => ({
            idSolicitud: nuevaSolicitud.idSolicitud,
            secuencia,
            idAsignacion: asig.idAsignacion,
          })),
        });
      }

      // Primera aprobación, para el titular del paso 1
      await tx.aprobacion.create({
        data: {
          idSolicitud: nuevaSolicitud.idSolicitud,
          idFlujo: version.idFlujo,
          secuencia: 1,
          idUsuario: usuario1.idUsuario,
          estado: 'PENDIENTE',
          fechaAsignacion: fechaCreacion,
        },
      });

      return nuevaSolicitud;
    });

    const nombreCargo1 = asignacion1.cargo?.nombre || 'la autoridad correspondiente';

    return {
      idSolicitud: Number(resultado.idSolicitud),
      codigoDocumento: resultado.codigoDocumento,
      estado: resultado.estado,
      fechaCreacion: new Date(resultado.fechaCreacion).toISOString(),
      mensaje: `Su solicitud ha sido enviada con éxito al ${nombreCargo1}.`,
    };
  }
}

module.exports = new RequestsService();
