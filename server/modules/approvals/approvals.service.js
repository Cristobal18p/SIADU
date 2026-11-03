const prisma = require('../../config/prisma');
const { INCLUDE_TITULAR, areaDe } = require('../../utils/pasosFlujo');

const LARGO_MAX_COMENTARIO = 1000;

const errorServicio = (codigo, mensaje, detalles = null, status = null) => {
  const err = new Error(mensaje);
  err.codigo = codigo;
  if (detalles) err.detalles = detalles;
  if (status) err.status = status;
  return err;
};

/** Decide solo si sigue PENDIENTE; si otra petición ya decidió, 409. */
const decidir = async (tx, idAprobacion, data) => {
  const { count } = await tx.aprobacion.updateMany({ where: { idAprobacion, estado: 'PENDIENTE' }, data });
  if (count === 0) {
    throw errorServicio(
      'CONFLICTO_ESTADO',
      'Este trámite ya fue resuelto previamente o ya no se encuentra en estado pendiente.',
      null,
      409
    );
  }
};

// Campos de la bandeja y el historial, sin los JSON de la solicitud ni de la versión
const SOLICITUD_RESUMEN = {
  select: {
    codigoDocumento: true,
    version: { select: { plantilla: { select: { nombre: true } } } },
    usuario: {
      select: {
        correo: true,
        cedula: true,
        estudiante: { select: { nombre: true, apellido: true, cedula: true } },
        personal: { select: { nombre: true, apellido: true, cedula: true } },
      },
    },
  },
};

class ApprovalsService {
  /** Aprobaciones pendientes del usuario en el paso activo. */
  async listPendingApprovals(idUsuario) {
    const aprobaciones = await prisma.aprobacion.findMany({
      where: {
        idUsuario: BigInt(idUsuario),
        estado: 'PENDIENTE',
        solicitud: { estado: 'PENDIENTE' },
      },
      select: {
        idAprobacion: true,
        idSolicitud: true,
        fechaAsignacion: true,
        solicitud: SOLICITUD_RESUMEN,
      },
      orderBy: { fechaAsignacion: 'asc' },
    });

    return aprobaciones.map((a) => {
      const s = a.solicitud;
      const usr = s.usuario;
      const est = usr.estudiante;
      const per = usr.personal;
      const solicitanteNombre = est
        ? `${est.nombre} ${est.apellido}`.trim()
        : (per ? `${per.nombre} ${per.apellido}`.trim() : usr.correo);
      const solicitanteCedula = est?.cedula || per?.cedula || usr.cedula;

      return {
        idAprobacion: Number(a.idAprobacion),
        idSolicitud: Number(a.idSolicitud),
        codigoDocumento: s.codigoDocumento,
        nombrePlantilla: s.version.plantilla.nombre,
        solicitanteNombre,
        solicitanteCedula,
        fechaAsignacion: new Date(a.fechaAsignacion).toISOString(),
      };
    });
  }

  /** Historial paginado de resoluciones del usuario. */
  async listApprovalHistory(idUsuario, params = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));
    const offset = (page - 1) * limit;

    const idUser = BigInt(idUsuario);
    const decision = params.decision ? String(params.decision).toUpperCase() : null;
    const desde = params.desde ? new Date(params.desde) : null;
    const hasta = params.hasta ? new Date(params.hasta) : null;

    const detalles = [];
    if (decision && !['APROBADO', 'RECHAZADO'].includes(decision)) {
      detalles.push({ campo: 'decision', mensaje: 'La decisión debe ser APROBADO o RECHAZADO.' });
    }
    if (desde && Number.isNaN(desde.getTime())) detalles.push({ campo: 'desde', mensaje: 'Fecha inválida.' });
    if (hasta && Number.isNaN(hasta.getTime())) detalles.push({ campo: 'hasta', mensaje: 'Fecha inválida.' });
    if (detalles.length > 0) {
      throw errorServicio('VALIDACION_FALLIDA', 'Hay filtros con formato incorrecto.', detalles);
    }

    const where = {
      idUsuario: idUser,
      estado: decision ? decision : { in: ['APROBADO', 'RECHAZADO'] },
      ...(desde || hasta ? {
        fechaAccion: {
          ...(desde ? { gte: desde } : {}),
          ...(hasta ? { lt: hasta } : {}),
        },
      } : {}),
    };

    const [total, aprobaciones] = await Promise.all([
      prisma.aprobacion.count({ where }),
      prisma.aprobacion.findMany({
        where,
        select: {
          idAprobacion: true,
          idSolicitud: true,
          estado: true,
          comentario: true,
          fechaAccion: true,
          solicitud: SOLICITUD_RESUMEN,
        },
        orderBy: { fechaAccion: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const totalPaginas = Math.ceil(total / limit) || 1;

    const datos = aprobaciones.map((a) => {
      const s = a.solicitud;
      const usr = s.usuario;
      const est = usr.estudiante;
      const per = usr.personal;
      const solicitanteNombre = est
        ? `${est.nombre} ${est.apellido}`.trim()
        : (per ? `${per.nombre} ${per.apellido}`.trim() : usr.correo);
      const solicitanteCedula = est?.cedula || per?.cedula || usr.cedula;

      return {
        idAprobacion: Number(a.idAprobacion),
        idSolicitud: Number(a.idSolicitud),
        codigoDocumento: s.codigoDocumento,
        nombrePlantilla: s.version.plantilla.nombre,
        solicitanteNombre,
        solicitanteCedula,
        decision: a.estado,
        comentario: a.comentario || null,
        fechaAccion: a.fechaAccion ? new Date(a.fechaAccion).toISOString() : null,
      };
    });

    return {
      total,
      pagina: page,
      limite: limit,
      totalPaginas,
      datos,
    };
  }

  /** Registra la decisión (APROBADO o RECHAZADO) sobre un paso. */
  async submitDecision(idUsuario, idAprobacion, { decision, comentario }) {
    const decUpper = String(decision || '').trim().toUpperCase();
    if (!['APROBADO', 'RECHAZADO'].includes(decUpper)) {
      throw errorServicio('VALIDACION_FALLIDA', 'La decisión debe ser APROBADO o RECHAZADO.', [
        { campo: 'decision', mensaje: 'Decisión inválida.' },
      ]);
    }

    const comentarioLimpio = comentario ? String(comentario).trim() : null;

    if (comentarioLimpio && comentarioLimpio.length > LARGO_MAX_COMENTARIO) {
      throw errorServicio('VALIDACION_FALLIDA', `El comentario no puede superar ${LARGO_MAX_COMENTARIO} caracteres.`, [
        { campo: 'comentario', mensaje: `Máximo ${LARGO_MAX_COMENTARIO} caracteres.` },
      ]);
    }

    if (decUpper === 'RECHAZADO' && (!comentarioLimpio || comentarioLimpio === '')) {
      throw errorServicio('VALIDACION_FALLIDA', 'El motivo de rechazo es obligatorio.', [
        { campo: 'comentario', mensaje: 'Debe ingresar una justificación para el rechazo.' },
      ]);
    }

    const numIdAprobacion = BigInt(idAprobacion);

    // La firma activa se busca en paralelo; el `catch` evita un rechazo sin atender
    const firmaPendiente = decUpper === 'APROBADO'
      ? prisma.firma.findFirst({
        where: { personal: { idUsuario: BigInt(idUsuario) }, estado: 'A' },
        select: { idFirma: true },
      })
      : null;
    firmaPendiente?.catch(() => {});

    const aprobacion = await prisma.aprobacion.findUnique({
      where: { idAprobacion: numIdAprobacion },
      include: {
        solicitud: {
          include: {
            pasosResueltos: { include: { asignacion: { include: INCLUDE_TITULAR } } },
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
        },
      },
    });

    // Para otro usuario, 404: no revela que la aprobación existe
    if (!aprobacion || BigInt(aprobacion.idUsuario) !== BigInt(idUsuario)) {
      throw errorServicio('NO_ENCONTRADO', 'La aprobación no existe o no tiene permisos para resolverla.', null, 404);
    }

    if (aprobacion.estado !== 'PENDIENTE' || aprobacion.solicitud.estado !== 'PENDIENTE') {
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'Este trámite ya fue resuelto previamente o ya no se encuentra en estado pendiente.',
        null,
        409
      );
    }

    const fechaAccion = new Date();

    const pasos = aprobacion.solicitud.flujo?.pasos || [];
    const resueltos = new Map((aprobacion.solicitud.pasosResueltos || []).map((r) => [r.secuencia, r.asignacion]));
    const asignacionDe = (p) => (p ? resueltos.get(p.secuencia) ?? p.asignacion : null);
    const pasoActual = pasos.find((p) => p.secuencia === aprobacion.secuencia);
    const asigActual = asignacionDe(pasoActual);
    const perActual = asigActual?.administrativo?.personal;
    const cargoNombre = asigActual?.cargo?.nombre || null;
    const areaNombre = asigActual ? areaDe(asigActual) : null;
    const aprobadorNombre = perActual ? `${perActual.nombre} ${perActual.apellido}`.trim() : null;
    const aprobadorCedula = perActual?.cedula || null;

    // Rechazo
    if (decUpper === 'RECHAZADO') {
      await prisma.$transaction(async (tx) => {
        await decidir(tx, numIdAprobacion, {
          estado: 'RECHAZADO',
          comentario: comentarioLimpio,
          fechaAccion,
          cargoNombre,
          areaNombre,
          aprobadorNombre,
          aprobadorCedula,
        });

        await tx.solicitud.update({
          where: { idSolicitud: aprobacion.idSolicitud },
          data: {
            estado: 'RECHAZADO',
            fechaResolucion: fechaAccion,
          },
        });
      });

      return {
        idAprobacion: Number(aprobacion.idAprobacion),
        estadoAprobacion: 'RECHAZADO',
        estadoSolicitud: 'RECHAZADO',
        fechaAccion: fechaAccion.toISOString(),
        solicitudFinalizada: true,
        mensaje: 'La solicitud ha sido rechazada formalmente.',
      };
    }

    // Aprobación
    const firmaActiva = await firmaPendiente;
    const idFirma = firmaActiva ? firmaActiva.idFirma : null;

    const pasoActualSecuencia = aprobacion.secuencia;
    const pasoSiguiente = pasos.find((p) => p.secuencia === pasoActualSecuencia + 1);

    if (pasoSiguiente) {
      const asigSig = asignacionDe(pasoSiguiente);
      const persSig = asigSig?.administrativo?.personal;
      const userSig = persSig?.usuario;
      const userSigActivo = persSig?.estado === 'A' && userSig?.estado === 'A';
      const esAprobadorSig = userSig?.rolesUsuario?.some(
        (ur) => ur.rol.descripcion.toUpperCase() === 'APROBADOR'
      );

      if (!asigSig || !userSig || !userSigActivo || !esAprobadorSig) {
        throw errorServicio(
          'APROBADOR_INVALIDO',
          'El titular asignado al siguiente paso del trámite no está habilitado para aprobar.',
          [{ campo: 'pasoSiguiente', mensaje: 'El aprobador del paso siguiente está inactivo o sin permisos.' }],
          409
        );
      }

      await prisma.$transaction(async (tx) => {
        await decidir(tx, numIdAprobacion, {
          estado: 'APROBADO',
          comentario: comentarioLimpio,
          idFirma,
          fechaAccion,
          cargoNombre,
          areaNombre,
          aprobadorNombre,
          aprobadorCedula,
        });

        await tx.aprobacion.create({
          data: {
            idSolicitud: aprobacion.idSolicitud,
            idFlujo: aprobacion.idFlujo,
            secuencia: pasoSiguiente.secuencia,
            idUsuario: userSig.idUsuario,
            estado: 'PENDIENTE',
            fechaAsignacion: fechaAccion,
          },
        });
      });

      const cargoSiguiente = asigSig.cargo?.nombre || 'siguiente autoridad';
      return {
        idAprobacion: Number(aprobacion.idAprobacion),
        estadoAprobacion: 'APROBADO',
        estadoSolicitud: 'PENDIENTE',
        fechaAccion: fechaAccion.toISOString(),
        solicitudFinalizada: false,
        mensaje: `Aprobación registrada con éxito. El trámite avanzó al ${cargoSiguiente}.`,
      };
    }

    // Último paso completado
    await prisma.$transaction(async (tx) => {
      await decidir(tx, numIdAprobacion, {
        estado: 'APROBADO',
        comentario: comentarioLimpio,
        idFirma,
        fechaAccion,
        cargoNombre,
        areaNombre,
        aprobadorNombre,
        aprobadorCedula,
      });

      await tx.solicitud.update({
        where: { idSolicitud: aprobacion.idSolicitud },
        data: {
          estado: 'APROBADO',
          fechaResolucion: fechaAccion,
        },
      });
    });

    return {
      idAprobacion: Number(aprobacion.idAprobacion),
      estadoAprobacion: 'APROBADO',
      estadoSolicitud: 'APROBADO',
      fechaAccion: fechaAccion.toISOString(),
      solicitudFinalizada: true,
      mensaje: 'Trámite aprobado en su totalidad y finalizado con éxito.',
    };
  }
}

module.exports = new ApprovalsService();
