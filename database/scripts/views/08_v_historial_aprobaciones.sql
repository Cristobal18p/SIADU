-- GET /api/approvals/history: filtrar por id_usuario_aprobador, decision y fecha_accion

DROP VIEW IF EXISTS v_historial_aprobaciones;

CREATE VIEW v_historial_aprobaciones AS
SELECT
    a.id_aprobacion,
    a.id_solicitud,
    s.codigo_documento,
    p.nombre AS nombre_plantilla,
    COALESCE(
        NULLIF(TRIM(CONCAT(e.nombre, ' ', e.apellido)), ''),
        NULLIF(TRIM(CONCAT(per_sol.nombre, ' ', per_sol.apellido)), ''),
        u_sol.correo
    ) AS solicitante_nombre,
    COALESCE(e.cedula, per_sol.cedula, u_sol.cedula) AS solicitante_cedula,
    a.secuencia,
    (
        SELECT COUNT(*)::INTEGER
        FROM flujo_pasos fp_count
        WHERE fp_count.id_flujo = a.id_flujo
    ) AS total_pasos,
    COALESCE(a.cargo_nombre, c.nombre) AS nombre_cargo,
    a.estado AS decision,
    a.comentario,
    a.fecha_accion,
    a.id_usuario AS id_usuario_aprobador
FROM aprobaciones a
JOIN solicitudes s ON s.id_solicitud = a.id_solicitud
JOIN versiones v ON v.id_version = s.id_version
JOIN plantillas p ON p.id_plantilla = v.id_plantilla
JOIN flujo_pasos fp ON fp.id_flujo = a.id_flujo AND fp.secuencia = a.secuencia
LEFT JOIN solicitud_pasos sp ON sp.id_solicitud = a.id_solicitud AND sp.secuencia = fp.secuencia
JOIN asignaciones_administrativos aa ON aa.id_asignacion = COALESCE(sp.id_asignacion, fp.id_asignacion)
JOIN cargos c ON c.id_cargo = aa.id_cargo
JOIN usuarios u_sol ON u_sol.id_usuario = s.id_usuario
LEFT JOIN estudiantes e ON e.id_usuario = u_sol.id_usuario
LEFT JOIN personal per_sol ON per_sol.id_usuario = u_sol.id_usuario
WHERE a.estado IN ('APROBADO', 'RECHAZADO');
