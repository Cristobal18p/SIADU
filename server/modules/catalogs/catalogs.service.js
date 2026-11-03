const prisma = require('../../config/prisma');
const { areaDe } = require('../../utils/pasosFlujo');

// Cargos de autoridad (la misma lista que v_cargos_autoridades)
const CARGOS_DE_AUTORIDAD = ['Decano', 'Vicedecano/a', 'Director/a de Escuela', 'Director/a de Departamento', 'Secretaria Administrativa'];
// Solo las secretarias de directores
const AREAS_DE_SECRETARIAS_DE_DIRECTOR = ['Departamentos', 'Escuelas'];

class CatalogsService {
  /** Cargos de autoridad vigentes de la unidad. */
  async getCargos({ codUnidad, soloAprobadores }) {
    const unidad = codUnidad ? Number(codUnidad) : null;
    const soloAp = soloAprobadores === true || soloAprobadores === 'true';

    const asignaciones = await prisma.asignacionAdministrativo.findMany({
      where: {
        estado: 'A',
        cargo: { estado: 'A' },
        ...(unidad ? { codUnidad: unidad } : {}),
        OR: [
          { cargo: { nombre: { in: CARGOS_DE_AUTORIDAD } } },
          { cargo: { nombre: 'Secretaria' }, area: { nombre: { in: AREAS_DE_SECRETARIAS_DE_DIRECTOR } } },
        ],
      },
      include: {
        cargo: true,
        area: true,
        departamento: true,
        escuela: true,
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
      orderBy: [
        { cargo: { nombre: 'asc' } },
      ],
    });

    const items = asignaciones.map((a) => {
      const per = a.administrativo?.personal;
      const usr = per?.usuario;
      const roles = usr && usr.estado === 'A'
        ? (usr.rolesUsuario || []).map((ur) => ur.rol.descripcion.toUpperCase())
        : [];
      const esAprobador = Boolean(usr && usr.estado === 'A' && roles.includes('APROBADOR'));
      const titularActual = per ? `${per.nombre} ${per.apellido}`.trim() : 'Sin asignar';

      return {
        idAsignacion: Number(a.idAsignacion),
        idCargo: Number(a.idCargo),
        nombreCargo: a.cargo.nombre,
        titularActual,
        idUsuarioTitular: usr ? Number(usr.idUsuario) : null,
        area: areaDe(a),
        escuela: a.escuela?.nombre ?? null,
        departamento: a.departamento?.nombre ?? null,
        esAprobador,
      };
    });

    items.sort((x, y) => {
      const cmp = x.nombreCargo.localeCompare(y.nombreCargo);
      return cmp !== 0 ? cmp : x.titularActual.localeCompare(y.titularActual);
    });

    if (soloAp) {
      return items.filter((item) => item.esAprobador);
    }

    return items;
  }
}

module.exports = new CatalogsService();
