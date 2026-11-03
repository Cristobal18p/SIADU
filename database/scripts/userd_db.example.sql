-- Permisos mínimos de siadu_app
-- Plantilla: copie este archivo a userd_db.sql (ignorado por git), cambie <CONTRASEÑA> y ejecútelo una vez por base.
-- Rol
DO $do$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'siadu_app') THEN
        CREATE ROLE siadu_app WITH LOGIN PASSWORD '<CONTRASEÑA>';
    END IF;
END
$do$;

-- Conexión y esquema
DO $do$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO siadu_app', current_database());
END
$do$;
GRANT USAGE ON SCHEMA public TO siadu_app;
ALTER ROLE siadu_app BYPASSRLS;

-- Lectura
GRANT SELECT ON ALL TABLES IN SCHEMA public TO siadu_app;

-- INSERT en tablas operativas
GRANT INSERT ON TABLE 
    usuarios,
    usuarios_roles,
    estudiantes,
    firmas,
    flujos,
    flujo_pasos,
    plantillas,
    versiones,
    solicitudes,
    solicitud_pasos,
    aprobaciones
TO siadu_app;

-- UPDATE en tablas operativas
GRANT UPDATE ON TABLE 
    usuarios,
    estudiantes,
    firmas,
    flujos,
    flujo_pasos,
    plantillas,
    versiones,
    solicitudes,
    aprobaciones
TO siadu_app;
-- Secuencias y funciones
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siadu_app;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO siadu_app;

-- Lectura de tablas y vistas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO siadu_app;

-- Sin DELETE
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM siadu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE DELETE ON TABLES FROM siadu_app;

-- Excepciones: los triggers solo dejan borrar lo nunca publicado
GRANT DELETE ON flujo_pasos, flujos, versiones, plantillas TO siadu_app;
