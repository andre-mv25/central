from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.modules.classification.repository import (
    CriterioClasificacionRepository,
    CategoriaClasificacionRepository,
    OrdenClasificacionRepository,
    OrdenClasificacionLineaRepository
)
from app.modules.classification.models import (
    CriterioClasificacion, CategoriaClasificacion,
    OrdenClasificacion, OrdenClasificacionLinea
)
from app.modules.classification.schemas import (
    CriterioClasificacionCreate, CriterioClasificacionUpdate,
    CategoriaClasificacionCreate, CategoriaClasificacionUpdate,
    OrdenClasificacionCreate, OrdenClasificacionUpdate,
    OrdenClasificacionLineaCreate, OrdenClasificacionBalanceInfo,
)
from app.modules.lots.service import LoteService
from app.modules.products.service import ProductoService
from app.modules.stock.service import StockService
from app.modules.auth.models import User
from app.core.config import get_settings
from app.core.exceptions import NotFoundError, BalanceError, ValidationError

settings = get_settings()


class ClasificacionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.criterio_repo = CriterioClasificacionRepository(session)
        self.categoria_repo = CategoriaClasificacionRepository(session)
        self.orden_repo = OrdenClasificacionRepository(session)
        self.linea_repo = OrdenClasificacionLineaRepository(session)
        self.lote_service = LoteService(session)
        self.producto_service = ProductoService(session)
        self.stock_service = StockService(session)

    # Criterios
    async def create_criterio(self, criterio_in: CriterioClasificacionCreate) -> CriterioClasificacion:
        existing = await self.criterio_repo.get_by_nombre(criterio_in.nombre)
        if existing:
            from app.core.exceptions import ConflictError
            raise ConflictError(f"Criterio {criterio_in.nombre} ya existe")
        return await self.criterio_repo.create(criterio_in.model_dump())

    async def update_criterio(self, criterio_id: int, criterio_in: CriterioClasificacionUpdate) -> Optional[CriterioClasificacion]:
        criterio = await self.criterio_repo.get(criterio_id)
        if not criterio:
            raise NotFoundError("Criterio", criterio_id)
        return await self.criterio_repo.update(criterio, criterio_in.model_dump(exclude_unset=True))

    async def get_criterios(self, activo: Optional[bool] = True) -> List[CriterioClasificacion]:
        return await self.criterio_repo.list(activo)

    async def get_criterio_with_categorias(self, criterio_id: int) -> Optional[CriterioClasificacion]:
        return await self.criterio_repo.get_with_categorias(criterio_id)

    # Categorías
    async def create_categoria(self, cat_in: CategoriaClasificacionCreate) -> CategoriaClasificacion:
        existing = await self.categoria_repo.get_by_criterio_y_nombre(cat_in.criterio_id, cat_in.nombre)
        if existing:
            from app.core.exceptions import ConflictError
            raise ConflictError(f"Categoría {cat_in.nombre} ya existe para este criterio")
        return await self.categoria_repo.create(cat_in.model_dump())

    async def update_categoria(self, categoria_id: int, cat_in: CategoriaClasificacionUpdate) -> Optional[CategoriaClasificacion]:
        categoria = await self.categoria_repo.get(categoria_id)
        if not categoria:
            raise NotFoundError("Categoría", categoria_id)
        return await self.categoria_repo.update(categoria, cat_in.model_dump(exclude_unset=True))

    async def get_categorias_by_criterio(self, criterio_id: int) -> List[CategoriaClasificacion]:
        return await self.categoria_repo.get_by_criterio(criterio_id)

    # Órdenes
    def _calcular_balance(self, lineas: List[OrdenClasificacionLineaCreate], kilos_entrada: Decimal) -> OrdenClasificacionBalanceInfo:
        kilos_clasificados = Decimal("0")
        kilos_merma = Decimal("0")
        
        for linea in lineas:
            if linea.es_merma:
                kilos_merma += linea.kilos
            else:
                kilos_clasificados += linea.kilos
        
        total_salida = kilos_clasificados + kilos_merma
        diferencia = kilos_entrada - total_salida
        merma_porcentaje = (kilos_merma / kilos_entrada * 100).quantize(Decimal("0.01")) if kilos_entrada > 0 else Decimal("0")
        tolerancia = Decimal(str(settings.CLASSIFICATION_TOLERANCE_KG))
        esta_balanceado = abs(diferencia) <= tolerancia
        
        return OrdenClasificacionBalanceInfo(
            kilos_entrada=kilos_entrada,
            kilos_clasificados=kilos_clasificados,
            kilos_merma=kilos_merma,
            diferencia=diferencia,
            merma_porcentaje=merma_porcentaje,
            esta_balanceado=esta_balanceado,
            tolerancia_kg=tolerancia
        )

    async def create_orden(self, orden_in: OrdenClasificacionCreate, operario_id: int) -> OrdenClasificacion:
        # Validate lote exists
        lote = await self.lote_service.get_lote(orden_in.lote_origen_id)
        if not lote:
            raise NotFoundError("Lote", orden_in.lote_origen_id)
        
        # Get stock of "sin clasificar" product for this lote
        stock = await self._get_stock_sin_clasificar(lote)
        if stock < orden_in.kilos_entrada:
            raise ValidationError(f"Stock insuficiente en lote. Disponible: {stock} kg, Solicitado: {orden_in.kilos_entrada} kg")
        
        # Validate balance
        balance = self._calcular_balance(orden_in.lineas, orden_in.kilos_entrada)
        if not balance.esta_balanceado:
            raise BalanceError(float(balance.diferencia), float(balance.tolerancia_kg))
        
        orden_data = orden_in.model_dump(exclude={"lineas"})
        orden_data["operario_id"] = operario_id
        orden_data["kilos_clasificados"] = balance.kilos_clasificados
        orden_data["kilos_merma"] = balance.kilos_merma
        orden_data["merma_porcentaje"] = balance.merma_porcentaje
        orden_data["estado"] = "borrador"
        
        orden = await self.orden_repo.create(orden_data)
        
        # Create lines
        lineas_data = [linea.model_dump() | {"orden_id": orden.id} for linea in orden_in.lineas]
        await self.linea_repo.bulk_create(lineas_data)
        
        await self.session.flush()
        return await self.orden_repo.get_with_lineas(orden.id)

    async def get_balance_info(self, orden_id: int) -> OrdenClasificacionBalanceInfo:
        orden = await self.orden_repo.get_with_lineas(orden_id)
        if not orden:
            raise NotFoundError("Orden", orden_id)
        
        lineas_data = [
            OrdenClasificacionLineaCreate(
                producto_id=l.producto_id,
                categoria_clasificacion_id=l.categoria_clasificacion_id,
                almacen_destino_id=l.almacen_destino_id,
                kilos=l.kilos,
                atributos_jsonb=l.atributos_jsonb,
                es_merma=l.es_merma
            )
            for l in orden.lineas
        ]
        
        return self._calcular_balance(lineas_data, orden.kilos_entrada)

    async def _get_stock_sin_clasificar(self, lote: "Lote") -> Decimal:
        from app.modules.products.models import Producto
        stmt = select(Producto).where(
            Producto.nombre == f"Papa {lote.variedad} (Sin clasificar)",
            Producto.activo == True
        )
        result = await self.session.execute(stmt)
        producto = result.scalar_one_or_none()
        
        if not producto:
            return Decimal("0")
        
        stocks = await self.stock_service.get_stock_producto(producto.id)
        total = Decimal("0")
        for s in stocks:
            if s["lote_id"] == lote.id:
                total += s["kilos"]
        return total

    async def _get_producto_sin_clasificar(self, variedad: str) -> Optional["Producto"]:
        from app.modules.products.models import Producto
        stmt = select(Producto).where(
            Producto.nombre == f"Papa {variedad} (Sin clasificar)",
            Producto.activo == True
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_or_create_producto_clasificado(
        self, variedad: str, categoria_id: Optional[int], atributos: Optional[dict]
    ) -> "Producto":
        from app.modules.products.models import Producto
        from app.modules.products.service import ProductoService
        
        if categoria_id:
            categoria = await self.categoria_repo.get(categoria_id)
            nombre = f"Papa {variedad} ({categoria.nombre if categoria else 'Clasificado'})"
        else:
            nombre = f"Papa {variedad} (Clasificado)"
        
        stmt = select(Producto).where(Producto.nombre == nombre, Producto.activo == True)
        result = await self.session.execute(stmt)
        producto = result.scalar_one_or_none()
        
        if not producto:
            categoria_prod = await self.producto_service.categoria_repo.get_by_nombre("Clasificado")
            if not categoria_prod:
                categorias = await self.producto_service.categoria_repo.list(activo=True, limit=1)
                categoria_prod = categorias[0] if categorias else None
            
            producto = Producto(
                sku=f"CLAS-{variedad.upper()}-{categoria_id or 'MIX'}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                nombre=nombre,
                categoria_id=categoria_prod.id if categoria_prod else 1,
                costo=Decimal("0"),
                precio_sugerido_kg=Decimal("0"),
                stock_minimo=Decimal("0"),
                activo=True
            )
            self.session.add(producto)
            await self.session.flush()
        
        return producto

    async def _get_almacen_lote(self, lote_id: int) -> int:
        stmt = select(StockActual.almacen_id).where(
            StockActual.lote_id == lote_id,
            StockActual.kilos > 0
        ).limit(1)
        result = await self.session.execute(stmt)
        almacen_id = result.scalar_one_or_none()
        return almacen_id or 1

    async def cerrar_orden(self, orden_id: int, usuario_id: int) -> OrdenClasificacion:
        orden = await self.orden_repo.get_with_lineas(orden_id)
        if not orden:
            raise NotFoundError("Orden", orden_id)
        if orden.estado != "borrador":
            raise ValidationError("Solo se pueden cerrar órdenes en estado borrador")
        
        # Validate balance
        balance = await self.get_balance_info(orden_id)
        if not balance.esta_balanceado:
            raise BalanceError(float(balance.diferencia), float(balance.tolerancia_kg))
        
        lote = await self.lote_service.get_lote(orden.lote_origen_id)
        if not lote:
            raise NotFoundError("Lote de origen", orden.lote_origen_id)
        
        producto_sin_clasificar = await self._get_producto_sin_clasificar(lote.variedad)
        almacen_origen = await self._get_almacen_lote(lote.id)
        
        # Create salida movement for sin clasificar
        from app.modules.stock.models import Movimiento
        movimiento_salida = Movimiento(
            producto_id=producto_sin_clasificar.id,
            almacen_id=almacen_origen,
            lote_id=lote.id,
            tipo="salida_clasificacion",
            kilos=-orden.kilos_entrada,
            costo_por_kilo=lote.costo_por_kilo,
            usuario_id=usuario_id,
            referencia_tipo="orden_clasificacion",
            referencia_id=orden.id,
            notas=f"Clasificación orden #{orden.id} - {lote.variedad}"
        )
        self.session.add(movimiento_salida)
        await self.stock_service.stock_repo.decrement_stock(
            producto_sin_clasificar.id, almacen_origen, lote.id, orden.kilos_entrada,
            allow_negative=settings.ALLOW_NEGATIVE_STOCK
        )
        
        # Distribute cost
        await self._repartir_costo(orden, lote.costo_por_kilo * orden.kilos_entrada)
        
        # Create entrada movements for each result line
        for linea in orden.lineas:
            if linea.es_merma:
                continue
            
            producto_resultado = await self._get_or_create_producto_clasificado(
                lote.variedad, linea.categoria_clasificacion_id, linea.atributos_jsonb
            )
            
            movimiento_entrada = Movimiento(
                producto_id=producto_resultado.id,
                almacen_id=linea.almacen_destino_id,
                lote_id=lote.id,
                tipo="entrada_clasificacion",
                kilos=linea.kilos,
                costo_por_kilo=linea.costo_por_kilo,
                usuario_id=usuario_id,
                referencia_tipo="orden_clasificacion",
                referencia_id=orden.id,
                notas=f"Clasificación orden #{orden.id} - {linea.producto.nombre}"
            )
            self.session.add(movimiento_entrada)
            await self.stock_service.stock_repo.increment_stock(
                producto_resultado.id, linea.almacen_destino_id, lote.id, linea.kilos
            )
        
        # Create merma movement if applicable
        if orden.kilos_merma > 0:
            movimiento_merma = Movimiento(
                producto_id=producto_sin_clasificar.id,
                almacen_id=almacen_origen,
                lote_id=lote.id,
                tipo="merma",
                kilos=-orden.kilos_merma,
                costo_por_kilo=lote.costo_por_kilo,
                usuario_id=usuario_id,
                referencia_tipo="orden_clasificacion",
                referencia_id=orden.id,
                notas=f"Merma orden #{orden.id}"
            )
            self.session.add(movimiento_merma)
            await self.stock_service.stock_repo.decrement_stock(
                producto_sin_clasificar.id, almacen_origen, lote.id, orden.kilos_merma,
                allow_negative=settings.ALLOW_NEGATIVE_STOCK
            )
        
        # Update orden
        orden.estado = "cerrada"
        orden.cerrada_en = datetime.utcnow()
        await self.session.flush()
        
        return await self.orden_repo.get_with_lineas(orden.id)

    async def _repartir_costo(self, orden: OrdenClasificacion, costo_total: Decimal):
        if orden.costo_reparto_metodo == "peso":
            total_kilos = sum(l.kilos for l in orden.lineas if not l.es_merma)
            if total_kilos > 0:
                for linea in orden.lineas:
                    if not linea.es_merma:
                        proporcion = linea.kilos / total_kilos
                        linea.costo_asignado = (costo_total * proporcion).quantize(Decimal("0.01"))
                        linea.costo_por_kilo = (linea.costo_asignado / linea.kilos).quantize(Decimal("0.0001")) if linea.kilos > 0 else Decimal("0")
        else:
            precios = {}
            for linea in orden.lineas:
                if not linea.es_merma:
                    producto = await self.producto_service.get_producto(linea.producto_id)
                    precios[linea.id] = producto.precio_sugerido_kg if producto else Decimal("0")
            
            total_valor = sum(p * l.kilos for l in orden.lineas if not l.es_merma for p_id, p in precios.items() if p_id == l.id)
            if total_valor > 0:
                for linea in orden.lineas:
                    if not linea.es_merma:
                        valor_linea = precios.get(linea.id, Decimal("0")) * linea.kilos
                        proporcion = valor_linea / total_valor
                        linea.costo_asignado = (costo_total * proporcion).quantize(Decimal("0.01"))
                        linea.costo_por_kilo = (linea.costo_asignado / linea.kilos).quantize(Decimal("0.0001")) if linea.kilos > 0 else Decimal("0")
        
        await self.session.flush()

    async def get_rendimiento_lote(self, lote_id: int) -> Optional[dict]:
        return await self.orden_repo.get_rendimiento_lote(lote_id)

    async def list_ordenes(
        self,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        lote_origen_id: Optional[int] = None,
        estado: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[OrdenClasificacion]:
        return await self.orden_repo.list(fecha_desde, fecha_hasta, lote_origen_id, estado, skip, limit)