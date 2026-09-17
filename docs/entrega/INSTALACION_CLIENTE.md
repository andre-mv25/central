# Registro de Ventas - Guía de instalación

Sistema de captura de ventas a granel. Se ejecuta en una sola computadora
(la "laptop servidor") usando Docker. No requiere internet ni dominio.

## 1. Requisitos

- **Docker Desktop** instalado y **abierto** (ícono de ballena activo).
  Descarga: https://www.docker.com/products/docker-desktop
- 4 GB de RAM libres y ~3 GB de disco.
- Windows 10/11, macOS o Linux.

Verificar la instalación (abrir una terminal):

```bash
docker version
docker compose version
```

## 2. Contenido del paquete

```
docker-compose.yml        configuración de los servicios
.env.example              plantilla de configuración
imagenes/                 imágenes Docker preconstruidas (no requiere compilar)
scripts/                  atajos de instalación, respaldo y restauración
database/init/            esquema y datos iniciales de la base
infra/caddy/              configuración del servidor web
LEEME.md                  este documento
```

## 3. Instalación (5 minutos)

Ejecutar los comandos desde la carpeta descomprimida.

**Paso 1 - Generar la configuración (.env)**

Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\generar-env.ps1
```
macOS / Linux:
```bash
sh scripts/generar-env.sh
```

**Paso 2 - Cargar las imágenes Docker**

Windows:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\cargar-imagenes.ps1
```
macOS / Linux:
```bash
sh scripts/cargar-imagenes.sh
```

**Paso 3 - Levantar la aplicación**
```bash
docker compose up -d
```

**Paso 4 - Abrir en el navegador**

- http://localhost/

La primera vez tarda unos segundos en crear la base de datos.

## 4. Acceso

- Usuario: `admin@registro.local`
- Contraseña: `admin123`

> Cambiar la contraseña antes de usarlo en producción. Contactar al proveedor
> para generarla.

## 5. Uso desde otras computadoras de la red

1. Averiguar la IP de la laptop servidor (Windows: `ipconfig`).
2. Abrir desde las otras PCs: `http://<IP-de-la-laptop>/`
3. Permitir el puerto 80 en el firewall de la laptop servidor.

## 6. Operación diaria

```bash
docker compose ps            # ver estado de los servicios
docker compose logs -f       # ver registros
docker compose stop          # detener (los datos se conservan)
docker compose up -d         # volver a iniciar
docker compose down          # detener y quitar contenedores (los datos se conservan)
```

> `docker compose down -v` **borra la base de datos**. Usar solo para reiniciar
> desde cero.

Si la aplicación no abre, verificar que Docker Desktop esté en ejecución y que
el puerto 80 no esté ocupado por otro programa (IIS, Skype, etc.).

## 7. Respaldos

Crear un respaldo (queda en la carpeta `respaldos/`):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\respaldo.ps1
```
```bash
sh scripts/respaldo.sh
```

Restaurar un respaldo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restaurar.ps1 respaldos\registro_ventas_AAAAMMDD-HHMMSS.dump
```
```bash
sh scripts/restaurar.sh respaldos/registro_ventas_AAAAMMDD-HHMMSS.dump
```

Recomendación: respaldar la carpeta `respaldos/` al menos una vez por semana.

## 8. Si el puerto 80 está ocupado

Editar el archivo `.env` y cambiar:

```
HTTP_PORT=8080
```

Luego `docker compose down && docker compose up -d` y abrir
`http://localhost:8080/`.
