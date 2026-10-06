from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.modules.auth.router import get_current_active_user, require_roles
from app.modules.auth.models import User
from app.modules.classification.service import ClasificacionService
from app.modules.classification.schemas import (
    CriterioClasificacionCreate, CriterioClasificacionUpdate, CriterioClasificacionResponse,
    CategoriaClasificacionCreate, CategoriaClasificacionUpdate, CategoriaClasificacionResponse,
    OrdenClasificacionCreate, OrdenClasificacionUpdate, OrdenClasificacionResponse,
    OrdenClasificacionBalanceInfo, OrdenClasificacionCerrar,
    RendimientoLote,
)


router = APIRouter(prefix="/clasificacion", tags=["Clasificación"])


def get_clasificacion_service(session: AsyncSession = Depends(get_db)) -> ClasificacionService:
    return ClasificacionService(session)


# Criterios
@router.post("/criterios", response_model=CriterioClasificacionResponse, status_code=status.HTTP_201_CREATED)
async def create_criterio(
    criterio_in: CriterioClasificacionCreate,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(require_roles("admin"))
):
    try:
        return await service.create_criterio(criterio_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/criterios", response_model=List[CriterioClasificacionResponse])
async def list_criterios(
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_criterios()


@router.get("/criterios/{criterio_id}", response_model=CriterioClasificacionResponse)
async def get_criterio(
    criterio_id: int,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    criterio = await service.get_criterio_with_categorias(criterio_id)
    if not criterio:
        raise HTTPException(status_code=404, detail="Criterio no encontrado")
    return criterio


@router.put("/criterios/{criterio_id}", response_model=CriterioClasificacionResponse)
async def update_criterio(
    criterio_id: int,
    criterio_in: CriterioClasificacionUpdate,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(require_roles("admin"))
):
    try:
        return await service.update_criterio(criterio_id, criterio_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Categorías
@router.post("/categorias", response_model=CategoriaClasificacionResponse, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    cat_in: CategoriaClasificacionCreate,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(require_roles("admin"))
):
    try:
        return await service.create_categoria(cat_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/categorias", response_model=List[CategoriaClasificacionResponse])
async def list_categorias(
    criterio_id: Optional[int] = None,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    if criterio_id:
        return await service.get_categorias_by_criterio(criterio_id)
    
    criterios = await service.get_criterios()
    all_cats = []
    for c in criterios:
        cats = await service.get_categorias_by_criterio(c.id)
        all_cats.extend(cats)
    return all_cats


@router.get("/categorias/by-criterio/{criterio_id}", response_model=List[CategoriaClasificacionResponse])
async def get_categorias_by_criterio(
    criterio_id: int,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_categorias_by_criterio(criterio_id)


# Órdenes
@router.post("/ordenes", response_model=OrdenClasificacionResponse, status_code=status.HTTP_201_CREATED)
async def create_orden(
    orden_in: OrdenClasificacionCreate,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.create_orden(orden_in, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ordenes", response_model=List[OrdenClasificacionResponse])
async def list_ordenes(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    lote_origen_id: Optional[int] = None,
    estado: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_ordenes(fecha_desde, fecha_hasta, lote_origen_id, estado, skip, limit)


@router.get("/ordenes/{orden_id}", response_model=OrdenClasificacionResponse)
async def get_orden(
    orden_id: int,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    orden = await service.orden_repo.get_with_lineas(orden_id)
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return orden


@router.get("/ordenes/{orden_id}/balance", response_model=OrdenClasificacionBalanceInfo)
async def get_orden_balance(
    orden_id: int,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    try:
        return await service.get_balance_info(orden_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ordenes/{orden_id}/cerrar", response_model=OrdenClasificacionResponse)
async def cerrar_orden(
    orden_id: int,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.cerrar_orden(orden_id, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Reportes
@router.get("/reportes/rendimiento/{lote_id}", response_model=RendimientoLote)
async def get_rendimiento_lote(
    lote_id: int,
    service: ClasificacionService = Depends(get_clasificacion_service),
    current_user: User = Depends(get_current_active_user)
):
    rendimiento = await service.get_rendimiento_lote(lote_id)
    if not rendimiento:
        raise HTTPException(status_code=404, detail="Lote no encontrado o sin clasificación")
    return rendimiento