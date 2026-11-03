-- GET /api/requests/me: filtrar por id_usuario_solicitante

DROP VIEW IF EXISTS v_mis_solicitudes;

CREATE VIEW v_mis_solicitudes AS
SELECT
    s.id_solicitud,
    s.codigo_documento,
    p.nombre AS nombre_plantilla,
    s.estado,
    COALESCE(c_actual.nombre, 'Finalizado') AS paso_actual,
    s.fecha_creacion,
    s.fecha_resolucion,
    s.id_usuario AS id_usuario_solicitante,
    s.cod_unidad,
    -- Motivo del rechazo
    a_rech.comentario AS motivo_rechazo,
    -- Paso en curso
    c_actual.secuencia AS paso_actual_secuencia,
    c_actual.titular AS paso_actual_titular,
    c_actual.fecha_asignacion AS paso_actual_desde,
    -- Total de pasos del flujo
    (SELECT COUNT(*) FROM flujo_pasos fp_t WHERE fp_t.id_flujo = s.id_flujo) AS total_pasos,
    -- Última resolución
    r_res.nombre AS resolucion_cargo,
    r_res.titular AS resolucion_titular,
    r_res.fecha_accion AS resolucion_fecha
FROM solicitudes s
JOIN versiones v ON v.id_version = s.id_version
JOIN plantillas p ON p.id_plantilla = v.id_plantilla
-- Paso pendiente
LEFT JOIN LATERAL (
    SELECT c.nombre,
           a_act.secuencia,
           a_act.fecha_asignacion,
           NULLIF(TRIM(CONCAT(per.nombre, ' ', per.apellido)), '') AS titular
    FROM aprobaciones a_act
    JOIN flujo_pasos fp ON fp.id_flujo = a_act.id_flujo AND fp.secuencia = a_act.secuencia
    LEFT JOIN solicitud_pasos sp ON sp.id_solicitud = a_act.id_solicitud AND sp.secuencia = fp.secuencia
    JOIN asignaciones_administrativos aa ON aa.id_asignacion = COALESCE(sp.id_asignacion, fp.id_asignacion)
    JOIN cargos c ON c.id_cargo = aa.id_cargo
    JOIN administrativos adm ON adm.id_admin = aa.id_admin
    JOIN personal per ON per.id_personal = adm.id_personal
    WHERE a_act.id_solicitud = s.id_solicitud AND a_act.estado = 'PENDIENTE'
    ORDER BY a_act.secuencia ASC
    LIMIT 1
) c_actual ON s.estado = 'PENDIENTE'
-- Rechazo
LEFT JOIN LATERAL (
    SELECT a_r.comentario
    FROM aprobaciones a_r
    WHERE a_r.id_solicitud = s.id_solicitud AND a_r.estado = 'RECHAZADO'
    ORDER BY a_r.fecha_accion DESC NULLS LAST
    LIMIT 1
) a_rech ON s.estado = 'RECHAZADO'
-- Última acción resuelta
LEFT JOIN LATERAL (
    SELECT a_x.cargo_nombre AS nombre,
           a_x.fecha_accion,
           a_x.aprobador_nombre AS titular
    FROM aprobaciones a_x
    WHERE a_x.id_solicitud = s.id_solicitud AND a_x.estado IN ('APROBADO', 'RECHAZADO')
    ORDER BY a_x.fecha_accion DESC NULLS LAST, a_x.secuencia DESC
    LIMIT 1
) r_res ON s.estado IN ('APROBADO', 'RECHAZADO');
