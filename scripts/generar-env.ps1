# Genera un .env con POSTGRES_PASSWORD y JWT_SECRET aleatorios.
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

$password = New-Secret 24
$jwtSecret = (New-Secret 32) + (New-Secret 32)

(Get-Content '.env.example') `
    -replace '^POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$password" `
    -replace '^JWT_SECRET=.*', "JWT_SECRET=$jwtSecret" |
    Set-Content -Encoding ascii '.env'

Write-Host 'OK: .env generado con credenciales aleatorias.'
