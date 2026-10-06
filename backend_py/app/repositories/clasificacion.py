from decimal import Decimal
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, func, text, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    CriterioClasificacion, CategoriaClasificacion,
    OrdenClasificacion, OrdenClasificacionLinea, Lote
)
from app.repositories.base import BaseRepository


class CriterioClasificacionRepository(BaseRepository[CriterioClasificacion]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, CriterioClasificacion)

    async def get_activos(self) -> List[CriterioClasificacion]:
        stmt = select(CriterioClasificacion).where(CriterioClasificacion.activo == True)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_categorias(self, criterio_id: int) -> Optional[CriterioClasificacion]:
        stmt = select(CriterioClasificacion).options(
            selectinload(CriterioClasificacion.categorias)
        ).where(CriterioClasificacion.id == criterio_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class CategoriaClasificacionRepository(BaseRepository[CategoriaClasificacion]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, CategoriaClasificacion)

    async def get_by_criterio(self, criterio_id: int) -> List[CategoriaClasificacion]:
        stmt = select(CategoriaClasificacion).where(
            CategoriaClasificacion.criterio_id == criterio_id,
            CategoriaClasificacion.activa == True
        ).order_by(CategoriaClasificacion.orden)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class OrdenClasificacionRepository(BaseRepository[OrdenClasificacion]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, OrdenClasificacion)

    async def get_with_lineas(self, orden_id: int) -> Optional[OrdenClasificacion]:
        stmt = select(OrdenClasificacion).options(
            selectinload(OrdenClasificacion.lineas).selectinload(OrdenClasificacionLinea.producto),
            selectinload(OrdenClasificacion.lineas).selectinload(OrdenClasificacionLinea.categoria_clasificacion),
            selectinload(OrdenClasificacion.lineas).selectinload(OrdenClasificacionLinea.almacen_destino),
            selectinload(OrdenClasificacion.lote_origen),
            selectinload(OrdenClasificacion.criterio),
            selectinload(OrdenClasificacion.operario)
        ).where(OrdenClasificacion.id == orden_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_with_filters(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        lote_origen_id: Optional[int] = None,
        estado: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[OrdenClasificacion]:
        stmt = select(OrdenClasificacion).options(
            selectinload(OrdenClasificacion.lote_origen),
            selectinload(OrdenClasificacion.criterio),
            selectinload(OrdenClasificacion.operario)
        )
        if fecha_desde:
            stmt = stmt.where(OrdenClasificacion.fecha >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(OrdenClasificacion.fecha <= fecha_hasta)
        if lote_origen_id:
            stmt = stmt.where(OrdenClasificacion.lote_origen_id == lote_origen_id)
        if estado:
            stmt = stmt.where(OrdenClasificacion.estado == estado)
        stmt = stmt.order_by(OrdenClasificacion.fecha.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_rendimiento_lote(self, lote_id: int) -> Optional[dict]:
        stmt = text("""
            SELECT 
                l.id as lote_id, l.variedad, l.fecha_cosecha, p.nombre as proveedor_nombre,
                l.kilos_recibidos as kilos_totales,
                oc.kilos_clasificados, oc.kilos_merma, oc.merma_porcentaje,
                oc.costo_reparto_metodo
            FROM lotes l
            LEFT JOIN proveedores p ON p.id = l.proveedor_id
            LEFT JOIN ordenes_clasificacion oc ON oc.lote_origen_id = l.id AND oc.estado = 'cerrada'
            WHERE l.id = :lid
        """)
        result = await self.session.execute(stmt, {"lid": lote_id})
        lote_data = result.mappings().first()
        
        if not lote_data:
            return None
            
        # Get categorias breakdown
        stmt_cat = text("""
            SELECT 
                ocl.categoria_clasificacion_id,
                ccl.nombre as categoria_nombre,
                SUM(ocl.kilos) as kilos,
                SUM(ocl.costo_asignado) as costo_total,
                AVG(ocl.costo_por_kilo) as costo_por_kilo
            FROM ordenes_clasificacion_lineas ocl
            JOIN ordenes_clasificacion oc ON oc.id = ocl.orden_id
            LEFT JOIN categorias_clasificacion ccl ON ccl.id = ocl.categoria_clasificacion_id
            WHERE oc.lote_origen_id = :lid AND oc.estado = 'cerrada' AND ocl.es_merma = false
            GROUP BY ocl.categoria_clasificacion_id, ccl.nombre
        """)
        result_cat = await self.session.execute(stmt_cat, {"lid": lote_id})
        categorias = list(result_cat.mappings().all())
        
        return {
            **lote_data,
            "categorias": categorias
        }


class OrdenClasificacionLineaRepository(BaseRepository[OrdenClasificacionLinea]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, OrdenClasificacionLinea)

    async def get_by_orden(self, orden_id: int) -> List[OrdenClasificacionLinea]:
        stmt = select(OrdenClasificacionLinea).where(
            OrdenClasificacionLinea.orden_id == orden_id
        ).order_by(OrdenClasificacionLinea.id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())