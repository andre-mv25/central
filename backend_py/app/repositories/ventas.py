from decimal import Decimal
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, func, text, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Comprador, Venta, VentaLinea, Movimiento
)
from app.repositories.base import BaseRepository
from app.schemas import CompradorCreate, CompradorUpdate, VentaCreate, VentaLineaCreate


class CompradorRepository(BaseRepository[Comprador]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Comprador)

    async def get_by_nombre(self, nombre: str) -> Optional[Comprador]:
        stmt = select(Comprador).where(
            Comprador.nombre.ilike(nombre),
            Comprador.activo == True
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(self, q: str, limit: int = 20) -> List[Comprador]:
        stmt = select(Comprador).where(
            Comprador.activo == True
        ).where(
            Comprador.nombre.ilike(f"%{q}%")
        ).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search_trgm(self, q: str, limit: int = 20) -> List[Comprador]:
        stmt = text("""
            SELECT * FROM compradores
            WHERE activo = true AND nombre % :q
            ORDER BY similarity(nombre, :q) DESC
            LIMIT :limit
        """)
        result = await self.session.execute(stmt, {"q": q, "limit": limit})
        return list(result.mappings().all())


class VentaRepository(BaseRepository[Venta]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, Venta)

    async def get_with_lineas(self, venta_id: int) -> Optional[Venta]:
        stmt = select(Venta).options(
            selectinload(Venta.lineas).selectinload(VentaLinea.producto),
            selectinload(Venta.lineas).selectinload(VentaLinea.lote),
            selectinload(Venta.comprador)
        ).where(Venta.id == venta_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_with_filters(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        comprador_id: Optional[int] = None,
        usuario_id: Optional[int] = None,
        estado: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Venta]:
        stmt = select(Venta).options(
            selectinload(Venta.comprador)
        )
        if fecha_desde:
            stmt = stmt.where(Venta.fecha >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(Venta.fecha <= fecha_hasta)
        if comprador_id:
            stmt = stmt.where(Venta.comprador_id == comprador_id)
        if usuario_id:
            stmt = stmt.where(Venta.usuario_id == usuario_id)
        if estado:
            stmt = stmt.where(Venta.estado == estado)
        stmt = stmt.order_by(Venta.fecha.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_with_filters(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        comprador_id: Optional[int] = None,
        usuario_id: Optional[int] = None,
        estado: Optional[str] = None,
    ) -> int:
        stmt = select(func.count(Venta.id))
        if fecha_desde:
            stmt = stmt.where(Venta.fecha >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(Venta.fecha <= fecha_hasta)
        if comprador_id:
            stmt = stmt.where(Venta.comprador_id == comprador_id)
        if usuario_id:
            stmt = stmt.where(Venta.usuario_id == usuario_id)
        if estado:
            stmt = stmt.where(Venta.estado == estado)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_ventas_por_producto(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> List[dict]:
        stmt = text("""
            SELECT 
                p.id as producto_id, p.sku, p.nombre, cp.nombre as categoria,
                SUM(vl.kilos) as kilos_vendidos,
                SUM(vl.total_linea) as total_ventas,
                AVG(vl.precio_por_kilo) as precio_promedio_kg,
                COUNT(DISTINCT v.id) as num_ventas
            FROM ventas_lineas vl
            JOIN ventas v ON v.id = vl.venta_id
            JOIN productos p ON p.id = vl.producto_id
            JOIN categorias_producto cp ON cp.id = p.categoria_id
            WHERE v.estado = 'completada'
        """)
        params = {}
        if fecha_desde:
            stmt += text(" AND v.fecha >= :fecha_desde")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            stmt += text(" AND v.fecha <= :fecha_hasta")
            params["fecha_hasta"] = fecha_hasta
        stmt += text(" GROUP BY p.id, p.sku, p.nombre, cp.nombre ORDER BY kilos_vendidos DESC")
        result = await self.session.execute(stmt, params)
        return list(result.mappings().all())

    async def get_ventas_por_comprador(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> List[dict]:
        stmt = text("""
            SELECT 
                c.id as comprador_id, c.nombre, c.telefono,
                SUM(vl.kilos) as kilos_comprados,
                SUM(v.total) as total_compras,
                COUNT(DISTINCT v.id) as num_ventas,
                MAX(v.fecha) as ultima_compra
            FROM ventas v
            JOIN compradores c ON c.id = v.comprador_id
            JOIN ventas_lineas vl ON vl.venta_id = v.id
            WHERE v.estado = 'completada' AND v.comprador_id IS NOT NULL
        """)
        params = {}
        if fecha_desde:
            stmt += text(" AND v.fecha >= :fecha_desde")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            stmt += text(" AND v.fecha <= :fecha_hasta")
            params["fecha_hasta"] = fecha_hasta
        stmt += text(" GROUP BY c.id, c.nombre, c.telefono ORDER BY total_compras DESC")
        result = await self.session.execute(stmt, params)
        return list(result.mappings().all())


class VentaLineaRepository(BaseRepository[VentaLinea]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, VentaLinea)