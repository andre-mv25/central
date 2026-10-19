SET statement_timeout = 0;

CREATE TABLE IF NOT EXISTS roles (
    id            SMALLSERIAL PRIMARY KEY,
    nombre        VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol_id        SMALLINT NOT NULL REFERENCES roles (id),
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    creado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compradores (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL UNIQUE,
    telefono      VARCHAR(30),
    sucursal      VARCHAR(100) NOT NULL DEFAULT '',
    creado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clases (
    id            SMALLSERIAL PRIMARY KEY,
    nombre_clase  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS calidades (
    id            SMALLSERIAL PRIMARY KEY,
    nombre_calidad VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS historial_precios (
    id            BIGSERIAL PRIMARY KEY,
    clase_id      SMALLINT NOT NULL REFERENCES clases (id),
    calidad_id    SMALLINT NOT NULL REFERENCES calidades (id),
    precio        NUMERIC(12,2) NOT NULL CHECK (precio > 0),
    vigente_desde TIMESTAMPTZ NOT NULL DEFAULT now(),
    registrado_por_id INTEGER REFERENCES usuarios (id),
    creado_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registros_ventas (
    id                BIGSERIAL PRIMARY KEY,
    comprador_id      INTEGER NOT NULL REFERENCES compradores (id),
    clase_id          SMALLINT NOT NULL REFERENCES clases (id),
    calidad_id        SMALLINT NOT NULL REFERENCES calidades (id),
    usuario_registro_id INTEGER NOT NULL REFERENCES usuarios (id),
    bolsas            INTEGER NOT NULL DEFAULT 1 CHECK (bolsas > 0),
    kilos             NUMERIC(12,3) NOT NULL CHECK (kilos > 0),
    precio            NUMERIC(12,2) NOT NULL CHECK (precio > 0),
    total             NUMERIC(12,2) GENERATED ALWAYS AS (bolsas * kilos * precio) STORED,
    fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rv_fecha ON registros_ventas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rv_comprador_fecha ON registros_ventas (comprador_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rv_clase_calidad ON registros_ventas (clase_id, calidad_id);
CREATE INDEX IF NOT EXISTS idx_hp_clase_calidad_vigente ON historial_precios (clase_id, calidad_id, vigente_desde DESC);

CREATE OR REPLACE FUNCTION set_actualizado_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_actualizar ON usuarios;
CREATE TRIGGER trg_usuarios_actualizar
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();

DROP TRIGGER IF EXISTS trg_compradores_actualizar ON compradores;
CREATE TRIGGER trg_compradores_actualizar
    BEFORE UPDATE ON compradores
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();

DROP TRIGGER IF EXISTS trg_rv_actualizar ON registros_ventas;
CREATE TRIGGER trg_rv_actualizar
    BEFORE UPDATE ON registros_ventas
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();