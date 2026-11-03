-- Último acceso de usuarios, revocación de sesiones al cambiar roles y fechas de resolución y de acción.

-- Último acceso
CREATE OR REPLACE FUNCTION fn_usuarios_actualizar_ultimo_acceso()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF NEW.ultimo_acceso IS NULL OR NEW.ultimo_acceso = OLD.ultimo_acceso THEN
        NEW.ultimo_acceso := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_actualizar_ultimo_acceso ON usuarios;
CREATE TRIGGER trg_usuarios_actualizar_ultimo_acceso
    BEFORE UPDATE OF ultimo_acceso
    ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION fn_usuarios_actualizar_ultimo_acceso();

-- La llama el backend al autenticar
CREATE OR REPLACE FUNCTION registrar_acceso_usuario(p_id_usuario BIGINT)
RETURNS VOID
SET search_path = public
AS $$
BEGIN
    UPDATE usuarios
    SET ultimo_acceso = CURRENT_TIMESTAMP
    WHERE id_usuario = p_id_usuario;
END;
$$ LANGUAGE plpgsql;

-- Cambiar los roles revoca las sesiones: el token lleva los roles
CREATE OR REPLACE FUNCTION fn_usuarios_roles_revocar_sesion()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    UPDATE usuarios
    SET version_sesion = version_sesion + 1
    WHERE id_usuario IN (
        CASE WHEN TG_OP <> 'INSERT' THEN OLD.id_usuario END,
        CASE WHEN TG_OP <> 'DELETE' THEN NEW.id_usuario END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_roles_revocar_sesion ON usuarios_roles;
CREATE TRIGGER trg_usuarios_roles_revocar_sesion
    AFTER INSERT OR UPDATE OR DELETE
    ON usuarios_roles
    FOR EACH ROW
    EXECUTE FUNCTION fn_usuarios_roles_revocar_sesion();

-- Fechas de resolución y de acción
CREATE OR REPLACE FUNCTION fn_solicitudes_fecha_resolucion()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF NEW.estado IN ('APROBADO', 'RECHAZADO')
       AND (OLD.estado IS NULL OR OLD.estado NOT IN ('APROBADO', 'RECHAZADO')) THEN
        IF NEW.fecha_resolucion IS NULL THEN
            NEW.fecha_resolucion := CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solicitudes_fecha_resolucion ON solicitudes;
CREATE TRIGGER trg_solicitudes_fecha_resolucion
    BEFORE UPDATE OF estado
    ON solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION fn_solicitudes_fecha_resolucion();

CREATE OR REPLACE FUNCTION fn_aprobaciones_fecha_accion()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF NEW.estado IN ('APROBADO', 'RECHAZADO') 
       AND (OLD.estado IS NULL OR OLD.estado = 'PENDIENTE') THEN
        IF NEW.fecha_accion IS NULL THEN
            NEW.fecha_accion := CURRENT_TIMESTAMP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aprobaciones_fecha_accion ON aprobaciones;
CREATE TRIGGER trg_aprobaciones_fecha_accion
    BEFORE UPDATE OF estado
    ON aprobaciones
    FOR EACH ROW
    EXECUTE FUNCTION fn_aprobaciones_fecha_accion();
