CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO roles (nombre) VALUES
    ('ADMIN'),
    ('VENDEDOR')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO usuarios (email, password_hash, rol_id) VALUES
    ('admin@registro.local', crypt('admin123', gen_salt('bf')), (SELECT id FROM roles WHERE nombre = 'ADMIN'))
ON CONFLICT (email) DO NOTHING;

INSERT INTO clases (nombre_clase) VALUES
    ('30'),
    ('26'),
    ('1ra')
ON CONFLICT (nombre_clase) DO NOTHING;

INSERT INTO calidades (nombre_calidad) VALUES
    ('Alta'),
    ('Media'),
    ('Baja')
ON CONFLICT (nombre_calidad) DO NOTHING;

INSERT INTO compradores (nombre, telefono, sucursal) VALUES
    ('Tucanazo', '33-0000-0001', 'Sucursal Centro'),
    ('Mascorro', '33-0000-0002', 'Sucursal Norte')
ON CONFLICT (nombre) DO NOTHING;