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
