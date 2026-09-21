-- Liga cada venta con una salida de inventario (y su reverso al eliminar).
-- Aplicar después de 20260918_inventario.sql en instalaciones existentes.

ALTER TABLE movimientos_inventario
    ADD COLUMN IF NOT EXISTS registro_venta_id BIGINT REFERENCES registros_ventas (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_registro_venta
    ON movimientos_inventario (registro_venta_id);
