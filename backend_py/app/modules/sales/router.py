from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.core.database import get_db
from app.modules.auth.router import get_current_active_user, require_roles
from app.modules.auth.models import User
from app.modules.sales.service import VentasService
from app.modules.sales.schemas import (
    CompradorCreate, CompradorUpdate, CompradorResponse, CompradorAutocomplete,
    VentaCreate, VentaUpdate, VentaResponse, VentaAnular,
    VentaRapidaCreate, VentaRapidaResponse, VentaRapidaLineaResponse,
    VentaReporteItem, VentasPorProductoItem, VentasPorCompradorItem,
    TicketVenta,
)


router = APIRouter(prefix="/ventas", tags=["Ventas"])


def get_ventas_service(session: AsyncSession = Depends(get_db)) -> VentasService:
    return VentasService(session)


# Compradores
@router.post("/compradores", response_model=CompradorResponse, status_code=status.HTTP_201_CREATED)
async def create_comprador(
    comprador_in: CompradorCreate,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(require_roles("admin", "vendedor"))
):
    try:
        return await service.create_comprador(comprador_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/compradores", response_model=List[CompradorResponse])
async def list_compradores(
    skip: int = 0,
    limit: int = 100,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.comprador_repo.list(activo=True, skip=skip, limit=limit)


@router.get("/compradores/search", response_model=List[CompradorAutocomplete])
async def search_compradores(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    compradores = await service.search_compradores(q, limit)
    return [CompradorAutocomplete.model_validate(c) for c in compradores]


@router.get("/compradores/{comprador_id}", response_model=CompradorResponse)
async def get_comprador(
    comprador_id: int,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    comprador = await service.comprador_repo.get(comprador_id)
    if not comprador:
        raise HTTPException(status_code=404, detail="Comprador no encontrado")
    return CompradorResponse.model_validate(comprador)


@router.put("/compradores/{comprador_id}", response_model=CompradorResponse)
async def update_comprador(
    comprador_id: int,
    comprador_in: CompradorUpdate,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(require_roles("admin", "vendedor"))
):
    comprador = await service.comprador_repo.get(comprador_id)
    if not comprador:
        raise HTTPException(status_code=404, detail="Comprador no encontrado")
    comprador = await service.comprador_repo.update(comprador, comprador_in.model_dump(exclude_unset=True))
    return CompradorResponse.model_validate(comprador)


# Venta rápida (pantalla mostrador)
@router.post("/rapida", response_model=VentaRapidaResponse, status_code=status.HTTP_201_CREATED)
async def create_venta_rapida(
    venta_in: VentaRapidaCreate,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(require_roles("admin", "vendedor"))
):
    try:
        venta = await service.create_venta_rapida(venta_in, current_user.id)
        return await _build_venta_rapida_response(venta, service)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


async def _build_venta_rapida_response(venta, service) -> VentaRapidaResponse:
    lineas_resp = []
    for linea in venta.lineas:
        producto = await service.producto_service.get_producto(linea.producto_id)
        lote_info = None
        if linea.lote_id:
            lote = await service.lote_service.get_lote(linea.lote_id)
            if lote:
                lote_info = (linea.lote_id, lote.variedad)
        lineas_resp.append(VentaRapidaLineaResponse(
            producto_id=linea.producto_id,
            sku=producto.sku if producto else "",
            nombre=producto.nombre if producto else "",
            categoria=producto.categoria.nombre if producto and producto.categoria else None,
            stock_disponible=Decimal("0"),
            kilos=linea.kilos,
            presentacion=linea.presentacion,
            unidades=linea.unidades,
            precio_por_kilo=linea.precio_por_kilo,
            total_linea=linea.total_linea,
            lote_usado_id=lote_info[0] if lote_info else None,
            lote_usado_variedad=lote_info[1] if lote_info else None
        ))
    
    return VentaRapidaResponse(
        venta_id=venta.id,
        fecha=venta.fecha,
        total=venta.total,
        comprador_nombre=venta.comprador.nombre if venta.comprador else None,
        lineas=lineas_resp
    )


# Ventas normales
@router.post("", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
async def create_venta(
    venta_in: VentaCreate,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(require_roles("admin", "vendedor"))
):
    try:
        return await service.create_venta(venta_in, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[VentaResponse])
async def list_ventas(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    comprador_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    ventas, _ = await service.get_ventas_reporte(fecha_desde, fecha_hasta, comprador_id, skip, limit)
    return [VentaResponse.model_validate(v) for v in ventas]


@router.get("/{venta_id}", response_model=VentaResponse)
async def get_venta(
    venta_id: int,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    venta = await service.venta_repo.get_with_lineas(venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return VentaResponse.model_validate(venta)


@router.get("/{venta_id}/ticket", response_model=TicketVenta)
async def get_ticket_venta(
    venta_id: int,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    venta = await service.venta_repo.get_with_lineas(venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    usuario = await service.session.get(User, venta.usuario_id)
    
    return TicketVenta(
        venta_id=venta.id,
        fecha=venta.fecha,
        comprador_nombre=venta.comprador.nombre if venta.comprador else None,
        vendedor_nombre=usuario.email if usuario else "N/A",
        lineas=[],  # Simplified
        total=venta.total,
        estado=venta.estado
    )


@router.post("/{venta_id}/anular", response_model=VentaResponse)
async def anular_venta(
    venta_id: int,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(require_roles("admin", "vendedor"))
):
    try:
        venta = await service.anular_venta(venta_id, current_user.id, "Anulada por usuario")
        return VentaResponse.model_validate(venta)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Reportes
@router.get("/reportes/ventas", response_model=List[VentaReporteItem])
async def get_ventas_reporte(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    comprador_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    items, _ = await service.get_ventas_reporte(fecha_desde, fecha_hasta, comprador_id, skip, limit)
    return items


@router.get("/reportes/por-producto", response_model=List[VentasPorProductoItem])
async def get_ventas_por_producto(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_ventas_por_producto(fecha_desde, fecha_hasta)


@router.get("/reportes/por-comprador", response_model=List[VentasPorCompradorItem])
async def get_ventas_por_comprador(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    service: VentasService = Depends(get_ventas_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_ventas_por_comprador(fecha_desde, fecha_hasta)