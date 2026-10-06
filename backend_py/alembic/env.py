from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.core.database import Base
from app.core.config import get_settings

# Import all models to register them with Base.metadata
from app.modules.auth.models import User, Role
from app.modules.products.models import Producto, CategoriaProducto, Presentacion, Almacen
from app.modules.lots.models import Proveedor, Lote
from app.modules.stock.models import StockActual, Movimiento, AjusteInventario
from app.modules.classification.models import (
    CriterioClasificacion, CategoriaClasificacion,
    OrdenClasificacion, OrdenClasificacionLinea
)
from app.modules.sales.models import Comprador, Venta, VentaLinea
from app.modules.audit.models import Auditoria

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = get_settings().DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_settings().DATABASE_URL.replace("postgresql+psycopg2", "postgresql+psycopg")
    
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio
    import sys
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_migrations_online())