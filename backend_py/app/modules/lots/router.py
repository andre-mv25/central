from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.core.database import get_db
from app.modules.auth.router import get_current_active_user, require_roles
from app.modules.auth.models import User
from app.modules.lots.service import LoteService
from app.modules.lots.schemas import (
    ProveedorCreate, ProveedorUpdate, ProveedorResponse,
    LoteCreate, LoteUpdate, LoteResponse, LoteStockInfo,
)


router = APIRouter(prefix="/lotes", tags=["Lotes"])


def get_lote_service(session: AsyncSession = Depends(get_db)) -> LoteService:
    return LoteService(session)


# Proveedores
@router.post("/proveedores", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED)
async def create_proveedor(
    prov_in: ProveedorCreate,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.create_proveedor(prov_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/proveedores", response_model=List[ProveedorResponse])
async def list_proveedores(
    activo: Optional[bool] = True,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_proveedores(activo)


@router.get("/proveedores/search", response_model=List[ProveedorResponse])
async def search_proveedores(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.search_proveedores(q, limit)


@router.get("/proveedores/{proveedor_id}", response_model=ProveedorResponse)
async def get_proveedor(
    proveedor_id: int,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(get_current_active_user)
):
    proveedor = await service.get_proveedor(proveedor_id)
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor


@router.put("/proveedores/{proveedor_id}", response_model=ProveedorResponse)
async def update_proveedor(
    proveedor_id: int,
    prov_in: ProveedorUpdate,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.update_proveedor(proveedor_id, prov_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Lotes
@router.post("", response_model=LoteResponse, status_code=status.HTTP_201_CREATED)
async def create_lote(
    lote_in: LoteCreate,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.create_lote(lote_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[LoteResponse])
async def list_lotes(
    activo: Optional[bool] = True,
    skip: int = 0,
    limit: int = 100,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_lotes(activo, skip, limit)


@router.get("/{lote_id}", response_model=LoteResponse)
async def get_lote(
    lote_id: int,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(get_current_active_user)
):
    lote = await service.get_lote(lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return lote


@router.get("/{lote_id}/stock", response_model=LoteStockInfo)
async def get_lote_stock(
    lote_id: int,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(get_current_active_user)
):
    stock = await service.get_lote_with_stock(lote_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return stock


@router.put("/{lote_id}", response_model=LoteResponse)
async def update_lote(
    lote_id: int,
    lote_in: LoteUpdate,
    service: LoteService = Depends(get_lote_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.update_lote(lote_id, lote_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))