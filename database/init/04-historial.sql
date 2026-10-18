CREATE TABLE IF NOT EXISTS historial_acciones (
    id            BIGSERIAL PRIMARY KEY,
    usuario_id    INTEGER REFERENCES usuarios (id),
    accion        VARCHAR(100) NOT NULL,
    entidad       VARCHAR(50) NOT NULL,
    entidad_id    INTEGER,
    detalles      JSONB,
    fecha         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_acciones (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON historial_acciones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_entidad ON historial_acciones (entidad, entidad_id);

CREATE OR REPLACE FUNCTION limpiar_historial_antiguo(dias INTEGER)
RETURNS INTEGER AS $$
DECLARE eliminados INTEGER;
BEGIN
    DELETE FROM historial_acciones
    WHERE fecha < now() - (dias || ' days')::interval;
    GET DIAGNOSTICS eliminados = ROW_COUNT;
    RETURN eliminados;
END;
$$ LANGUAGE plpgsql;
