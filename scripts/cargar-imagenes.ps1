# Carga en Docker las imagenes preconstruidas de la carpeta imagenes/.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\cargar-imagenes.ps1
$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $raiz 'imagenes'

if (-not (Test-Path $dir)) {
    Write-Error "No existe la carpeta $dir"
    exit 1
}

$archivos = Get-ChildItem -Path $dir -Filter '*.tar'
if ($archivos.Count -eq 0) {
    Write-Error "No hay archivos .tar en $dir"
    exit 1
}

foreach ($archivo in $archivos) {
    Write-Host "Cargando $($archivo.Name)..."
    docker load -i $archivo.FullName
}

Write-Host 'OK: imagenes cargadas.'
