// Pasos de flujo: alcance, titular aprobador y resolución por la escuela del solicitante
const ALCANCE_ESCUELA = 'ESCUELA_SOLICITANTE';
const AREA_ESCUELA_SOLICITANTE = 'Escuela del solicitante';

const INCLUDE_TITULAR = {
  cargo: true,
  area: true,
  escuela: true,
  departamento: true,
  administrativo: {
    include: {
      personal: {
        include: { usuario: { include: { rolesUsuario: { include: { rol: true } } } } },
      },
    },
  },
};

const esPasoEscuela = (paso) => paso?.alcance === ALCANCE_ESCUELA;

/** Área a mostrar: la escuela, el departamento o el área de la asignación. */
const areaDe = (asignacion) =>
  asignacion?.escuela?.nombre ??
  (asignacion?.departamento ? `Departamento de ${asignacion.departamento.nombre}` : null) ??
  asignacion?.area?.nombre ??
  'Área General';

/** Usuario del titular si tiene cuenta activa y rol APROBADOR; si no, null. */
const titularAprobador = (asignacion) => {
  const per = asignacion?.administrativo?.personal;
  const usr = per?.usuario;
  if (!usr || usr.estado !== 'A' || (per.estado ?? 'A') !== 'A') return null;
  return usr.rolesUsuario?.some((ur) => ur.rol.descripcion.toUpperCase() === 'APROBADOR') ? usr : null;
};

/** Asignación activa del cargo en la escuela del estudiante, o null. */
const asignacionEnEscuela = (prisma, idCargo, idUsuario) =>
  prisma.asignacionAdministrativo.findFirst({
    where: {
      idCargo: Number(idCargo),
      estado: 'A',
      escuela: { carreras: { some: { estudiantes: { some: { idUsuario: BigInt(idUsuario), estado: 'A' } } } } },
    },
    include: INCLUDE_TITULAR,
    orderBy: { idAsignacion: 'asc' },
  });

/** Paso como lo guarda flujo_pasos. */
const datosPaso = (paso, idFlujo) => ({
  idFlujo,
  secuencia: Number(paso.secuencia),
  alcance: esPasoEscuela(paso) ? ALCANCE_ESCUELA : 'FIJO',
  idAsignacion: esPasoEscuela(paso) ? null : BigInt(paso.idAsignacion),
  idCargo: esPasoEscuela(paso) ? Number(paso.idCargo) : null,
  reqFirma: paso.reqFirma !== false,
});

/** PasoFlujo de las respuestas. `asignacion`: la del paso o la resuelta para el solicitante. */
const pasoFlujo = (paso, asignacion = paso.asignacion) => {
  const per = asignacion?.administrativo?.personal;
  return {
    secuencia: Number(paso.secuencia),
    alcance: esPasoEscuela(paso) ? ALCANCE_ESCUELA : 'FIJO',
    idAsignacion: asignacion ? Number(asignacion.idAsignacion) : null,
    idCargo: Number(paso.idCargo ?? asignacion?.idCargo ?? asignacion?.cargo?.idCargo) || null,
    nombreCargo: asignacion?.cargo?.nombre ?? paso.cargo?.nombre ?? '',
    titular: per ? `${per.nombre} ${per.apellido}`.trim() : null,
    area: asignacion ? areaDe(asignacion) : AREA_ESCUELA_SOLICITANTE,
    reqFirma: paso.reqFirma !== false,
  };
};

module.exports = {
  ALCANCE_ESCUELA,
  INCLUDE_TITULAR,
  areaDe,
  esPasoEscuela,
  titularAprobador,
  asignacionEnEscuela,
  datosPaso,
  pasoFlujo,
};
