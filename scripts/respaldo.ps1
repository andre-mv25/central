# Crea un respaldo de la base de datos en la carpeta respaldos/.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\respaldo.ps1
$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$destino = Join-Path $raiz 'respaldos'
New-Item -ItemType Directory -Force -Path $destino | Out-Null

$fecha = Get-Date -Format 'yyyyMMdd-HHmmss'
$archivo = Join-Path $destino "registro_ventas_$fecha.dump"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/respaldo.dump'
docker compose cp db:/tmp/respaldo.dump $archivo
docker compose exec -T db rm -f /tmp/respaldo.dump

Write-Host "OK: respaldo creado en $archivo"
