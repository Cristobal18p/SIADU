-- GET /api/approvals/pending: filtrar por id_usuario_aprobador

DROP VIEW IF EXISTS v_bandeja_aprobaciones;

CREATE VIEW v_bandeja_aprobaciones AS
SELECT
    a.id_aprobacion,
    a.id_solicitud,
    s.codigo_documento,
    p.nombre AS nombre_plantilla,
    s.cod_unidad,
    COALESCE(
        NULLIF(TRIM(CONCAT(e.nombre, ' ', e.apellido)), ''),
        NULLIF(TRIM(CONCAT(per_sol.nombre, ' ', per_sol.apellido)), ''),
        u_sol.correo
    ) AS solicitante_nombre,
    COALESCE(e.cedula, per_sol.cedula, u_sol.cedula) AS solicitante_cedula,
    a.fecha_asignacion,
    a.id_usuario AS id_usuario_aprobador
FROM aprobaciones a
JOIN solicitudes s ON s.id_solicitud = a.id_solicitud
JOIN versiones v ON v.id_version = s.id_version
JOIN plantillas p ON p.id_plantilla = v.id_plantilla
JOIN usuarios u_sol ON u_sol.id_usuario = s.id_usuario
LEFT JOIN estudiantes e ON e.id_usuario = u_sol.id_usuario
LEFT JOIN personal per_sol ON per_sol.id_usuario = u_sol.id_usuario
WHERE a.estado = 'PENDIENTE' AND s.estado = 'PENDIENTE';
