#!/usr/bin/env sh
# Restaura la base de datos desde un archivo .dump creado por respaldo.sh.
# Uso:  sh scripts/restaurar.sh respaldos/registro_ventas_20260917-120000.dump
set -eu

if [ "$#" -lt 1 ]; then
    echo "Uso: sh scripts/restaurar.sh <archivo.dump>" >&2
    exit 1
fi

ARCHIVO="$1"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

if [ ! -f "$ARCHIVO" ]; then
    echo "ERROR: no existe el archivo $ARCHIVO" >&2
    exit 1
fi

docker compose cp "$ARCHIVO" db:/tmp/restaurar.dump
if docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner /tmp/restaurar.dump'; then
    echo "OK: respaldo restaurado."
else
    echo "AVISO: pg_restore termino con advertencias. Revisa los mensajes anteriores." >&2
fi
docker compose exec -T db rm -f /tmp/restaurar.dump
