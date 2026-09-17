# Restaura la base de datos desde un archivo .dump creado por respaldo.ps1.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\restaurar.ps1 respaldos\registro_ventas_20260917-120000.dump
param(
    [Parameter(Mandatory = $true)]
    [string]$Archivo
)

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

if (-not (Test-Path $Archivo)) {
    Write-Error "No existe el archivo $Archivo"
    exit 1
}

docker compose cp $Archivo db:/tmp/restaurar.dump
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner /tmp/restaurar.dump'
$codigo = $LASTEXITCODE
docker compose exec -T db rm -f /tmp/restaurar.dump

if ($codigo -ne 0) {
    Write-Warning "pg_restore termino con advertencias (codigo $codigo). Revisa los mensajes anteriores."
} else {
    Write-Host 'OK: respaldo restaurado.'
}
