from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.classification.models import CriterioClasificacion, CategoriaClasificacion, OrdenClasificacion, OrdenClasificacionLinea


class CriterioClasificacionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, criterio_id: int) -> Optional[CriterioClasificacion]:
        stmt = select(CriterioClasificacion).where(CriterioClasificacion.id == criterio_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_nombre(self, nombre: str) -> Optional[CriterioClasificacion]:
        stmt = select(CriterioClasificacion).where(CriterioClasificacion.nombre == nombre)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(self, activo: Optional[bool] = True) -> List[CriterioClasificacion]:
        stmt = select(CriterioClasificacion)
        if activo is not None:
            stmt = stmt.where(CriterioClasificacion.activo == activo)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_categorias(self, criterio_id: int) -> Optional[CriterioClasificacion]:
        stmt = select(CriterioClasificacion).options(
            selectinload(CriterioClasificacion.categorias)
        ).where(CriterioClasificacion.id == criterio_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> CriterioClasificacion:
        criterio = CriterioClasificacion(**data)
        self.session.add(criterio)
        await self.session.flush()
        await self.session.refresh(criterio)
        return criterio

    async def update(self, criterio: CriterioClasificacion, data: dict) -> CriterioClasificacion:
        for field, value in data.items():
            setattr(criterio, field, value)
        await self.session.flush()
        await self.session.refresh(criterio)
        return criterio


class CategoriaClasificacionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, categoria_id: int) -> Optional[CategoriaClasificacion]:
        stmt = select(CategoriaClasificacion).where(CategoriaClasificacion.id == categoria_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_criterio_y_nombre(self, criterio_id: int, nombre: str) -> Optional[CategoriaClasificacion]:
        stmt = select(CategoriaClasificacion).where(
            CategoriaClasificacion.criterio_id == criterio_id,
            CategoriaClasificacion.nombre == nombre
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_criterio(self, criterio_id: int) -> List[CategoriaClasificacion]:
        stmt = select(CategoriaClasificacion).where(
            CategoriaClasificacion.criterio_id == criterio_id,
            CategoriaClasificacion.activa == True
        ).order_by(CategoriaClasificacion.orden)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: dict) -> CategoriaClasificacion:
        cat = CategoriaClasificacion(**data)
        self.session.add(cat)
        await self.session.flush()
        await self.session.refresh(cat)
        return cat

    async def update(self, categoria: CategoriaClasificacion, data: dict) -> CategoriaClasificacion:
        for field, value in data.items():
            setattr(categoria, field, value)
        await self.session.flush()
        await self.session.refresh(categoria)
        return categoria


class OrdenClasificacionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, orden_id: int) -> Optional[OrdenClasificacion]:
        stmt = select(OrdenClasificacion).where(OrdenClasificacion.id == orden_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

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

    async def list(
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

    async def create(self, data: dict) -> OrdenClasificacion:
        orden = OrdenClasificacion(**data)
        self.session.add(orden)
        await self.session.flush()
        await self.session.refresh(orden)
        return orden

    async def update(self, orden: OrdenClasificacion, data: dict) -> OrdenClasificacion:
        for field, value in data.items():
            setattr(orden, field, value)
        await self.session.flush()
        await self.session.refresh(orden)
        return orden

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


class OrdenClasificacionLineaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_orden(self, orden_id: int) -> List[OrdenClasificacionLinea]:
        stmt = select(OrdenClasificacionLinea).where(
            OrdenClasificacionLinea.orden_id == orden_id
        ).order_by(OrdenClasificacionLinea.id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, data: dict) -> OrdenClasificacionLinea:
        linea = OrdenClasificacionLinea(**data)
        self.session.add(linea)
        await self.session.flush()
        await self.session.refresh(linea)
        return linea

    async def bulk_create(self, lineas_data: List[dict]) -> List[OrdenClasificacionLinea]:
        lineas = [OrdenClasificacionLinea(**data) for data in lineas_data]
        self.session.add_all(lineas)
        await self.session.flush()
        for linea in lineas:
            await self.session.refresh(linea)
        return lineas