-- Migración: Tabla de claves de idempotencia
-- Aplicar después de 20260923_proveedores_y_lotes.sql

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id              BIGSERIAL PRIMARY KEY,
    clave           VARCHAR(100) NOT NULL UNIQUE,
    metodo          VARCHAR(10) NOT NULL,
    ruta            VARCHAR(200) NOT NULL,
    usuario_id      INTEGER REFERENCES usuarios (id),
    request_hash    VARCHAR(64) NOT NULL,  -- SHA256 del body para detectar duplicados con misma clave pero diferente payload
    response_status SMALLINT,
    response_body   JSONB,
    creado_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expira ON idempotency_keys (expira_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_usuario ON idempotency_keys (usuario_id);

-- Función de limpieza automática (ejecutar via pg_cron o job externo)
-- DELETE FROM idempotency_keys WHERE expira_at < now();

COMMENT ON TABLE idempotency_keys IS 'Deduplicación de requests mutables (POST/PATCH/PUT/DELETE) via header Idempotency-Key';