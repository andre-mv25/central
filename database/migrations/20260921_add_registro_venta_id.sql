-- Migración para agregar columna registro_venta_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'movimientos_inventario' 
        AND column_name = 'registro_venta_id'
    ) THEN
        ALTER TABLE movimientos_inventario 
        ADD COLUMN registro_venta_id BIGINT REFERENCES registros_ventas (id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_movimientos_registro_venta 
        ON movimientos_inventario (registro_venta_id);
    END IF;
END $$;