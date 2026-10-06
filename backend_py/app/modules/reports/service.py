from typing import Optional, List, Tuple
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload
from app.modules.reports.schemas import (
    DashboardStats, MovimientoResumen, AlertaStockMinimo,
    VentaReporteItem, VentasPorProductoItem, VentasPorCompradorItem,
    RendimientoLoteItem, ValorizacionInventarioItem, MovimientoReporteItem,
    AuditoriaItem,
)
from app.modules.auth.models import User
from app.modules.sales.models import Venta, VentaLinea
from app.modules.stock.models import Movimiento, AjusteInventario
from app.modules.classification.models import OrdenClasificacion
from app.modules.lots.models import Lote
from app.modules.products.models import Producto
from app.core.database import Base


class ReportesService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_dashboard_stats(self) -> DashboardStats:
        # Stock bajo
        stock_bajo_stmt = text("""
            SELECT 
                p.id, p.sku, p.nombre, p.stock_minimo,
                COALESCE(SUM(sa.kilos), 0) as stock_total
            FROM productos p
            LEFT JOIN stock_actual sa ON sa.producto_id = p.id
            WHERE p.activo = true AND p.stock_minimo > 0
            GROUP BY p.id
            HAVING COALESCE(SUM(sa.kilos), 0) <= p.stock_minimo
        """)
        stock_bajo_result = await self.session.execute(stock_bajo_stmt)
        stock_bajo = list(stock_bajo_result.mappings().all())
        
        # Ventas hoy
        hoy_inicio = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        hoy_fin = hoy_inicio.replace(hour=23, minute=59, second=59)
        
        ventas_hoy_stmt = select(func.count(Venta.id)).where(
            Venta.fecha >= hoy_inicio,
            Venta.fecha <= hoy_fin,
            Venta.estado == "completada"
        )
        ventas_hoy = await self.session.execute(ventas_hoy_stmt)
        ventas_hoy_count = ventas_hoy.scalar_one() or 0
        
        kilos_hoy_stmt = select(func.sum(VentaLinea.kilos)).select_from(VentaLinea).join(Venta).where(
            Venta.fecha >= hoy_inicio,
            Venta.fecha <= hoy_fin,
            Venta.estado == "completada"
        )
        kilos_hoy = await self.session.execute(kilos_hoy_stmt)
        kilos_vendidos_hoy = kilos_hoy.scalar_one() or Decimal("0")
        
        # Valor inventario
        valor_inventario_stmt = text("""
            SELECT COALESCE(SUM(sa.kilos * p.costo), 0) as valor_total
            FROM stock_actual sa
            JOIN productos p ON p.id = sa.producto_id
            WHERE sa.kilos > 0
        """)
        valor_result = await self.session.execute(valor_inventario_stmt)
        valor_inventario = valor_result.scalar_one() or Decimal("0")
        
        # Últimos movimientos
        ultimos_movs_stmt = select(Movimiento).order_by(Movimiento.fecha.desc()).limit(10)
        ultimos_movs_result = await self.session.execute(ultimos_movs_stmt)
        ultimos_movimientos = []
        for m in ultimos_movs_result.scalars().all():
            producto = await self.session.get(Producto, m.producto_id)
            almacen = await self.session.get("Almacen", m.almacen_id)
            usuario = await self.session.get(User, m.usuario_id)
            ultimos_movimientos.append(MovimientoResumen(
                id=m.id,
                fecha=m.fecha,
                tipo=m.tipo,
                producto_nombre=producto.nombre if producto else "N/A",
                almacen_nombre=almacen.nombre if almacen else "N/A",
                kilos=m.kilos,
                usuario_nombre=usuario.email if usuario else "N/A"
            ))
        
        # Alertas stock mínimo
        alertas = []
        for s in stock_bajo:
            alertas.append(AlertaStockMinimo(
                producto_id=s["id"],
                sku=s["sku"],
                nombre=s["nombre"],
                stock_actual=s["stock_total"],
                stock_minimo=s["stock_minimo"],
                almacen_nombre="General"
            ))
        
        return DashboardStats(
            stock_bajo_count=len(stock_bajo),
            ventas_hoy_count=ventas_hoy_count,
            kilos_vendidos_hoy=kilos_vendidos_hoy,
            valor_inventario_total=valor_inventario,
            ultimos_movimientos=ultimos_movimientos,
            alertas_stock_minimo=alertas
        )

    async def get_ventas_reporte(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        comprador_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[VentaReporteItem], int]:
        stmt = select(Venta).options(selectinload(Venta.comprador))
        params = {}
        
        if fecha_desde:
            stmt = stmt.where(Venta.fecha >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(Venta.fecha <= fecha_hasta)
        if comprador_id:
            stmt = stmt.where(Venta.comprador_id == comprador_id)
        stmt = stmt.where(Venta.estado == "completada")
        
        count_stmt = select(func.count(Venta.id))
        if fecha_desde:
            count_stmt = count_stmt.where(Venta.fecha >= fecha_desde)
        if fecha_hasta:
            count_stmt = count_stmt.where(Venta.fecha <= fecha_hasta)
        if comprador_id:
            count_stmt = count_stmt.where(Venta.comprador_id == comprador_id)
        count_stmt = count_stmt.where(Venta.estado == "completada")
        
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar_one() or 0
        
        stmt = stmt.order_by(Venta.fecha.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        ventas = result.scalars().all()
        
        items = []
        for v in ventas:
            lineas_count_stmt = select(func.count(VentaLinea.id)).where(VentaLinea.venta_id == v.id)
            lineas_count = await self.session.execute(lineas_count_stmt)
            items.append(VentaReporteItem(
                venta_id=v.id,
                fecha=v.fecha,
                comprador_nombre=v.comprador.nombre if v.comprador else None,
                usuario_nombre=(await self.session.get(User, v.usuario_id)).email if v.usuario_id else "N/A",
                total=v.total,
                estado=v.estado,
                lineas_count=lineas_count.scalar_one() or 0
            ))
        
        return items, total

    async def get_ventas_por_producto(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> List[VentasPorProductoItem]:
        stmt = text("""
            SELECT 
                p.id as producto_id, p.sku, p.nombre, cp.nombre as categoria,
                SUM(vl.kilos) as kilos_vendidos,
                SUM(vl.total_linea) as total_ventas,
                AVG(vl.precio_por_kilo) as precio_promedio_kg,
                COUNT(DISTINCT v.id) as num_ventas
            FROM ventas_lineas vl
            JOIN ventas v ON v.id = vl.venta_id
            JOIN productos p ON p.id = vl.producto_id
            JOIN categorias_producto cp ON cp.id = p.categoria_id
            WHERE v.estado = 'completada'
        """)
        params = {}
        if fecha_desde:
            stmt += text(" AND v.fecha >= :fecha_desde")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            stmt += text(" AND v.fecha <= :fecha_hasta")
            params["fecha_hasta"] = fecha_hasta
        stmt += text(" GROUP BY p.id, p.sku, p.nombre, cp.nombre ORDER BY kilos_vendidos DESC")
        result = await self.session.execute(stmt, params)
        return [VentasPorProductoItem(**dict(r)) for r in result.mappings().all()]

    async def get_ventas_por_comprador(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> List[VentasPorCompradorItem]:
        stmt = text("""
            SELECT 
                c.id as comprador_id, c.nombre, c.telefono,
                SUM(vl.kilos) as kilos_comprados,
                SUM(v.total) as total_compras,
                COUNT(DISTINCT v.id) as num_ventas,
                MAX(v.fecha) as ultima_compra
            FROM ventas v
            JOIN compradores c ON c.id = v.comprador_id
            JOIN ventas_lineas vl ON vl.venta_id = v.id
            WHERE v.estado = 'completada' AND v.comprador_id IS NOT NULL
        """)
        params = {}
        if fecha_desde:
            stmt += text(" AND v.fecha >= :fecha_desde")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            stmt += text(" AND v.fecha <= :fecha_hasta")
            params["fecha_hasta"] = fecha_hasta
        stmt += text(" GROUP BY c.id, c.nombre, c.telefono ORDER BY total_compras DESC")
        result = await self.session.execute(stmt, params)
        return [VentasPorCompradorItem(**dict(r)) for r in result.mappings().all()]

    async def get_rendimiento_lotes(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> List[RendimientoLoteItem]:
        stmt = text("""
            SELECT 
                l.id as lote_id, l.variedad, l.fecha_cosecha, p.nombre as proveedor_nombre,
                l.kilos_recibidos as kilos_entrada,
                oc.kilos_clasificados, oc.kilos_merma, oc.merma_porcentaje
            FROM lotes l
            LEFT JOIN proveedores p ON p.id = l.proveedor_id
            LEFT JOIN ordenes_clasificacion oc ON oc.lote_origen_id = l.id AND oc.estado = 'cerrada'
            WHERE 1=1
        """)
        params = {}
        if fecha_desde:
            stmt += text(" AND l.fecha_recepcion >= :fecha_desde")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            stmt += text(" AND l.fecha_recepcion <= :fecha_hasta")
            params["fecha_hasta"] = fecha_hasta
        stmt += text(" ORDER BY l.fecha_recepcion DESC")
        
        result = await self.session.execute(stmt, params)
        lotes = list(result.mappings().all())
        
        items = []
        for lote in lotes:
            stmt_cat = text("""
                SELECT 
                    ccl.nombre as categoria_nombre,
                    SUM(ocl.kilos) as kilos,
                    SUM(ocl.costo_asignado) as costo_total
                FROM ordenes_clasificacion_lineas ocl
                JOIN ordenes_clasificacion oc ON oc.id = ocl.orden_id
                LEFT JOIN categorias_clasificacion ccl ON ccl.id = ocl.categoria_clasificacion_id
                WHERE oc.lote_origen_id = :lid AND oc.estado = 'cerrada' AND ocl.es_merma = false
                GROUP BY ccl.nombre
            """)
            result_cat = await self.session.execute(stmt_cat, {"lid": lote["lote_id"]})
            categorias = list(result_cat.mappings().all())
            
            items.append(RendimientoLoteItem(
                lote_id=lote["lote_id"],
                variedad=lote["variedad"],
                fecha_cosecha=lote["fecha_cosecha"],
                proveedor_nombre=lote["proveedor_nombre"],
                kilos_entrada=lote["kilos_entrada"],
                categorias=[dict(c) for c in categorias],
                merma_kg=lote["kilos_merma"] or Decimal("0"),
                merma_porcentaje=lote["merma_porcentaje"] or Decimal("0")
            ))
        
        return items

    async def get_valorizacion_inventario(self) -> List[ValorizacionInventarioItem]:
        stmt = text("""
            SELECT 
                p.id as producto_id, p.sku, p.nombre, cp.nombre as categoria,
                SUM(sa.kilos) as stock_total_kg,
                p.costo as costo_promedio_kg,
                SUM(sa.kilos * p.costo) as valor_total
            FROM stock_actual sa
            JOIN productos p ON p.id = sa.producto_id
            JOIN categorias_producto cp ON cp.id = p.categoria_id
            WHERE sa.kilos > 0 AND p.activo = true
            GROUP BY p.id, p.sku, p.nombre, cp.nombre, p.costo
            ORDER BY valor_total DESC
        """)
        result = await self.session.execute(stmt)
        return [ValorizacionInventarioItem(**dict(r)) for r in result.mappings().all()]

    async def get_movimientos_reporte(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        producto_id: Optional[int] = None,
        almacen_id: Optional[int] = None,
        lote_id: Optional[int] = None,
        tipo: Optional[str] = None,
        usuario_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MovimientoReporteItem]:
        stmt = text("""
            SELECT 
                m.id, m.fecha, m.tipo,
                p.sku as producto_sku, p.nombre as producto_nombre,
                a.nombre as almacen_nombre,
                l.variedad as lote_variedad,
                m.kilos, m.costo_por_kilo,
                u.email as usuario_nombre,
                m.referencia_tipo, m.referencia_id
            FROM movimientos m
            JOIN productos p ON p.id = m.producto_id
            JOIN almacenes a ON a.id = m.almacen_id
            LEFT JOIN lotes l ON l.id = m.lote_id
            JOIN usuarios u ON u.id = m.usuario_id
            WHERE 1=1
        """)
        params = {}
        
        if fecha_desde:
            stmt += text(" AND m.fecha >= :fecha_desde")
            params["fecha_desde"] = fecha_desde
        if fecha_hasta:
            stmt += text(" AND m.fecha <= :fecha_hasta")
            params["fecha_hasta"] = fecha_hasta
        if producto_id:
            stmt += text(" AND m.producto_id = :producto_id")
            params["producto_id"] = producto_id
        if almacen_id:
            stmt += text(" AND m.almacen_id = :almacen_id")
            params["almacen_id"] = almacen_id
        if lote_id:
            stmt += text(" AND m.lote_id = :lote_id")
            params["lote_id"] = lote_id
        if tipo:
            stmt += text(" AND m.tipo = :tipo")
            params["tipo"] = tipo
        if usuario_id:
            stmt += text(" AND m.usuario_id = :usuario_id")
            params["usuario_id"] = usuario_id
        
        stmt += text(" ORDER BY m.fecha DESC LIMIT :limit OFFSET :skip")
        params["limit"] = limit
        params["skip"] = skip
        
        result = await self.session.execute(stmt, params)
        return [MovimientoReporteItem(**dict(r)) for r in result.mappings().all()]

    async def get_auditoria(
        self,
        tabla: Optional[str] = None,
        registro_id: Optional[int] = None,
        accion: Optional[str] = None,
        usuario_id: Optional[int] = None,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditoriaItem]:
        from app.modules.audit.models import Auditoria
        stmt = select(Auditoria).options(selectinload(Auditoria.usuario))
        
        if tabla:
            stmt = stmt.where(Auditoria.tabla == tabla)
        if registro_id:
            stmt = stmt.where(Auditoria.registro_id == registro_id)
        if accion:
            stmt = stmt.where(Auditoria.accion == accion)
        if usuario_id:
            stmt = stmt.where(Auditoria.usuario_id == usuario_id)
        if fecha_desde:
            stmt = stmt.where(Auditoria.creado_en >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(Auditoria.creado_en <= fecha_hasta)
        
        stmt = stmt.order_by(Auditoria.creado_en.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        
        items = []
        for a in result.scalars().all():
            items.append(AuditoriaItem(
                id=a.id,
                tabla=a.tabla,
                registro_id=a.registro_id,
                accion=a.accion,
                valores_anteriores=a.valores_anteriores,
                valores_nuevos=a.valores_nuevos,
                usuario_nombre=a.usuario.email if a.usuario else "N/A",
                ip=a.ip,
                creado_en=a.creado_en
            ))
        return items