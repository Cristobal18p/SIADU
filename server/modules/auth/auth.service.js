const hashWorker = require('../../utils/hashWorker');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const { getJwtSecret, getTokenDuration } = require('../../config/token');
const { validarPasswordNueva } = require('../../utils/password');
const cuentaCache = require('../../utils/cuentaCache');
const { areaDe } = require('../../utils/pasosFlujo');

// Hash de relleno: el tiempo de respuesta no revela si la cuenta existe
const HASH_RELLENO = '$2b$10$hrPnte2KuVozvZyvJ2jpN.rk9Sl5ZMhQ9mZeuENhV6qiVCgRxKRXG';

const errorServicio = (codigo, mensaje, detalles) => {
  const err = new Error(mensaje);
  err.codigo = codigo;
  if (detalles) err.detalles = detalles;
  return err;
};

const credencialesInvalidas = () =>
  errorServicio(
    'CREDENCIALES_INVALIDAS',
    'Credenciales de acceso incorrectas o cuenta no autorizada.'
  );

const firmarToken = (claims) =>
  jwt.sign(claims, getJwtSecret(), { algorithm: 'HS256', expiresIn: getTokenDuration() });

const noAutenticado = () =>
  errorServicio('NO_AUTENTICADO', 'Sesión no válida o expirada. Inicie sesión nuevamente.');

// Relaciones del perfil; se cargan con un solo JOIN (`relationLoadStrategy: 'join'`)
const INCLUDE_PERFIL = {
  rolesUsuario: { include: { rol: true } },
  personal: {
    include: {
      unidad: true,
      profesor: true,
      administrativo: {
        include: {
          asignaciones: {
            where: { estado: 'A', cargo: { estado: 'A' } },
            orderBy: [{ cargo: { jerarquia: 'asc' } }, { idAsignacion: 'asc' }],
            include: { cargo: true, unidad: true, area: true, departamento: true, escuela: true },
          },
        },
      },
    },
  },
  estudiante: { include: { carrera: { include: { escuela: true } }, unidad: true } },
};

/** Perfil con los estamentos activos; la unidad sale del estudiante, de la asignación activa o de la persona. */
const armarPerfil = (usuario) => {
  const { estudiante, personal } = usuario;
  const personaActiva = personal?.estado === 'A';

  const estudianteActivo = estudiante?.estado === 'A' ? estudiante : null;
  const profesor = personaActiva && personal.profesor?.estado === 'A' ? personal.profesor : null;
  const administrativo = personaActiva && personal.administrativo?.estado === 'A' ? personal.administrativo : null;

  const estamentos = [];
  if (estudianteActivo) estamentos.push('ESTUDIANTE');
  if (profesor) estamentos.push('PROFESOR');
  if (administrativo) estamentos.push('ADMINISTRATIVO');

  // SOLICITANTE es implícito para toda cuenta activa
  const roles = [
    ...new Set(['SOLICITANTE', ...usuario.rolesUsuario.map((ur) => ur.rol.descripcion.toUpperCase())]),
  ].sort();

  const nombre = estudiante?.nombre || personal?.nombre || '';
  const apellido = estudiante?.apellido || personal?.apellido || '';
  const nombreCompleto = `${nombre} ${apellido}`.trim();

  const asignaciones = administrativo?.asignaciones ?? [];
  const unidad = estudianteActivo?.unidad ?? asignaciones[0]?.unidad ?? personal?.unidad ?? null;

  return {
    nombre,
    apellido,
    nombreCompleto,
    estamentos,
    roles,
    codUnidad: unidad?.codUnidad ?? null,
    unidad: unidad
      ? {
          codUnidad: unidad.codUnidad,
          nombre: unidad.nombre,
          tipoUnidad: unidad.tipoUnidad ?? null,
          abrev: unidad.abrev ?? null,
        }
      : null,
    carrera: estudianteActivo?.carrera
      ? {
          idCarrera: Number(estudianteActivo.carrera.idCarrera),
          descripcion: estudianteActivo.carrera.descripcion,
          escuela: estudianteActivo.carrera.escuela?.nombre ?? null,
        }
      : null,
    cargos: asignaciones.map((a) => ({
      idAsignacion: Number(a.idAsignacion),
      idCargo: a.cargo.idCargo,
      nombreCargo: a.cargo.nombre,
      titularActual: nombreCompleto,
      idUsuarioTitular: Number(usuario.idUsuario),
      area: areaDe(a),
      escuela: a.escuela?.nombre ?? null,
      departamento: a.departamento?.nombre ?? null,
      esAprobador: roles.includes('APROBADOR'),
    })),
  };
};

class AuthService {

  async login({ identificador, password, estamento }) {
    const id = (identificador || '').trim();

    // Cuenta activa por correo (sin distinguir mayúsculas) o cédula
    const usuario = await prisma.usuario.findFirst({
      where: {
        estado: 'A',
        OR: [{ correo: { equals: id, mode: 'insensitive' } }, { cedula: id }],
      },
      include: INCLUDE_PERFIL,
      relationLoadStrategy: 'join',
    });

    const coincide = await hashWorker.compare(password, usuario ? usuario.passwordHash : HASH_RELLENO);
    if (!usuario || !coincide) throw credencialesInvalidas();

    // Debe tener activo el estamento elegido
    const perfil = armarPerfil(usuario);
    if (!perfil.estamentos.includes(estamento)) throw credencialesInvalidas();

    // El acceso anterior viaja en el token
    const ultimoAcceso = usuario.ultimoAcceso ? usuario.ultimoAcceso.toISOString() : null;
    await prisma.usuario.update({
      where: { idUsuario: usuario.idUsuario },
      data: { ultimoAcceso: new Date() },
    });

    const token = firmarToken({
      idUsuario: Number(usuario.idUsuario),
      correo: usuario.correo,
      cedula: usuario.cedula,
      roles: perfil.roles,
      estamentos: perfil.estamentos,
      codUnidad: perfil.codUnidad,
      ultimoAcceso,
      vs: usuario.versionSesion ?? 0,
    });

    return {
      token,
      usuario: {
        idUsuario: Number(usuario.idUsuario),
        correo: usuario.correo,
        cedula: usuario.cedula,
        nombreCompleto: perfil.nombreCompleto,
        roles: perfil.roles,
        estamentos: perfil.estamentos,
        codUnidad: perfil.codUnidad,
        debeCambiarPassword: usuario.claveInicial,
      },
    };
  }

  async getMe(idUsuario, ultimoAcceso = null) {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: BigInt(idUsuario) },
      include: INCLUDE_PERFIL,
      relationLoadStrategy: 'join',
    });

    // Sin cuenta o perfil activo, la sesión no es válida
    const perfil = usuario && usuario.estado === 'A' ? armarPerfil(usuario) : null;
    if (!perfil || perfil.estamentos.length === 0) throw noAutenticado();

    return {
      idUsuario: Number(usuario.idUsuario),
      correo: usuario.correo,
      cedula: usuario.cedula,
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      nombreCompleto: perfil.nombreCompleto,
      ultimoAcceso,
      debeCambiarPassword: usuario.claveInicial,
      roles: perfil.roles,
      estamentos: perfil.estamentos,
      codUnidad: perfil.codUnidad,
      unidad: perfil.unidad,
      carrera: perfil.carrera,
      cargos: perfil.estamentos.includes('ADMINISTRATIVO') ? perfil.cargos : [],
    };
  }

  /** Cambia la contraseña, revoca las demás sesiones y devuelve un token nuevo para la actual. */
  async changePassword(idUsuario, { passwordActual, passwordNueva }, sesion = {}) {
    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: BigInt(idUsuario) },
      select: { estado: true, passwordHash: true },
    });
    if (!usuario || usuario.estado !== 'A') throw noAutenticado();

    if (!(await hashWorker.compare(passwordActual, usuario.passwordHash))) {
      throw errorServicio('PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta.', [
        { campo: 'passwordActual', mensaje: 'La contraseña actual no es correcta.' },
      ]);
    }

    const problemas = validarPasswordNueva(passwordNueva);
    if (passwordNueva === passwordActual) {
      problemas.push('Debe ser distinta de la contraseña actual.');
    }
    if (problemas.length > 0) {
      throw errorServicio(
        'VALIDACION_FALLIDA',
        'Hay campos requeridos o con formato incorrecto',
        problemas.map((mensaje) => ({ campo: 'passwordNueva', mensaje }))
      );
    }

    // Nuevo hash, sin contraseña inicial y con los tokens anteriores revocados
    const actualizado = await prisma.usuario.update({
      where: { idUsuario: BigInt(idUsuario) },
      data: {
        passwordHash: await hashWorker.hash(passwordNueva, 10),
        claveInicial: false,
        versionSesion: { increment: 1 },
      },
      select: { versionSesion: true },
    });
    cuentaCache.invalidar(idUsuario);

    const { iat, exp, debeCambiarPassword, ...claims } = sesion;
    const token = firmarToken({ ...claims, idUsuario: Number(idUsuario), vs: actualizado.versionSesion });
    return { ok: true, mensaje: 'Contraseña actualizada correctamente.', token };
  }

  /** Cierra todas las sesiones del usuario. */
  async logout(idUsuario) {
    await prisma.usuario.update({
      where: { idUsuario: BigInt(idUsuario) },
      data: { versionSesion: { increment: 1 } },
      select: { idUsuario: true },
    });
    cuentaCache.invalidar(idUsuario);
    return { ok: true, mensaje: 'Sesión finalizada exitosamente.' };
  }
}

module.exports = new AuthService();
