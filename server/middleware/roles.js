const { errorResponse } = require('../utils/errorResponse');

/** Exige uno o más roles de sistema. */
const requireRole = (rolesPermitidos) => {
  const permitidos = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];

  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.roles)) {
      return errorResponse(res, 401, 'NO_AUTENTICADO', 'Sesión no válida o expirada.');
    }

    const tieneRol = permitidos.some((rol) => req.user.roles.includes(rol));
    if (!tieneRol) {
      return errorResponse(
        res,
        403,
        'SIN_PERMISO',
        `No tiene permisos suficientes. Requiere rol: ${permitidos.join(' o ')}.`
      );
    }

    return next();
  };
};

module.exports = {
  requireRole,
};
