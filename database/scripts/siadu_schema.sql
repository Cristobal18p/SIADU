-- Esquema de SIADU (PostgreSQL)

-- Seguridad y usuarios
CREATE TABLE IF NOT EXISTS roles (
    id_rol BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    correo VARCHAR(150) NOT NULL UNIQUE,
    cedula VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    clave_inicial BOOLEAN NOT NULL DEFAULT TRUE,
    version_sesion INTEGER NOT NULL DEFAULT 0 CHECK (version_sesion >= 0),
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS usuarios_roles (
    id_usuario BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_rol BIGINT NOT NULL REFERENCES roles(id_rol) ON DELETE CASCADE,
    PRIMARY KEY (id_usuario, id_rol)
);

-- Estructura organizacional
CREATE TABLE IF NOT EXISTS areas (
    id_area BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cargos (
    id_cargo INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    jerarquia INTEGER NOT NULL DEFAULT 9, -- 1 es el cargo mayor
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I'))
);

CREATE TABLE IF NOT EXISTS unidades (
    id_unidad BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    abrev VARCHAR(50),
    cod_sede INTEGER,
    cod_unidad INTEGER NOT NULL UNIQUE,
    cod_facultad INTEGER,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    tipo_unidad VARCHAR(100),
    ubicacion VARCHAR(255),
    CONSTRAINT uk_unidad_sede_facultad UNIQUE (cod_sede, cod_facultad)
);

CREATE TABLE IF NOT EXISTS departamentos (
    id_departamento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cod_departamento INTEGER NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    CONSTRAINT uk_departamento_unidad UNIQUE (cod_unidad, cod_departamento)
);

CREATE TABLE IF NOT EXISTS escuelas (
    id_escuela BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cod_escuela INTEGER NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    cod_unidad INTEGER NOT NULL,
    cod_departamento INTEGER NOT NULL,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    FOREIGN KEY (cod_unidad, cod_departamento) 
        REFERENCES departamentos(cod_unidad, cod_departamento) ON DELETE RESTRICT,
    CONSTRAINT uk_escuela_departamento UNIQUE (cod_unidad, cod_departamento, cod_escuela)
);

CREATE TABLE IF NOT EXISTS carreras (
    id_carrera BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    descripcion VARCHAR(255) NOT NULL,
    -- Escuela de la carrera
    cod_departamento INTEGER,
    cod_escuela INTEGER,
    CONSTRAINT uk_carrera UNIQUE (cod_unidad, descripcion),
    CONSTRAINT uk_carrera_unidad UNIQUE (cod_unidad, id_carrera),
    CONSTRAINT ck_carrera_escuela CHECK ((cod_departamento IS NULL) = (cod_escuela IS NULL)),
    FOREIGN KEY (cod_unidad, cod_departamento, cod_escuela)
        REFERENCES escuelas(cod_unidad, cod_departamento, cod_escuela) ON DELETE RESTRICT
);

-- Personal, cargos y estudiantes
CREATE TABLE IF NOT EXISTS personal (
    id_personal BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    cedula VARCHAR(30) UNIQUE,
    telefono VARCHAR(50),
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    id_usuario BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS administrativos (
    id_admin BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_personal BIGINT NOT NULL REFERENCES personal(id_personal) ON DELETE CASCADE UNIQUE,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I'))
);

CREATE TABLE IF NOT EXISTS profesores (
    id_profesor BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_personal BIGINT NOT NULL REFERENCES personal(id_personal) ON DELETE CASCADE UNIQUE,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I'))
);

CREATE TABLE IF NOT EXISTS asignaciones_administrativos (
    id_asignacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_admin BIGINT NOT NULL REFERENCES administrativos(id_admin) ON DELETE CASCADE,
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    id_cargo INTEGER NOT NULL REFERENCES cargos(id_cargo) ON DELETE RESTRICT,
    id_area BIGINT REFERENCES areas(id_area) ON DELETE SET NULL,
    cod_departamento INTEGER,
    cod_escuela INTEGER,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    
    FOREIGN KEY (cod_unidad, cod_departamento) 
        REFERENCES departamentos(cod_unidad, cod_departamento) ON DELETE RESTRICT,
        
    FOREIGN KEY (cod_unidad, cod_departamento, cod_escuela) 
        REFERENCES escuelas(cod_unidad, cod_departamento, cod_escuela) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS estudiantes (
    id_estudiante BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    cedula VARCHAR(30) UNIQUE,
    correo VARCHAR(150) NOT NULL UNIQUE,
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    id_carrera BIGINT NOT NULL,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    id_usuario BIGINT REFERENCES usuarios(id_usuario) ON DELETE SET NULL UNIQUE,
    FOREIGN KEY (cod_unidad, id_carrera) 
        REFERENCES carreras(cod_unidad, id_carrera) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS firmas (
    id_firma BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_personal BIGINT NOT NULL REFERENCES personal(id_personal) ON DELETE CASCADE,
    url_firma TEXT NOT NULL,
    hash_firma VARCHAR(255) NOT NULL,
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    fecha_registrado TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flujos y plantillas
CREATE TABLE IF NOT EXISTS flujos (
    id_flujo BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    estado CHAR(1) NOT NULL DEFAULT 'B' CHECK (estado IN ('A', 'B')), -- B: borrador, A: activo
    id_version_borrador BIGINT, -- FK al final del script
    fecha_creada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flujo_pasos (
    id_paso BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_flujo BIGINT NOT NULL REFERENCES flujos(id_flujo) ON DELETE CASCADE,
    secuencia INTEGER NOT NULL,
    alcance VARCHAR(20) NOT NULL DEFAULT 'FIJO' CHECK (alcance IN ('FIJO', 'ESCUELA_SOLICITANTE')),
    id_asignacion BIGINT REFERENCES asignaciones_administrativos(id_asignacion) ON DELETE RESTRICT, -- FIJO
    id_cargo INTEGER REFERENCES cargos(id_cargo) ON DELETE RESTRICT, -- ESCUELA_SOLICITANTE: se resuelve al radicar
    req_firma BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE: visto bueno sin firma
    CONSTRAINT uk_flujo_secuencia UNIQUE (id_flujo, secuencia),
    CONSTRAINT ck_flujo_paso_alcance CHECK (
        (alcance = 'FIJO' AND id_asignacion IS NOT NULL AND id_cargo IS NULL)
        OR (alcance = 'ESCUELA_SOLICITANTE' AND id_asignacion IS NULL AND id_cargo IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS plantillas (
    id_plantilla BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    audiencia VARCHAR(50)[] NOT NULL DEFAULT ARRAY['ESTUDIANTE']::VARCHAR(50)[],
    estado CHAR(1) NOT NULL DEFAULT 'A' CHECK (estado IN ('A', 'I')),
    fecha_registrado TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS versiones (
    id_version BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_plantilla BIGINT NOT NULL REFERENCES plantillas(id_plantilla) ON DELETE CASCADE,
    id_flujo BIGINT REFERENCES flujos(id_flujo) ON DELETE RESTRICT,
    numero_version INTEGER NOT NULL DEFAULT 1,
    variable_form_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    diseno_form_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'ACTIVO', 'INACTIVO')),
    creado_por BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    fecha_public TIMESTAMPTZ,
    CONSTRAINT uk_plantilla_version UNIQUE (id_plantilla, numero_version)
);

-- Solicitudes y aprobaciones
CREATE TABLE IF NOT EXISTS solicitudes (
    id_solicitud BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_version BIGINT NOT NULL REFERENCES versiones(id_version) ON DELETE RESTRICT,
    id_usuario BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    cod_unidad INTEGER NOT NULL REFERENCES unidades(cod_unidad) ON DELETE RESTRICT,
    id_flujo BIGINT NOT NULL REFERENCES flujos(id_flujo) ON DELETE RESTRICT,
    codigo_documento VARCHAR(100) NOT NULL UNIQUE, -- Lo genera un trigger: UP{unidad}-{año}-{número}
    datos_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' 
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMPTZ
);

-- Pasos por escuela resueltos al radicar
CREATE TABLE IF NOT EXISTS solicitud_pasos (
    id_solicitud BIGINT NOT NULL REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    secuencia INTEGER NOT NULL,
    id_asignacion BIGINT NOT NULL REFERENCES asignaciones_administrativos(id_asignacion) ON DELETE RESTRICT,
    PRIMARY KEY (id_solicitud, secuencia)
);

CREATE TABLE IF NOT EXISTS aprobaciones (
    id_aprobacion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud BIGINT NOT NULL REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
    id_flujo BIGINT NOT NULL,
    secuencia INTEGER NOT NULL,
    id_usuario BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    comentario TEXT,
    id_firma BIGINT REFERENCES firmas(id_firma) ON DELETE SET NULL,
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_accion TIMESTAMPTZ,

    -- Copia al decidir (trigger)
    cargo_nombre VARCHAR(150),
    area_nombre VARCHAR(150),
    aprobador_nombre VARCHAR(200),
    aprobador_cedula VARCHAR(30),

    FOREIGN KEY (id_flujo, secuencia) 
        REFERENCES flujo_pasos(id_flujo, secuencia) ON DELETE RESTRICT,
        
    CONSTRAINT uk_aprobacion_solicitud_secuencia UNIQUE (id_solicitud, secuencia)
);

-- flujos y versiones se referencian entre sí
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_flujos_version_borrador') THEN
        ALTER TABLE flujos
            ADD CONSTRAINT fk_flujos_version_borrador
            FOREIGN KEY (id_version_borrador) REFERENCES versiones(id_version) ON DELETE SET NULL;
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_cedula ON usuarios(cedula);
CREATE INDEX IF NOT EXISTS idx_solicitudes_usuario ON solicitudes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_solicitudes_version ON solicitudes(id_version);
CREATE INDEX IF NOT EXISTS idx_solicitudes_flujo ON solicitudes(id_flujo);
CREATE INDEX IF NOT EXISTS idx_solicitudes_unidad ON solicitudes(cod_unidad);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_solicitud ON aprobaciones(id_solicitud);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_usuario ON aprobaciones(id_usuario);
CREATE INDEX IF NOT EXISTS idx_flujo_pasos_flujo ON flujo_pasos(id_flujo);
CREATE INDEX IF NOT EXISTS idx_flujo_pasos_asignacion ON flujo_pasos(id_asignacion);
CREATE INDEX IF NOT EXISTS idx_flujos_unidad ON flujos(cod_unidad);
CREATE INDEX IF NOT EXISTS idx_versiones_plantilla ON versiones(id_plantilla);
CREATE INDEX IF NOT EXISTS idx_versiones_flujo ON versiones(id_flujo);
CREATE INDEX IF NOT EXISTS idx_flujos_version_borrador ON flujos(id_version_borrador);
-- Por plantilla: a lo sumo una versión ACTIVO y una BORRADOR
CREATE UNIQUE INDEX IF NOT EXISTS uk_versiones_activa ON versiones(id_plantilla) WHERE estado = 'ACTIVO';
CREATE UNIQUE INDEX IF NOT EXISTS uk_versiones_borrador ON versiones(id_plantilla) WHERE estado = 'BORRADOR';
CREATE INDEX IF NOT EXISTS idx_estudiantes_unidad ON estudiantes(cod_unidad);
CREATE INDEX IF NOT EXISTS idx_asignaciones_admin ON asignaciones_administrativos(id_admin);
CREATE INDEX IF NOT EXISTS idx_asignaciones_unidad ON asignaciones_administrativos(cod_unidad);
CREATE INDEX IF NOT EXISTS idx_plantillas_audiencia ON plantillas USING GIN(audiencia);
-- Una sola firma activa por persona
CREATE UNIQUE INDEX IF NOT EXISTS uk_firmas_activa ON firmas(id_personal) WHERE estado = 'A';
