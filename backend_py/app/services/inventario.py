from decimal import Decimal
from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_
from sqlalchemy.exc import IntegrityError

from app.models import (
    Producto, Lote, StockActual, Movimiento, Almacen,
    CategoriaProducto, Presentacion, Proveedor
)
from app.repositories.inventario import (
    ProductoRepository, LoteRepository, StockActualRepository,
    MovimientoRepository, AlmacenRepository, CategoriaProductoRepository,
    PresentacionRepository, ProveedorRepository
)
from app.schemas import (
    ProductoCreate, ProductoUpdate, LoteCreate, LoteUpdate,
    MovimientoCreate, MovimientoTipo
)
from app.core.config import get_settings


settings = get_settings()


class InventarioService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.producto_repo = ProductoRepository(session)
        self.lote_repo = LoteRepository(session)
        self.stock_repo = StockActualRepository(session)
        self.movimiento_repo = MovimientoRepository(session)
        self.almacen_repo = AlmacenRepository(session)
        self.categoria_repo = CategoriaProductoRepository(session)
        self.presentacion_repo = PresentacionRepository(session)
        self.proveedor_repo = ProveedorRepository(session)

    # Productos
    async def create_producto(self, producto_in: ProductoCreate, usuario_id: int) -> Producto:
        exists = await self.producto_repo.get_by(sku=producto_in.sku)
        if exists:
            raise ValueError(f"SKU {producto_in.sku} ya existe")
        producto = await self.producto_repo.create(producto_in.model_dump())
        await self._auditar("productos", producto.id, "INSERT", None, producto_in.model_dump(), usuario_id)
        return producto

    async def update_producto(self, producto_id: int, producto_in: ProductoUpdate, usuario_id: int) -> Optional[Producto]:
        producto = await self.producto_repo.get(producto_id)
        if not producto:
            return None
        valores_anteriores = {c.name: getattr(producto, c.name) for c in producto.__table__.columns}
        update_data = producto_in.model_dump(exclude_unset=True)
        producto = await self.producto_repo.update(producto, update_data)
        valores_nuevos = {c.name: getattr(producto, c.name) for c in producto.__table__.columns}
        await self._auditar("productos", producto.id, "UPDATE", valores_anteriores, valores_nuevos, usuario_id)
        return producto

    async def delete_producto(self, producto_id: int, usuario_id: int) -> bool:
        producto = await self.producto_repo.get(producto_id)
        if not producto:
            return False
        producto.activo = False
        producto.eliminado_en = datetime.utcnow()
        await self.session.flush()
        await self._auditar("productos", producto.id, "DELETE", {"activo": True}, {"activo": False}, usuario_id)
        return True

    # Lotes
    async def create_lote(self, lote_in: LoteCreate, usuario_id: int) -> Lote:
        costo_por_kilo = lote_in.costo_total / lote_in.kilos_recibidos if lote_in.kilos_recibidos > 0 else Decimal("0")
        lote_data = lote_in.model_dump()
        lote_data["costo_por_kilo"] = costo_por_kilo.quantize(Decimal("0.0001"))
        lote = await self.lote_repo.create(lote_data)
        
        # Create entrada movement
        await self._crear_movimiento_entrada_compra(lote, usuario_id)
        
        return lote

    async def _crear_movimiento_entrada_compra(self, lote: Lote, usuario_id: int) -> Movimiento:
        # Get or create a default almacen for purchases (first active almacen)
        almacen = await self.almacen_repo.get_by(activo=True)
        if not almacen:
            raise ValueError("No hay almacenes activos configurados")
        
        # Get or create product for "sin clasificar" for this variety
        producto_sin_clasificar = await self._get_or_create_sin_clasificar(lote.variedad)
        
        movimiento = Movimiento(
            producto_id=producto_sin_clasificar.id,
            almacen_id=almacen.id,
            lote_id=lote.id,
            tipo=MovimientoTipo.ENTRADA_COMPRA,
            kilos=lote.kilos_recibidos,
            costo_por_kilo=lote.costo_por_kilo,
            usuario_id=usuario_id,
            referencia_tipo="lote",
            referencia_id=lote.id,
            notas=f"Recepción lote {lote.variedad} - {lote.proveedor_id or 'Parcela'}"
        )
        self.session.add(movimiento)
        
        # Update stock
        await self.stock_repo.increment_stock(
            producto_sin_clasificar.id, almacen.id, lote.id, lote.kilos_recibidos
        )
        
        await self.session.flush()
        return movimiento

    async def _get_or_create_sin_clasificar(self, variedad: str) -> Producto:
        # Try to find existing "Sin clasificar" product for this variety
        stmt = select(Producto).where(
            Producto.nombre == f"Papa {variedad} (Sin clasificar)",
            Producto.activo == True
        )
        result = await self.session.execute(stmt)
        producto = result.scalar_one_or_none()
        
        if not producto:
            # Get categoria "Sin clasificar" or first active categoria
            categoria = await self.categoria_repo.get_by(nombre="Sin clasificar")
            if not categoria:
                categorias = await self.categoria_repo.list(activo=True, limit=1)
                if not categorias:
                    raise ValueError("No hay categorías de producto configuradas")
                categoria = categorias[0]
            
            producto = Producto(
                sku=f"SIN-CLAS-{variedad.upper()}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                nombre=f"Papa {variedad} (Sin clasificar)",
                categoria_id=categoria.id,
                costo=Decimal("0"),
                precio_sugerido_kg=Decimal("0"),
                stock_minimo=Decimal("0"),
                activo=True
            )
            self.session.add(producto)
            await self.session.flush()
        
        return producto

    # Stock movements
    async def crear_movimiento(self, mov_in: MovimientoCreate, usuario_id: int) -> Movimiento:
        # Validate stock for salidas
        if mov_in.tipo in [MovimientoTipo.SALIDA_VENTA, MovimientoTipo.SALIDA_CLASIFICACION, 
                          MovimientoTipo.MERMA, MovimientoTipo.TRASLADO_SALIDA]:
            if mov_in.kilos > 0:
                mov_in.kilos = -mov_in.kilos
            
            if not settings.ALLOW_NEGATIVE_STOCK:
                stock = await self.stock_repo.get_stock(
                    mov_in.producto_id, mov_in.almacen_id, mov_in.lote_id or 0
                )
                if not stock or stock.kilos < abs(mov_in.kilos):
                    raise ValueError(f"Stock insuficiente. Disponible: {stock.kilos if stock else 0}, Solicitado: {abs(mov_in.kilos)}")
        
        # For entradas, ensure positive
        if mov_in.tipo in [MovimientoTipo.ENTRADA_COMPRA, MovimientoTipo.ENTRADA_CLASIFICACION, 
                          MovimientoTipo.TRASLADO_ENTRADA, MovimientoTipo.AJUSTE_INVENTARIO]:
            if mov_in.kilos < 0:
                mov_in.kilos = -mov_in.kilos
        
        movimiento = Movimiento(
            **mov_in.model_dump(),
            usuario_id=usuario_id,
            fecha=datetime.utcnow()
        )
        self.session.add(movimiento)
        
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
        
        await self.session.flush()
        return movimiento

    async def ajuste_inventario(
        self,
        producto_id: int,
        almacen_id: int,
        lote_id: Optional[int],
        stock_fisico: Decimal,
        motivo: str,
        usuario_id: int
    ) -> Tuple[Movimiento, Decimal]:
        # Get current stock
        if lote_id:
            stock = await self.stock_repo.get_stock(producto_id, almacen_id, lote_id)
            stock_sistema = stock.kilos if stock else Decimal("0")
        else:
            # Sum across all lotes for this producto/almacen
            stmt = select(func.sum(StockActual.kilos)).where(
                StockActual.producto_id == producto_id,
                StockActual.almacen_id == almacen_id
            )
            result = await self.session.execute(stmt)
            stock_sistema = result.scalar_one_or_none() or Decimal("0")
        
        diferencia = stock_fisico - stock_sistema
        
        if diferencia != 0:
            movimiento = await self.crear_movimiento(MovimientoCreate(
                producto_id=producto_id,
                almacen_id=almacen_id,
                lote_id=lote_id,
                tipo=MovimientoTipo.AJUSTE_INVENTARIO,
                kilos=diferencia,
                notas=f"Ajuste físico: {motivo}"
            ), usuario_id)
        else:
            movimiento = None
        
        return movimiento, diferencia

    # Queries
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

    # Helper
    async def _auditar(self, tabla: str, registro_id: int, accion: str, 
                       valores_anteriores: dict, valores_nuevos: dict, usuario_id: int):
        from app.models import Auditoria
        auditoria = Auditoria(
            tabla=tabla,
            registro_id=registro_id,
            accion=accion,
            valores_anteriores=valores_anteriores,
            valores_nuevos=valores_nuevos,
            usuario_id=usuario_id
        )
        self.session.add(auditoria)