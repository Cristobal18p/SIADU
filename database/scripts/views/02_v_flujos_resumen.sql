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
