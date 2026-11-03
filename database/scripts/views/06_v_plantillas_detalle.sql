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
