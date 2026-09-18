# Genera un .env a partir de .env.example.
# POSTGRES_PASSWORD se toma de la plantilla (fija en 5052003) y
# JWT_SECRET se genera aleatoriamente.
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\generar-env.ps1
$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

if (-not (Test-Path '.env.example')) {
    Write-Error 'No se encontro .env.example en la raiz del proyecto.'
    exit 1
}

if (Test-Path '.env') {
    Write-Error '.env ya existe. Borralo o renombralo si quieres regenerarlo.'
    exit 1
}

function New-Secret([int]$bytes = 24) {
    $buffer = New-Object 'byte[]' $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    -join ($buffer | ForEach-Object { $_.ToString('x2') })
}

$jwtSecret = (New-Secret 32) + (New-Secret 32)

(Get-Content '.env.example') `
    -replace '^JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" |
    Set-Content -Encoding ascii '.env'

Write-Host 'OK: .env generado. POSTGRES_PASSWORD = 5052003, JWT_SECRET aleatorio.'
