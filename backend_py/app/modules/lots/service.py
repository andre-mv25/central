from typing import Optional, List
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.lots.repository import ProveedorRepository, LoteRepository
from app.modules.lots.models import Proveedor, Lote
from app.modules.lots.schemas import ProveedorCreate, ProveedorUpdate, LoteCreate, LoteUpdate
from app.core.exceptions import NotFoundError, ConflictError


class LoteService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.proveedor_repo = ProveedorRepository(session)
        self.lote_repo = LoteRepository(session)

    # Proveedores
    async def create_proveedor(self, prov_in: ProveedorCreate) -> Proveedor:
        existing = await self.proveedor_repo.get_by_nombre(prov_in.nombre)
        if existing:
            raise ConflictError(f"Proveedor {prov_in.nombre} ya existe")
        return await self.proveedor_repo.create(prov_in.model_dump())

    async def get_proveedor(self, proveedor_id: int) -> Optional[Proveedor]:
        return await self.proveedor_repo.get(proveedor_id)

    async def list_proveedores(self, activo: Optional[bool] = True) -> List[Proveedor]:
        return await self.proveedor_repo.list(activo=activo)

    async def search_proveedores(self, q: str, limit: int = 20) -> List[Proveedor]:
        return await self.proveedor_repo.search(q, limit)

    async def update_proveedor(self, proveedor_id: int, prov_in: ProveedorUpdate) -> Optional[Proveedor]:
        proveedor = await self.proveedor_repo.get(proveedor_id)
        if not proveedor:
            raise NotFoundError("Proveedor", proveedor_id)
        return await self.proveedor_repo.update(proveedor, prov_in.model_dump(exclude_unset=True))

    # Lotes
    async def create_lote(self, lote_in: LoteCreate) -> Lote:
        costo_por_kilo = lote_in.costo_total / lote_in.kilos_recibidos if lote_in.kilos_recibidos > 0 else Decimal("0")
        lote_data = lote_in.model_dump()
        lote_data["costo_por_kilo"] = costo_por_kilo.quantize(Decimal("0.0001"))
        return await self.lote_repo.create(lote_data)

    async def get_lote(self, lote_id: int) -> Optional[Lote]:
        return await self.lote_repo.get(lote_id)

    async def get_lote_with_stock(self, lote_id: int) -> Optional[dict]:
        return await self.lote_repo.get_with_stock(lote_id)

    async def list_lotes(self, activo: Optional[bool] = True, skip: int = 0, limit: int = 100) -> List[Lote]:
        return await self.lote_repo.list(activo=activo, skip=skip, limit=limit)

    async def update_lote(self, lote_id: int, lote_in: LoteUpdate) -> Optional[Lote]:
        lote = await self.lote_repo.get(lote_id)
        if not lote:
            raise NotFoundError("Lote", lote_id)
        
        update_data = lote_in.model_dump(exclude_unset=True)
        if "costo_total" in update_data and "kilos_recibidos" in update_data:
            update_data["costo_por_kilo"] = (update_data["costo_total"] / update_data["kilos_recibidos"]).quantize(Decimal("0.0001"))
        elif "costo_total" in update_data:
            update_data["costo_por_kilo"] = (update_data["costo_total"] / lote.kilos_recibidos).quantize(Decimal("0.0001"))
        elif "kilos_recibidos" in update_data:
            update_data["costo_por_kilo"] = (lote.costo_total / update_data["kilos_recibidos"]).quantize(Decimal("0.0001"))
        
        return await self.lote_repo.update(lote, update_data)

    async def get_fifo_lotes(self, producto_id: int, almacen_id: int, cantidad: Decimal) -> List[dict]:
        return await self.lote_repo.get_fifo_for_producto(producto_id, almacen_id, cantidad)