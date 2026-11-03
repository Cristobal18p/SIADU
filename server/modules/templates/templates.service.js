const prisma = require('../../config/prisma');
const authService = require('../auth/auth.service');
const { generarVariablesSistema } = require('../../utils/sistemaVariables');
const { INCLUDE_TITULAR, esPasoEscuela, titularAprobador, asignacionEnEscuela, pasoFlujo } = require('../../utils/pasosFlujo');

const errorServicio = (codigo, mensaje, detalles = null, status = null) => {
  const err = new Error(mensaje);
  err.codigo = codigo;
  if (detalles) err.detalles = detalles;
  if (status) err.status = status;
  return err;
};

// Reglas del documento del motor compartido (ESM)
const validador = () => import('../../../shared/documento/validar.js');

const exigir = (detalles) => {
  if (detalles.length) throw errorServicio('VALIDACION_FALLIDA', detalles[0].mensaje, detalles, 400);
};

/** Flujo de una versión: existe (404), es de la unidad (400) y no es el borrador de otra versión (409). */
const comprobarFlujo = async (idFlujo, codUnidad, idVersion = null) => {
  const flujo = await prisma.flujo.findUnique({
    where: { idFlujo: BigInt(idFlujo) },
    select: { codUnidad: true, estado: true, idVersionBorrador: true },
  });
  if (!flujo) throw errorServicio('NO_ENCONTRADO', 'El flujo de aprobación no existe.', null, 404);
  if (flujo.codUnidad !== Number(codUnidad)) {
    exigir([{ campo: 'idFlujo', mensaje: 'El flujo es de otra unidad.' }]);
  }
  const ajeno = idVersion == null || String(flujo.idVersionBorrador) !== String(idVersion);
  if (flujo.estado === 'B' && flujo.idVersionBorrador != null && ajeno) {
    throw errorServicio('CONFLICTO_ESTADO', 'El flujo en borrador pertenece a otra versión de plantilla.', null, 409);
  }
};

/** Plantilla de otra unidad: 404. Sin `contexto.codUnidad` no se comprueba. */
const comprobarUnidad = async (idPlantilla, contexto) => {
  if (contexto?.codUnidad == null) return;
  const plantilla = await prisma.plantilla.findUnique({
    where: { idPlantilla: BigInt(idPlantilla) },
    select: { codUnidad: true },
  });
  if (plantilla && plantilla.codUnidad !== Number(contexto.codUnidad)) {
    throw errorServicio('NO_ENCONTRADO', 'La plantilla especificada no existe.', null, 404);
  }
};

/** Unidad, roles y estamentos del usuario, desde el token (`req.user`); sin contexto, carga el perfil. */
const contextoDe = async (idUsuario, contexto) => {
  if (contexto && Array.isArray(contexto.roles) && Array.isArray(contexto.estamentos)) {
    return { roles: contexto.roles, estamentos: contexto.estamentos, codUnidad: contexto.codUnidad ?? null };
  }
  const perfil = await authService.getMe(idUsuario);
  return {
    roles: perfil.roles,
    estamentos: perfil.estamentos,
    codUnidad: perfil.codUnidad || perfil.unidad?.codUnidad || null,
  };
};

/** Filtro por estado de la versión vigente (la ACTIVO o la de mayor número); lo usan el inventario y el resumen. */
const filtroPorEstadoVigente = (estado) => {
  switch (estado) {
    case null:
    case undefined:
      return {};
    case 'ACTIVO':
      return { versiones: { some: { estado: 'ACTIVO' } } };
    case 'BORRADOR':
      return { AND: [{ versiones: { none: { estado: 'ACTIVO' } } }, { versiones: { some: { estado: 'BORRADOR' } } }] };
    case 'INACTIVO':
      return {
        AND: [
          { versiones: { none: { estado: { in: ['ACTIVO', 'BORRADOR'] } } } },
          { versiones: { some: {} } },
        ],
      };
    default:
      // Un estado desconocido no coincide con ninguna plantilla
      return { versiones: { some: { estado } } };
  }
};

// Campos de versión del inventario, sin los JSON del formulario y del documento
const VERSION_RESUMEN = { idVersion: true, numeroVersion: true, estado: true, fechaPublic: true };

const ESTAMENTOS = ['ESTUDIANTE', 'PROFESOR', 'ADMINISTRATIVO'];

/** Indica si la plantilla nunca se publicó: su única versión es la 1 en BORRADOR. */
const nuncaPublicada = (versiones) =>
  versiones.length === 1 && versiones[0].numeroVersion === 1 && versiones[0].estado === 'BORRADOR';

/** `audiencia` del cuerpo: arreglo no vacío de estamentos válidos y sin repetir. Devuelve los errores por campo. */
const erroresAudiencia = (audiencia) => {
  if (!Array.isArray(audiencia) || audiencia.length === 0) {
    return [{ campo: 'audiencia', mensaje: 'Elige al menos un grupo que pueda solicitar la plantilla.' }];
  }
  if (audiencia.some((a) => !ESTAMENTOS.includes(a))) {
    return [{ campo: 'audiencia', mensaje: `Los grupos válidos son ${ESTAMENTOS.join(', ')}.` }];
  }
  if (new Set(audiencia).size !== audiencia.length) {
    return [{ campo: 'audiencia', mensaje: 'La audiencia no puede repetir un grupo.' }];
  }
  return [];
};

class TemplatesService {
  /** Catálogo del solicitante: plantillas activas de su unidad dirigidas a sus estamentos. */
  async getCatalog(idUsuario, contexto) {
    const ctx = await contextoDe(idUsuario, contexto);
    const codUnidad = ctx.codUnidad;

    const plantillas = await prisma.plantilla.findMany({
      where: {
        codUnidad,
        estado: 'A',
        versiones: {
          some: { estado: 'ACTIVO' },
        },
      },
      include: {
        versiones: {
          where: { estado: 'ACTIVO' },
          orderBy: { numeroVersion: 'desc' },
          take: 1,
          select: { idVersion: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    const filtradas = plantillas.filter((p) => {
      const audiencia = Array.isArray(p.audiencia) ? p.audiencia : [];
      return audiencia.some((est) => ctx.estamentos.includes(est));
    });

    return filtradas.map((p) => ({
      idPlantilla: Number(p.idPlantilla),
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      codUnidad: p.codUnidad,
      idVersion: Number(p.versiones[0].idVersion),
    }));
  }

  /** Inventario de plantillas con paginación, filtro por estado y búsqueda. */
  async getTemplates(idUsuario, { page = 1, limit = 10, estado = 'TODOS', search, codUnidad }, contexto) {
    // Con `codUnidad` explícito no hace falta la unidad del usuario
    const unidad = codUnidad ? Number(codUnidad) : (await contextoDe(idUsuario, contexto)).codUnidad;

    const numPage = Math.max(1, Number(page) || 1);
    const numLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const offset = (numPage - 1) * numLimit;

    const filtroEstado = (estado && estado !== 'TODOS') ? estado.trim().toUpperCase() : null;

    const where = {
      codUnidad: unidad,
      ...(search && search.trim() ? {
        OR: [
          { nombre: { contains: search.trim(), mode: 'insensitive' } },
          { descripcion: { contains: search.trim(), mode: 'insensitive' } },
        ],
      } : {}),
      ...filtroPorEstadoVigente(filtroEstado),
    };

    const [total, plantillas] = await Promise.all([
      prisma.plantilla.count({ where }),
      prisma.plantilla.findMany({
        where,
        include: {
          versiones: {
            orderBy: { numeroVersion: 'desc' },
            select: VERSION_RESUMEN,
          },
        },
        orderBy: [
          { fechaRegistrado: 'desc' },
          { nombre: 'asc' },
        ],
        skip: offset,
        take: numLimit,
      }),
    ]);

    const totalPaginas = Math.ceil(total / numLimit) || 0;

    const datos = plantillas.map((p) => {
      const activa = p.versiones.find((v) => v.estado === 'ACTIVO');
      const borrador = p.versiones.find((v) => v.estado === 'BORRADOR');
      const vigente = activa || p.versiones[0] || {};
      const fechaActualizacion = vigente.fechaPublic || p.fechaRegistrado;

      return {
        idPlantilla: Number(p.idPlantilla),
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        codUnidad: p.codUnidad,
        audiencia: Array.isArray(p.audiencia) ? p.audiencia : [],
        numeroVersion: Number(vigente.numeroVersion || 1),
        estadoVersion: vigente.estado || 'BORRADOR',
        idVersionBorrador: borrador ? Number(borrador.idVersion) : null,
        fechaActualizacion: fechaActualizacion ? new Date(fechaActualizacion).toISOString() : null,
      };
    });

    return {
      total,
      pagina: numPage,
      limite: numLimit,
      totalPaginas,
      datos,
    };
  }

  /** Totales por estado de la versión vigente, con el mismo criterio que el inventario. */
  async getSummary(idUsuario, { codUnidad } = {}, contexto) {
    const unidad = codUnidad ? Number(codUnidad) : (await contextoDe(idUsuario, contexto)).codUnidad;
    const contar = (estado) => prisma.plantilla.count({ where: { codUnidad: unidad, ...filtroPorEstadoVigente(estado) } });

    const [total, activas, borradores, inactivas] = await Promise.all([
      contar(null),
      contar('ACTIVO'),
      contar('BORRADOR'),
      contar('INACTIVO'),
    ]);

    return { total, activas, borradores, inactivas };
  }

  /** Plantilla con su formulario, diseño y flujo; para el solicitante incluye `variablesSistema`. */
  async getTemplateById(idUsuario, idPlantilla, idVersion = null, contexto) {
    const ctx = await contextoDe(idUsuario, contexto);
    const esAdmin = ctx.roles.includes('ADMINISTRADOR');

    // El perfil solo lo necesita el solicitante; se pide en paralelo y el `catch` evita un rechazo sin atender
    const perfilPendiente = esAdmin ? null : authService.getMe(idUsuario);
    perfilPendiente?.catch(() => {});

    const numIdPlantilla = BigInt(idPlantilla);

    // Borrador en curso, para el administrador; se pide en paralelo
    const borradorPendiente = esAdmin
      ? prisma.version.findFirst({
        where: { idPlantilla: numIdPlantilla, estado: 'BORRADOR' },
        select: { idVersion: true, numeroVersion: true },
      })
      : null;
    borradorPendiente?.catch(() => {});

    const plantilla = await prisma.plantilla.findUnique({
      where: { idPlantilla: numIdPlantilla },
      include: {
        versiones: {
          where: idVersion ? { idVersion: BigInt(idVersion) } : undefined,
          orderBy: [{ estado: 'asc' }, { numeroVersion: 'desc' }],
          include: {
            flujo: {
              include: {
                pasos: {
                  orderBy: { secuencia: 'asc' },
                  include: {
                    cargo: true,
                    asignacion: {
                      include: {
                        cargo: true,
                        area: true,
                        escuela: true,
                        departamento: true,
                        unidad: true,
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
        },
      },
    });

    if (!plantilla || plantilla.versiones.length === 0) {
      throw errorServicio('NO_ENCONTRADO', 'La plantilla solicitada no existe.', null, 404);
    }
    if (esAdmin && ctx.codUnidad != null && plantilla.codUnidad !== Number(ctx.codUnidad)) {
      throw errorServicio('NO_ENCONTRADO', 'La plantilla solicitada no existe.', null, 404);
    }

    // Sin idVersion: la ACTIVO o, si no hay, la de mayor número
    let version = plantilla.versiones.find((v) => v.estado === 'ACTIVO');
    if (!version) {
      version = plantilla.versiones.sort((a, b) => b.numeroVersion - a.numeroVersion)[0];
    }

    const codUnidadUsuario = ctx.codUnidad;

    if (!esAdmin) {
      if (plantilla.codUnidad !== codUnidadUsuario) {
        throw errorServicio('NO_ENCONTRADO', 'La plantilla no pertenece a su unidad académica.', null, 404);
      }
      const audiencia = Array.isArray(plantilla.audiencia) ? plantilla.audiencia : [];
      const tieneAudiencia = audiencia.some((est) => ctx.estamentos.includes(est));
      if (!tieneAudiencia) {
        throw errorServicio('NO_ENCONTRADO', 'La plantilla no está disponible para su estamento.', null, 404);
      }
      if (version.estado !== 'ACTIVO') {
        throw errorServicio('NO_ENCONTRADO', 'La plantilla no se encuentra activa para recepción de solicitudes.', null, 404);
      }
    }

    // Flujo; para el solicitante, los pasos por escuela con el titular de su escuela
    let flujo = null;
    if (version.flujo) {
      const pasos = await Promise.all(version.flujo.pasos.map(async (p) => {
        const asig = esPasoEscuela(p) && !esAdmin ? await asignacionEnEscuela(prisma, p.idCargo, idUsuario) : p.asignacion;
        const per = asig?.administrativo?.personal;
        return { ...pasoFlujo(p, asig), cedulaTitular: per?.cedula || null, correoTitular: per?.correo || null };
      }));
      flujo = {
        idFlujo: Number(version.flujo.idFlujo),
        nombre: version.flujo.nombre,
        codigo: version.flujo.codigo,
        estado: version.flujo.estado === 'A' ? 'ACTIVO' : 'BORRADOR',
        pasos,
      };
    }

    let versionBorrador = null;
    if (esAdmin) {
      const borradorRow = await borradorPendiente;
      if (borradorRow) {
        versionBorrador = {
          idVersion: Number(borradorRow.idVersion),
          numeroVersion: borradorRow.numeroVersion,
        };
      }
    }

    // Vista previa de variablesSistema para el solicitante, sin código
    const variablesSistema = !esAdmin
      ? generarVariablesSistema(await perfilPendiente, null, new Date())
      : null;

    return {
      idPlantilla: Number(plantilla.idPlantilla),
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion || '',
      codUnidad: plantilla.codUnidad,
      audiencia: plantilla.audiencia || [],
      estado: version.estado,
      idVersion: Number(version.idVersion),
      numeroVersion: Number(version.numeroVersion),
      estadoVersion: version.estado,
      fechaPublicacion: version.fechaPublic ? new Date(version.fechaPublic).toISOString() : null,
      versionBorrador,
      variableFormJson: version.variableFormJson || { variables: [] },
      disenoFormJson: version.disenoFormJson || { cuerpoDocumento: { type: 'doc', content: [] } },
      idFlujo: version.idFlujo ? Number(version.idFlujo) : null,
      flujo,
      variablesSistema,
    };
  }

  /** Crea una plantilla con su versión 1 en BORRADOR. */
  async createTemplate(idUsuario, {
    nombre,
    descripcion,
    codUnidad,
    audiencia,
    idFlujo,
    variableFormJson,
    disenoFormJson,
  }) {
    if (!nombre || !nombre.trim()) {
      throw errorServicio('VALIDACION_FALLIDA', 'El nombre de la plantilla es requerido.', null, 400);
    }

    const unidad = Number(codUnidad);
    if (!unidad) {
      throw errorServicio('VALIDACION_FALLIDA', 'La unidad académica es requerida.', null, 400);
    }

    const audienciaArray = Array.isArray(audiencia) && audiencia.length > 0 ? audiencia : ['ESTUDIANTE'];

    const { validarDefinicion } = await validador();
    exigir(validarDefinicion(
      variableFormJson || { variables: [] },
      disenoFormJson || { cuerpoDocumento: { type: 'doc', content: [] } }
    ));
    if (idFlujo) await comprobarFlujo(idFlujo, unidad);

    const resultado = await prisma.$transaction(async (tx) => {
      const plantilla = await tx.plantilla.create({
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion ? descripcion.trim() : null,
          codUnidad: unidad,
          audiencia: audienciaArray,
          estado: 'A',
        },
      });

      const version = await tx.version.create({
        data: {
          idPlantilla: plantilla.idPlantilla,
          numeroVersion: 1,
          variableFormJson: variableFormJson || { variables: [] },
          disenoFormJson: disenoFormJson || { cuerpoDocumento: { type: 'doc', content: [] } },
          idFlujo: idFlujo ? BigInt(idFlujo) : null,
          estado: 'BORRADOR',
          creadoPor: BigInt(idUsuario),
        },
      });

      if (idFlujo) {
        await tx.flujo.updateMany({
          where: { idFlujo: BigInt(idFlujo), estado: 'B' },
          data: { idVersionBorrador: version.idVersion },
        });
      }

      return { plantilla, version };
    });

    return {
      idPlantilla: Number(resultado.plantilla.idPlantilla),
      idVersion: Number(resultado.version.idVersion),
      numeroVersion: 1,
      estado: 'BORRADOR',
      mensaje: 'Plantilla creada en borrador exitosamente.',
    };
  }

  /** Guarda los cambios de una versión en BORRADOR. */
  async updateTemplate(idUsuario, idPlantilla, {
    idVersion,
    nombre,
    descripcion,
    audiencia,
    idFlujo,
    variableFormJson,
    disenoFormJson,
  }, contexto) {
    await comprobarUnidad(idPlantilla, contexto);
    const numIdPlantilla = BigInt(idPlantilla);
    const numIdVersion = BigInt(idVersion);

    const version = await prisma.version.findUnique({
      where: { idVersion: numIdVersion },
    });

    if (!version || version.idPlantilla !== numIdPlantilla) {
      throw errorServicio('NO_ENCONTRADO', 'La versión de plantilla especificada no existe.', null, 404);
    }

    if (version.estado !== 'BORRADOR') {
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'Solo se pueden editar versiones en estado BORRADOR.',
        null,
        409
      );
    }

    if (variableFormJson || disenoFormJson) {
      const { validarDefinicion } = await validador();
      exigir(validarDefinicion(variableFormJson || version.variableFormJson, disenoFormJson || version.disenoFormJson));
    }
    if (idFlujo) {
      const plantilla = await prisma.plantilla.findUnique({ where: { idPlantilla: numIdPlantilla }, select: { codUnidad: true } });
      await comprobarFlujo(idFlujo, plantilla.codUnidad, numIdVersion);
    }

    // La audiencia solo cambia mientras la plantilla nunca se ha publicado; si se omite, se conserva
    if (audiencia !== undefined) {
      const detalles = erroresAudiencia(audiencia);
      if (detalles.length) {
        throw errorServicio('VALIDACION_FALLIDA', detalles[0].mensaje, detalles, 400);
      }
      const versiones = await prisma.version.findMany({
        where: { idPlantilla: numIdPlantilla },
        select: { numeroVersion: true, estado: true },
      });
      if (!nuncaPublicada(versiones)) {
        throw errorServicio(
          'CONFLICTO_ESTADO',
          'La audiencia solo se puede cambiar mientras la plantilla nunca se ha publicado.',
          null,
          409
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      if (nombre !== undefined || descripcion !== undefined || audiencia !== undefined) {
        await tx.plantilla.update({
          where: { idPlantilla: numIdPlantilla },
          data: {
            ...(nombre ? { nombre: nombre.trim() } : {}),
            ...(descripcion !== undefined ? { descripcion: descripcion ? descripcion.trim() : null } : {}),
            ...(audiencia !== undefined ? { audiencia } : {}),
          },
        });
      }

      const nuevoIdFlujo = idFlujo !== undefined ? (idFlujo ? BigInt(idFlujo) : null) : version.idFlujo;

      await tx.version.update({
        where: { idVersion: numIdVersion },
        data: {
          variableFormJson: variableFormJson || version.variableFormJson,
          disenoFormJson: disenoFormJson || version.disenoFormJson,
          idFlujo: nuevoIdFlujo,
        },
      });

      if (version.idFlujo && version.idFlujo !== nuevoIdFlujo) {
        await tx.flujo.updateMany({
          where: { idFlujo: version.idFlujo, idVersionBorrador: numIdVersion },
          data: { idVersionBorrador: null },
        });
      }

      if (nuevoIdFlujo) {
        await tx.flujo.updateMany({
          where: { idFlujo: nuevoIdFlujo, estado: 'B' },
          data: { idVersionBorrador: numIdVersion },
        });
      }
    });

    return {
      idPlantilla: Number(idPlantilla),
      idVersion: Number(idVersion),
      mensaje: 'Plantilla guardada correctamente.',
    };
  }

  /** Elimina una plantilla nunca publicada, su versión 1 y el flujo en borrador de esa versión. */
  async deleteTemplate(idUsuario, idPlantilla, contexto) {
    const ctx = await contextoDe(idUsuario, contexto);
    const numIdPlantilla = BigInt(idPlantilla);

    const plantilla = await prisma.plantilla.findUnique({
      where: { idPlantilla: numIdPlantilla },
      select: {
        codUnidad: true,
        versiones: { select: { idVersion: true, numeroVersion: true, estado: true } },
      },
    });

    // Una plantilla de otra unidad responde como si no existiera
    if (!plantilla || plantilla.codUnidad !== ctx.codUnidad) {
      throw errorServicio('NO_ENCONTRADO', 'La plantilla especificada no existe.', null, 404);
    }

    if (!nuncaPublicada(plantilla.versiones)) {
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'Solo se puede eliminar una plantilla que nunca se ha publicado. Para retirarla del catálogo, desactívela.',
        null,
        409
      );
    }

    const idsVersion = plantilla.versiones.map((v) => v.idVersion);

    await prisma.$transaction(async (tx) => {
      // Si la versión tuviera solicitudes, no se borra nada
      const solicitudes = await tx.solicitud.count({ where: { idVersion: { in: idsVersion } } });
      if (solicitudes > 0) {
        throw errorServicio('CONFLICTO_ESTADO', 'La plantilla tiene solicitudes registradas y no se puede eliminar.', null, 409);
      }

      // Se sueltan los flujos en borrador, se borra la versión y después los flujos
      const flujosPropios = await tx.flujo.findMany({
        where: { idVersionBorrador: { in: idsVersion }, estado: 'B' },
        select: { idFlujo: true },
      });
      const idsFlujo = flujosPropios.map((f) => f.idFlujo);

      await tx.flujo.updateMany({ where: { idVersionBorrador: { in: idsVersion } }, data: { idVersionBorrador: null } });
      await tx.version.deleteMany({ where: { idPlantilla: numIdPlantilla } });
      await tx.plantilla.delete({ where: { idPlantilla: numIdPlantilla } });

      if (idsFlujo.length) {
        await tx.flujoPaso.deleteMany({ where: { idFlujo: { in: idsFlujo } } });
        await tx.flujo.deleteMany({ where: { idFlujo: { in: idsFlujo } } });
      }
    });
  }

  /** Crea un borrador a partir de la versión activa o de la de mayor número. */
  async createVersion(idUsuario, idPlantilla, contexto) {
    await comprobarUnidad(idPlantilla, contexto);
    const numIdPlantilla = BigInt(idPlantilla);

    // Lecturas independientes en paralelo; los errores se evalúan después, en orden
    const [plantilla, borradorExistente, fuente, aggr] = await Promise.all([
      prisma.plantilla.findUnique({ where: { idPlantilla: numIdPlantilla }, select: { idPlantilla: true } }),
      prisma.version.findFirst({ where: { idPlantilla: numIdPlantilla, estado: 'BORRADOR' }, select: { idVersion: true } }),
      prisma.version.findFirst({
        where: { idPlantilla: numIdPlantilla },
        orderBy: [{ estado: 'asc' }, { numeroVersion: 'desc' }],
      }),
      prisma.version.aggregate({ where: { idPlantilla: numIdPlantilla }, _max: { numeroVersion: true } }),
    ]);

    if (!plantilla) {
      throw errorServicio('NO_ENCONTRADO', 'La plantilla especificada no existe.', null, 404);
    }

    if (borradorExistente) {
      // 409 con el idVersion del borrador existente en `detalles`
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'Ya existe una versión en borrador para esta plantilla. Edite o descarte el borrador existente.',
        [{ campo: 'idVersion', mensaje: String(borradorExistente.idVersion) }],
        409
      );
    }

    const nuevoNumero = (aggr._max.numeroVersion || 1) + 1;

    const nuevaVersion = await prisma.version.create({
      data: {
        idPlantilla: numIdPlantilla,
        numeroVersion: nuevoNumero,
        variableFormJson: fuente?.variableFormJson || { variables: [] },
        disenoFormJson: fuente?.disenoFormJson || { cuerpoDocumento: { type: 'doc', content: [] } },
        idFlujo: fuente?.idFlujo || null,
        estado: 'BORRADOR',
        creadoPor: BigInt(idUsuario),
      },
    });

    return {
      idPlantilla: Number(idPlantilla),
      idVersion: Number(nuevaVersion.idVersion),
      numeroVersion: nuevaVersion.numeroVersion,
      estado: 'BORRADOR',
      mensaje: 'Nueva versión en borrador creada.',
    };
  }

  /** Publica una versión en borrador: activa el flujo e inactiva la versión anterior. */
  async publishTemplate(idUsuario, idPlantilla, idVersion, contexto) {
    await comprobarUnidad(idPlantilla, contexto);
    const numIdPlantilla = BigInt(idPlantilla);
    const numIdVersion = BigInt(idVersion);

    const version = await prisma.version.findUnique({
      where: { idVersion: numIdVersion },
    });

    if (!version || version.idPlantilla !== numIdPlantilla) {
      throw errorServicio('NO_ENCONTRADO', 'La versión a publicar no existe.', null, 404);
    }

    if (version.estado !== 'BORRADOR') {
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'Solo se pueden publicar versiones que se encuentren en estado BORRADOR.',
        null,
        409
      );
    }

    if (!version.idFlujo) {
      throw errorServicio(
        'APROBADOR_INVALIDO',
        'La plantilla debe tener un flujo de aprobación asignado para poder ser publicada.',
        null,
        409
      );
    }

    const pasos = await prisma.flujoPaso.findMany({
      where: { idFlujo: version.idFlujo },
      orderBy: { secuencia: 'asc' },
      include: { cargo: true, asignacion: { include: INCLUDE_TITULAR } },
    });

    if (pasos.length === 0) {
      throw errorServicio(
        'APROBADOR_INVALIDO',
        'El flujo asignado debe contener al menos un paso de aprobación.',
        null,
        409
      );
    }

    const titulares = new Set();
    for (const p of pasos.filter((x) => !esPasoEscuela(x))) {
      const usr = p.asignacion?.administrativo?.personal?.usuario;
      const roles = usr && usr.estado === 'A'
        ? (usr.rolesUsuario || []).map((ur) => ur.rol.descripcion.toUpperCase())
        : [];
      const esAprobador = Boolean(usr && usr.estado === 'A' && roles.includes('APROBADOR'));

      if (!esAprobador) {
        throw errorServicio(
          'APROBADOR_INVALIDO',
          `El paso ${p.secuencia} no cuenta con un titular con cuenta activa y rol APROBADOR.`,
          null,
          409
        );
      }
      if (titulares.has(String(usr.idUsuario))) {
        throw errorServicio('CONFLICTO_ESTADO', `El titular del paso ${p.secuencia} ya está en otro paso del flujo.`, null, 409);
      }
      titulares.add(String(usr.idUsuario));
    }

    const pasosEscuela = pasos.filter(esPasoEscuela);
    if (pasosEscuela.length) {
      const plantilla = await prisma.plantilla.findUnique({ where: { idPlantilla: numIdPlantilla }, select: { codUnidad: true, audiencia: true } });
      const audiencia = plantilla.audiencia || [];
      if (audiencia.length !== 1 || audiencia[0] !== 'ESTUDIANTE') {
        exigir([{ campo: 'audiencia', mensaje: 'Un paso por escuela solo sirve en plantillas dirigidas únicamente a estudiantes.' }]);
      }
      const escuelas = await prisma.escuela.findMany({
        where: { codUnidad: plantilla.codUnidad, carreras: { some: {} } },
        include: { asignaciones: { where: { estado: 'A', idCargo: { in: pasosEscuela.map((p) => p.idCargo) } }, include: INCLUDE_TITULAR } },
      });
      const faltan = [];
      escuelas.forEach((e) => pasosEscuela.forEach((p) => {
        if (!e.asignaciones.some((a) => a.idCargo === p.idCargo && titularAprobador(a))) {
          faltan.push({ campo: 'idFlujo', mensaje: `La ${e.nombre} no tiene un titular de «${p.cargo?.nombre}» que pueda aprobar.` });
        }
      }));
      if (faltan.length) throw errorServicio('APROBADOR_INVALIDO', faltan[0].mensaje, faltan, 409);
    }

    const { validarPublicacion } = await validador();
    exigir(validarPublicacion(version.variableFormJson, version.disenoFormJson, {
      conFirma: pasos.some((p) => p.reqFirma !== false),
    }));

    await prisma.$transaction(async (tx) => {
      // Primero se inactiva la anterior: el índice único admite una sola versión ACTIVO
      await tx.version.updateMany({
        where: { idPlantilla: numIdPlantilla, estado: 'ACTIVO' },
        data: { estado: 'INACTIVO' },
      });

      await tx.version.update({
        where: { idVersion: numIdVersion },
        data: {
          estado: 'ACTIVO',
          fechaPublic: new Date(),
        },
      });

      await tx.flujo.updateMany({
        where: { idFlujo: version.idFlujo, estado: 'B' },
        data: {
          estado: 'A',
          idVersionBorrador: null,
        },
      });
    });

    return {
      idPlantilla: Number(idPlantilla),
      idVersion: Number(idVersion),
      numeroVersion: version.numeroVersion,
      estado: 'ACTIVO',
      mensaje: 'Plantilla publicada exitosamente.',
    };
  }

  /** Pasa una versión ACTIVO a INACTIVO. */
  async deactivateTemplate(idUsuario, idPlantilla, idVersion, contexto) {
    await comprobarUnidad(idPlantilla, contexto);
    const numIdPlantilla = BigInt(idPlantilla);
    const numIdVersion = BigInt(idVersion);

    const version = await prisma.version.findUnique({
      where: { idVersion: numIdVersion },
    });

    if (!version || version.idPlantilla !== numIdPlantilla) {
      throw errorServicio('NO_ENCONTRADO', 'La versión a desactivar no existe.', null, 404);
    }

    if (version.estado !== 'ACTIVO') {
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'Solo se pueden desactivar versiones que se encuentren en estado ACTIVO.',
        null,
        409
      );
    }

    await prisma.version.update({
      where: { idVersion: numIdVersion },
      data: { estado: 'INACTIVO' },
    });

    return {
      idPlantilla: Number(idPlantilla),
      idVersion: Number(idVersion),
      estado: 'INACTIVO',
      mensaje: 'Plantilla retirada del catálogo exitosamente.',
    };
  }
}

module.exports = new TemplatesService();
