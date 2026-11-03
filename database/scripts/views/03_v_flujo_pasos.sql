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
