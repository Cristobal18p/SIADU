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
