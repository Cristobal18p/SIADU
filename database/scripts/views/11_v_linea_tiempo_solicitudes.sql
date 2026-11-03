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
