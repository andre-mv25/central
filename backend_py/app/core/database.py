from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql+psycopg2", "postgresql+psycopg"),
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    # Import all models to register them with Base
    from app.modules.auth.models import User, Role
    from app.modules.products.models import Producto, CategoriaProducto, Presentacion, Almacen
    from app.modules.lots.models import Proveedor, Lote
    from app.modules.stock.models import StockActual, Movimiento, AjusteInventario
    from app.modules.classification.models import (
        CriterioClasificacion, CategoriaClasificacion,
        OrdenClasificacion, OrdenClasificacionLinea
    )
    from app.modules.sales.models import Comprador, Venta, VentaLinea
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)