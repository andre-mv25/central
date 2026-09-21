-- Aplicar una vez en instalaciones que ya existían antes del módulo de inventario.
-- En instalaciones nuevas, estas tablas ya se crean mediante init/01-schema.sql.

CREATE TABLE IF NOT EXISTS productos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    codigo VARCHAR(80) UNIQUE,
    unidad_medida VARCHAR(30) NOT NULL DEFAULT 'pieza',
    stock_minimo NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recepciones_inventario (
    id BIGSERIAL PRIMARY KEY,
    proveedor VARCHAR(150), referencia VARCHAR(100), fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    notas TEXT, usuario_registro_id INTEGER NOT NULL REFERENCES usuarios (id),
    creado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES productos (id),
    tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad <> 0),
    motivo VARCHAR(200), referencia VARCHAR(100), recepcion_id BIGINT REFERENCES recepciones_inventario (id),
    usuario_registro_id INTEGER NOT NULL REFERENCES usuarios (id), creado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((tipo IN ('entrada', 'salida') AND cantidad > 0) OR tipo = 'ajuste')
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto_fecha ON movimientos_inventario (producto_id, creado_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_recepcion ON movimientos_inventario (recepcion_id);

ALTER TABLE productos ALTER COLUMN unidad_medida SET DEFAULT 'kg';

-- Compatibilidad: las ventas nuevas usan una calidad estándar invisible para el usuario.
INSERT INTO calidades (nombre_calidad) VALUES ('Estándar')
ON CONFLICT (nombre_calidad) DO NOTHING;

CREATE OR REPLACE FUNCTION set_actualizado_at()
RETURNS TRIGGER AS $$ BEGIN NEW.actualizado_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_productos_actualizar ON productos;
CREATE TRIGGER trg_productos_actualizar BEFORE UPDATE ON productos
FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();
