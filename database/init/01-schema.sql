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

-- La calidad ya no forma parte de la captura; se conserva como valor técnico
-- estándar para mantener compatibilidad con el historial de precios existente.
INSERT INTO calidades (nombre_calidad) VALUES ('Estándar')
ON CONFLICT (nombre_calidad) DO NOTHING;

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
    total             NUMERIC(14,2) GENERATED ALWAYS AS (bolsas * kilos * precio) STORED,
    fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rv_fecha ON registros_ventas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rv_comprador_fecha ON registros_ventas (comprador_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rv_clase_calidad ON registros_ventas (clase_id, calidad_id);
CREATE INDEX IF NOT EXISTS idx_hp_clase_calidad_vigente ON historial_precios (clase_id, calidad_id, vigente_desde DESC);

-- Inventario: las existencias se calculan desde el kardex para conservar
-- trazabilidad de cada entrada, salida y corrección.
CREATE TABLE IF NOT EXISTS productos (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL UNIQUE,
    codigo          VARCHAR(80) UNIQUE,
    unidad_medida   VARCHAR(30) NOT NULL DEFAULT 'kg',
    stock_minimo    NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recepciones_inventario (
    id                  BIGSERIAL PRIMARY KEY,
    proveedor           VARCHAR(150),
    referencia          VARCHAR(100),
    fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
    notas               TEXT,
    usuario_registro_id INTEGER NOT NULL REFERENCES usuarios (id),
    creado_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id                  BIGSERIAL PRIMARY KEY,
    producto_id         BIGINT NOT NULL REFERENCES productos (id),
    tipo                VARCHAR(12) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad            NUMERIC(14,3) NOT NULL CHECK (cantidad <> 0),
    motivo              VARCHAR(200),
    referencia          VARCHAR(100),
    recepcion_id        BIGINT REFERENCES recepciones_inventario (id),
    registro_venta_id   BIGINT REFERENCES registros_ventas (id) ON DELETE SET NULL,
    usuario_registro_id INTEGER NOT NULL REFERENCES usuarios (id),
    creado_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
      (tipo IN ('entrada', 'salida') AND cantidad > 0)
      OR (tipo = 'ajuste')
    )
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha
    ON movimientos_inventario (producto_id, creado_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_recepcion ON movimientos_inventario (recepcion_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_registro_venta ON movimientos_inventario (registro_venta_id);

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

DROP TRIGGER IF EXISTS trg_productos_actualizar ON productos;
CREATE TRIGGER trg_productos_actualizar
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();
