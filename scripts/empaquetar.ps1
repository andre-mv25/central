# Empaqueta el proyecto para entregar al cliente.
# Genera la carpeta entrega/ y un ZIP con imagenes preconstruidas,
# docker-compose listo para usar, base de datos, scripts y el LEEME.
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\empaquetar.ps1
$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$version = Get-Date -Format 'yyyyMMdd'
$salida = Join-Path $raiz 'entrega'
$zip = Join-Path $raiz "registro-ventas-entrega-$version.zip"

Write-Host '==> Construyendo imagenes de backend y frontend...'
docker compose build

Write-Host '==> Descargando imagenes base (postgres, caddy)...'
docker pull postgres:16-alpine
docker pull caddy:2-alpine

if (Test-Path $salida) { Remove-Item -Recurse -Force $salida }
if (Test-Path $zip) { Remove-Item -Force $zip }
New-Item -ItemType Directory -Force -Path (Join-Path $salida 'imagenes') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $salida 'scripts') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $salida 'infra\caddy') | Out-Null

$imagenes = [ordered]@{
    'postgres.tar' = 'postgres:16-alpine'
    'caddy.tar'    = 'caddy:2-alpine'
    'backend.tar'  = 'registro-ventas-backend:latest'
    'frontend.tar' = 'registro-ventas-frontend:latest'
}

foreach ($nombre in $imagenes.Keys) {
    $ref = $imagenes[$nombre]
    Write-Host "==> Guardando $ref -> imagenes\$nombre"
    docker save -o (Join-Path $salida "imagenes\$nombre") $ref
}

Write-Host '==> Copiando archivos de despliegue...'
Copy-Item 'docker-compose.entrega.yml' (Join-Path $salida 'docker-compose.yml')
Copy-Item '.env.example' $salida
Copy-Item 'infra\caddy\Caddyfile' (Join-Path $salida 'infra\caddy\Caddyfile')
Copy-Item 'database' $salida -Recurse
Copy-Item 'docs\entrega\INSTALACION_CLIENTE.md' (Join-Path $salida 'LEEME.md')

$scriptsCliente = @(
    'generar-env.ps1', 'generar-env.sh',
    'cargar-imagenes.ps1', 'cargar-imagenes.sh',
    'respaldo.ps1', 'respaldo.sh',
    'restaurar.ps1', 'restaurar.sh'
)
foreach ($s in $scriptsCliente) {
    Copy-Item (Join-Path 'scripts' $s) (Join-Path $salida "scripts\$s")
}

Write-Host '==> Generando ZIP...'
Compress-Archive -Path (Join-Path $salida '*') -DestinationPath $zip

Write-Host ''
Write-Host "OK: paquete generado en $zip"
Write-Host 'El cliente debe: descomprimir, cargar imagenes y ejecutar docker compose up -d.'
