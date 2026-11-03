-- Las 13 vistas de views/ en una transacción

BEGIN;

-- GET /api/catalogs/cargos: cargos de autoridad activos (misma lista en catalogs.service.js)

DROP VIEW IF EXISTS v_cargos_autoridades;

CREATE VIEW v_cargos_autoridades AS
SELECT
    aa.id_asignacion,
    c.id_cargo,
    c.nombre AS nombre_cargo,
    CONCAT(per.nombre, ' ', per.apellido) AS titular_actual,
    per.cedula AS cedula_titular,
    per.correo AS correo_titular,
    COALESCE(esc.nombre, 'Departamento de ' || dep.nombre, ar.nombre, 'Área General') AS area,
    esc.nombre AS escuela,
    dep.nombre AS departamento,
    aa.cod_unidad,
    u.nombre AS nombre_unidad,
    u.abrev AS abrev_unidad,
    per.id_usuario AS id_usuario_titular,
    -- Solo estos pueden ser pasos de un flujo
    (
        usr.id_usuario IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM usuarios_roles ur
            JOIN roles r ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = usr.id_usuario AND UPPER(r.descripcion) = 'APROBADOR'
        )
    ) AS es_aprobador
FROM asignaciones_administrativos aa
JOIN cargos c ON c.id_cargo = aa.id_cargo
JOIN administrativos adm ON adm.id_admin = aa.id_admin
JOIN personal per ON per.id_personal = adm.id_personal
LEFT JOIN usuarios usr ON usr.id_usuario = per.id_usuario AND usr.estado = 'A'
JOIN unidades u ON u.cod_unidad = aa.cod_unidad
LEFT JOIN areas ar ON ar.id_area = aa.id_area
LEFT JOIN departamentos dep ON dep.cod_unidad = aa.cod_unidad AND dep.cod_departamento = aa.cod_departamento
LEFT JOIN escuelas esc
    ON esc.cod_unidad = aa.cod_unidad AND esc.cod_departamento = aa.cod_departamento AND esc.cod_escuela = aa.cod_escuela
WHERE aa.estado = 'A' AND c.estado = 'A'
  AND (
      c.nombre IN ('Decano', 'Vicedecano/a', 'Director/a de Escuela', 'Director/a de Departamento', 'Secretaria Administrativa')
      OR (c.nombre = 'Secretaria' AND ar.nombre IN ('Departamentos', 'Escuelas'))
  );

-- GET /api/flows: flujos activos reutilizables

DROP VIEW IF EXISTS v_flujos_resumen;

CREATE VIEW v_flujos_resumen AS
SELECT
    f.id_flujo,
    f.nombre,
    f.codigo,
    f.descripcion,
    f.cod_unidad,
    f.estado,
    COUNT(fp.id_paso)::INTEGER AS total_pasos,
    COALESCE(
        ARRAY_AGG(
            CASE WHEN fp.alcance = 'ESCUELA_SOLICITANTE' THEN c.nombre || ' (del solicitante)' ELSE c.nombre END
            ORDER BY fp.secuencia
        ) FILTER (WHERE c.nombre IS NOT NULL),
        ARRAY[]::VARCHAR[]
    ) AS pasos_resumen
FROM flujos f
LEFT JOIN flujo_pasos fp ON fp.id_flujo = f.id_flujo
LEFT JOIN asignaciones_administrativos aa ON aa.id_asignacion = fp.id_asignacion
LEFT JOIN cargos c ON c.id_cargo = COALESCE(fp.id_cargo, aa.id_cargo)
WHERE f.estado = 'A'
GROUP BY f.id_flujo, f.nombre, f.codigo, f.descripcion, f.cod_unidad, f.estado;

-- GET /api/flows/{id} y flujo.pasos de GET /api/templates/{id}; los pasos por escuela van sin titular

DROP VIEW IF EXISTS v_flujo_pasos;

CREATE VIEW v_flujo_pasos AS
SELECT
    fp.id_paso,
    fp.id_flujo,
    fp.secuencia,
    fp.alcance,
    fp.id_asignacion,
    fp.req_firma,
    c.id_cargo,
    c.nombre AS nombre_cargo,
    NULLIF(TRIM(CONCAT(per.nombre, ' ', per.apellido)), '') AS titular,
    per.cedula AS cedula_titular,
    per.correo AS correo_titular,
    CASE WHEN fp.alcance = 'ESCUELA_SOLICITANTE' THEN 'Escuela del solicitante' ELSE COALESCE(esc.nombre, 'Departamento de ' || dep.nombre, ar.nombre, 'Área General') END AS area,
    fl.cod_unidad,
    u.abrev AS unidad_abrev
FROM flujo_pasos fp
JOIN flujos fl ON fl.id_flujo = fp.id_flujo
LEFT JOIN asignaciones_administrativos aa ON aa.id_asignacion = fp.id_asignacion
JOIN cargos c ON c.id_cargo = COALESCE(fp.id_cargo, aa.id_cargo)
LEFT JOIN administrativos adm ON adm.id_admin = aa.id_admin
LEFT JOIN personal per ON per.id_personal = adm.id_personal
JOIN unidades u ON u.cod_unidad = fl.cod_unidad
LEFT JOIN areas ar ON ar.id_area = aa.id_area
LEFT JOIN escuelas esc
    ON esc.cod_unidad = aa.cod_unidad AND esc.cod_departamento = aa.cod_departamento AND esc.cod_escuela = aa.cod_escuela
LEFT JOIN departamentos dep ON dep.cod_unidad = aa.cod_unidad AND dep.cod_departamento = aa.cod_departamento
ORDER BY fp.id_flujo, fp.secuencia ASC;

-- GET /api/templates: cada plantilla con su versión vigente (ACTIVO o la de mayor número)

DROP VIEW IF EXISTS v_plantillas_inventario;

CREATE VIEW v_plantillas_inventario AS
SELECT
    p.id_plantilla,
    p.nombre,
    p.descripcion,
    p.cod_unidad,
    p.audiencia,
    p.estado AS estado_plantilla,
    p.fecha_registrado,
    v.id_version,
    v.numero_version,
    v.estado AS estado_version,
    v.id_flujo,
    -- Sin publicar: fecha de registro
    COALESCE(v.fecha_public, p.fecha_registrado) AS fecha_actualizacion,
    (
        SELECT v_act.numero_version
        FROM versiones v_act
        WHERE v_act.id_plantilla = p.id_plantilla AND v_act.estado = 'ACTIVO'
        LIMIT 1
    ) AS version_activa,
    (
        SELECT v_bor.id_version
        FROM versiones v_bor
        WHERE v_bor.id_plantilla = p.id_plantilla AND v_bor.estado = 'BORRADOR'
        LIMIT 1
    ) AS id_version_borrador
FROM plantillas p
JOIN versiones v ON v.id_plantilla = p.id_plantilla
WHERE v.id_version = (
    SELECT v_sub.id_version
    FROM versiones v_sub
    WHERE v_sub.id_plantilla = p.id_plantilla
    ORDER BY (v_sub.estado = 'ACTIVO') DESC, v_sub.numero_version DESC
    LIMIT 1
);

-- GET /api/templates/catalog: filtrar por cod_unidad y audiencia

DROP VIEW IF EXISTS v_plantillas_catalogo;

CREATE VIEW v_plantillas_catalogo AS
SELECT
    p.id_plantilla,
    p.nombre,
    p.descripcion,
    p.cod_unidad,
    u.abrev AS unidad_abrev,
    p.audiencia,
    v.id_version,
    v.numero_version,
    v.variable_form_json,
    v.diseno_form_json,
    v.id_flujo
FROM plantillas p
JOIN versiones v ON v.id_plantilla = p.id_plantilla AND v.estado = 'ACTIVO'
JOIN unidades u ON u.cod_unidad = p.cod_unidad
WHERE p.estado = 'A';

-- GET /api/templates/{id}?idVersion=

DROP VIEW IF EXISTS v_plantillas_detalle;

CREATE VIEW v_plantillas_detalle AS
SELECT
    p.id_plantilla,
    p.nombre AS nombre_plantilla,
    p.descripcion AS descripcion_plantilla,
    p.cod_unidad,
    u.nombre AS nombre_unidad,
    u.abrev AS abrev_unidad,
    p.audiencia,
    p.estado AS estado_plantilla,
    v.id_version,
    v.numero_version,
    v.estado AS estado_version,
    v.variable_form_json,
    v.diseno_form_json,
    v.id_flujo,
    f.nombre AS nombre_flujo,
    f.codigo AS codigo_flujo,
    (
        SELECT COUNT(*)::INTEGER
        FROM flujo_pasos fp
        WHERE fp.id_flujo = v.id_flujo
    ) AS total_pasos_flujo,
    v.creado_por,
    v.fecha_public
FROM plantillas p
JOIN versiones v ON v.id_plantilla = p.id_plantilla
JOIN unidades u ON u.cod_unidad = p.cod_unidad
LEFT JOIN flujos f ON f.id_flujo = v.id_flujo;

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

-- lineaTiempo de GET /api/requests/{id}: los pasos decididos muestran lo copiado al decidir

DROP VIEW IF EXISTS v_linea_tiempo_solicitudes;

CREATE VIEW v_linea_tiempo_solicitudes AS
SELECT
    a.id_aprobacion,
    a.id_solicitud,
    a.secuencia,
    c.id_cargo,
    COALESCE(a.cargo_nombre, c.nombre) AS nombre_cargo,
    COALESCE(a.aprobador_nombre, NULLIF(TRIM(CONCAT(per.nombre, ' ', per.apellido)), '')) AS titular,
    COALESCE(a.aprobador_cedula, per.cedula) AS cedula_titular,
    COALESCE(a.area_nombre, esc.nombre, 'Departamento de ' || dep.nombre, ar.nombre, 'Área General') AS area,
    a.estado,
    a.fecha_asignacion,
    a.fecha_accion,
    a.comentario,
    fp.req_firma,
    a.id_firma,
    f.url_firma,
    f.hash_firma,
    a.id_usuario AS id_usuario_aprobador
FROM aprobaciones a
JOIN flujo_pasos fp ON fp.id_flujo = a.id_flujo AND fp.secuencia = a.secuencia
LEFT JOIN solicitud_pasos sp ON sp.id_solicitud = a.id_solicitud AND sp.secuencia = fp.secuencia
JOIN asignaciones_administrativos aa ON aa.id_asignacion = COALESCE(sp.id_asignacion, fp.id_asignacion)
JOIN cargos c ON c.id_cargo = aa.id_cargo
JOIN administrativos adm ON adm.id_admin = aa.id_admin
JOIN personal per ON per.id_personal = adm.id_personal
LEFT JOIN areas ar ON ar.id_area = aa.id_area
LEFT JOIN escuelas esc
    ON esc.cod_unidad = aa.cod_unidad AND esc.cod_departamento = aa.cod_departamento AND esc.cod_escuela = aa.cod_escuela
LEFT JOIN departamentos dep ON dep.cod_unidad = aa.cod_unidad AND dep.cod_departamento = aa.cod_departamento
LEFT JOIN firmas f ON f.id_firma = a.id_firma
ORDER BY a.secuencia ASC;

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

-- pasosDocumento de GET /api/requests/{id} y PDF: todos los pasos, alcanzados o no

DROP VIEW IF EXISTS v_pasos_documento;

CREATE VIEW v_pasos_documento AS
SELECT
    s.id_solicitud,
    fp.secuencia,
    fp.req_firma,
    COALESCE(a.cargo_nombre, c.nombre) AS nombre_cargo,
    COALESCE(a.aprobador_nombre, NULLIF(TRIM(CONCAT(per.nombre, ' ', per.apellido)), '')) AS titular,
    COALESCE(a.area_nombre, esc.nombre, 'Departamento de ' || dep.nombre, ar.nombre, 'Área General') AS area,
    a.id_aprobacion,
    a.estado,
    a.fecha_accion,
    a.comentario,
    f.url_firma
FROM solicitudes s
JOIN flujo_pasos fp ON fp.id_flujo = s.id_flujo
LEFT JOIN solicitud_pasos sp ON sp.id_solicitud = s.id_solicitud AND sp.secuencia = fp.secuencia
JOIN asignaciones_administrativos aa ON aa.id_asignacion = COALESCE(sp.id_asignacion, fp.id_asignacion)
JOIN cargos c ON c.id_cargo = aa.id_cargo
JOIN administrativos adm ON adm.id_admin = aa.id_admin
JOIN personal per ON per.id_personal = adm.id_personal
LEFT JOIN areas ar ON ar.id_area = aa.id_area
LEFT JOIN escuelas esc
    ON esc.cod_unidad = aa.cod_unidad AND esc.cod_departamento = aa.cod_departamento AND esc.cod_escuela = aa.cod_escuela
LEFT JOIN departamentos dep ON dep.cod_unidad = aa.cod_unidad AND dep.cod_departamento = aa.cod_departamento
LEFT JOIN aprobaciones a ON a.id_solicitud = s.id_solicitud AND a.secuencia = fp.secuencia
LEFT JOIN firmas f ON f.id_firma = a.id_firma
ORDER BY s.id_solicitud, fp.secuencia;

COMMIT;
