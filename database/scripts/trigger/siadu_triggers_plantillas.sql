-- Solo se borran plantillas nunca publicadas (única versión: la 1 en BORRADOR).

CREATE OR REPLACE FUNCTION fn_versiones_borrar()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado <> 'BORRADOR' OR OLD.numero_version <> 1 THEN
        RAISE EXCEPTION 'La versión % ya fue publicada o no es la primera: no se puede borrar.', OLD.id_version;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_versiones_borrar ON versiones;
CREATE TRIGGER trg_versiones_borrar
    BEFORE DELETE ON versiones
    FOR EACH ROW
    EXECUTE FUNCTION fn_versiones_borrar();

CREATE OR REPLACE FUNCTION fn_plantillas_borrar()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM versiones
         WHERE id_plantilla = OLD.id_plantilla AND (estado <> 'BORRADOR' OR numero_version <> 1)
    ) THEN
        RAISE EXCEPTION 'La plantilla % ya fue publicada: no se puede borrar, solo desactivar.', OLD.id_plantilla;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_plantillas_borrar ON plantillas;
CREATE TRIGGER trg_plantillas_borrar
    BEFORE DELETE ON plantillas
    FOR EACH ROW
    EXECUTE FUNCTION fn_plantillas_borrar();
