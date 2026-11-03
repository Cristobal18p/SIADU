-- Solo titulares con cuenta activa y rol APROBADOR pueden ser pasos fijos de un flujo.

CREATE OR REPLACE FUNCTION fn_flujo_pasos_aprobador()
RETURNS TRIGGER AS $$
DECLARE
    v_id_usuario BIGINT;
BEGIN
    -- Paso por escuela: el titular se valida al radicar
    IF NEW.id_asignacion IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT usr.id_usuario
      INTO v_id_usuario
      FROM asignaciones_administrativos aa
      JOIN administrativos adm ON adm.id_admin = aa.id_admin
      JOIN personal per ON per.id_personal = adm.id_personal
      JOIN usuarios usr ON usr.id_usuario = per.id_usuario AND usr.estado = 'A'
     WHERE aa.id_asignacion = NEW.id_asignacion;

    IF v_id_usuario IS NULL THEN
        RAISE EXCEPTION 'La asignación % no tiene una cuenta activa asociada: no puede ser paso de un flujo.', NEW.id_asignacion
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM usuarios_roles ur
          JOIN roles r ON r.id_rol = ur.id_rol
         WHERE ur.id_usuario = v_id_usuario AND UPPER(r.descripcion) = 'APROBADOR'
    ) THEN
        RAISE EXCEPTION 'El titular de la asignación % no tiene el rol APROBADOR: no puede ser paso de un flujo.', NEW.id_asignacion
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_flujo_pasos_aprobador ON flujo_pasos;
CREATE TRIGGER trg_flujo_pasos_aprobador
    BEFORE INSERT OR UPDATE OF id_asignacion ON flujo_pasos
    FOR EACH ROW
    EXECUTE FUNCTION fn_flujo_pasos_aprobador();

-- Un flujo activo (A) no cambia de estructura; solo admite relevo de persona en el mismo puesto.

CREATE OR REPLACE FUNCTION fn_flujo_pasos_estructura()
RETURNS TRIGGER AS $$
DECLARE
    v_estado CHAR(1);
    v_mismo_puesto BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT estado INTO v_estado FROM flujos WHERE id_flujo = NEW.id_flujo;
        IF v_estado = 'A' THEN
            RAISE EXCEPTION 'El flujo % está activo: no admite pasos nuevos. Cree otro flujo.', NEW.id_flujo;
        END IF;
        RETURN NEW;
    END IF;

    SELECT estado INTO v_estado FROM flujos WHERE id_flujo = OLD.id_flujo;

    IF TG_OP = 'DELETE' THEN
        IF v_estado = 'A' THEN
            RAISE EXCEPTION 'El flujo % está activo: no se pueden borrar sus pasos. Cree otro flujo.', OLD.id_flujo;
        END IF;
        RETURN OLD;
    END IF;

    -- En borrador no hay restricciones
    IF v_estado IS DISTINCT FROM 'A' THEN
        RETURN NEW;
    END IF;

    IF NEW.id_flujo <> OLD.id_flujo OR NEW.secuencia <> OLD.secuencia OR NEW.req_firma <> OLD.req_firma
       OR NEW.alcance <> OLD.alcance OR NEW.id_cargo IS DISTINCT FROM OLD.id_cargo THEN
        RAISE EXCEPTION 'El flujo % está activo: solo se puede cambiar la persona de un paso. Cree otro flujo.', OLD.id_flujo;
    END IF;

    IF NEW.id_asignacion IS DISTINCT FROM OLD.id_asignacion THEN
        SELECT (n.id_cargo = o.id_cargo
                AND n.cod_unidad = o.cod_unidad
                AND n.id_area IS NOT DISTINCT FROM o.id_area
                AND n.cod_departamento IS NOT DISTINCT FROM o.cod_departamento
                AND n.cod_escuela IS NOT DISTINCT FROM o.cod_escuela)
          INTO v_mismo_puesto
          FROM asignaciones_administrativos o, asignaciones_administrativos n
         WHERE o.id_asignacion = OLD.id_asignacion AND n.id_asignacion = NEW.id_asignacion;

        IF v_mismo_puesto IS DISTINCT FROM TRUE THEN
            RAISE EXCEPTION 'El flujo % está activo: el paso % solo puede pasar a otra persona del mismo puesto.', OLD.id_flujo, OLD.secuencia;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_flujo_pasos_estructura ON flujo_pasos;
CREATE TRIGGER trg_flujo_pasos_estructura
    BEFORE INSERT OR UPDATE OR DELETE ON flujo_pasos
    FOR EACH ROW
    EXECUTE FUNCTION fn_flujo_pasos_estructura();

-- B -> A, nunca al revés; para activarse necesita al menos un paso.

CREATE OR REPLACE FUNCTION fn_flujos_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'A' AND NEW.estado <> 'A' THEN
        RAISE EXCEPTION 'El flujo % está activo y no puede volver a borrador.', OLD.id_flujo;
    END IF;

    IF OLD.estado = 'B' AND NEW.estado = 'A' THEN
        IF NOT EXISTS (SELECT 1 FROM flujo_pasos WHERE id_flujo = NEW.id_flujo) THEN
            RAISE EXCEPTION 'El flujo % no tiene pasos: no se puede activar.', NEW.id_flujo;
        END IF;
        NEW.id_version_borrador := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_flujos_estado ON flujos;
CREATE TRIGGER trg_flujos_estado
    BEFORE UPDATE OF estado ON flujos
    FOR EACH ROW
    EXECUTE FUNCTION fn_flujos_estado();

-- Un flujo activo (A) no se borra.

CREATE OR REPLACE FUNCTION fn_flujos_borrar()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'A' THEN
        RAISE EXCEPTION 'El flujo % está activo y no se puede borrar.', OLD.id_flujo;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_flujos_borrar ON flujos;
CREATE TRIGGER trg_flujos_borrar
    BEFORE DELETE ON flujos
    FOR EACH ROW
    EXECUTE FUNCTION fn_flujos_borrar();
