#!/usr/bin/env sh
# Carga en Docker las imagenes preconstruidas de la carpeta imagenes/.
# Uso:  sh scripts/cargar-imagenes.sh
set -eu

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$RAIZ/imagenes"

if [ ! -d "$DIR" ]; then
    echo "ERROR: no existe la carpeta $DIR" >&2
    exit 1
fi

encontrados=0
for archivo in "$DIR"/*.tar; do
    [ -f "$archivo" ] || continue
    encontrados=1
    echo "Cargando $(basename "$archivo")..."
    docker load -i "$archivo"
done

if [ "$encontrados" -eq 0 ]; then
    echo "ERROR: no hay archivos .tar en $DIR" >&2
    exit 1
fi

echo "OK: imagenes cargadas."
