#!/usr/bin/env sh
# Crea un respaldo de la base de datos en la carpeta respaldos/.
# Uso:  sh scripts/respaldo.sh
set -eu

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

mkdir -p respaldos
FECHA="$(date +%Y%m%d-%H%M%S)"
ARCHIVO="respaldos/registro_ventas_$FECHA.dump"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/respaldo.dump'
docker compose cp db:/tmp/respaldo.dump "$ARCHIVO"
docker compose exec -T db rm -f /tmp/respaldo.dump

echo "OK: respaldo creado en $ARCHIVO"
