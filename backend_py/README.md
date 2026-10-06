# Inventario Papa - Backend API

Sistema de inventario para negocio de papa (tienda + producción) construido con FastAPI, SQLAlchemy 2.x y PostgreSQL 16+.

## Stack Tecnológico

- **Backend**: Python 3.12, FastAPI 0.115
- **ORM**: SQLAlchemy 2.x (async)
- **Migraciones**: Alembic
- **Validación**: Pydantic v2
- **Auth**: JWT + bcrypt
- **Base de datos**: PostgreSQL 16+ con extensiones pg_trgm, pgcrypto
- **Contenedores**: Docker Compose

## Requisitos

- Docker y Docker Compose
- O Python 3.12+ para desarrollo local

## Inicio Rápido con Docker

```bash
# Clonar y entrar al directorio
cd backend_py

# Copiar variables de entorno
cp .env.example .env

# Levantar servicios
docker-compose up -d --build

# Ejecutar migraciones
docker-compose exec backend alembic upgrade head

# Cargar datos de prueba
docker-compose exec backend python scripts/seed.py
```

La API estará disponible en http://localhost:8000
Documentación Swagger en http://localhost:8000/docs

## Desarrollo Local

```bash
# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Ejecutar migraciones
alembic upgrade head

# Cargar datos de prueba
python scripts/seed.py

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Estructura del Proyecto

```
backend_py/
├── alembic/                 # Migraciones de base de datos
├── app/
│   ├── api/
│   │   ├── v1/             # Endpoints de la API v1
│   │   └── deps.py         # Dependencias FastAPI
│   ├── core/
│   │   └── config.py       # Configuración Pydantic Settings
│   ├── db/
│   │   └── session.py      # Sesión DB async SQLAlchemy
│   ├── models/             # Modelos SQLAlchemy
│   ├── schemas/            # Esquemas Pydantic
│   ├── services/           # Lógica de negocio
│   └── repositories/       # Acceso a datos
├── scripts/
│   └── seed.py             # Datos de prueba
├── tests/                  # Pruebas automatizadas
├── requirements.txt
├── pyproject.toml
├── Dockerfile
└── .env.example
```

## Endpoints Principales

### Autenticación
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro (admin)
- `GET /api/v1/auth/me` - Usuario actual

### Inventario
- `GET/POST /api/v1/inventario/productos` - CRUD productos
- `GET /api/v1/inventario/productos/search?q=` - Búsqueda con pg_trgm
- `GET /api/v1/inventario/productos/{id}/stock` - Stock por almacén/lote
- `GET/POST /api/v1/inventario/lotes` - CRUD lotes
- `POST /api/v1/inventario/movimientos` - Crear movimiento
- `GET /api/v1/inventario/stock/bajo` - Alertas stock mínimo
- `GET /api/v1/inventario/stock/valor` - Valorización inventario

### Ventas
- `POST /api/v1/ventas/rapida` - Venta rápida mostrador (FIFO automático)
- `POST /api/v1/ventas` - Venta normal
- `POST /api/v1/ventas/{id}/anular` - Anular venta (movimientos inversos)
- `GET /api/v1/ventas/compradores/search?q=` - Autocompletado compradores
- `GET /api/v1/ventas/reportes/...` - Reportes de ventas

### Clasificación
- `GET/POST /api/v1/clasificacion/criterios` - Criterios configurables
- `GET /api/v1/clasificacion/categorias/by-criterio/{id}` - Categorías por criterio
- `POST /api/v1/clasificacion/ordenes` - Crear orden (validación balance)
- `GET /api/v1/clasificacion/ordenes/{id}/balance` - Ver balance en vivo
- `POST /api/v1/clasificacion/ordenes/{id}/cerrar` - Cerrar (genera movimientos)
- `GET /api/v1/clasificacion/reportes/rendimiento/{lote_id}` - Rendimiento por lote

### Reportes
- `GET /api/v1/reportes/dashboard` - Dashboard principal
- `GET /api/v1/reportes/ventas` - Ventas con filtros
- `GET /api/v1/reportes/ventas/por-producto` - Ventas por producto
- `GET /api/v1/reportes/ventas/por-comprador` - Ventas por comprador
- `GET /api/v1/reportes/inventario/valorizacion` - Valorización stock
- `GET /api/v1/reportes/movimientos` - Movimientos con filtros
- `GET /api/v1/reportes/auditoria` - Auditoría de cambios

## Modelo de Datos

Ver `alembic/versions/001_initial_schema.py` para el esquema completo.

Tablas principales:
- `usuarios`, `roles` - Auth y autorización
- `productos`, `categorias_producto`, `presentaciones`, `almacenes` - Catálogo
- `proveedores`, `lotes` - Trazabilidad entrada
- `stock_actual` - Stock por (producto, almacén, lote) - **actualizado en misma transacción**
- `movimientos` - Ledger inmutable (particionable por fecha)
- `compradores`, `ventas`, `ventas_lineas` - Ventas con FIFO por lote
- `criterios_clasificacion`, `categorias_clasificacion` - Clasificación configurable
- `ordenes_clasificacion`, `ordenes_clasificacion_lineas` - Proceso clasificación con balance
- `ajustes_inventario` - Conteos físicos
- `auditoria` - Trazabilidad cambios maestros

## Principios de Diseño

1. **Stock solo via movimientos**: Nunca se edita `stock_actual` a mano. Cada cambio es un `movimiento` que actualiza `stock_actual` en la misma transacción con `SELECT FOR UPDATE`.

2. **Todo en kilos**: Bolsas, cajas, sacos son solo presentaciones informativas.

3. **Soft delete**: Campos `activo` + `eliminado_en`, sin borrados duros.

4. **FIFO automático**: Ventas descuentan del lote más antiguo primero, con opción manual.

5. **Balance de clasificación**: `kilos_entrada = sum(kilos_clasificados) + kilos_merma`. No se cierra si no cuadra (tolerancia configurable).

6. **Reparto de costo**: Por peso o precio relativo, configurable por orden.

7. **Búsqueda tolerante**: pg_trgm en nombres, SKU, códigos de barras.

## Pruebas

```bash
# Ejecutar tests
pytest tests/ -v

# Con coverage
pytest tests/ --cov=app --cov-report=html
```

## Migraciones

```bash
# Crear nueva migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Ver historial
alembic history
```

## Variables de Entorno Principales

| Variable | Descripción | Default |
|----------|-------------|---------|
| DATABASE_URL | URL PostgreSQL | postgresql+psycopg2://postgres:postgres@db:5432/inventario |
| JWT_SECRET_KEY | Clave firmado JWT | **Cambiar en producción** |
| ALLOW_NEGATIVE_STOCK | Permitir stock negativo | false |
| CLASSIFICATION_TOLERANCE_KG | Tolerancia balance clasificación | 0.5 |

## Licencia

Proyecto privado - Uso interno.