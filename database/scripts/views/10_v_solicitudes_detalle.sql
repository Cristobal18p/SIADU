-- GET /api/requests/{id}

DROP VIEW IF EXISTS v_solicitudes_detalle;

CREATE VIEW v_solicitudes_detalle AS
SELECT
    s.id_solicitud,
    s.codigo_documento,
    p.id_plantilla,
    p.nombre AS nombre_plantilla,
    v.id_version,
    v.numero_version,
    s.id_flujo,
    s.estado,
    s.fecha_creacion,
    s.fecha_resolucion,
    s.cod_unidad,
    u.nombre AS nombre_unidad,
    u.abrev AS abrev_unidad,
    s.datos_json,
    v.diseno_form_json,
    v.variable_form_json,
    s.id_usuario AS id_usuario_solicitante,
    COALESCE(
        NULLIF(TRIM(CONCAT(e.nombre, ' ', e.apellido)), ''),
        NULLIF(TRIM(CONCAT(per_sol.nombre, ' ', per_sol.apellido)), ''),
        u_sol.correo
    ) AS solicitante_nombre_completo,
    COALESCE(e.cedula, per_sol.cedula, u_sol.cedula) AS solicitante_cedula,
    u_sol.correo AS solicitante_correo,
    carr.descripcion AS solicitante_carrera,
    paso_act.id_aprobacion AS id_aprobacion_pendiente,
    paso_act.id_usuario AS id_usuario_aprobador_pendiente,
    paso_act.secuencia AS paso_actual_secuencia,
    paso_act.nombre_cargo AS paso_actual_cargo
FROM solicitudes s
JOIN versiones v ON v.id_version = s.id_version
JOIN plantillas p ON p.id_plantilla = v.id_plantilla
JOIN unidades u ON u.cod_unidad = s.cod_unidad
JOIN usuarios u_sol ON u_sol.id_usuario = s.id_usuario
LEFT JOIN estudiantes e ON e.id_usuario = u_sol.id_usuario
LEFT JOIN carreras carr ON carr.id_carrera = e.id_carrera AND carr.cod_unidad = e.cod_unidad
LEFT JOIN personal per_sol ON per_sol.id_usuario = u_sol.id_usuario
-- Paso pendiente activo (si la solicitud sigue en curso)
LEFT JOIN LATERAL (
    SELECT
        a_act.id_aprobacion,
        a_act.id_usuario,
        a_act.secuencia,
        c.nombre AS nombre_cargo
    FROM aprobaciones a_act
    JOIN flujo_pasos fp ON fp.id_flujo = a_act.id_flujo AND fp.secuencia = a_act.secuencia
    LEFT JOIN solicitud_pasos sp ON sp.id_solicitud = a_act.id_solicitud AND sp.secuencia = fp.secuencia
    JOIN asignaciones_administrativos aa ON aa.id_asignacion = COALESCE(sp.id_asignacion, fp.id_asignacion)
    JOIN cargos c ON c.id_cargo = aa.id_cargo
    WHERE a_act.id_solicitud = s.id_solicitud AND a_act.estado = 'PENDIENTE'
    ORDER BY a_act.secuencia ASC
    LIMIT 1
) paso_act ON true;
