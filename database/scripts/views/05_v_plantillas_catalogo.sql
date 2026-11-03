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
