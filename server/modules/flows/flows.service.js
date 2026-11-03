const prisma = require('../../config/prisma');
const { esPasoEscuela, datosPaso, pasoFlujo } = require('../../utils/pasosFlujo');

const errorServicio = (codigo, mensaje, detalles, status = null) => {
  const err = new Error(mensaje);
  err.codigo = codigo;
  if (detalles) err.detalles = detalles;
  if (status) err.status = status;
  return err;
};

class FlowsService {
  /** Flujos activos de la unidad. */
  async getFlows({ codUnidad }) {
    const unidad = codUnidad ? Number(codUnidad) : null;

    const flujos = await prisma.flujo.findMany({
      where: {
        estado: 'A',
        ...(unidad ? { codUnidad: unidad } : {}),
      },
      include: {
        pasos: {
          orderBy: { secuencia: 'asc' },
          include: {
            cargo: true,
            asignacion: {
              include: { cargo: true },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return flujos.map((f) => ({
      idFlujo: Number(f.idFlujo),
      nombre: f.nombre,
      codigo: f.codigo,
      totalPasos: f.pasos.length,
      pasosResumen: f.pasos
        .map((p) => {
          const nombre = p.cargo?.nombre ?? p.asignacion?.cargo?.nombre;
          return nombre && esPasoEscuela(p) ? `${nombre} (del solicitante)` : nombre;
        })
        .filter(Boolean),
    }));
  }

  /** Detalle de un flujo con sus pasos; de otra unidad, 404. */
  async getFlowById(idFlujo, codUnidadUsuario = null) {
    const numId = BigInt(idFlujo);

    const flujo = await prisma.flujo.findUnique({
      where: { idFlujo: numId },
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
    });

    if (!flujo || (codUnidadUsuario != null && flujo.codUnidad !== Number(codUnidadUsuario))) {
      throw errorServicio('NO_ENCONTRADO', 'El flujo solicitado no existe.', null, 404);
    }

    return {
      idFlujo: Number(flujo.idFlujo),
      nombre: flujo.nombre,
      codigo: flujo.codigo,
      estado: flujo.estado === 'A' ? 'ACTIVO' : 'BORRADOR',
      descripcion: flujo.descripcion,
      codUnidad: flujo.codUnidad,
      pasos: flujo.pasos.map((p) => pasoFlujo(p)),
    };
  }

  /** Valida secuencias consecutivas, asignaciones activas de la unidad y aprobadores distintos. */
  async _validarAprobadoresPasos(pasos, codUnidad = null) {
    const estructura = [];
    const entero = (v) => v != null && Number.isInteger(Number(v)) && Number(v) > 0;
    pasos.forEach((p, i) => {
      if (Number(p.secuencia) !== i + 1) {
        estructura.push({ campo: `pasos[${i}].secuencia`, mensaje: 'Las secuencias deben ser 1, 2, 3… en orden.' });
      }
      if (p.alcance !== undefined && !['FIJO', 'ESCUELA_SOLICITANTE'].includes(p.alcance)) {
        estructura.push({ campo: `pasos[${i}].alcance`, mensaje: 'Alcance no válido.' });
      } else if (esPasoEscuela(p)) {
        if (!entero(p.idCargo) || p.idAsignacion != null) {
          estructura.push({ campo: `pasos[${i}].idCargo`, mensaje: 'Un paso por escuela lleva solo idCargo.' });
        }
      } else if (!entero(p.idAsignacion) || p.idCargo != null) {
        estructura.push({ campo: `pasos[${i}].idAsignacion`, mensaje: 'Un paso fijo lleva solo idAsignacion.' });
      }
    });
    if (estructura.length) {
      throw errorServicio('VALIDACION_FALLIDA', 'Los pasos del flujo no son válidos.', estructura, 400);
    }

    // Por escuela: cargo con asignaciones por escuela en la unidad, sin repetir
    const pasosEscuela = pasos.map((p, i) => [p, i]).filter(([p]) => esPasoEscuela(p));
    if (pasosEscuela.length) {
      const conEscuela = await prisma.asignacionAdministrativo.findMany({
        where: {
          idCargo: { in: pasosEscuela.map(([p]) => Number(p.idCargo)) },
          estado: 'A',
          codEscuela: { not: null },
          ...(codUnidad != null ? { codUnidad: Number(codUnidad) } : {}),
        },
        select: { idCargo: true },
      });
      const cargosConEscuela = new Set(conEscuela.map((a) => Number(a.idCargo)));
      const vistos = new Set();
      const detalles = [];
      pasosEscuela.forEach(([p, i]) => {
        const idCargo = Number(p.idCargo);
        if (!cargosConEscuela.has(idCargo)) {
          detalles.push({ campo: `pasos[${i}].idCargo`, mensaje: 'El cargo no tiene asignaciones por escuela en la unidad.' });
        } else if (vistos.has(idCargo)) {
          detalles.push({ campo: `pasos[${i}].idCargo`, mensaje: 'Este cargo por escuela ya está en el flujo.' });
        }
        vistos.add(idCargo);
      });
      if (detalles.length) throw errorServicio('VALIDACION_FALLIDA', detalles[0].mensaje, detalles, 400);
    }

    const fijos = pasos.map((p, i) => [p, i]).filter(([p]) => !esPasoEscuela(p));
    if (fijos.length === 0) return;

    const asignaciones = await prisma.asignacionAdministrativo.findMany({
      where: {
        idAsignacion: { in: fijos.map(([p]) => BigInt(p.idAsignacion)) },
        estado: 'A',
      },
      include: {
        administrativo: {
          include: {
            personal: {
              include: {
                usuario: {
                  include: {
                    rolesUsuario: {
                      include: { rol: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const mapaCargos = new Map();
    for (const a of asignaciones) {
      const per = a.administrativo?.personal;
      const usr = per?.usuario;
      const roles = usr && usr.estado === 'A'
        ? (usr.rolesUsuario || []).map((ur) => ur.rol.descripcion.toUpperCase())
        : [];
      mapaCargos.set(Number(a.idAsignacion), {
        esAprobador: Boolean(usr && usr.estado === 'A' && roles.includes('APROBADOR')),
        titular: per ? `${per.nombre} ${per.apellido}`.trim() : '',
        idUsuario: usr?.idUsuario != null ? String(usr.idUsuario) : null,
        codUnidad: a.codUnidad,
      });
    }

    const errores = [];
    fijos.forEach(([paso, idx]) => {
      const cargo = mapaCargos.get(Number(paso.idAsignacion));
      if (!cargo || !cargo.esAprobador) {
        errores.push({
          campo: `pasos[${idx}].idAsignacion`,
          mensaje: cargo
            ? `El titular (${cargo.titular}) no tiene una cuenta activa con rol APROBADOR.`
            : 'La asignación no existe o no se encuentra activa.',
        });
      }
    });
    if (errores.length > 0) {
      throw errorServicio(
        'APROBADOR_INVALIDO',
        'Uno o más pasos del flujo no tienen un titular que pueda aprobar.',
        errores,
        400
      );
    }

    const detalles = [];
    const asignacionesVistas = new Set();
    const personas = new Map();
    fijos.forEach(([paso, idx]) => {
      const campo = `pasos[${idx}].idAsignacion`;
      const id = Number(paso.idAsignacion);
      const cargo = mapaCargos.get(id);
      if (codUnidad != null && cargo.codUnidad !== Number(codUnidad)) {
        detalles.push({ campo, mensaje: 'La autoridad no pertenece a la unidad del flujo.' });
      } else if (asignacionesVistas.has(id)) {
        detalles.push({ campo, mensaje: 'Esta autoridad ya está en el flujo.' });
      } else if (cargo.idUsuario && personas.has(cargo.idUsuario)) {
        detalles.push({ campo, mensaje: `${cargo.titular} ya está en el paso ${personas.get(cargo.idUsuario) + 1}: una persona aprueba una sola vez.` });
      }
      asignacionesVistas.add(id);
      if (cargo.idUsuario && !personas.has(cargo.idUsuario)) personas.set(cargo.idUsuario, idx);
    });
    if (detalles.length) {
      throw errorServicio('VALIDACION_FALLIDA', detalles[0].mensaje, detalles, 400);
    }
  }

  /** Crea un flujo en BORRADOR. */
  async createFlow({ nombre, codigo, descripcion, codUnidad, pasos }) {
    if (!nombre || !codigo || !codUnidad) {
      throw errorServicio('VALIDACION_FALLIDA', 'El nombre, código y unidad académica son requeridos.', null, 400);
    }

    if (!Array.isArray(pasos) || pasos.length === 0) {
      throw errorServicio('VALIDACION_FALLIDA', 'El flujo debe contener al menos un paso.', null, 400);
    }

    const codigoLimpio = codigo.trim().toUpperCase();
    const codigoRepetido = () =>
      errorServicio('CONFLICTO_ESTADO', `El código "${codigoLimpio}" ya está registrado en otro flujo.`, null, 409);

    // Código y aprobadores se validan en paralelo; si fallan ambos, se informa primero el código
    const [rExiste, rAprobadores] = await Promise.allSettled([
      prisma.flujo.findUnique({ where: { codigo: codigoLimpio }, select: { idFlujo: true } }),
      this._validarAprobadoresPasos(pasos, codUnidad),
    ]);
    if (rExiste.status === 'rejected') throw rExiste.reason;
    if (rExiste.value) throw codigoRepetido();
    if (rAprobadores.status === 'rejected') throw rAprobadores.reason;

    let nuevoFlujo;
    try {
      nuevoFlujo = await prisma.$transaction(async (tx) => {
        const f = await tx.flujo.create({
          data: {
            nombre: nombre.trim(),
            codigo: codigoLimpio,
            descripcion: descripcion ? descripcion.trim() : null,
            codUnidad: Number(codUnidad),
            estado: 'B',
          },
        });

        // Todos los pasos en una sola inserción
        await tx.flujoPaso.createMany({
          data: pasos.map((p) => datosPaso(p, f.idFlujo)),
        });

        return f;
      });
    } catch (err) {
      // Código repetido por peticiones simultáneas: lo rechaza la restricción de unicidad
      if (err.code === 'P2002' && String(err.meta?.driverAdapterError?.cause?.constraint?.index ?? '').includes('codigo')) {
        throw codigoRepetido();
      }
      throw err;
    }

    return {
      idFlujo: Number(nuevoFlujo.idFlujo),
      codigo: nuevoFlujo.codigo,
      estado: 'BORRADOR',
      totalPasos: pasos.length,
      mensaje: 'Flujo creado en borrador exitosamente.',
    };
  }

  /** Modifica un flujo en BORRADOR; ACTIVO, 409; de otra unidad, 404. */
  async updateFlow(idFlujo, { nombre, descripcion, pasos }, codUnidadUsuario = null) {
    const numId = BigInt(idFlujo);

    // Flujo y aprobadores en paralelo; los errores se evalúan después, en orden
    const hayPasos = Array.isArray(pasos) && pasos.length > 0;
    const [rFlujo, rAprobadores] = await Promise.allSettled([
      prisma.flujo.findUnique({ where: { idFlujo: numId } }),
      hayPasos ? this._validarAprobadoresPasos(pasos, codUnidadUsuario) : Promise.resolve(),
    ]);
    if (rFlujo.status === 'rejected') throw rFlujo.reason;
    const flujo = rFlujo.value;

    if (!flujo || (codUnidadUsuario != null && flujo.codUnidad !== Number(codUnidadUsuario))) {
      throw errorServicio('NO_ENCONTRADO', 'El flujo a modificar no existe.', null, 404);
    }

    if (flujo.estado === 'A') {
      throw errorServicio(
        'CONFLICTO_ESTADO',
        'Un flujo ACTIVO no se edita: debe crear un nuevo flujo.',
        null,
        409
      );
    }

    if (!hayPasos) {
      throw errorServicio('VALIDACION_FALLIDA', 'El flujo debe contener al menos un paso.', null, 400);
    }

    if (rAprobadores.status === 'rejected') throw rAprobadores.reason;

    await prisma.$transaction(async (tx) => {
      await tx.flujo.update({
        where: { idFlujo: numId },
        data: {
          nombre: nombre ? nombre.trim() : flujo.nombre,
          descripcion: descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : flujo.descripcion,
        },
      });

      await tx.flujoPaso.deleteMany({
        where: { idFlujo: numId },
      });

      await tx.flujoPaso.createMany({
        data: pasos.map((p) => datosPaso(p, numId)),
      });
    });

    return {
      idFlujo: Number(flujo.idFlujo),
      codigo: flujo.codigo,
      estado: 'BORRADOR',
      totalPasos: pasos.length,
      mensaje: 'Flujo actualizado correctamente.',
    };
  }
}

module.exports = new FlowsService();
