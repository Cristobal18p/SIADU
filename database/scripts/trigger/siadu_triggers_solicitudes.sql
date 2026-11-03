-- Código documental UP{unidad}-{año}-{0001}, consecutivo por unidad y año.

CREATE OR REPLACE FUNCTION fn_solicitudes_codigo() 
RETURNS TRIGGER AS $$
DECLARE
    v_prefijo TEXT;
    v_seq INT;
BEGIN
    -- LPAD recorta: se rechaza antes
    IF NEW.cod_unidad NOT BETWEEN 0 AND 99 THEN
        RAISE EXCEPTION 'El código de unidad % no cabe en 2 dígitos del código documental.', NEW.cod_unidad;
    END IF;

    -- Año de Panamá (la sesión suele estar en UTC)
    v_prefijo := 'UP' || LPAD(NEW.cod_unidad::TEXT, 2, '0') || '-'
              || TO_CHAR(COALESCE(NEW.fecha_creacion, CURRENT_TIMESTAMP) AT TIME ZONE 'America/Panama', 'YYYY') || '-';

    -- Serializa la numeración por unidad y año
    PERFORM pg_advisory_xact_lock(hashtext(v_prefijo));

    SELECT COALESCE(MAX(SUBSTRING(codigo_documento FROM '\d+$')::INT), 0) + 1
      INTO v_seq 
      FROM solicitudes 
     WHERE codigo_documento LIKE v_prefijo || '%';

    IF v_seq > 9999 THEN
        RAISE EXCEPTION 'Se agotó la numeración anual (9999) del prefijo %.', v_prefijo;
    END IF;

    NEW.codigo_documento := v_prefijo || LPAD(v_seq::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Sin id_flujo se toma el de la versión; resuelta la solicitud, ya no cambia.

CREATE OR REPLACE FUNCTION fn_solicitudes_flujo()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.id_flujo IS NULL THEN
            SELECT id_flujo INTO NEW.id_flujo FROM versiones WHERE id_version = NEW.id_version;
        END IF;
    ELSIF NEW.id_flujo <> OLD.id_flujo AND OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'La solicitud % ya fue resuelta: su flujo no se puede cambiar.', OLD.id_solicitud;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_solicitudes_flujo ON solicitudes;
CREATE TRIGGER trg_solicitudes_flujo
    BEFORE INSERT OR UPDATE OF id_flujo ON solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION fn_solicitudes_flujo();

DROP TRIGGER IF EXISTS trg_solicitudes_codigo ON solicitudes;
CREATE TRIGGER trg_solicitudes_codigo
    BEFORE INSERT ON solicitudes
    FOR EACH ROW
    WHEN (NEW.codigo_documento IS NULL OR NEW.codigo_documento = '')
    EXECUTE FUNCTION fn_solicitudes_codigo();
