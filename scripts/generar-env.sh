#!/usr/bin/env sh
# Genera un .env a partir de .env.example.
# POSTGRES_PASSWORD se toma de la plantilla (fija en 5052003) y
# JWT_SECRET se genera aleatoriamente.
# Uso:  sh scripts/generar-env.sh
set -eu

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

if [ ! -f .env.example ]; then
    echo "ERROR: no se encontro .env.example en la raiz del proyecto." >&2
    exit 1
fi

if [ -f .env ]; then
    echo "ERROR: .env ya existe. Borralo o renombralo si quieres regenerarlo." >&2
    exit 1
fi

generar_secreto() {
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 24
    else
        head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'
    fi
}

JWT_SECRET="$(generar_secreto)$(generar_secreto)"

sed -e "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" \
    .env.example > .env

echo "OK: .env generado. POSTGRES_PASSWORD = 5052003, JWT_SECRET aleatorio."
