-- Migración: Proveedores y Lotes básicos
-- Aplicar después de 20260918_inventario.sql

-- 1. Tabla proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL UNIQUE,
    contacto        VARCHAR(150),
    telefono        VARCHAR(30),
    email           VARCHAR(150),
    direccion       TEXT,
    rfc             VARCHAR(20),
    condiciones_pago VARCHAR(100),
    dias_credito    SMALLINT NOT NULL DEFAULT 0 CHECK (dias_credito >= 0),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores (activo);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores (nombre);

-- Trigger updated_at para proveedores
DROP TRIGGER IF EXISTS trg_proveedores_actualizar ON proveedores;
CREATE TRIGGER trg_proveedores_actualizar
    BEFORE UPDATE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();

-- 2. Agregar proveedor_id a recepciones_inventario (FK)
ALTER TABLE recepciones_inventario
    ADD COLUMN IF NOT EXISTS proveedor_id BIGINT REFERENCES proveedores (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recepciones_proveedor ON recepciones_inventario (proveedor_id);

-- 3. Migrar datos existentes: crear proveedores desde el campo texto 'proveedor' y actualizar recepciones
DO $$
DECLARE
    v_proveedor_nombre TEXT;
    v_proveedor_id BIGINT;
BEGIN
    FOR v_proveedor_nombre IN
        SELECT DISTINCT trim(proveedor) FROM recepciones_inventario
        WHERE proveedor IS NOT NULL AND trim(proveedor) <> ''
    LOOP
        INSERT INTO proveedores (nombre, creado_at, actualizado_at)
        VALUES (v_proveedor_nombre, now(), now())
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id INTO v_proveedor_id;
        
        UPDATE recepciones_inventario
        SET proveedor_id = v_proveedor_id
        WHERE trim(proveedor) = v_proveedor_nombre AND proveedor_id IS NULL;
    END LOOP;
END $$;

-- 4. Campos de lote en productos
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS numero_lote VARCHAR(80),
    ADD COLUMN IF NOT EXISTS fecha_cosecha DATE,
    ADD COLUMN IF NOT EXISTS fecha_caducidad DATE,
    ADD COLUMN IF NOT EXISTS origen VARCHAR(150); -- campo, galpón, región, etc.

-- Índices para consultas de lote
CREATE INDEX IF NOT EXISTS idx_productos_lote ON productos (numero_lote) WHERE numero_lote IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_fecha_caducidad ON productos (fecha_caducidad) WHERE fecha_caducidad IS NOT NULL;

-- 5. Vista para compatibilidad: mantener campo 'proveedor' texto en recepciones para consultas legacy
-- (opcional, se puede quitar en futuro)