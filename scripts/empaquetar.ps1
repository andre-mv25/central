# Empaqueta el proyecto para entregar al cliente.
# Genera la carpeta entrega/ y un ZIP con imagenes preconstruidas,
# docker-compose listo para usar, base de datos, scripts, el LEEME y
# el instalador de Docker Desktop (para la laptop del cliente sin internet).
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\empaquetar.ps1
# Opciones:
#   -SinInstaladorDocker   no descarga el instalador de Docker Desktop
param(
    [switch]$SinInstaladorDocker
)
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
New-Item -ItemType Directory -Force -Path (Join-Path $salida 'instaladores') | Out-Null

if (-not $SinInstaladorDocker) {
    $instalador = Join-Path $salida 'instaladores\Docker Desktop Installer.exe'
    $urlDocker = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe'
    Write-Host '==> Descargando instalador de Docker Desktop (Windows)...'
    try {
        Invoke-WebRequest -Uri $urlDocker -OutFile $instalador -UseBasicParsing
    } catch {
        Write-Warning 'Fallo la descarga con Invoke-WebRequest, reintentando con curl.exe...'
        & curl.exe -L --fail --silent --show-error -o $instalador $urlDocker
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo descargar el instalador de Docker Desktop.' }
    }
    $tamano = (Get-Item $instalador).Length
    if ($tamano -lt 400MB) {
        Write-Warning "Tamano inesperado del instalador ($tamano bytes). Verificar manualmente."
    } else {
        Write-Host "Instalador descargado ($([math]::Round($tamano/1MB)) MB)."
    }
} else {
    Write-Host '==> Omitido: instalador de Docker Desktop (-SinInstaladorDocker).'
}

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
