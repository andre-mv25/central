from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.modules.auth.router import get_current_active_user, require_roles
from app.modules.auth.models import User
from app.modules.products.service import ProductoService
from app.modules.products.schemas import (
    ProductoCreate, ProductoUpdate, ProductoResponse, ProductoStockInfo,
    CategoriaProductoCreate, CategoriaProductoUpdate, CategoriaProductoResponse,
    PresentacionCreate, PresentacionUpdate, PresentacionResponse,
    AlmacenCreate, AlmacenUpdate, AlmacenResponse,
)


router = APIRouter(prefix="/productos", tags=["Productos"])


def get_producto_service(session: AsyncSession = Depends(get_db)) -> ProductoService:
    return ProductoService(session)


# Categorías
@router.post("/categorias", response_model=CategoriaProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    cat_in: CategoriaProductoCreate,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(require_roles("admin"))
):
    try:
        return await service.create_categoria(cat_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/categorias", response_model=List[CategoriaProductoResponse])
async def list_categorias(
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_categorias()


# Presentaciones
@router.post("/presentaciones", response_model=PresentacionResponse, status_code=status.HTTP_201_CREATED)
async def create_presentacion(
    pres_in: PresentacionCreate,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(require_roles("admin"))
):
    return await service.create_presentacion(pres_in)


@router.get("/presentaciones", response_model=List[PresentacionResponse])
async def list_presentaciones(
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_presentaciones()


# Almacenes
@router.post("/almacenes", response_model=AlmacenResponse, status_code=status.HTTP_201_CREATED)
async def create_almacen(
    alm_in: AlmacenCreate,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(require_roles("admin"))
):
    return await service.create_almacen(alm_in)


@router.get("/almacenes", response_model=List[AlmacenResponse])
async def list_almacenes(
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_almacenes()


# Productos
@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_producto(
    producto_in: ProductoCreate,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.create_producto(producto_in, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[ProductoResponse])
async def list_productos(
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = True,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.list_productos(skip, limit, activo)


@router.get("/search", response_model=List[ProductoResponse])
async def search_productos(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.search_productos(q, limit)


@router.get("/{producto_id}", response_model=ProductoResponse)
async def get_producto(
    producto_id: int,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(get_current_active_user)
):
    producto = await service.get_producto(producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.get("/{producto_id}/stock", response_model=ProductoStockInfo)
async def get_producto_stock(
    producto_id: int,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(get_current_active_user)
):
    stock = await service.get_producto_stock(producto_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return stock


@router.put("/{producto_id}", response_model=ProductoResponse)
async def update_producto(
    producto_id: int,
    producto_in: ProductoUpdate,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        producto = await service.update_producto(producto_id, producto_in)
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        return producto
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_producto(
    producto_id: int,
    service: ProductoService = Depends(get_producto_service),
    current_user: User = Depends(require_roles("admin"))
):
    success = await service.delete_producto(producto_id)
    if not success:
        raise HTTPException(status_code=404, detail="Producto no encontrado")