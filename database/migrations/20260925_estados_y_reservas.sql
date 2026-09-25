-- Migración: Estados de inventario + Reservas de stock
-- Aplicar después de 20260924_idempotency_keys.sql

-- 1. Extender productos con estado y costos
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'disponible'
        CHECK (estado IN ('disponible', 'cuarentena', 'bloqueado', 'reservado', 'en_transito', 'merma', 'devuelto')),
    ADD COLUMN IF NOT EXISTS costo_promedio NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (costo_promedio >= 0),
    ADD COLUMN IF NOT EXISTS costo_ultimo NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (costo_ultimo >= 0),
    ADD COLUMN IF NOT EXISTS valor_stock NUMERIC(16,2) GENERATED ALWAYS AS (stock_actual * costo_promedio) STORED;

-- Nota: stock_actual no es columna real, se calcula. La generated column no funcionará directamente.
-- Usaremos una vista o calcular en aplicación. Por ahora solo guardamos costo_promedio y costo_ultimo.

-- Eliminar la generated column que no funciona y agregar vista después
ALTER TABLE productos DROP COLUMN IF EXISTS valor_stock;

-- Índices para estados
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos (estado);
CREATE INDEX IF NOT EXISTS idx_productos_activo_estado ON productos (activo, estado);

-- 2. Tabla de reservas de stock
CREATE TABLE IF NOT EXISTS reservas_stock (
    id                  BIGSERIAL PRIMARY KEY,
    producto_id         BIGINT NOT NULL REFERENCES productos (id) ON DELETE RESTRICT,
    cantidad            NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
    estado              VARCHAR(20) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa', 'confirmada', 'liberada', 'vencida', 'parcial')),
    origen_tipo         VARCHAR(30) NOT NULL CHECK (origen_tipo IN ('venta', 'transferencia', 'produccion', 'ajuste', 'manual')),
    origen_id           BIGINT,  -- ID de la venta, transferencia, etc.
    referencia          VARCHAR(100),
    notas               TEXT,
    usuario_creacion_id INTEGER NOT NULL REFERENCES usuarios (id),
    usuario_confirmacion_id INTEGER REFERENCES usuarios (id),
    fecha_vencimiento   TIMESTAMPTZ,  -- Auto-liberar si no se confirma
    creado_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmado_at       TIMESTAMPTZ,
    liberado_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reservas_producto_estado ON reservas_stock (producto_id, estado);
CREATE INDEX IF NOT EXISTS idx_reservas_origen ON reservas_stock (origen_tipo, origen_id);
CREATE INDEX IF NOT EXISTS idx_reservas_vencimiento ON reservas_stock (fecha_vencimiento) WHERE estado = 'activa' AND fecha_vencimiento IS NOT NULL;

-- Trigger updated_at para reservas
DROP TRIGGER IF EXISTS trg_reservas_actualizar ON reservas_stock;
CREATE TRIGGER trg_reservas_actualizar
    BEFORE UPDATE ON reservas_stock
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();

-- 3. Vista para stock disponible (real - reservado)
CREATE OR REPLACE VIEW v_productos_stock AS
SELECT 
    p.id,
    p.nombre,
    p.codigo,
    p.numero_lote,
    p.fecha_cosecha,
    p.fecha_caducidad,
    p.origen,
    p.unidad_medida,
    p.stock_minimo,
    p.activo,
    p.estado,
    p.costo_promedio,
    p.costo_ultimo,
    COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0) AS stock_real,
    COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0) 
      - COALESCE((SELECT SUM(cantidad) FROM reservas_stock r WHERE r.producto_id = p.id AND r.estado IN ('activa', 'confirmada')), 0) AS stock_disponible,
    COALESCE((SELECT SUM(cantidad) FROM reservas_stock r WHERE r.producto_id = p.id AND r.estado IN ('activa', 'confirmada')), 0) AS stock_reservado,
    p.creado_at,
    p.actualizado_at
FROM productos p
LEFT JOIN movimientos_inventario m ON m.producto_id = p.id
GROUP BY p.id;

-- 4. Función helper para obtener stock disponible (para uso en triggers/validaciones)
CREATE OR REPLACE FUNCTION get_stock_disponible(p_producto_id BIGINT)
RETURNS NUMERIC(14,3) AS $$
DECLARE
    v_stock_real NUMERIC(14,3);
    v_stock_reservado NUMERIC(14,3);
BEGIN
    SELECT COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0)
    INTO v_stock_real
    FROM movimientos_inventario m
    WHERE m.producto_id = p_producto_id;

    SELECT COALESCE(SUM(cantidad), 0)
    INTO v_stock_reservado
    FROM reservas_stock
    WHERE producto_id = p_producto_id AND estado IN ('activa', 'confirmada');

    RETURN v_stock_real - v_stock_reservado;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para liberar reservas vencidas (llamar vía pg_cron o job)
CREATE OR REPLACE FUNCTION liberar_reservas_vencidas()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE reservas_stock
    SET estado = 'vencida', liberado_at = now()
    WHERE estado = 'activa' AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < now();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE reservas_stock IS 'Reservas de stock para ventas, transferencias, producción. Evita sobreventa.';
COMMENT ON COLUMN productos.estado IS 'Estado físico/lógico del lote: disponible, cuarentena, bloqueado, reservado, en_transito, merma, devuelto';
COMMENT ON COLUMN productos.costo_promedio IS 'Costo promedio ponderado (WAC) actualizado en cada recepción';
COMMENT ON COLUMN productos.costo_ultimo IS 'Costo de la última recepción (para referencia)';