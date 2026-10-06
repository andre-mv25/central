from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.core.database import get_db
from app.modules.auth.router import get_current_active_user, require_roles
from app.modules.auth.models import User
from app.modules.stock.service import StockService
from app.modules.stock.schemas import (
    MovimientoCreate, MovimientoResponse, MovimientoTipo,
    MovimientoReporteItem, MovimientoReporteFiltros,
    AjusteInventarioCreate, AjusteInventarioResponse,
    StockDetalle,
)


router = APIRouter(prefix="/stock", tags=["Stock"])


def get_stock_service(session: AsyncSession = Depends(get_db)) -> StockService:
    return StockService(session)


# Movimientos
@router.post("/movimientos", response_model=MovimientoResponse, status_code=status.HTTP_201_CREATED)
async def create_movimiento(
    mov_in: MovimientoCreate,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        return await service.crear_movimiento(mov_in, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/movimientos", response_model=List[MovimientoResponse])
async def list_movimientos(
    producto_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    almacen_id: Optional[int] = None,
    limit: int = 100,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_active_user)
):
    if not producto_id:
        return []
    return await service.get_movimientos_producto(producto_id, fecha_desde, fecha_hasta, almacen_id, limit)


# Stock
@router.get("/bajo", response_model=List[dict])
async def get_stock_bajo(
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_stock_bajo()


@router.get("/valor", response_model=Decimal)
async def get_valor_inventario(
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_valor_inventario()


@router.get("/producto/{producto_id}", response_model=StockDetalle)
async def get_producto_stock(
    producto_id: int,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_active_user)
):
    stocks = await service.get_stock_producto(producto_id)
    if not stocks:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Build response
    from app.modules.products.service import ProductoService
    producto_service = ProductoService(service.session)
    producto = await producto_service.get_producto(producto_id)
    
    stock_total = sum(s["kilos"] for s in stocks)
    por_almacen = {}
    por_lote = {}
    
    for s in stocks:
        almacen_key = s["almacen_id"]
        if almacen_key not in por_almacen:
            por_almacen[almacen_key] = {"almacen_id": almacen_key, "almacen_nombre": s["almacen_nombre"], "kilos": Decimal("0")}
        por_almacen[almacen_key]["kilos"] += s["kilos"]
        
        lote_key = s["lote_id"]
        if lote_key not in por_lote:
            por_lote[lote_key] = {
                "lote_id": lote_key,
                "lote_variedad": s["variedad"],
                "lote_fecha_cosecha": s["fecha_cosecha"],
                "kilos": Decimal("0")
            }
        por_lote[lote_key]["kilos"] += s["kilos"]
    
    return StockDetalle(
        producto_id=producto.id,
        sku=producto.sku,
        nombre=producto.nombre,
        stock_total=stock_total,
        por_almacen=list(por_almacen.values()),
        por_lote=list(por_lote.values())
    )


# Ajustes
@router.post("/ajustes", response_model=AjusteInventarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_ajuste(
    ajuste_in: AjusteInventarioCreate,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        _, diferencia = await service.ajuste_inventario(ajuste_in, current_user.id)
        # Return the created adjustment
        # This is simplified - in practice you'd return the full adjustment object
        return {"message": f"Ajuste creado. Diferencia: {diferencia} kg"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Reportes de movimientos
@router.get("/reportes/movimientos", response_model=List[MovimientoReporteItem])
async def get_movimientos_reporte(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    producto_id: Optional[int] = None,
    almacen_id: Optional[int] = None,
    lote_id: Optional[int] = None,
    tipo: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    service: StockService = Depends(get_stock_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_movimientos_reporte(
        fecha_desde, fecha_hasta, producto_id, almacen_id, lote_id, tipo, None, skip, limit
    )