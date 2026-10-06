from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.lots.models import Proveedor, Lote


class ProveedorRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, proveedor_id: int) -> Optional[Proveedor]:
        stmt = select(Proveedor).where(Proveedor.id == proveedor_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_nombre(self, nombre: str) -> Optional[Proveedor]:
        stmt = select(Proveedor).where(Proveedor.nombre == nombre)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(self, activo: Optional[bool] = True, skip: int = 0, limit: int = 100) -> List[Proveedor]:
        stmt = select(Proveedor)
        if activo is not None:
            stmt = stmt.where(Proveedor.activo == activo)
        stmt = stmt.order_by(Proveedor.id).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search(self, q: str, limit: int = 20) -> List[Proveedor]:
        stmt = select(Proveedor).where(
            Proveedor.activo == True
        ).where(
            Proveedor.nombre.ilike(f"%{q}%")
        ).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: dict) -> Proveedor:
        prov = Proveedor(**data)
        self.session.add(prov)
        await self.session.flush()
        await self.session.refresh(prov)
        return prov

    async def update(self, proveedor: Proveedor, data: dict) -> Proveedor:
        for field, value in data.items():
            setattr(proveedor, field, value)
        await self.session.flush()
        await self.session.refresh(proveedor)
        return proveedor


class LoteRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, lote_id: int) -> Optional[Lote]:
        stmt = select(Lote).where(Lote.id == lote_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        activo: Optional[bool] = True,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Lote]:
        stmt = select(Lote)
        if activo is not None:
            stmt = stmt.where(Lote.activo == activo)
        stmt = stmt.order_by(Lote.id).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

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

    async def get_fifo_for_producto(
        self, 
        producto_id: int, 
        almacen_id: int, 
        cantidad: Decimal
    ) -> List[dict]:
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

    async def create(self, data: dict) -> Lote:
        lote = Lote(**data)
        self.session.add(lote)
        await self.session.flush()
        await self.session.refresh(lote)
        return lote

    async def update(self, lote: Lote, data: dict) -> Lote:
        for field, value in data.items():
            setattr(lote, field, value)
        await self.session.flush()
        await self.session.refresh(lote)
        return lote