CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles (nombre) VALUES
    ('ADMIN'),
    ('VENDEDOR')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (email, password_hash, rol_id) VALUES
    ('admin', crypt('admin123', gen_salt('bf')), (SELECT id FROM roles WHERE nombre = 'ADMIN'))
ON CONFLICT (email) DO NOTHING;