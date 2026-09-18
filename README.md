# Registro de Ventas

Sistema de captura y registro de ventas a granel por clase y calidad.

## Stack

- **Backend:** NestJS (API REST) + `pg` (SQL puro, sin ORM)
- **Base de datos:** PostgreSQL 16+
- **Frontend:** React + AG Grid (Vite + TypeScript)
- **Infraestructura:** Docker + Docker Compose, Caddy como proxy inverso

## Estructura

```
backend/    API REST NestJS
database/   Scripts SQL (esquema + seed)
frontend/   Aplicación React + AG Grid
infra/      Caddy y scripts de despliegue
docs/       Documentación
```

## Despliegue con Docker Compose

```bash
cp .env.example .env      # ajustar JWT_SECRET, SITE_ADDRESS (POSTGRES_PASSWORD fija en 5052003)
docker compose up -d --build
```

Para generar un `.env` con credenciales aleatorias:

```bash
scripts\generar-env.ps1   # Windows
sh scripts/generar-env.sh # Linux / macOS
```

Servicios: `db` (PostgreSQL 16), `backend` (NestJS), `frontend` (SPA servida por
nginx) y `caddy` (proxy inverso en 80/443). El puerto de acceso se controla con
`HTTP_PORT` (por defecto 80).

- Aplicación: `http://localhost/`
- API: `http://localhost/api`

Caddy enruta `/api/*` al backend y todo lo demás a la SPA. La primera vez, `db`
ejecuta `database/init/01-schema.sql` y `02-seed.sql` automáticamente.

```bash
docker compose logs -f backend      # logs
docker compose down                 # detener
docker compose down -v              # detener y borrar datos (reinicia la BD)
```

> Si cambias `POSTGRES_PASSWORD` después del primer arranque, la contraseña del
> volumen no cambia. Ejecuta `docker compose down -v` y vuelve a levantar.

### TLS automático (opcional, requiere dominio)

Caddy emite y renueva el certificado SSL/TLS de Let's Encrypt sin configuración
adicional. Requisitos:

1. Un dominio con registro DNS **tipo A** apuntando a la IP del servidor.
2. Puertos **80** y **443** abiertos y accesibles desde internet.
3. En `.env`:

```bash
SITE_ADDRESS=ventas.tudominio.com
ACME_EMAIL=tu-correo-real@tudominio.com
```

4. Aplicar:

```bash
docker compose up -d
```

Caddy obtiene el certificado en el primer arranque (puede tardar unos segundos).
Mientras no haya dominio, usar `SITE_ADDRESS=:80` (HTTP local).

## Entrega en la laptop del cliente

El modo de entrega es un paquete autocontenido con imágenes Docker
preconstruidas, para que la laptop del cliente no necesite compilar ni acceso a
internet. El cliente solo carga las imágenes y levanta el stack:

```bash
scripts\cargar-imagenes.ps1     # Windows
docker compose up -d
```

Generar el paquete (crea `entrega/` y `registro-ventas-entrega-<fecha>.zip`):

```bash
scripts\empaquetar.ps1
```

El paquete incluye `docker-compose.entrega.yml` (renombrado a
`docker-compose.yml`, sin `build:`), las imágenes (`imagenes/*.tar`), la base de
datos, los scripts de instalación/respaldo y la guía
`docs/entrega/INSTALACION_CLIENTE.md` (copiada como `LEEME.md`). Además, si hay
internet al generar el paquete, descarga el instalador de Docker Desktop a
`instaladores/` para que la laptop del cliente no lo necesite (omitir con
`-SinInstaladorDocker`).

> El paquete de entrega no está generado todavía: el script está listo, se
> ejecuta cuando se decida cerrar la versión.

## Base de datos

Los scripts de `database/init/` se ejecutan automáticamente al crear el contenedor
de PostgreSQL. Para una base existente:

```bash
psql -U <usuario> -d registro_ventas -f database/init/01-schema.sql
psql -U <usuario> -d registro_ventas -f database/init/02-seed.sql
```

Tablas: `roles`, `usuarios`, `compradores`, `clases`, `calidades`,
`historial_precios`, `registros_ventas`.

## Backend

```bash
cd backend
npm install
cp .env.example .env     # ajustar credenciales
npm run start:dev        # desarrollo
npm run build            # compilar
npm run start:prod       # producción
```

API en `http://localhost:3000/api`.

### Autenticación

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"admin123"}'
```

Usar el `accessToken` como `Authorization: Bearer <token>`.

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxy /api -> http://localhost)
npm run build      # typecheck (tsc --noEmit) + build de producción
npm run preview    # previsualizar el build
```

En desarrollo, Vite hace proxy de `/api` hacia `http://localhost` (puerto 80,
Caddy), por lo que el backend debe estar corriendo.

### Pantallas

- **Login** (`/login`): autenticación con JWT (token en `localStorage`).
- **Registros** (`/`): KPIs del día, captura tipo hoja de cálculo con AG Grid
  (comprador, clase, calidad, bolsas, kilos, precio, último precio y total
  calculado), guardado en lote, y listado de ventas con eliminación.
- La alerta de precio (variación > 20%) abre un modal de confirmación; al
  confirmar se reenvía la captura con `confirmarPrecioAnomalo: true`.

### Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/login` | Inicio de sesión |
| GET | `/api/auth/me` | Usuario autenticado |
| GET | `/api/compradores` | Catálogo de compradores |
| GET | `/api/clases` | Catálogo de clases |
| GET | `/api/calidades` | Catálogo de calidades |
| GET | `/api/historial-precios/sugerencia?claseId=&calidadId=&precio=` | Último precio y variación |
| GET | `/api/registros-ventas?fecha=&compradorId=&sucursal=` | Listado de ventas |
| POST | `/api/registros-ventas` | Crear venta |
| POST | `/api/registros-ventas/bulk` | Crear ventas en lote (transaccional) |
| PATCH | `/api/registros-ventas/:id` | Editar venta |
| DELETE | `/api/registros-ventas/:id` | Eliminar venta |
| GET | `/api/reportes/kpis?fecha=&sucursal=` | KPIs del dashboard |

### Regla de negocio: alerta de precio

Al registrar una venta se compara el precio contra el último de
`historial_precios` para la misma clase y calidad. Si la variación supera
`PRICE_ALERT_THRESHOLD` (20% por defecto), la API responde `422` con
`requiereConfirmacion: true`. Para confirmar, reenviar con
`confirmarPrecioAnomalo: true`. Al guardar se actualiza `historial_precios`
si el precio cambió.

## Credenciales por defecto

- Usuario: `admin`
- Contraseña: `admin123` (cambiar en producción)

## Estado

- [x] Esquema y seed de base de datos
- [x] API backend (auth, catálogos, ventas, historial de precios, reportes)
- [x] docker-compose del stack completo (db + backend + frontend + caddy)
- [x] Frontend React + AG Grid
- [x] Scripts de configuración, respaldo y restauración
- [x] Empaquetado para laptop del cliente (listo, sin ejecutar)
- [ ] Despliegue en VPS con dominio
