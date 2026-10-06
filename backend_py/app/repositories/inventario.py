from decimal import Decimal
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, func, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Producto, Lote, StockActual, Movimiento, Almacen, CategoriaProducto,
    Presentacion, Proveedor
)
from app.repositories.base import BaseRepository
from app.schemas import ProductoCreate, ProductoUpdate, LoteCreate, LoteUpdate


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Producto)

    async def get_by_sku(self, sku: str) -> Optional[Producto]:
        stmt = select(Producto).where(Producto.sku == sku)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(self, q: str, limit: int = 20) -> List[Producto]:
        stmt = select(Producto).where(
            Producto.activo == True
        ).where(
            or_(
                Producto.nombre.ilike(f"%{q}%"),
                Producto.sku.ilike(f"%{q}%"),
            )
        ).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search_trgm(self, q: str, limit: int = 20) -> List[Producto]:
        stmt = text("""
            SELECT p.* FROM productos p
            WHERE p.activo = true
            AND (p.nombre % :q OR p.sku % :q)
            ORDER BY similarity(p.nombre, :q) DESC
            LIMIT :limit
        """)
        result = await self.session.execute(stmt, {"q": q, "limit": limit})
        return list(result.mappings().all())

    async def get_with_stock(self, producto_id: int) -> Optional[dict]:
        stmt = text("""
            SELECT 
                p.id, p.sku, p.nombre, p.categoria_id, p.precio_sugerido_kg,
                cp.nombre as categoria_nombre,
                COALESCE(SUM(sa.kilos), 0) as stock_total,
                COALESCE(SUM(sa.kilos), 0) as stock_disponible
            FROM productos p
            LEFT JOIN categorias_producto cp ON cp.id = p.categoria_id
            LEFT JOIN stock_actual sa ON sa.producto_id = p.id
            WHERE p.id = :pid AND p.activo = true
            GROUP BY p.id, cp.nombre
        """)
        result = await self.session.execute(stmt, {"pid": producto_id})
        return result.mappings().first()


class LoteRepository(BaseRepository[Lote]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Lote)

    async def get_with_stock(self, lote_id: int) -> Optional[dict]:
        stmt = text("""
            SELECT 
                l.id, l.variedad, l.fecha_cosecha, l.fecha_recepcion,
                l.kilos_recibidos, l.costo_por_kilo,
                p.nombre as proveedor_nombre,
                COALESCE(SUM(sa.kilos), 0) as stock_actual
            FROM lotes l
            LEFT JOIN proveedores p ON p.id = l.proveedor_id
            LEFT JOIN stock_actual sa ON sa.lote_id = l.id
            WHERE l.id = :lid
            GROUP BY l.id, p.nombre
        """)
        result = await self.session.execute(stmt, {"lid": lote_id})
        return result.mappings().first()

    async def get_fifo_for_producto(self, producto_id: int, almacen_id: int, cantidad: Decimal) -> List[dict]:
        stmt = text("""
            SELECT 
                l.id, l.variedad, l.fecha_cosecha, l.costo_por_kilo,
                sa.kilos as stock_disponible
            FROM stock_actual sa
            JOIN lotes l ON l.id = sa.lote_id
            WHERE sa.producto_id = :pid
            AND sa.almacen_id = :aid
            AND sa.kilos > 0
            AND l.activo = true
            ORDER BY l.fecha_cosecha ASC NULLS LAST, l.id ASC
        """)
        result = await self.session.execute(stmt, {"pid": producto_id, "aid": almacen_id})
        return list(result.mappings().all())


class StockActualRepository(BaseRepository[StockActual]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, StockActual)

    async def get_stock(self, producto_id: int, almacen_id: int, lote_id: int) -> Optional[StockActual]:
        stmt = select(StockActual).where(
            StockActual.producto_id == producto_id,
            StockActual.almacen_id == almacen_id,
            StockActual.lote_id == lote_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def increment_stock(
        self,
        producto_id: int,
        almacen_id: int,
        lote_id: int,
        kilos: Decimal
    ) -> StockActual:
        stock = await self.get_stock(producto_id, almacen_id, lote_id)
        if stock:
            stock.kilos += kilos
            stock.actualizado_en = func.now()
        else:
            stock = StockActual(
                producto_id=producto_id,
                almacen_id=almacen_id,
                lote_id=lote_id,
                kilos=kilos
            )
            self.session.add(stock)
        await self.session.flush()
        return stock

    async def decrement_stock(
        self,
        producto_id: int,
        almacen_id: int,
        lote_id: int,
        kilos: Decimal,
        allow_negative: bool = False
    ) -> StockActual:
        stock = await self.get_stock(producto_id, almacen_id, lote_id)
        if not stock:
            if allow_negative:
                stock = StockActual(
                    producto_id=producto_id,
                    almacen_id=almacen_id,
                    lote_id=lote_id,
                    kilos=-kilos
                )
                self.session.add(stock)
            else:
                raise ValueError(f"Stock insuficiente para producto {producto_id} en almacén {almacen_id} lote {lote_id}")
        else:
            if not allow_negative and stock.kilos < kilos:
                raise ValueError(f"Stock insuficiente: disponible {stock.kilos}, solicitado {kilos}")
            stock.kilos -= kilos
            stock.actualizado_en = func.now()
        await self.session.flush()
        return stock

    async def get_stock_by_producto(self, producto_id: int) -> List[dict]:
        stmt = text("""
            SELECT 
                sa.almacen_id, a.nombre as almacen_nombre,
                sa.lote_id, l.variedad, l.fecha_cosecha,
                sa.kilos
            FROM stock_actual sa
            JOIN almacenes a ON a.id = sa.almacen_id
            JOIN lotes l ON l.id = sa.lote_id
            WHERE sa.producto_id = :pid AND sa.kilos > 0
            ORDER BY a.nombre, l.fecha_cosecha ASC NULLS LAST
        """)
        result = await self.session.execute(stmt, {"pid": producto_id})
        return list(result.mappings().all())

    async def get_stock_bajo(self) -> List[dict]:
        stmt = text("""
            SELECT 
                p.id, p.sku, p.nombre, p.stock_minimo,
                COALESCE(SUM(sa.kilos), 0) as stock_total
            FROM productos p
            LEFT JOIN stock_actual sa ON sa.producto_id = p.id
            WHERE p.activo = true AND p.stock_minimo > 0
            GROUP BY p.id
            HAVING COALESCE(SUM(sa.kilos), 0) <= p.stock_minimo
        """)
        result = await self.session.execute(stmt)
        return list(result.mappings().all())


class MovimientoRepository(BaseRepository[Movimiento]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Movimiento)

    async def get_by_referencia(self, referencia_tipo: str, referencia_id: int) -> List[Movimiento]:
        stmt = select(Movimiento).where(
            Movimiento.referencia_tipo == referencia_tipo,
            Movimiento.referencia_id == referencia_id
        ).order_by(Movimiento.fecha)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_producto_fecha(
        self,
        producto_id: int,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        almacen_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Movimiento]:
        stmt = select(Movimiento).where(Movimiento.producto_id == producto_id)
        if fecha_desde:
            stmt = stmt.where(Movimiento.fecha >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(Movimiento.fecha <= fecha_hasta)
        if almacen_id:
            stmt = stmt.where(Movimiento.almacen_id == almacen_id)
        stmt = stmt.order_by(Movimiento.fecha.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_valor_inventario(self) -> Decimal:
        stmt = text("""
            SELECT COALESCE(SUM(sa.kilos * p.costo), 0) as valor_total
            FROM stock_actual sa
            JOIN productos p ON p.id = sa.producto_id
            WHERE sa.kilos > 0
        """)
        result = await self.session.execute(stmt)
        return result.scalar_one() or Decimal("0")


class AlmacenRepository(BaseRepository[Almacen]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Almacen)


class CategoriaProductoRepository(BaseRepository[CategoriaProducto]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, CategoriaProducto)


class PresentacionRepository(BaseRepository[Presentacion]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Presentacion)


class ProveedorRepository(BaseRepository[Proveedor]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Proveedor)

    async def search(self, q: str, limit: int = 20) -> List[Proveedor]:
        stmt = select(Proveedor).where(
            Proveedor.activo == True
        ).where(
            Proveedor.nombre.ilike(f"%{q}%")
        ).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())