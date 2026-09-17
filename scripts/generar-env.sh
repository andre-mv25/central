#!/usr/bin/env sh
# Genera un .env con POSTGRES_PASSWORD y JWT_SECRET aleatorios.
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

PASSWORD="$(generar_secreto)"
JWT_SECRET="$(generar_secreto)$(generar_secreto)"

sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PASSWORD|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" \
    .env.example > .env

echo "OK: .env generado con credenciales aleatorias."
