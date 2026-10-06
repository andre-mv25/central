from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.products.repository import ProductoRepository, CategoriaProductoRepository, PresentacionRepository, AlmacenRepository
from app.modules.products.models import Producto, CategoriaProducto, Presentacion, Almacen
from app.modules.products.schemas import (
    ProductoCreate, ProductoUpdate,
    CategoriaProductoCreate, CategoriaProductoUpdate,
    PresentacionCreate, PresentacionUpdate,
    AlmacenCreate, AlmacenUpdate,
)
from app.core.exceptions import ConflictError, NotFoundError


class ProductoService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.producto_repo = ProductoRepository(session)
        self.categoria_repo = CategoriaProductoRepository(session)
        self.presentacion_repo = PresentacionRepository(session)
        self.almacen_repo = AlmacenRepository(session)

    # Productos
    async def create_producto(self, producto_in: ProductoCreate, usuario_id: int) -> Producto:
        existing = await self.producto_repo.get_by_sku(producto_in.sku)
        if existing:
            raise ConflictError(f"SKU {producto_in.sku} ya existe")
        return await self.producto_repo.create(producto_in.model_dump())

    async def update_producto(self, producto_id: int, producto_in: ProductoUpdate) -> Optional[Producto]:
        producto = await self.producto_repo.get(producto_id)
        if not producto:
            raise NotFoundError("Producto", producto_id)
        return await self.producto_repo.update(producto, producto_in.model_dump(exclude_unset=True))

    async def delete_producto(self, producto_id: int) -> bool:
        return await self.producto_repo.delete(producto_id)

    async def get_producto(self, producto_id: int) -> Optional[Producto]:
        return await self.producto_repo.get(producto_id)

    async def list_productos(self, skip: int = 0, limit: int = 100, activo: Optional[bool] = True) -> List[Producto]:
        return await self.producto_repo.list(skip, limit, activo)

    async def search_productos(self, q: str, limit: int = 20) -> List[Producto]:
        return await self.producto_repo.search_trgm(q, limit)

    async def get_producto_stock(self, producto_id: int) -> Optional[dict]:
        return await self.producto_repo.get_with_stock(producto_id)

    # Categorías
    async def create_categoria(self, cat_in: CategoriaProductoCreate) -> CategoriaProducto:
        existing = await self.categoria_repo.get_by_nombre(cat_in.nombre)
        if existing:
            raise ConflictError(f"Categoría {cat_in.nombre} ya existe")
        return await self.categoria_repo.create(cat_in.model_dump())

    async def list_categorias(self, activo: Optional[bool] = True) -> List[CategoriaProducto]:
        return await self.categoria_repo.list(activo=activo)

    # Presentaciones
    async def create_presentacion(self, pres_in: PresentacionCreate) -> Presentacion:
        return await self.presentacion_repo.create(pres_in.model_dump())

    async def list_presentaciones(self, activo: Optional[bool] = True) -> List[Presentacion]:
        return await self.presentacion_repo.list(activo=activo)

    # Almacenes
    async def create_almacen(self, alm_in: AlmacenCreate) -> Almacen:
        return await self.almacen_repo.create(alm_in.model_dump())

    async def list_almacenes(self, activo: Optional[bool] = True) -> List[Almacen]:
        return await self.almacen_repo.list(activo=activo)

    async def get_almacen(self, almacen_id: int) -> Optional[Almacen]:
        return await self.almacen_repo.get(almacen_id)