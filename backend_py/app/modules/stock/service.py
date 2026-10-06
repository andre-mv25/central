from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.modules.stock.repository import StockActualRepository, MovimientoRepository, AjusteInventarioRepository
from app.modules.stock.models import Movimiento
from app.modules.stock.schemas import MovimientoCreate, MovimientoTipo, AjusteInventarioCreate
from app.modules.products.service import ProductoService
from app.modules.lots.service import LoteService
from app.modules.auth.models import User
from app.core.config import get_settings
from app.core.exceptions import InsufficientStockError

settings = get_settings()


class StockService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.stock_repo = StockActualRepository(session)
        self.movimiento_repo = MovimientoRepository(session)
        self.ajuste_repo = AjusteInventarioRepository(session)
        self.producto_service = ProductoService(session)
        self.lote_service = LoteService(session)

    async def crear_movimiento(self, mov_in: MovimientoCreate, usuario_id: int) -> Movimiento:
        # Validate stock for salidas
        if mov_in.tipo in [
            MovimientoTipo.SALIDA_VENTA, 
            MovimientoTipo.SALIDA_CLASIFICACION, 
            MovimientoTipo.MERMA, 
            MovimientoTipo.TRASLADO_SALIDA
        ]:
            if mov_in.kilos > 0:
                mov_in.kilos = -mov_in.kilos
            
            if not settings.ALLOW_NEGATIVE_STOCK:
                stock = await self.stock_repo.get_stock(
                    mov_in.producto_id, mov_in.almacen_id, mov_in.lote_id or 0
                )
                if not stock or stock.kilos < abs(mov_in.kilos):
                    raise InsufficientStockError(
                        available=float(stock.kilos) if stock else 0,
                        requested=float(abs(mov_in.kilos)),
                        product_name=f"producto_{mov_in.producto_id}"
                    )
        
        # For entradas, ensure positive
        if mov_in.tipo in [
            MovimientoTipo.ENTRADA_COMPRA, 
            MovimientoTipo.ENTRADA_CLASIFICACION, 
            MovimientoTipo.TRASLADO_ENTRADA, 
            MovimientoTipo.AJUSTE_INVENTARIO
        ]:
            if mov_in.kilos < 0:
                mov_in.kilos = -mov_in.kilos
        
        movimiento = await self.movimiento_repo.create(mov_in.model_dump())
        
        # Update stock_actual
        if mov_in.lote_id:
            if mov_in.kilos > 0:
                await self.stock_repo.increment_stock(
                    mov_in.producto_id, mov_in.almacen_id, mov_in.lote_id, mov_in.kilos
                )
            else:
                await self.stock_repo.decrement_stock(
                    mov_in.producto_id, mov_in.almacen_id, mov_in.lote_id, abs(mov_in.kilos),
                    allow_negative=settings.ALLOW_NEGATIVE_STOCK
                )
        
        return movimiento

    async def ajuste_inventario(
        self,
        ajuste_in: AjusteInventarioCreate,
        usuario_id: int
    ) -> tuple:
        # Get current stock
        if ajuste_in.lote_id:
            stock = await self.stock_repo.get_stock(
                ajuste_in.producto_id, ajuste_in.almacen_id, ajuste_in.lote_id
            )
            stock_sistema = stock.kilos if stock else Decimal("0")
        else:
            stmt = select(func.sum(StockActual.kilos)).where(
                StockActual.producto_id == ajuste_in.producto_id,
                StockActual.almacen_id == ajuste_in.almacen_id
            )
            result = await self.session.execute(stmt)
            stock_sistema = result.scalar_one_or_none() or Decimal("0")
        
        diferencia = ajuste_in.stock_fisico - stock_sistema
        
        if diferencia != 0:
            mov_in = MovimientoCreate(
                producto_id=ajuste_in.producto_id,
                almacen_id=ajuste_in.almacen_id,
                lote_id=ajuste_in.lote_id,
                tipo=MovimientoTipo.AJUSTE_INVENTARIO,
                kilos=diferencia,
                notas=f"Ajuste físico: {ajuste_in.motivo}"
            )
            movimiento = await self.crear_movimiento(mov_in, usuario_id)
        else:
            movimiento = None
        
        # Record the adjustment
        ajuste = await self.ajuste_repo.create({
            "almacen_id": ajuste_in.almacen_id,
            "producto_id": ajuste_in.producto_id,
            "lote_id": ajuste_in.lote_id,
            "stock_sistema": stock_sistema,
            "stock_fisico": ajuste_in.stock_fisico,
            "diferencia": diferencia,
            "motivo": ajuste_in.motivo,
            "usuario_id": usuario_id,
        })
        
        return movimiento, diferencia

    async def get_stock_producto(self, producto_id: int) -> List[dict]:
        return await self.stock_repo.get_stock_by_producto(producto_id)

    async def get_stock_bajo(self) -> List[dict]:
        return await self.stock_repo.get_stock_bajo()

    async def get_valor_inventario(self) -> Decimal:
        return await self.movimiento_repo.get_valor_inventario()

    async def get_movimientos_producto(
        self,
        producto_id: int,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        almacen_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Movimiento]:
        return await self.movimiento_repo.get_by_producto_fecha(
            producto_id, fecha_desde, fecha_hasta, almacen_id, limit
        )

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
        return await self.movimiento_repo.get_movimientos_reporte(
            fecha_desde, fecha_hasta, producto_id, almacen_id, lote_id, tipo, usuario_id, skip, limit
        )