# Registro de Ventas - Guía de instalación

Sistema de captura de ventas a granel. Se ejecuta en una sola computadora
(la "laptop servidor") usando Docker. No requiere internet ni dominio.

## 1. Requisitos

- **Docker Desktop** instalado y **abierto** (ícono de ballena activo).
  - Si el paquete incluye la carpeta `instaladores/`, instalar desde ahí
    (funciona sin internet).
  - Si no la incluye, descargar de https://www.docker.com/products/docker-desktop
- 4 GB de RAM libres y ~3 GB de disco (más el instalador de Docker).
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
instaladores/             instalador de Docker Desktop (si se generó con internet)
scripts/                  atajos de instalación, respaldo y restauración
database/init/            esquema y datos iniciales de la base (incluye historial_acciones)
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

- Usuario: `admin`
- Contraseña: `admin123`

> Cambiar la contraseña antes de usarlo en producción. Contactar al proveedor
> para generarla.

### Acceso a la base de datos

- Clave de la base de datos: `5052003` (usuario `ventas`, base `registro_ventas`).
- Consola SQL dentro del contenedor:

  ```bash
  docker compose exec db psql -U ventas -d registro_ventas
  ```

- Con un cliente gráfico (pgAdmin/DBeaver): el puerto 5432 no está expuesto por
  defecto. Si se necesita, agregar `ports: ["5432:5432"]` al servicio `db` del
  `docker-compose.yml` y reconectar el stack con `docker compose up -d`. Luego
  conectar a `localhost:5432` con usuario `ventas` y clave `5052003`.

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

## 7. Historial de acciones

El sistema registra automáticamente cada acción de ventas (crear, editar, eliminar y capturas en lote) en el historial.

- Pantalla: `http://localhost/historial`
- Filtros disponibles: acción, entidad y rango de fechas.
- Exportar a Excel: botón **Exportar Excel** en la pantalla de historial.
- Limpieza automática: todos los días a medianoche se borra el historial con más de 3 días de antigüedad.
- Limpieza manual desde la pantalla: botón **Limpiar (>3 días)**.

## 8. Respaldos

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

## 9. Si el puerto 80 está ocupado

Editar el archivo `.env` y cambiar:

```
HTTP_PORT=8080
```

Luego `docker compose down && docker compose up -d` y abrir
`http://localhost:8080/`.
