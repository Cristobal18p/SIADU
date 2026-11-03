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
