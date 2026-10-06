from decimal import Decimal
from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, or_
from sqlalchemy.orm import selectinload

from app.models import (
    Comprador, Venta, VentaLinea, Movimiento, Producto, Lote, StockActual
)
from app.repositories.ventas import (
    CompradorRepository, VentaRepository, VentaLineaRepository
)
from app.repositories.inventario import (
    ProductoRepository, StockActualRepository, LoteRepository
)
from app.schemas import (
    CompradorCreate, CompradorUpdate, VentaCreate, VentaRapidaCreate,
    VentaRapidaLineaInput, VentaLineaCreate
)
from app.core.config import get_settings


settings = get_settings()


class VentasService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.comprador_repo = CompradorRepository(session)
        self.venta_repo = VentaRepository(session)
        self.venta_linea_repo = VentaLineaRepository(session)
        self.producto_repo = ProductoRepository(session)
        self.stock_repo = StockActualRepository(session)
        self.lote_repo = LoteRepository(session)

    # Compradores
    async def create_comprador(self, comprador_in: CompradorCreate) -> Comprador:
        existing = await self.comprador_repo.get_by(nombre=comprador_in.nombre)
        if existing:
            raise ValueError(f"Comprador {comprador_in.nombre} ya existe")
        return await self.comprador_repo.create(comprador_in.model_dump())

    async def get_or_create_comprador(self, nombre: str) -> Comprador:
        comprador = await self.comprador_repo.get_by(nombre=nombre)
        if not comprador:
            comprador = await self.comprador_repo.create({"nombre": nombre, "activo": True})
        return comprador

    async def search_compradores(self, q: str, limit: int = 20) -> List[Comprador]:
        return await self.comprador_repo.search_trgm(q, limit)

    # Ventas normales
    async def create_venta(self, venta_in: VentaCreate, usuario_id: int) -> Venta:
        # Validate stock for all lines
        for linea in venta_in.lineas:
            if not await self._validar_stock_linea(linea):
                raise ValueError(f"Stock insuficiente para producto {linea.producto_id}")
        
        # Create venta
        total = sum(l.kilos * l.precio_por_kilo for l in venta_in.lineas)
        venta = Venta(
            comprador_id=venta_in.comprador_id,
            usuario_id=usuario_id,
            total=total,
            estado="completada"
        )
        self.session.add(venta)
        await self.session.flush()
        
        # Create lineas and movements
        for linea_in in venta_in.lineas:
            await self._procesar_linea_venta(venta.id, linea_in, usuario_id)
        
        await self.session.flush()
        return await self.venta_repo.get_with_lineas(venta.id)

    async def _validar_stock_linea(self, linea: VentaLineaCreate) -> bool:
        if linea.lote_id:
            stock = await self.stock_repo.get_stock(linea.producto_id, 1, linea.lote_id)  # TODO: almacen_id from context
            return stock and stock.kilos >= linea.kilos
        else:
            # Check total stock across lotes
            stocks = await self.stock_repo.get_stock_by_producto(linea.producto_id)
            total = sum(s["kilos"] for s in stocks)
            return total >= linea.kilos

    async def _procesar_linea_venta(
        self,
        venta_id: int,
        linea_in: VentaLineaCreate,
        usuario_id: int
    ) -> VentaLinea:
        # Determine lote using FIFO if not specified
        lote_id = linea_in.lote_id
        almacen_id = 1  # TODO: get from context/config
        
        if not lote_id:
            # FIFO: get oldest lotes first
            lotes_fifo = await self.lote_repo.get_fifo_for_producto(
                linea_in.producto_id, almacen_id, linea_in.kilos
            )
            for lote_info in lotes_fifo:
                if linea_in.kilos <= 0:
                    break
                disponible = lote_info["stock_disponible"]
                a_descontar = min(linea_in.kilos, disponible)
                if a_descontar > 0:
                    lote_id = lote_info["id"]
                    await self.stock_repo.decrement_stock(
                        linea_in.producto_id, almacen_id, lote_id, a_descontar,
                        allow_negative=settings.ALLOW_NEGATIVE_STOCK
                    )
                    # Create movement
                    movimiento = Movimiento(
                        producto_id=linea_in.producto_id,
                        almacen_id=almacen_id,
                        lote_id=lote_id,
                        tipo="salida_venta",
                        kilos=-a_descontar,
                        costo_por_kilo=lote_info["costo_por_kilo"],
                        usuario_id=usuario_id,
                        referencia_tipo="venta",
                        referencia_id=venta_id,
                        notas=f"Venta #{venta_id}"
                    )
                    self.session.add(movimiento)
                    linea_in.kilos -= a_descontar
        else:
            # Specific lote
            await self.stock_repo.decrement_stock(
                linea_in.producto_id, almacen_id, lote_id, linea_in.kilos,
                allow_negative=settings.ALLOW_NEGATIVE_STOCK
            )
            # Get costo for movement
            lote = await self.lote_repo.get(lote_id)
            movimiento = Movimiento(
                producto_id=linea_in.producto_id,
                almacen_id=almacen_id,
                lote_id=lote_id,
                tipo="salida_venta",
                kilos=-linea_in.kilos,
                costo_por_kilo=lote.costo_por_kilo if lote else None,
                usuario_id=usuario_id,
                referencia_tipo="venta",
                referencia_id=venta_id,
                notas=f"Venta #{venta_id}"
            )
            self.session.add(movimiento)
        
        # Create venta linea
        linea = VentaLinea(
            venta_id=venta_id,
            producto_id=linea_in.producto_id,
            lote_id=lote_id,
            kilos=linea_in.kilos,
            presentacion=linea_in.presentacion,
            unidades=linea_in.unidades,
            precio_por_kilo=linea_in.precio_por_kilo,
            total_linea=linea_in.kilos * linea_in.precio_por_kilo
        )
        self.session.add(linea)
        return linea

    # Venta rápida (mostrador)
    async def create_venta_rapida(self, venta_in: VentaRapidaCreate, usuario_id: int) -> Venta:
        # Handle comprador
        comprador_id = venta_in.comprador_id
        if not comprador_id and venta_in.comprador_nombre:
            comprador = await self.get_or_create_comprador(venta_in.comprador_nombre)
            comprador_id = comprador.id
        
        # Validate all lines first
        for linea in venta_in.lineas:
            if not await self._validar_stock_rapida(linea):
                producto = await self.producto_repo.get(linea.producto_id)
                raise ValueError(f"Stock insuficiente para {producto.nombre if producto else linea.producto_id}")
        
        # Create venta
        total = sum(
            (l.total_linea if l.total_linea else l.kilos * (l.precio_por_kilo or 0))
            for l in venta_in.lineas
        )
        venta = Venta(
            comprador_id=comprador_id,
            usuario_id=usuario_id,
            total=total,
            estado="completada"
        )
        self.session.add(venta)
        await self.session.flush()
        
        # Process each line
        for linea_in in venta_in.lineas:
            await self._procesar_linea_rapida(venta.id, linea_in, usuario_id)
        
        await self.session.flush()
        return await self.venta_repo.get_with_lineas(venta.id)

    async def _validar_stock_rapida(self, linea: VentaRapidaLineaInput) -> bool:
        stocks = await self.stock_repo.get_stock_by_producto(linea.producto_id)
        total = sum(s["kilos"] for s in stocks)
        return total >= linea.kilos

    async def _procesar_linea_rapida(
        self,
        venta_id: int,
        linea_in: VentaRapidaLineaInput,
        usuario_id: int
    ) -> VentaLinea:
        almacen_id = 1  # TODO: from config
        kilos = linea_in.kilos
        precio = linea_in.precio_por_kilo
        total = linea_in.total_linea or (kilos * (precio or 0))
        
        if precio is None or precio == 0:
            # Get suggested price
            producto = await self.producto_repo.get(linea_in.producto_id)
            precio = producto.precio_sugerido_kg if producto else Decimal("0")
        
        # FIFO deduction
        lotes_fifo = await self.lote_repo.get_fifo_for_producto(linea_in.producto_id, almacen_id, kilos)
        kilos_restantes = kilos
        
        for lote_info in lotes_fifo:
            if kilos_restantes <= 0:
                break
            disponible = lote_info["stock_disponible"]
            a_descontar = min(kilos_restantes, disponible)
            if a_descontar > 0:
                lote_id = lote_info["id"]
                await self.stock_repo.decrement_stock(
                    linea_in.producto_id, almacen_id, lote_id, a_descontar,
                    allow_negative=settings.ALLOW_NEGATIVE_STOCK
                )
                movimiento = Movimiento(
                    producto_id=linea_in.producto_id,
                    almacen_id=almacen_id,
                    lote_id=lote_id,
                    tipo="salida_venta",
                    kilos=-a_descontar,
                    costo_por_kilo=lote_info["costo_por_kilo"],
                    usuario_id=usuario_id,
                    referencia_tipo="venta",
                    referencia_id=venta_id,
                    notas=f"Venta rápida #{venta_id}"
                )
                self.session.add(movimiento)
                kilos_restantes -= a_descontar
        
        if kilos_restantes > 0 and not settings.ALLOW_NEGATIVE_STOCK:
            raise ValueError("Stock insuficiente durante procesamiento FIFO")
        
        linea = VentaLinea(
            venta_id=venta_id,
            producto_id=linea_in.producto_id,
            lote_id=lotes_fifo[0]["id"] if lotes_fifo else None,
            kilos=kilos,
            presentacion=linea_in.presentacion,
            unidades=linea_in.unidades,
            precio_por_kilo=precio,
            total_linea=total
        )
        self.session.add(linea)
        return linea

    # Anular venta
    async def anular_venta(self, venta_id: int, usuario_id: int, motivo: str = "") -> Venta:
        venta = await self.venta_repo.get_with_lineas(venta_id)
        if not venta:
            raise ValueError("Venta no encontrada")
        if venta.estado == "anulada":
            raise ValueError("Venta ya anulada")
        
        # Create reverse movements for each line
        for linea in venta.lineas:
            if linea.lote_id:
                await self.stock_repo.increment_stock(
                    linea.producto_id, 1, linea.lote_id, linea.kilos
                )
                movimiento = Movimiento(
                    producto_id=linea.producto_id,
                    almacen_id=1,
                    lote_id=linea.lote_id,
                    tipo="entrada_ajuste",  # Reverse of salida_venta
                    kilos=linea.kilos,
                    costo_por_kilo=linea.lote.costo_por_kilo if linea.lote else None,
                    usuario_id=usuario_id,
                    referencia_tipo="anulacion_venta",
                    referencia_id=venta_id,
                    notas=f"Anulación venta #{venta_id}: {motivo}"
                )
                self.session.add(movimiento)
        
        venta.estado = "anulada"
        venta.anulada_en = datetime.utcnow()
        venta.anulada_por_id = usuario_id
        await self.session.flush()
        return venta

    # Reports
    async def get_ventas_reporte(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        comprador_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Venta], int]:
        ventas = await self.venta_repo.list_with_filters(
            fecha_desde, fecha_hasta, comprador_id, None, "completada", skip, limit
        )
        total = await self.venta_repo.count_with_filters(
            fecha_desde, fecha_hasta, comprador_id, None, "completada"
        )
        return ventas, total

    async def get_ventas_por_producto(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> List[dict]:
        return await self.venta_repo.get_ventas_por_producto(fecha_desde, fecha_hasta)

    async def get_ventas_por_comprador(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> List[dict]:
        return await self.venta_repo.get_ventas_por_comprador(fecha_desde, fecha_hasta)