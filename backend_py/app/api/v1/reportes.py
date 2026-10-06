from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_active_user
from app.services import ReportesService
from app.models import User
from app.schemas import (
    DashboardStats, VentaReporteItem, VentasPorProductoItem,
    VentasPorCompradorItem, RendimientoLoteItem, ValorizacionInventarioItem,
    MovimientoReporteItem, AuditoriaItem, ExportRequest
)

router = APIRouter(prefix="/reportes", tags=["Reportes"])


def get_reportes_service(session: AsyncSession = Depends(get_db)) -> ReportesService:
    return ReportesService(session)


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_dashboard_stats()


@router.get("/ventas", response_model=List[VentaReporteItem])
async def get_ventas_reporte(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    comprador_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    items, _ = await service.get_ventas_reporte(fecha_desde, fecha_hasta, comprador_id, skip, limit)
    return items


@router.get("/ventas/por-producto", response_model=List[VentasPorProductoItem])
async def get_ventas_por_producto(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_ventas_por_producto(fecha_desde, fecha_hasta)


@router.get("/ventas/por-comprador", response_model=List[VentasPorCompradorItem])
async def get_ventas_por_comprador(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_ventas_por_comprador(fecha_desde, fecha_hasta)


@router.get("/clasificacion/rendimiento", response_model=List[RendimientoLoteItem])
async def get_rendimiento_lotes(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_rendimiento_lotes(fecha_desde, fecha_hasta)


@router.get("/inventario/valorizacion", response_model=List[ValorizacionInventarioItem])
async def get_valorizacion_inventario(
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_valorizacion_inventario()


@router.get("/movimientos", response_model=List[MovimientoReporteItem])
async def get_movimientos_reporte(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    producto_id: Optional[int] = None,
    almacen_id: Optional[int] = None,
    lote_id: Optional[int] = None,
    tipo: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_movimientos_reporte(
        fecha_desde, fecha_hasta, producto_id, almacen_id, lote_id, tipo, skip, limit
    )


@router.get("/auditoria", response_model=List[AuditoriaItem])
async def get_auditoria(
    tabla: Optional[str] = None,
    registro_id: Optional[int] = None,
    accion: Optional[str] = None,
    usuario_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_auditoria(
        tabla, registro_id, accion, usuario_id, fecha_desde, fecha_hasta, skip, limit
    )


@router.post("/exportar")
async def exportar_reporte(
    export_req: ExportRequest,
    service: ReportesService = Depends(get_reportes_service),
    current_user: User = Depends(get_current_active_user)
):
    # Placeholder for CSV/Excel export
    return {"message": "Export functionality to be implemented", "formato": export_req.formato}