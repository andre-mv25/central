# Inventario Papa - Sistema de Inventario para Tienda y Producción

Sistema completo de inventario para negocio de papa que combina tienda (venta en mostrador) y producción (clasificación de papa sin clasificar).

## Stack Tecnológico

### Backend (NUEVO - Python/FastAPI)
- **Python 3.12**, FastAPI 0.115
- **SQLAlchemy 2.x** (async) + Alembic (migraciones)
- **Pydantic v2** (validación)
- **JWT + bcrypt** (autenticación)
- **PostgreSQL 16+** con extensiones `pg_trgm`, `pgcrypto`

### Frontend (Existente - React/TypeScript)
- **React 19** + TypeScript + Vite
- **AG Grid** (tablas paginadas server-side)
- **Zustand** (estado global)
- **Axios** + React Router
- Diseño responsivo (tablet/celular en piso, escritorio en mostrador)

### Infraestructura
- **Docker Compose** (db, api, web, caddy)
- Volúmenes persistentes para PostgreSQL
- Caddy como proxy inverso con TLS automático

## Arquitectura del Sistema

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   PostgreSQL    │
│   (React/Vite)  │     │   (FastAPI)     │     │   16+           │
│   Port 5173     │     │   Port 8000     │     │   Port 5432     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                        ┌───────┴───────┐
                        │   Caddy       │
                        │   Port 80/443 │
                        └───────────────┘
```

## Inicio Rápido

### Con Docker Compose (Recomendado)

```bash
# 1. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores seguros (JWT_SECRET_KEY, etc.)

# 2. Levantar stack completo
docker-compose up -d --build

# 3. Ejecutar migraciones
docker-compose exec backend alembic upgrade head

# 4. Cargar datos de prueba
docker-compose exec backend python scripts/seed.py

# 5. Acceder a la aplicación
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
# Health:   http://localhost:8000/health
```

### Desarrollo Local (Backend)

```bash
cd backend_py

# Entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Dependencias
pip install -r requirements.txt

# Configuración
cp .env.example .env
# Editar .env

# Base de datos (requiere PostgreSQL corriendo)
alembic upgrade head
python scripts/seed.py

# Servidor desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Desarrollo Local (Frontend)

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

## Credenciales por Defecto

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | admin |

> **Importante**: Cambiar `JWT_SECRET_KEY` y contraseña de admin en producción.

## Funcionalidades Principales

### 1. Catálogo de Productos
- SKU único, nombre, categoría, unidad base (kg)
- Costo, precio sugerido por kg, stock mínimo
- Búsqueda instantánea tolerante a errores (pg_trgm)
- Presentaciones configurables (bolsa, caja, saco, granel)

### 2. Gestión de Lotes (Trazabilidad)
- Proveedor/parcela, fecha cosecha/recepción, variedad
- Kilos recibidos, costo total → costo por kg automático
- Stock consultable por producto, almacén y lote

### 3. Movimientos y Stock (Ledger Inmutable)
- **Tipos**: entrada compra, salida venta, entrada/salida clasificación, merma, ajuste, traslado
- **Stock nunca se edita a mano**: cada cambio = movimiento + actualización `stock_actual` en misma transacción
- Bloqueo de fila (`SELECT FOR UPDATE`) para evitar condiciones de carrera
- Opción configurable: bloquear/permitir stock negativo
- Alertas de stock mínimo en dashboard

### 4. Clasificación de Papa (Producción)
- Papa entra sin clasificar → se separa en categorías via **orden de clasificación**
- **Criterios configurables**: Calidad, Calibre, Variedad, Mixto (+ los que agregue el usuario)
- **Criterio Mixto**: permite múltiples atributos por línea (JSONB)
- **Balance en vivo**: `kilos_entrada = suma(kilos_clasificados) + merma` con % merma visible
- **No permite cerrar** si no cuadra (tolerancia configurable)
- Al cerrar: genera automáticamente salida (sin clasificar) + entradas (categorías resultado)
- **Reparto de costo**: por peso o precio relativo → costo real por categoría
- **Reporte de rendimiento**: % por categoría y % merma por lote

### 5. Venta Rápida (Pantalla Mostrador - Optimizada <15 seg)
- Una sola vista, flujo por línea optimizado para velocidad
- Buscar producto (muestra categoría + stock disponible)
- Kilos + presentación opcional (informativa) + precio/kg (sugiere último usado)
- Total = kilos × precio/kg (recalcula si se teclea total)
- Comprador con autocompletado + creación al vuelo + "Mostrador" sin nombre
- Múltiples líneas + botón **Cobrar**
- **FIFO automático** por lote (más antiguo primero) con opción manual
- Bloquea si no hay stock (configurable)
- Genera movimientos de salida + actualiza stock en misma transacción
- **Ticket imprimible/compartible**
- **Anulación**: genera movimientos inversos (no borra)
- Atajos de teclado, botones grandes

### 6. Compradores
- Nombre, teléfono, historial de compras
- Preparado para futuro: crédito, saldo pendiente (cuentas por cobrar)

### 7. Inventario Físico y Ajustes
- Conteo guiado por almacén/producto
- Diferencia → movimiento de ajuste con motivo obligatorio

### 8. Reportes y Exportación
- **Dashboard**: stock bajo, ventas día, kilos vendidos, últimos movimientos, valor inventario
- **Reportes**: ventas por rango/fechas/comprador/producto, rendimiento por lote, valorización, movimientos
- **Exportación**: CSV/Excel

### 9. Usuarios y Roles (RBAC)
- JWT auth, roles: admin, almacenista/operario, vendedor, solo lectura
- Cada movimiento/venta registra usuario
- Auditoría de cambios en datos maestros

### 10. Importación Masiva
- CSV/Excel: productos, compradores, stock inicial
- Vista previa + reporte de errores por fila

## Modelo de Datos (Resumen)

### Tablas Principales
| Tabla | Descripción |
|-------|-------------|
| `usuarios`, `roles` | Auth y RBAC |
| `categorias_producto`, `productos`, `presentaciones`, `almacenes` | Catálogo |
| `proveedores`, `lotes` | Entrada y trazabilidad |
| `stock_actual` | **Stock por (producto, almacén, lote)** - actualizado en transacción |
| `movimientos` | **Ledger inmutable** (particionable por fecha) |
| `compradores`, `ventas`, `ventas_lineas` | Ventas con FIFO por lote |
| `criterios_clasificacion`, `categorias_clasificacion` | Clasificación configurable |
| `ordenes_clasificacion`, `ordenes_clasificacion_lineas` | Proceso clasificación |
| `ajustes_inventario` | Conteos físicos |
| `auditoria` | Trazabilidad cambios maestros |

### Convenciones Técnicas
- **PK**: `BIGINT GENERATED ALWAYS AS IDENTITY`
- **Peso**: `NUMERIC(14,3)` | **Dinero**: `NUMERIC(14,2)` | **Precio/kg**: `NUMERIC(12,4)`
- **Fechas**: `TIMESTAMPTZ`
- **Constraints**: `CHECK`, FK explícitas, índices compuestos
- **Soft delete**: `activo` + `eliminado_en`
- **Índices**: GIN pg_trgm (búsqueda), BRIN (fecha movimientos), compuestos (consultas frecuentes)

## Rendimiento y Escala

- **Volumen**: miles de movimientos/día (millones/año)
- **Stock**: `stock_actual` actualizado en transacción con movimiento (`UPDATE ... SET kilos = kilos + x` con lock)
- **Índices críticos**: 
  - `movimientos(producto_id, almacen_id, fecha)`
  - `movimientos(lote_id)` 
  - `movimientos.fecha` (BRIN)
  - `productos.sku` (único)
  - `compradores.nombre` (GIN pg_trgm)
- **Particionado**: `movimientos` preparado para partición por rango de fecha (activar cuando >50M filas)
- **Paginación**: Keyset (cursor) en listados grandes, evitar OFFSET profundo
- **Pool conexiones**: Configurado (10 base, 20 overflow)
- **Vistas materializadas**: Para reportes pesados

## Seguridad y Operación

- Contraseñas: bcrypt (configurable rounds)
- JWT: expiración configurable, algoritmo HS256
- Validación entrada: Pydantic v2 + SQLAlchemy parametrizado (anti-inyección)
- Secrets: Variables de entorno (`.env.example` documentado)
- Backups: `pg_dump` programado + documentación restauración + WAL/PITR
- Logs: Estructurados, errores con mensajes claros al usuario

## Pruebas Automatizadas

```bash
# Backend
cd backend_py
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html

# Tests incluyen:
# - Balance de clasificación
# - Descuento FIFO
# - Concurrencia en ventas simultáneas
# - Anulación de ventas
# - Cálculo de totales
```

## Estructura del Proyecto

```
central/
├── backend_py/           # NUEVO: Backend Python/FastAPI
│   ├── alembic/          # Migraciones
│   ├── app/
│   │   ├── api/v1/       # Endpoints REST
│   │   ├── core/         # Config, seguridad
│   │   ├── db/           # Sesión DB
│   │   ├── models/       # Modelos SQLAlchemy
│   │   ├── schemas/      # Esquemas Pydantic
│   │   ├── services/     # Lógica de negocio
│   │   └── repositories/ # Acceso a datos
│   ├── scripts/seed.py   # Datos de prueba
│   ├── tests/            # Pruebas automatizadas
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/             # Frontend React/TypeScript/Vite
├── database/             # Scripts SQL legacy (referencia)
├── infra/                # Caddy, scripts despliegue
├── docs/                 # Documentación
├── docker-compose.yml    # Stack completo
└── README.md
```

## Variables de Entorno Principales

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg2://postgres:postgres@db:5432/inventario` |
| `JWT_SECRET_KEY` | **Clave secreta JWT (cambiar en prod)** | `change-me-in-production` |
| `ALLOW_NEGATIVE_STOCK` | Permitir stock negativo | `false` |
| `CLASSIFICATION_TOLERANCE_KG` | Tolerancia balance clasificación (kg) | `0.5` |
| `COST_ALLOCATION_METHOD` | Reparto costo: `peso` o `precio_relativo` | `peso` |
| `CORS_ORIGINS` | Orígenes permitidos CORS | `http://localhost:5173,http://localhost:80` |

## Documentación API

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Migraciones de Base de Datos

```bash
# Ver historial
alembic history

# Crear nueva migración (auto-detecta cambios en modelos)
alembic revision --autogenerate -m "descripcion_cambio"

# Aplicar migraciones
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Backup y Restauración

```bash
# Backup
docker-compose exec db pg_dump -U postgres inventario > backup_$(date +%F).sql

# Restaurar
docker-compose exec -T db psql -U postgres inventario < backup_2026-10-04.sql

# WAL/PITR: Configurar archive_mode=on, archive_command en postgresql.conf
```

## Licencia

Proyecto privado - Uso interno.