Add-Type -AssemblyName Microsoft.Office.Interop.Word
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()

# Title
$title = $doc.Content
$title.Text = 'Registro de Ventas - Manual de Instalación'
$title.Font.Size = 24
$title.Font.Bold = $true
$title.ParagraphFormat.Alignment = 1
$title.InsertParagraphAfter()

# Subtitle
$subtitle = $doc.Content
$subtitle.Text = 'Sistema de captura de ventas a granel'
$subtitle.Font.Size = 14
$subtitle.ParagraphFormat.Alignment = 1
$subtitle.InsertParagraphAfter()

$subtitle2 = $doc.Content
$subtitle2.Text = 'Versión 1.0 - Octubre 2026'
$subtitle2.Font.Size = 12
$subtitle2.ParagraphFormat.Alignment = 1
$subtitle2.InsertParagraphAfter()

$line = $doc.Content
$line.Text = '________________________________________'
$line.ParagraphFormat.Alignment = 1
$line.InsertParagraphAfter()
$line.InsertParagraphAfter()

# Section 1: Requisitos
$h1 = $doc.Content
$h1.Text = '1. Requisitos previos'
$h1.Font.Size = 16
$h1.Font.Bold = $true
$h1.InsertParagraphAfter()

$req = @(
    'Docker Desktop instalado y en ejecución (ícono de ballena activo en la bandeja del sistema).',
    '   - Si el paquete incluye la carpeta `instaladores/`, instale Docker desde ahí (funciona sin internet).',
    '   - Si no la incluye, descárguelo de: https://www.docker.com/products/docker-desktop',
    '4 GB de RAM libres y aproximadamente 3 GB de espacio en disco (además del instalador de Docker).',
    'Windows 10/11, macOS o Linux.'
)
foreach ($r in $req) {
    $p = $doc.Content
    $p.Text = $r
    $p.Font.Size = 11
    $p.InsertParagraphAfter()
}

$ver = $doc.Content
$ver.Text = 'Verificación de la instalación:'
$ver.Font.Bold = $true
$ver.Font.Size = 11
$ver.InsertParagraphAfter()

$code = $doc.Content
$code.Text = 'docker version'
$code.Font.Name = 'Consolas'
$code.Font.Size = 10
$code.InsertParagraphAfter()

$code2 = $doc.Content
$code2.Text = 'docker compose version'
$code2.Font.Name = 'Consolas'
$code2.Font.Size = 10
$code2.InsertParagraphAfter()

# Section 2: Contenido
$h2 = $doc.Content
$h2.Text = '2. Contenido del paquete de entrega'
$h2.Font.Size = 16
$h2.Font.Bold = $true
$h2.InsertParagraphAfter()

$content = @(
    'docker-compose.yml        - Configuración de los servicios',
    '.env.example              - Plantilla de configuración',
    'imagenes/                 - Imágenes Docker preconstruidas (no requiere compilar)',
    'instaladores/             - Instalador de Docker Desktop (si se generó con internet)',
    'scripts/                  - Atajos de instalación, respaldo y restauración',
    'database/init/            - Esquema y datos iniciales de la base de datos',
    'infra/caddy/              - Configuración del servidor web',
    'LEEME.md                  - Este documento en formato Markdown'
)
foreach ($c in $content) {
    $p = $doc.Content
    $p.Text = $c
    $p.Font.Name = 'Consolas'
    $p.Font.Size = 10
    $p.InsertParagraphAfter()
}

# Section 3: Instalación
$h3 = $doc.Content
$h3.Text = '3. Instalación (aprox. 5 minutos)'
$h3.Font.Size = 16
$h3.Font.Bold = $true
$h3.InsertParagraphAfter()

$note = $doc.Content
$note.Text = 'Ejecute todos los comandos desde la carpeta donde descomprimió el paquete.'
$note.Font.Italic = $true
$note.Font.Size = 11
$note.InsertParagraphAfter()

# Paso 1
$p1 = $doc.Content
$p1.Text = 'Paso 1 - Generar la configuración (.env)'
$p1.Font.Size = 14
$p1.Font.Bold = $true
$p1.InsertParagraphAfter()

$win = $doc.Content
$win.Text = 'Windows (PowerShell):'
$win.Font.Bold = $true
$win.Font.Size = 11
$win.InsertParagraphAfter()

$cmd1 = $doc.Content
$cmd1.Text = 'powershell -ExecutionPolicy Bypass -File scripts\generar-env.ps1'
$cmd1.Font.Name = 'Consolas'
$cmd1.Font.Size = 10
$cmd1.InsertParagraphAfter()

$mac = $doc.Content
$mac.Text = 'macOS / Linux:'
$mac.Font.Bold = $true
$mac.Font.Size = 11
$mac.InsertParagraphAfter()

$cmd2 = $doc.Content
$cmd2.Text = 'sh scripts/generar-env.sh'
$cmd2.Font.Name = 'Consolas'
$cmd2.Font.Size = 10
$cmd2.InsertParagraphAfter()

# Paso 2
$p2 = $doc.Content
$p2.Text = 'Paso 2 - Cargar las imágenes Docker'
$p2.Font.Size = 14
$p2.Font.Bold = $true
$p2.InsertParagraphAfter()

$win2 = $doc.Content
$win2.Text = 'Windows:'
$win2.Font.Bold = $true
$win2.Font.Size = 11
$win2.InsertParagraphAfter()

$cmd3 = $doc.Content
$cmd3.Text = 'powershell -ExecutionPolicy Bypass -File scripts\cargar-imagenes.ps1'
$cmd3.Font.Name = 'Consolas'
$cmd3.Font.Size = 10
$cmd3.InsertParagraphAfter()

$mac2 = $doc.Content
$mac2.Text = 'macOS / Linux:'
$mac2.Font.Bold = $true
$mac2.Font.Size = 11
$mac2.InsertParagraphAfter()

$cmd4 = $doc.Content
$cmd4.Text = 'sh scripts/cargar-imagenes.sh'
$cmd4.Font.Name = 'Consolas'
$cmd4.Font.Size = 10
$cmd4.InsertParagraphAfter()

# Paso 3
$p3 = $doc.Content
$p3.Text = 'Paso 3 - Levantar la aplicación'
$p3.Font.Size = 14
$p3.Font.Bold = $true
$p3.InsertParagraphAfter()

$cmd5 = $doc.Content
$cmd5.Text = 'docker compose up -d'
$cmd5.Font.Name = 'Consolas'
$cmd5.Font.Size = 10
$cmd5.InsertParagraphAfter()

# Paso 4
$p4 = $doc.Content
$p4.Text = 'Paso 4 - Abrir en el navegador'
$p4.Font.Size = 14
$p4.Font.Bold = $true
$p4.InsertParagraphAfter()

$url = $doc.Content
$url.Text = 'http://localhost/'
$url.Font.Name = 'Consolas'
$url.Font.Size = 11
$url.Font.Bold = $true
$url.InsertParagraphAfter()

$note2 = $doc.Content
$note2.Text = 'La primera vez tarda unos segundos en crear la base de datos.'
$note2.Font.Italic = $true
$note2.Font.Size = 11
$note2.InsertParagraphAfter()

# Section 4: Acceso
$h4 = $doc.Content
$h4.Text = '4. Acceso al sistema'
$h4.Font.Size = 16
$h4.Font.Bold = $true
$h4.InsertParagraphAfter()

$cred = @(
    'Usuario: admin',
    'Contraseña: admin123'
)
foreach ($c in $cred) {
    $p = $doc.Content
    $p.Text = $c
    $p.Font.Name = 'Consolas'
    $p.Font.Size = 11
    $p.Font.Bold = $true
    $p.InsertParagraphAfter()
}

$warn = $doc.Content
$warn.Text = 'IMPORTANTE: Cambie la contraseña antes de usar el sistema en producción. Contacte al proveedor para generar una contraseña segura.'
$warn.Font.Bold = $true
$warn.Font.Color = 255
$warn.Font.Size = 11
$warn.InsertParagraphAfter()

# Acceso a la base de datos
$db = $doc.Content
$db.Text = 'Acceso a la base de datos (opcional):'
$db.Font.Bold = $true
$db.Font.Size = 12
$db.InsertParagraphAfter()

$dbinfo = @(
    'Clave de la base de datos: 5052003 (usuario: ventas, base: registro_ventas)',
    'Consola SQL dentro del contenedor:',
    '   docker compose exec db psql -U ventas -d registro_ventas',
    'Con cliente gráfico (pgAdmin/DBeaver): el puerto 5432 no está expuesto por defecto.',
    '   Si lo necesita, agregue `ports: ["5432:5432"]` al servicio `db` en docker-compose.yml',
    '   y ejecute `docker compose up -d`. Luego conecte a localhost:5432 con usuario `ventas` y clave `5052003`.'
)
foreach ($d in $dbinfo) {
    $p = $doc.Content
    $p.Text = $d
    $p.Font.Size = 11
    if ($d.StartsWith('   ')) { $p.Font.Name = 'Consolas'; $p.Font.Size = 10 }
    $p.InsertParagraphAfter()
}

# Section 5: Uso en red
$h5 = $doc.Content
$h5.Text = '5. Uso desde otras computadoras de la red local'
$h5.Font.Size = 16
$h5.Font.Bold = $true
$h5.InsertParagraphAfter()

$red = @(
    '1. Averigüe la IP de la laptop servidor (Windows: abra CMD y ejecute `ipconfig`).',
    '2. Desde las otras PCs, abra en el navegador: http://<IP-de-la-laptop>/',
    '3. Permita el puerto 80 en el firewall de la laptop servidor (Windows Defender > Firewall > Reglas de entrada > Nueva regla > Puerto 80 > Permitir).'
)
foreach ($r in $red) {
    $p = $doc.Content
    $p.Text = $r
    $p.Font.Size = 11
    $p.InsertParagraphAfter()
}

# Section 6: Operación diaria
$h6 = $doc.Content
$h6.Text = '6. Operación diaria (comandos útiles)'
$h6.Font.Size = 16
$h6.Font.Bold = $true
$h6.InsertParagraphAfter()

$cmds = @(
    'docker compose ps            - Ver estado de los servicios',
    'docker compose logs -f       - Ver registros en tiempo real',
    'docker compose stop          - Detener (los datos se conservan)',
    'docker compose up -d         - Volver a iniciar',
    'docker compose down          - Detener y quitar contenedores (los datos se conservan)'
)
foreach ($c in $cmds) {
    $p = $doc.Content
    $p.Text = $c
    $p.Font.Name = 'Consolas'
    $p.Font.Size = 10
    $p.InsertParagraphAfter()
}

$warn2 = $doc.Content
$warn2.Text = 'ADVERTENCIA: `docker compose down -v` BORRA la base de datos. Úselo solo para reiniciar desde cero.'
$warn2.Font.Bold = $true
$warn2.Font.Color = 255
$warn2.Font.Size = 11
$warn2.InsertParagraphAfter()

$trouble = $doc.Content
$trouble.Text = 'Si la aplicación no abre, verifique que Docker Desktop esté en ejecución y que el puerto 80 no esté ocupado por otro programa (IIS, Skype, etc.).'
$trouble.Font.Italic = $true
$trouble.Font.Size = 11
$trouble.InsertParagraphAfter()

# Section 7: Respaldos
$h7 = $doc.Content
$h7.Text = '7. Respaldos de la base de datos'
$h7.Font.Size = 16
$h7.Font.Bold = $true
$h7.InsertParagraphAfter()

$backup = $doc.Content
$backup.Text = 'Crear un respaldo (queda en la carpeta `respaldos/`):'
$backup.Font.Bold = $true
$backup.Font.Size = 11
$backup.InsertParagraphAfter()

$b1 = $doc.Content
$b1.Text = 'Windows: powershell -ExecutionPolicy Bypass -File scripts\respaldo.ps1'
$b1.Font.Name = 'Consolas'
$b1.Font.Size = 10
$b1.InsertParagraphAfter()

$b2 = $doc.Content
$b2.Text = 'macOS/Linux: sh scripts/respaldo.sh'
$b2.Font.Name = 'Consolas'
$b2.Font.Size = 10
$b2.InsertParagraphAfter()

$restore = $doc.Content
$restore.Text = 'Restaurar un respaldo:'
$restore.Font.Bold = $true
$restore.Font.Size = 11
$restore.InsertParagraphAfter()

$r1 = $doc.Content
$r1.Text = 'Windows: powershell -ExecutionPolicy Bypass -File scripts\restaurar.ps1 respaldos\registro_ventas_AAAAMMDD-HHMMSS.dump'
$r1.Font.Name = 'Consolas'
$r1.Font.Size = 10
$r1.InsertParagraphAfter()

$r2 = $doc.Content
$r2.Text = 'macOS/Linux: sh scripts/restaurar.sh respaldos/registro_ventas_AAAAMMDD-HHMMSS.dump'
$r2.Font.Name = 'Consolas'
$r2.Font.Size = 10
$r2.InsertParagraphAfter()

$rec = $doc.Content
$rec.Text = 'Recomendación: respalde la carpeta `respaldos/` al menos una vez por semana (cópiela a un disco externo o la nube).'
$rec.Font.Italic = $true
$rec.Font.Size = 11
$rec.InsertParagraphAfter()

# Section 8: Puerto 80 ocupado
$h8 = $doc.Content
$h8.Text = '8. Si el puerto 80 está ocupado'
$h8.Font.Size = 16
$h8.Font.Bold = $true
$h8.InsertParagraphAfter()

$port = @(
    '1. Edite el archivo `.env` y cambie:',
    '   HTTP_PORT=8080',
    '2. Ejecute: docker compose down && docker compose up -d',
    '3. Abra en el navegador: http://localhost:8080/'
)
foreach ($p in $port) {
    $par = $doc.Content
    $par.Text = $p
    $par.Font.Size = 11
    if ($p.StartsWith('   ')) { $par.Font.Name = 'Consolas'; $par.Font.Size = 10 }
    $par.InsertParagraphAfter()
}

# Footer
$doc.Content.InsertParagraphAfter()
$doc.Content.InsertParagraphAfter()
$footer = $doc.Content
$footer.Text = '--- Fin del manual ---'
$footer.ParagraphFormat.Alignment = 1
$footer.Font.Italic = $true
$footer.Font.Size = 10
$footer.InsertParagraphAfter()

$footer2 = $doc.Content
$footer2.Text = 'Soporte técnico: contactar al proveedor del sistema'
$footer2.ParagraphFormat.Alignment = 1
$footer2.Font.Size = 10
$footer2.InsertParagraphAfter()

# Save
$savePath = 'E:\Manual_Instalacion_Registro_Ventas.docx'
$doc.SaveAs([ref]$savePath)
$doc.Close()
$word.Quit()
Write-Host "Documento guardado en: $savePath"