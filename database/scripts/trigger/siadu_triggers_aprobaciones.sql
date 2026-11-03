-- Aprobaciones: al decidir se copia el cargo y el aprobador; lo decidido no se modifica ni se borra.

CREATE OR REPLACE FUNCTION fn_aprobaciones_congelar()
RETURNS TRIGGER AS $$
BEGIN
    -- Una aprobación decidida es de solo lectura
    IF TG_OP = 'DELETE' THEN
        IF OLD.estado IN ('APROBADO', 'RECHAZADO') THEN
            RAISE EXCEPTION 'La aprobación % ya fue decidida y no se puede borrar.', OLD.id_aprobacion;
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.estado IN ('APROBADO', 'RECHAZADO') THEN
        RAISE EXCEPTION 'La aprobación % ya fue decidida y no se puede modificar.', OLD.id_aprobacion;
    END IF;

    -- Copia del cargo y del aprobador
    IF NEW.estado IN ('APROBADO', 'RECHAZADO') THEN
        SELECT c.nombre, COALESCE(esc.nombre, 'Departamento de ' || dep.nombre, ar.nombre)
          INTO NEW.cargo_nombre, NEW.area_nombre
          FROM flujo_pasos fp
          LEFT JOIN solicitud_pasos sp ON sp.id_solicitud = NEW.id_solicitud AND sp.secuencia = NEW.secuencia
          JOIN asignaciones_administrativos aa ON aa.id_asignacion = COALESCE(sp.id_asignacion, fp.id_asignacion)
          JOIN cargos c ON c.id_cargo = aa.id_cargo
          LEFT JOIN areas ar ON ar.id_area = aa.id_area
          LEFT JOIN escuelas esc
            ON esc.cod_unidad = aa.cod_unidad AND esc.cod_departamento = aa.cod_departamento AND esc.cod_escuela = aa.cod_escuela
          LEFT JOIN departamentos dep ON dep.cod_unidad = aa.cod_unidad AND dep.cod_departamento = aa.cod_departamento
         WHERE fp.id_flujo = NEW.id_flujo AND fp.secuencia = NEW.secuencia;

        SELECT NULLIF(TRIM(CONCAT(per.nombre, ' ', per.apellido)), ''), COALESCE(per.cedula, u.cedula)
          INTO NEW.aprobador_nombre, NEW.aprobador_cedula
          FROM usuarios u
          LEFT JOIN personal per ON per.id_usuario = u.id_usuario
         WHERE u.id_usuario = NEW.id_usuario;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_aprobaciones_congelar ON aprobaciones;
CREATE TRIGGER trg_aprobaciones_congelar
    BEFORE UPDATE OR DELETE ON aprobaciones
    FOR EACH ROW
    EXECUTE FUNCTION fn_aprobaciones_congelar();
