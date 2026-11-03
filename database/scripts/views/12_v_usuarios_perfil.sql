-- POST /api/auth/login y GET /api/auth/me

DROP VIEW IF EXISTS v_usuarios_perfil;

CREATE VIEW v_usuarios_perfil AS
SELECT
    u.id_usuario,
    u.correo,
    u.cedula,
    COALESCE(e.nombre, per.nombre, '') AS nombre,
    COALESCE(e.apellido, per.apellido, '') AS apellido,
    TRIM(CONCAT(COALESCE(e.nombre, per.nombre, ''), ' ', COALESCE(e.apellido, per.apellido, ''))) AS nombre_completo,
    u.estado AS estado_usuario,
    u.clave_inicial,
    u.fecha_creacion,
    u.ultimo_acceso,
    COALESCE(e.cod_unidad, asig_adm.cod_unidad, per.cod_unidad) AS cod_unidad,
    uni.nombre AS nombre_unidad,
    uni.abrev AS abrev_unidad,
    e.id_carrera,
    carr.descripcion AS carrera_nombre,
    esc.nombre AS carrera_escuela,
    (e.id_estudiante IS NOT NULL) AS es_estudiante,
    (prof.id_profesor IS NOT NULL) AS es_profesor,
    (adm.id_admin IS NOT NULL) AS es_administrativo,
    ARRAY_REMOVE(ARRAY[
        CASE WHEN e.id_estudiante IS NOT NULL THEN 'ESTUDIANTE' END,
        CASE WHEN prof.id_profesor IS NOT NULL THEN 'PROFESOR' END,
        CASE WHEN adm.id_admin IS NOT NULL THEN 'ADMINISTRATIVO' END
    ]::VARCHAR[], NULL) AS estamentos,
    -- SOLICITANTE es implícito
    (
        SELECT ARRAY_AGG(DISTINCT x.rol ORDER BY x.rol)
        FROM (
            SELECT 'SOLICITANTE'::TEXT AS rol
            UNION
            SELECT UPPER(r.descripcion)
            FROM usuarios_roles ur
            JOIN roles r ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = u.id_usuario
        ) x
    ) AS roles
FROM usuarios u
LEFT JOIN personal per ON per.id_usuario = u.id_usuario
LEFT JOIN administrativos adm ON adm.id_personal = per.id_personal
LEFT JOIN profesores prof ON prof.id_personal = per.id_personal
LEFT JOIN estudiantes e ON e.id_usuario = u.id_usuario
LEFT JOIN carreras carr ON carr.id_carrera = e.id_carrera AND carr.cod_unidad = e.cod_unidad
LEFT JOIN escuelas esc
    ON esc.cod_unidad = carr.cod_unidad AND esc.cod_departamento = carr.cod_departamento AND esc.cod_escuela = carr.cod_escuela
-- Primera asignación activa
LEFT JOIN LATERAL (
    SELECT aa.cod_unidad
    FROM asignaciones_administrativos aa
    WHERE aa.id_admin = adm.id_admin AND aa.estado = 'A'
    LIMIT 1
) asig_adm ON true
LEFT JOIN unidades uni ON uni.cod_unidad = COALESCE(e.cod_unidad, asig_adm.cod_unidad, per.cod_unidad);
