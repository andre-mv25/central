-- Tabla para entradas de mercancía (recepción/inventario)
CREATE TABLE IF NOT EXISTS entradas_mercancia (
    id                BIGSERIAL PRIMARY KEY,
    proveedor_id      INTEGER NOT NULL REFERENCES compradores (id),
    clase_id          SMALLINT NOT NULL REFERENCES clases (id),
    calidad_id        SMALLINT NOT NULL REFERENCES calidades (id),
    usuario_registro_id INTEGER NOT NULL REFERENCES usuarios (id),
    bolsas            INTEGER NOT NULL DEFAULT 1 CHECK (bolsas > 0),
    kilos             NUMERIC(12,3) NOT NULL CHECK (kilos > 0),
    precio            NUMERIC(12,2) NOT NULL CHECK (precio > 0),
    total             NUMERIC(12,2) GENERATED ALWAYS AS (bolsas * kilos * precio) STORED,
    fecha             DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones     TEXT,
    creado_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_em_fecha ON entradas_mercancia (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_em_proveedor_fecha ON entradas_mercancia (proveedor_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_em_clase_calidad ON entradas_mercancia (clase_id, calidad_id);

-- Trigger para actualizado_at
DROP TRIGGER IF EXISTS trg_em_actualizar ON entradas_mercancia;
CREATE TRIGGER trg_em_actualizar
    BEFORE UPDATE ON entradas_mercancia
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();

-- Vista para stock actual (entradas - salidas)
CREATE OR REPLACE VIEW stock_actual AS
SELECT
    em.clase_id,
    c.nombre_clase,
    em.calidad_id,
    ca.nombre_calidad,
    COALESCE(SUM(em.kilos), 0) AS kilos_entrados,
    COALESCE(SUM(rv.kilos), 0) AS kilos_vendidos,
    COALESCE(SUM(em.kilos), 0) - COALESCE(SUM(rv.kilos), 0) AS stock_kilos,
    COALESCE(SUM(em.bolsas), 0) AS bolsas_entradas,
    COALESCE(SUM(rv.bolsas), 0) AS bolsas_vendidas,
    COALESCE(SUM(em.bolsas), 0) - COALESCE(SUM(rv.bolsas), 0) AS stock_bolsas
FROM entradas_mercancia em
JOIN clases c ON c.id = em.clase_id
JOIN calidades ca ON ca.id = em.calidad_id
LEFT JOIN registros_ventas rv ON rv.clase_id = em.clase_id AND rv.calidad_id = em.calidad_id
GROUP BY em.clase_id, c.nombre_clase, em.calidad_id, ca.nombre_calidad;