from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlalchemy import select, func, text, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.products.models import Producto, CategoriaProducto, Presentacion, Almacen


class ProductoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, producto_id: int) -> Optional[Producto]:
        stmt = select(Producto).where(Producto.id == producto_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_sku(self, sku: str) -> Optional[Producto]:
        stmt = select(Producto).where(Producto.sku == sku)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        activo: Optional[bool] = True,
    ) -> List[Producto]:
        stmt = select(Producto)
        if activo is not None:
            stmt = stmt.where(Producto.activo == activo)
        stmt = stmt.order_by(Producto.id).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

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

    async def create(self, producto_data: dict) -> Producto:
        producto = Producto(**producto_data)
        self.session.add(producto)
        await self.session.flush()
        await self.session.refresh(producto)
        return producto

    async def update(self, producto: Producto, producto_data: dict) -> Producto:
        for field, value in producto_data.items():
            setattr(producto, field, value)
        await self.session.flush()
        await self.session.refresh(producto)
        return producto

    async def delete(self, producto_id: int) -> bool:
        producto = await self.get(producto_id)
        if not producto:
            return False
        producto.activo = False
        from datetime import datetime
        producto.eliminado_en = datetime.utcnow()
        await self.session.flush()
        return True


class CategoriaProductoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, categoria_id: int) -> Optional[CategoriaProducto]:
        stmt = select(CategoriaProducto).where(CategoriaProducto.id == categoria_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_nombre(self, nombre: str) -> Optional[CategoriaProducto]:
        stmt = select(CategoriaProducto).where(CategoriaProducto.nombre == nombre)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(self, activo: Optional[bool] = True, skip: int = 0, limit: int = 100) -> List[CategoriaProducto]:
        stmt = select(CategoriaProducto)
        if activo is not None:
            stmt = stmt.where(CategoriaProducto.activa == activo)
        stmt = stmt.order_by(CategoriaProducto.id).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: dict) -> CategoriaProducto:
        cat = CategoriaProducto(**data)
        self.session.add(cat)
        await self.session.flush()
        await self.session.refresh(cat)
        return cat


class PresentacionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, activo: Optional[bool] = True) -> List[Presentacion]:
        stmt = select(Presentacion)
        if activo is not None:
            stmt = stmt.where(Presentacion.activa == activo)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: dict) -> Presentacion:
        pres = Presentacion(**data)
        self.session.add(pres)
        await self.session.flush()
        await self.session.refresh(pres)
        return pres


class AlmacenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, activo: Optional[bool] = True) -> List[Almacen]:
        stmt = select(Almacen)
        if activo is not None:
            stmt = stmt.where(Almacen.activo == activo)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get(self, almacen_id: int) -> Optional[Almacen]:
        stmt = select(Almacen).where(Almacen.id == almacen_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Almacen:
        alm = Almacen(**data)
        self.session.add(alm)
        await self.session.flush()
        await self.session.refresh(alm)
        return alm