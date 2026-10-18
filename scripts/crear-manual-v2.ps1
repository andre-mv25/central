# Crear manual de instalación detallado usando Open XML (más confiable que COM)
Add-Type -AssemblyName DocumentFormat.OpenXml
Add-Type -AssemblyName WindowsBase

$savePath = 'E:\Manual_Instalacion_Registro_Ventas.docx'

# Crear documento Word usando Open XML SDK
$wordDoc = [DocumentFormat.OpenXml.Packaging.WordprocessingDocument]::Create($savePath, [DocumentFormat.OpenXml.WordprocessingDocumentType]::Document)

# Partes principales
$mainPart = $wordDoc.AddMainDocumentPart()
$mainPart.Document = New-Object DocumentFormat.OpenXml.Wordprocessing.Document
$body = New-Object DocumentFormat.OpenXml.Wordprocessing.Body
$mainPart.Document.Append($body)

# Estilos
$stylesPart = $mainPart.AddNewPart([DocumentFormat.OpenXml.Packaging.StyleDefinitionsPart]::class)
$stylesPart.Styles = New-Object DocumentFormat.OpenXml.Wordprocessing.Styles
$stylesPart.Styles.Save()

function Add-Paragraph($text, $fontSize = 11, $bold = $false, $italic = $false, $alignment = "Left", $fontName = "Calibri", $color = "000000", $spaceAfter = 120) {
    global $body
    $p = New-Object DocumentFormat.OpenXml.Wordprocessing.Paragraph
    
    # Propiedades del párrafo
    $pPr = New-Object DocumentFormat.OpenXml.Wordprocessing.ParagraphProperties
    $spacing = New-Object DocumentFormat.OpenXml.Wordprocessing.SpacingBetweenLines
    $spacing.After = $spaceAfter
    $pPr.Append($spacing)
    
    $jc = New-Object DocumentFormat.OpenXml.Wordprocessing.Justification
    $jc.Val = $alignment
    $pPr.Append($jc)
    
    $p.Append($pPr)
    
    # Run (texto)
    $run = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
    $rPr = New-Object DocumentFormat.OpenXml.Wordprocessing.RunProperties
    
    $sz = New-Object DocumentFormat.OpenXml.Wordprocessing.FontSize
    $sz.Val = ($fontSize * 2).ToString()  # en half-points
    $rPr.Append($sz)
    
    if ($bold) { $rPr.Append((New-Object DocumentFormat.OpenXml.Wordprocessing.Bold)) }
    if ($italic) { $rPr.Append((New-Object DocumentFormat.OpenXml.Wordprocessing.Italic)) }
    
    $rFonts = New-Object DocumentFormat.OpenXml.Wordprocessing.RunFonts
    $rFonts.Ascii = $fontName
    $rFonts.HighAnsi = $fontName
    $rPr.Append($rFonts)
    
    $clr = New-Object DocumentFormat.OpenXml.Wordprocessing.Color
    $clr.Val = $color
    $rPr.Append($clr)
    
    $run.Append($rPr)
    
    $t = New-Object DocumentFormat.OpenXml.Wordprocessing.Text
    $t.Text = $text
    $t.Space = [DocumentFormat.OpenXml.Wordprocessing.SpaceProcessingModeValues]::Preserve
    $run.Append($t)
    
    $p.Append($run)
    $body.Append($p)
}

function Add-CodeBlock($lines) {
    global $body
    foreach ($line in $lines) {
        $p = New-Object DocumentFormat.OpenXml.Wordprocessing.Paragraph
        $pPr = New-Object DocumentFormat.OpenXml.Wordprocessing.ParagraphProperties
        $spacing = New-Object DocumentFormat.OpenXml.Wordprocessing.SpacingBetweenLines
        $spacing.After = 40
        $pPr.Append($spacing)
        
        # Fondo gris claro para código
        $shd = New-Object DocumentFormat.OpenXml.Wordprocessing.Shading
        $shd.Val = "Clear"
        $shd.Color = "auto"
        $shd.Fill = "F2F2F2"
        $pPr.Append($shd)
        
        $p.Append($pPr)
        
        $run = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
        $rPr = New-Object DocumentFormat.OpenXml.Wordprocessing.RunProperties
        $sz = New-Object DocumentFormat.OpenXml.Wordprocessing.FontSize
        $sz.Val = "20"  # 10pt
        $rPr.Append($sz)
        $rFonts = New-Object DocumentFormat.OpenXml.Wordprocessing.RunFonts
        $rFonts.Ascii = "Consolas"
        $rFonts.HighAnsi = "Consolas"
        $rPr.Append($rFonts)
        $run.Append($rPr)
        
        $t = New-Object DocumentFormat.OpenXml.Wordprocessing.Text
        $t.Text = $line
        $t.Space = [DocumentFormat.OpenXml.Wordprocessing.SpaceProcessingModeValues]::Preserve
        $run.Append($t)
        $p.Append($run)
        $body.Append($p)
    }
}

function Add-Heading($text, $level = 1) {
    $sizes = @{1=28; 2=20; 3=16}
    $size = $sizes[$level]
    if (-not $size) { $size = 14 }
    Add-Paragraph -text $text -fontSize $size -bold $true -spaceAfter 200
}

function Add-Bullet($text, $fontSize = 11, $indent = 720) {
    global $body
    $p = New-Object DocumentFormat.OpenXml.Wordprocessing.Paragraph
    $pPr = New-Object DocumentFormat.OpenXml.Wordprocessing.ParagraphProperties
    $spacing = New-Object DocumentFormat.OpenXml.Wordprocessing.SpacingBetweenLines
    $spacing.After = 80
    $pPr.Append($spacing)
    
    $ind = New-Object DocumentFormat.OpenXml.Wordprocessing.Indentation
    $ind.Left = $indent.ToString()
    $ind.Hanging = "360"
    $pPr.Append($ind)
    
    $p.Append($pPr)
    
    # Bullet character
    $run = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
    $rPr = New-Object DocumentFormat.OpenXml.Wordprocessing.RunProperties
    $sz = New-Object DocumentFormat.OpenXml.Wordprocessing.FontSize
    $sz.Val = ($fontSize * 2).ToString()
    $rPr.Append($sz)
    $rFonts = New-Object DocumentFormat.OpenXml.Wordprocessing.RunFonts
    $rFonts.Ascii = "Calibri"
    $rFonts.HighAnsi = "Calibri"
    $rPr.Append($rFonts)
    $run.Append($rPr)
    $t = New-Object DocumentFormat.OpenXml.Wordprocessing.Text
    $t.Text = "• "
    $run.Append($t)
    $p.Append($run)
    
    # Texto
    $run2 = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
    $rPr2 = New-Object DocumentFormat.OpenXml.Wordprocessing.RunProperties
    $sz2 = New-Object DocumentFormat.OpenXml.Wordprocessing.FontSize
    $sz2.Val = ($fontSize * 2).ToString()
    $rPr2.Append($sz2)
    $rFonts2 = New-Object DocumentFormat.OpenXml.Wordprocessing.RunFonts
    $rFonts2.Ascii = "Calibri"
    $rFonts2.HighAnsi = "Calibri"
    $rPr2.Append($rFonts2)
    $run2.Append($rPr2)
    $t2 = New-Object DocumentFormat.OpenXml.Wordprocessing.Text
    $t2.Text = $text
    $t2.Space = [DocumentFormat.OpenXml.Wordprocessing.SpaceProcessingModeValues]::Preserve
    $run2.Append($t2)
    $p.Append($run2)
    
    $body.Append($p)
}

function Add-Numbered($text, $number, $fontSize = 11, $indent = 720) {
    global $body
    $p = New-Object DocumentFormat.OpenXml.Wordprocessing.Paragraph
    $pPr = New-Object DocumentFormat.OpenXml.Wordprocessing.ParagraphProperties
    $spacing = New-Object DocumentFormat.OpenXml.Wordprocessing.SpacingBetweenLines
    $spacing.After = 80
    $pPr.Append($spacing)
    
    $ind = New-Object DocumentFormat.OpenXml.Wordprocessing.Indentation
    $ind.Left = $indent.ToString()
    $ind.Hanging = "360"
    $pPr.Append($ind)
    
    $p.Append($pPr)
    
    # Número
    $run = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
    $rPr = New-Object DocumentFormat.OpenXml.Wordprocessing.RunProperties
    $sz = New-Object DocumentFormat.OpenXml.Wordprocessing.FontSize
    $sz.Val = ($fontSize * 2).ToString()
    $rPr.Append($sz)
    $rFonts = New-Object DocumentFormat.OpenXml.Wordprocessing.RunFonts
    $rFonts.Ascii = "Calibri"
    $rFonts.HighAnsi = "Calibri"
    $rPr.Append($rFonts)
    $run.Append($rPr)
    $t = New-Object DocumentFormat.OpenXml.Wordprocessing.Text
    $t.Text = "$number. "
    $run.Append($t)
    $p.Append($run)
    
    # Texto
    $run2 = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
    $rPr2 = New-Object DocumentFormat.OpenXml.Wordprocessing.RunProperties
    $sz2 = New-Object DocumentFormat.OpenXml.Wordprocessing.FontSize
    $sz2.Val = ($fontSize * 2).ToString()
    $rPr2.Append($sz2)
    $rFonts2 = New-Object DocumentFormat.OpenXml.Wordprocessing.RunFonts
    $rFonts2.Ascii = "Calibri"
    $rFonts2.HighAnsi = "Calibri"
    $rPr2.Append($rFonts2)
    $run2.Append($rPr2)
    $t2 = New-Object DocumentFormat.OpenXml.Wordprocessing.Text
    $t2.Text = $text
    $t2.Space = [DocumentFormat.OpenXml.Wordprocessing.SpaceProcessingModeValues]::Preserve
    $run2.Append($t2)
    $p.Append($run2)
    
    $body.Append($p)
}

function Add-PageBreak() {
    global $body
    $break = New-Object DocumentFormat.OpenXml.Wordprocessing.Paragraph
    $run = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
    $br = New-Object DocumentFormat.OpenXml.Wordprocessing.Break
    $br.Type = "page"
    $run.Append($br)
    $break.Append($run)
    $body.Append($break)
}

# ===== CONTENIDO DEL MANUAL =====

# Portada
Add-Paragraph -text "Registro de Ventas" -fontSize 36 -bold $true -alignment "Center" -spaceAfter 40
Add-Paragraph -text "Manual de Instalacion y Uso" -fontSize 24 -alignment "Center" -spaceAfter 20
Add-Paragraph -text "Sistema de captura de ventas a granel" -fontSize 16 -italic $true -alignment "Center" -spaceAfter 60
Add-Paragraph -text "Version 1.0" -fontSize 14 -alignment "Center" -spaceAfter 10
Add-Paragraph -text "Octubre 2026" -fontSize 14 -alignment "Center" -spaceAfter 100
Add-Paragraph -text "________________________________________" -alignment "Center" -spaceAfter 60
Add-Paragraph -text "Documento confidencial - Uso interno del cliente" -fontSize 10 -italic $true -alignment "Center" -color "666666"

# Salto de página
Add-PageBreak

# Tabla de contenidos (manual)
Add-Heading "Tabla de Contenidos" 2
Add-Paragraph -text "1. Requisitos previos" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "2. Contenido del paquete de entrega" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "3. Instalacion paso a paso (5 minutos)" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "4. Acceso al sistema" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "5. Uso desde otras computadoras de la red local" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "6. Operacion diaria - Comandos utiles" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "7. Respaldos y restauracion de la base de datos" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "8. Solucion de problemas frecuentes" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "9. Cambio de puerto (si el 80 esta ocupado)" -fontSize 12 -spaceAfter 60
Add-Paragraph -text "10. Contacto y soporte tecnico" -fontSize 12 -spaceAfter 60

# Salto de página
Add-PageBreak

# ===== 1. REQUISITOS PREVIOS =====
Add-Heading "1. Requisitos previos" 1

Add-Paragraph -text "Antes de iniciar la instalacion, verifique que la computadora que actuara como servidor cumpla con lo siguiente:" -fontSize 11 -spaceAfter 120

Add-Bullet -text "Docker Desktop instalado y en ejecucion (debe verse el icono de la ballena en la bandeja del sistema, junto al reloj)." -fontSize 11
Add-Bullet -text "Si el paquete de entrega incluye la carpeta instaladores/, instale Docker desde ahi (funciona sin conexion a internet)." -fontSize 11
Add-Bullet -text "Si no incluye la carpeta instaladores/, descargue Docker Desktop desde: https://www.docker.com/products/docker-desktop" -fontSize 11
Add-Bullet -text "Minimo 4 GB de RAM libres y aproximadamente 3 GB de espacio en disco disponibles (ademas del espacio que ocupe el instalador de Docker)." -fontSize 11
Add-Bullet -text "Sistema operativo: Windows 10/11, macOS 12+ o Linux (Ubuntu 20.04+, Debian 11+, etc.)." -fontSize 11

Add-Paragraph -text "Como verificar que Docker esta listo:" -fontSize 11 -bold $true -spaceAfter 60
Add-CodeBlock @("docker version", "docker compose version")
Add-Paragraph -text "Ambos comandos deben mostrar numeros de version sin errores. Si dice 'Cannot connect to the Docker daemon', abra Docker Desktop y espere a que inicie completamente." -fontSize 11 -italic $true -spaceAfter 120

# ===== 2. CONTENIDO DEL PAQUETE =====
Add-Heading "2. Contenido del paquete de entrega" 1

Add-Paragraph -text "Al descomprimir el archivo ZIP entregado, encontrara la siguiente estructura:" -fontSize 11 -spaceAfter 80

Add-CodeBlock @(
    "registro-ventas-entrega-YYYYMMDD/",
    "|-- docker-compose.yml          Configuracion de todos los servicios",
    "|-- .env.example                Plantilla de variables de entorno",
    "|-- LEEME.md                    Este manual en formato Markdown",
    "|-- imagenes/",
    "|   |-- postgres.tar            Base de datos PostgreSQL 16",
    "|   |-- caddy.tar               Servidor web Caddy",
    "|   |-- backend.tar             API del sistema (NestJS)",
    "|   |-- frontend.tar            Interfaz web (React + Vite)",
    "|-- instaladores/               (Opcional) Instalador de Docker Desktop para Windows",
    "|-- scripts/",
    "|   |-- generar-env.ps1 / .sh   Genera el archivo .env con claves seguras",
    "|   |-- cargar-imagenes.ps1 / .sh  Carga las imagenes Docker al sistema",
    "|   |-- respaldo.ps1 / .sh      Crea respaldo de la base de datos",
    "|   |-- restaurar.ps1 / .sh     Restaura un respaldo anterior",
    "|-- database/init/              Esquema SQL y datos iniciales",
    "|-- infra/caddy/Caddyfile       Configuracion del servidor web"
)

Add-Paragraph -text "No modifique ni elimine ningun archivo a menos que se indique explicitamente en este manual." -fontSize 11 -bold $true -color "CC0000" -spaceAfter 120

# ===== 3. INSTALACIÓN PASO A PASO =====
Add-Heading "3. Instalacion paso a paso (aprox. 5 minutos)" 1

Add-Paragraph -text "IMPORTANTE: Ejecute todos los comandos desde la carpeta raiz donde descomprimio el paquete (donde esta el archivo docker-compose.yml)." -fontSize 11 -bold $true -color "CC0000" -spaceAfter 120

# Paso 1
Add-Heading "Paso 1 - Generar el archivo de configuracion (.env)" 2
Add-Paragraph -text "Este script crea el archivo .env con una clave JWT segura y aleatoria. Es obligatorio ejecutarlo antes de levantar la aplicacion." -fontSize 11 -spaceAfter 80

Add-Paragraph -text "En Windows (PowerShell como Administrador):" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("powershell -ExecutionPolicy Bypass -File scripts\generar-env.ps1")

Add-Paragraph -text "En macOS / Linux:" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("sh scripts/generar-env.sh")

Add-Paragraph -text "Que hace este script:" -fontSize 11 -bold $true -spaceAfter 40
Add-Bullet -text "Copia .env.example a .env"
Add-Bullet -text "Genera un JWT_SECRET criptograficamente seguro (64 caracteres hexadecimales)"
Add-Bullet -text "Deja POSTGRES_PASSWORD=5052003 (clave fija para la base de datos)"
Add-Bullet -text "Configura HTTP_PORT=80 para acceso local"

# Paso 2
Add-Heading "Paso 2 - Cargar las imagenes Docker al sistema" 2
Add-Paragraph -text "Esto importa las imagenes preconstruidas desde la carpeta imagenes/ a Docker. No requiere internet." -fontSize 11 -spaceAfter 80

Add-Paragraph -text "En Windows (PowerShell como Administrador):" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("powershell -ExecutionPolicy Bypass -File scripts\cargar-imagenes.ps1")

Add-Paragraph -text "En macOS / Linux:" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("sh scripts/cargar-imagenes.sh")

Add-Paragraph -text "Vera mensajes como 'Loaded image: registro-ventas-backend:latest'. Espere a que termine (1-2 minutos)." -fontSize 11 -italic $true -spaceAfter 120

# Paso 3
Add-Heading "Paso 3 - Levantar la aplicacion" 2
Add-Paragraph -text "Inicia todos los contenedores en segundo plano:" -fontSize 11 -spaceAfter 40
Add-CodeBlock @("docker compose up -d")

Add-Paragraph -text "La primera vez tardara 15-30 segundos en crear la base de datos y aplicar las migraciones. Las siguientes veces arranca en 3-5 segundos." -fontSize 11 -italic $true -spaceAfter 80

Add-Paragraph -text "Para ver el estado de los servicios:" -fontSize 11 -spaceAfter 40
Add-CodeBlock @("docker compose ps")

Add-Paragraph -text "Debe ver 4 servicios con STATUS 'Up' o 'healthy': db, backend, frontend, caddy." -fontSize 11 -spaceAfter 120

# Paso 4
Add-Heading "Paso 4 - Abrir la aplicacion en el navegador" 2
Add-Paragraph -text "Abra su navegador (Chrome, Edge, Firefox) y vaya a:" -fontSize 11 -spaceAfter 40
Add-CodeBlock @("http://localhost/")
Add-Paragraph -text "Debera ver la pantalla de login del sistema Registro de Ventas." -fontSize 11 -spaceAfter 120

# ===== 4. ACCESO AL SISTEMA =====
Add-Heading "4. Acceso al sistema" 1

Add-Heading "Credenciales iniciales" 2
Add-CodeBlock @("Usuario: admin", "Contrasena: admin123")

Add-Paragraph -text "CAMBIE LA CONTRASENA INMEDIATAMENTE AL ENTRAR POR PRIMERA VEZ." -fontSize 12 -bold $true -color "CC0000" -spaceAfter 60
Add-Paragraph -text "Vaya a Configuracion (icono de engranaje) -> Cambiar contrasena. Use una contrasena de al menos 12 caracteres con mayusculas, minusculas, numeros y simbolos." -fontSize 11 -spaceAfter 120

Add-Paragraph -text "Para generar una contrasena segura, contacte al proveedor del sistema." -fontSize 11 -italic $true -spaceAfter 120

Add-Heading "Acceso a la base de datos (solo para administradores tecnicos)" 2
Add-Paragraph -text "La base de datos PostgreSQL corre dentro del contenedor 'db'. No esta expuesta al exterior por seguridad." -fontSize 11 -spaceAfter 80

Add-Bullet -text "Usuario: ventas"
Add-Bullet -text "Contrasena: 5052003"
Add-Bullet -text "Base de datos: registro_ventas"

Add-Paragraph -text "Consola SQL directa:" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("docker compose exec db psql -U ventas -d registro_ventas")

Add-Paragraph -text "Con cliente grafico (pgAdmin, DBeaver, DataGrip):" -fontSize 11 -bold $true -spaceAfter 40
Add-Numbered -text "Edite docker-compose.yml y agregue bajo el servicio 'db':" -fontSize 11
Add-CodeBlock @("  ports:", '    - "5432:5432"')
Add-Numbered -text "Ejecute: docker compose up -d" -fontSize 11
Add-Numbered -text "Conectese a localhost:5432 con usuario ventas y contrasena 5052003" -fontSize 11
Add-Paragraph -text "Recuerde quitar el puerto 5432 del docker-compose.yml y reiniciar (docker compose up -d) despues de terminar, para mantener la base de datos sin exposicion externa." -fontSize 11 -bold $true -color "CC0000" -spaceAfter 120

# ===== 5. USO EN RED LOCAL =====
Add-Heading "5. Uso desde otras computadoras de la red local" 1

Add-Paragraph -text "El sistema esta disenado para que la laptop servidor atienda a otras PCs de la misma red (caja, oficinas, etc.)." -fontSize 11 -spaceAfter 80

Add-Numbered -text "En la laptop servidor, abra CMD (Simbolo del sistema) y ejecute: ipconfig" -fontSize 11
Add-Paragraph -text "Busque 'Direccion IPv4' (ejemplo: 192.168.1.45). Esa es la IP del servidor." -fontSize 11 -italic $true -spaceAfter 80

Add-Numbered -text "En cada PC cliente, abra el navegador y vaya a: http://<IP-DEL-SERVIDOR>/" -fontSize 11
Add-Paragraph -text "Ejemplo: http://192.168.1.45/" -fontSize 11 -italic $true -spaceAfter 80

Add-Numbered -text "Permita el puerto 80 en el firewall de Windows de la laptop servidor:" -fontSize 11
Add-Bullet -text "Panel de control -> Sistema y seguridad -> Firewall de Windows Defender"
Add-Bullet -text "Configuracion avanzada -> Reglas de entrada -> Nueva regla..."
Add-Bullet -text "Tipo: Puerto -> TCP -> Puertos especificos: 80 -> Permitir la conexion -> Perfil: Privada (y Publica si es red de trabajo) -> Nombre: 'Registro Ventas - Puerto 80'"

Add-Paragraph -text "Si las PCs no pueden conectarse, verifique que esten en la misma red (mismo router/switch) y que el firewall no bloquee el puerto 80." -fontSize 11 -italic $true -spaceAfter 120

# ===== 6. OPERACIÓN DIARIA =====
Add-Heading "6. Operacion diaria - Comandos utiles" 1

Add-Paragraph -text "Ejecute estos comandos desde la carpeta del proyecto (donde esta docker-compose.yml):" -fontSize 11 -spaceAfter 80

# Crear tabla simple
$table = New-Object DocumentFormat.OpenXml.Wordprocessing.Table
$tblPr = New-Object DocumentFormat.OpenXml.Wordprocessing.TableProperties
$tblW = New-Object DocumentFormat.OpenXml.Wordprocessing.TableWidth
$tblW.Type = "pct"
$tblW.Width = "5000"
$tblPr.Append($tblW)
$table.Append($tblPr)

$cmdTable = @(
    @("Comando", "Descripcion"),
    @("docker compose ps", "Ver estado de los 4 servicios (Up/Exited/Restarting)"),
    @("docker compose logs -f", "Ver registros en tiempo real (Ctrl+C para salir)"),
    @("docker compose logs backend", "Ver solo logs del backend (API)"),
    @("docker compose logs frontend", "Ver solo logs del frontend (nginx)"),
    @("docker compose stop", "Detiene los contenedores (los datos se conservan)"),
    @("docker compose up -d", "Vuelve a iniciar los contenedores detenidos"),
    @("docker compose restart", "Reinicia todos los servicios (util si algo falla)"),
    @("docker compose down", "Detiene y elimina contenedores (los datos en volumenes se conservan)"),
    @("docker compose down -v", "ELIMINA LA BASE DE DATOS. Solo para reiniciar desde cero.")
)

foreach ($rowData in $cmdTable) {
    $tr = New-Object DocumentFormat.OpenXml.Wordprocessing.TableRow
    foreach ($cellText in $rowData) {
        $tc = New-Object DocumentFormat.OpenXml.Wordprocessing.TableCell
        $tcPr = New-Object DocumentFormat.OpenXml.Wordprocessing.TableCellProperties
        $tcW = New-Object DocumentFormat.OpenXml.Wordprocessing.TableCellWidth
        $tcW.Type = "pct"
        if ($cellText -eq $rowData[0]) { $tcW.Width = "2000" } else { $tcW.Width = "3000" }
        $tcPr.Append($tcW)
        
        # Fondo para header
        if ($rowData -eq $cmdTable[0]) {
            $shd = New-Object DocumentFormat.OpenXml.Wordprocessing.Shading
            $shd.Fill = "4472C4"
            $shd.Color = "auto"
            $shd.Val = "Clear"
            $tcPr.Append($shd)
        }
        $tc.Append($tcPr)
        
        $p = New-Object DocumentFormat.OpenXml.Wordprocessing.Paragraph
        $run = New-Object DocumentFormat.OpenXml.Wordprocessing.Run
        $rPr = New-Object DocumentFormat.OpenXml.Wordprocessing.RunProperties
        $sz = New-Object DocumentFormat.OpenXml.Wordprocessing.FontSize
        $sz.Val = "20"
        $rPr.Append($sz)
        if ($rowData -eq $cmdTable[0]) { 
            $rPr.Append((New-Object DocumentFormat.OpenXml.Wordprocessing.Bold))
            $clr = New-Object DocumentFormat.OpenXml.Wordprocessing.Color
            $clr.Val = "FFFFFF"
            $rPr.Append($clr)
        }
        $rFonts = New-Object DocumentFormat.OpenXml.Wordprocessing.RunFonts
        $rFonts.Ascii = if ($cellText -like "docker*") { "Consolas" } else { "Calibri" }
        $rFonts.HighAnsi = if ($cellText -like "docker*") { "Consolas" } else { "Calibri" }
        $rPr.Append($rFonts)
        $run.Append($rPr)
        $t = New-Object DocumentFormat.OpenXml.Wordprocessing.Text
        $t.Text = $cellText
        $run.Append($t)
        $p.Append($run)
        $tc.Append($p)
        $tr.Append($tc)
    }
    $table.Append($tr)
}
$body.Append($table)

Add-Paragraph -text "" -spaceAfter 120

Add-Paragraph -text "NUNCA use 'docker compose down -v' a menos que quiera borrar todo y empezar de cero. Ese comando elimina el volumen de la base de datos y TODOS LOS DATOS SE PIERDEN IRRECUPERABLEMENTE." -fontSize 11 -bold $true -color "CC0000" -spaceAfter 120

# ===== 7. RESPALDOS =====
Add-Heading "7. Respaldos y restauracion de la base de datos" 1

Add-Paragraph -text "Los respaldos son su seguro contra fallos de disco, errores humanos o ransomware. HAGALOS REGULARMENTE." -fontSize 11 -bold $true -color "CC0000" -spaceAfter 120

Add-Heading "Crear un respaldo" 2
Add-Paragraph -text "Genera un archivo .dump comprimido en la carpeta respaldos/ (se crea automaticamente):" -fontSize 11 -spaceAfter 60

Add-Paragraph -text "Windows:" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("powershell -ExecutionPolicy Bypass -File scripts\respaldo.ps1")

Add-Paragraph -text "macOS / Linux:" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("sh scripts/respaldo.sh")

Add-Paragraph -text "El archivo se llamara algo como: registro_ventas_20261012-143022.dump" -fontSize 11 -italic $true -spaceAfter 120

Add-Heading "Restaurar un respaldo" 2
Add-Paragraph -text "ESTO SOBRESCRIBE LA BASE DE DATOS ACTUAL. Haga un respaldo antes si duda." -fontSize 11 -bold $true -color "CC0000" -spaceAfter 60

Add-Paragraph -text "Windows:" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("powershell -ExecutionPolicy Bypass -File scripts\restaurar.ps1 respaldos\registro_ventas_20261012-143022.dump")

Add-Paragraph -text "macOS / Linux:" -fontSize 11 -bold $true -spaceAfter 40
Add-CodeBlock @("sh scripts/restaurar.sh respaldos/registro_ventas_20261012-143022.dump")

Add-Heading "Buenas practicas de respaldo" 2
Add-Bullet -text "Programe respaldos automaticos diarios (Tareas programadas de Windows / cron en Linux)."
Add-Bullet -text "Copie la carpeta respaldos/ a un disco externo, NAS o nube (OneDrive, Google Drive) al menos una vez por semana."
Add-Bullet -text "Pruebe restaurar un respaldo al menos una vez al trimestre para verificar que funciona."
Add-Bullet -text "Mantenga al menos los ultimos 7 respaldos diarios y 4 semanales."

# ===== 8. SOLUCIÓN DE PROBLEMAS =====
Add-Heading "8. Solucion de problemas frecuentes" 1

$problems = @(
    @("La pagina no carga (ERR_CONNECTION_REFUSED)",
      "1. Verifique que Docker Desktop este abierto (ballena en la bandeja).",
      "2. Ejecute: docker compose ps  ->  ¿Todos dicen 'Up'?",
      "3. Si algun servicio dice 'Restarting': docker compose logs <servicio> para ver el error.",
      "4. Reinicie: docker compose restart"),
    
    @("Error 'port 80 already in use' o 'address already in use'",
      "Otro programa usa el puerto 80 (IIS, Skype, Apache, Nginx, VMware).",
      "Opcion A: Detenga el otro programa.",
      "Opcion B: Cambie el puerto del sistema (ver seccion 9)."),
    
    @("Error 'Cannot connect to the Docker daemon'",
      "Docker Desktop no esta corriendo. Abralo desde el menu Inicio y espere a que la ballena deje de animarse."),
    
    @("La aplicacion va lenta o se congela",
      "1. Verifique RAM: docker stats -> ¿alguno contenedor usa >80% memoria?",
      "2. Reinicie: docker compose restart",
      "3. Si persiste, reinicie la laptop."),
    
    @("Olvide la contrasena de admin",
      "Contacte al proveedor para generar un reset de contrasena via base de datos."),
    
    @("Quiero actualizar el sistema",
      "Contacte al proveedor. Le entregara un nuevo paquete ZIP. El proceso: hacer respaldo -> descargar imagenes nuevas -> docker compose up -d.")
)

foreach ($prob in $problems) {
    Add-Paragraph -text "Problema: $($prob[0])" -fontSize 11 -bold $true -spaceAfter 40
    for ($i=1; $i -lt $prob.Count; $i++) {
        Add-Bullet -text $prob[$i] -fontSize 11
    }
    Add-Paragraph -text "" -spaceAfter 80
}

# ===== 9. CAMBIO DE PUERTO =====
Add-Heading "9. Cambio de puerto (si el 80 esta ocupado)" 1

Add-Paragraph -text "Si el puerto 80 esta ocupado y no puede liberarlo, cambie el puerto de la aplicacion:" -fontSize 11 -spaceAfter 80

Add-Numbered -text "Edite el archivo .env (Bloc de notas o Notepad++) y cambie la linea:" -fontSize 11
Add-CodeBlock @("HTTP_PORT=8080")
Add-Paragraph -text "Puede usar 8080, 3000, 8000 o cualquier puerto libre >1024." -fontSize 11 -italic $true -spaceAfter 80

Add-Numbered -text "Reinicie la aplicacion:" -fontSize 11
Add-CodeBlock @("docker compose down", "docker compose up -d")

Add-Numbered -text "Acceda en el navegador:" -fontSize 11
Add-CodeBlock @("http://localhost:8080/   (o el puerto que eligio)")

Add-Numbered -text "Desde otras PCs de la red:" -fontSize 11
Add-CodeBlock @("http://<IP-DEL-SERVIDOR>:8080/")

Add-Paragraph -text "Nota: Si usa puerto distinto de 80, los usuarios deben incluir el puerto en la URL (ej: :8080). El puerto 80 es el estandar HTTP y no requiere especificarse." -fontSize 11 -italic $true -spaceAfter 120

# ===== 10. CONTACTO =====
Add-Heading "10. Contacto y soporte tecnico" 1

Add-Paragraph -text "Para dudas, incidencias, solicitud de nuevas funcionalidades o renovacion de licencia:" -fontSize 11 -spaceAfter 80

Add-Paragraph -text "Email: [correo-del-proveedor@ejemplo.com]" -fontSize 11 -spaceAfter 40
Add-Paragraph -text "Tel/WhatsApp: [numero-del-proveedor]" -fontSize 11 -spaceAfter 40
Add-Paragraph -text "Horario de soporte: Lunes a Viernes, 9:00 - 18:00 (hora local)" -fontSize 11 -spaceAfter 120

Add-Paragraph -text "Al reportar un problema, incluya:" -fontSize 11 -bold $true -spaceAfter 60
Add-Bullet -text "Que estaba haciendo cuando ocurrio"
Add-Bullet -text "Mensaje de error exacto (captura de pantalla si es posible)"
Add-Bullet -text "Resultado de: docker compose ps  y  docker compose logs backend"
Add-Bullet -text "Version del sistema (vea pie de pagina en la app o archivo LEEME.md)"

# Footer final
Add-Paragraph -text "" -spaceAfter 200
Add-Paragraph -text "================================================================" -alignment "Center" -fontSize 10 -color "999999" -spaceAfter 40
Add-Paragraph -text "Registro de Ventas - Manual de Instalacion v1.0" -alignment "Center" -fontSize 10 -color "999999" -spaceAfter 20
Add-Paragraph -text "Generado automaticamente - Octubre 2026" -alignment "Center" -fontSize 10 -color "999999" -spaceAfter 20
Add-Paragraph -text "(c) 2026 - Todos los derechos reservados" -alignment "Center" -fontSize 10 -color "999999"

# Guardar
$mainPart.Document.Save()
$wordDoc.Close()
$sizeKB = [math]::Round((Get-Item $savePath).Length / 1KB, 1)
Write-Host "Manual creado exitosamente en: $savePath"
Write-Host "Tamano: $sizeKB KB"