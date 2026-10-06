from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.stock.models import StockActual, Movimiento, AjusteInventario


class StockActualRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

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
                from app.core.exceptions import InsufficientStockError
                raise InsufficientStockError(
                    available=0,
                    requested=float(kilos),
                    product_name=f"producto_{producto_id}"
                )
        else:
            if not allow_negative and stock.kilos < kilos:
                from app.core.exceptions import InsufficientStockError
                raise InsufficientStockError(
                    available=float(stock.kilos),
                    requested=float(kilos),
                    product_name=f"producto_{producto_id}"
                )
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


class MovimientoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, movimiento_data: dict) -> Movimiento:
        movimiento = Movimiento(**movimiento_data)
        self.session.add(movimiento)
        await self.session.flush()
        await self.session.refresh(movimiento)
        return movimiento

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

    async def get_movimientos_reporte(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        producto_id: Optional[int] = None,
        almacen_id: Optional[int] = None,
        lote_id: Optional[int] = None,
        tipo: Optional[str] = None,
        usuario_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[dict]:
        stmt = text("""
            SELECT 
                m.id, m.fecha, m.tipo,
                p.sku as producto_sku, p.nombre as producto_nombre,
                a.nombre as almacen_nombre,
                l.variedad as lote_variedad,
                m.kilos, m.costo_por_kilo,
                u.email as usuario_nombre,
                m.referencia_tipo, m.referencia_id
            FROM movimientos m
            JOIN productos p ON p.id = m.producto_id
            JOIN almacenes a ON a.id = m.almacen_id
            LEFT JOIN lotes l ON l.id = m.lote_id
            JOIN usuarios u ON u.id = m.usuario_id
            WHERE 1=1
        """)
        params = {}
        
        if fecha_desde:
            stmt += text(" AND m.fecha >= :fecha_desde")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            stmt += text(" AND m.fecha <= :fecha_hasta")
            params["fecha_hasta"] = fecha_hasta
        if producto_id:
            stmt += text(" AND m.producto_id = :producto_id")
            params["producto_id"] = producto_id
        if almacen_id:
            stmt += text(" AND m.almacen_id = :almacen_id")
            params["almacen_id"] = almacen_id
        if lote_id:
            stmt += text(" AND m.lote_id = :lote_id")
            params["lote_id"] = lote_id
        if tipo:
            stmt += text(" AND m.tipo = :tipo")
            params["tipo"] = tipo
        if usuario_id:
            stmt += text(" AND m.usuario_id = :usuario_id")
            params["usuario_id"] = usuario_id
        
        stmt += text(" ORDER BY m.fecha DESC LIMIT :limit OFFSET :skip")
        params["limit"] = limit
        params["skip"] = skip
        
        result = await self.session.execute(stmt, params)
        return list(result.mappings().all())


class AjusteInventarioRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, ajuste_data: dict) -> AjusteInventario:
        ajuste = AjusteInventario(**ajuste_data)
        self.session.add(ajuste)
        await self.session.flush()
        await self.session.refresh(ajuste)
        return ajuste