from decimal import Decimal
from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_
from sqlalchemy.orm import selectinload

from app.models import (
    CriterioClasificacion, CategoriaClasificacion,
    OrdenClasificacion, OrdenClasificacionLinea, Lote, Producto, Movimiento, StockActual
)
from app.models import Movimiento as MovimientoModel
from app.repositories.clasificacion import (
    CriterioClasificacionRepository,
    CategoriaClasificacionRepository,
    OrdenClasificacionRepository,
    OrdenClasificacionLineaRepository
)
from app.repositories.inventario import LoteRepository, ProductoRepository, StockActualRepository
from app.schemas import (
    CriterioClasificacionCreate, CriterioClasificacionUpdate,
    CategoriaClasificacionCreate, CategoriaClasificacionUpdate,
    OrdenClasificacionCreate, OrdenClasificacionUpdate,
    OrdenClasificacionLineaCreate, OrdenClasificacionBalanceInfo,
    OrdenClasificacionCerrar
)
from app.core.config import get_settings


settings = get_settings()


class ClasificacionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.criterio_repo = CriterioClasificacionRepository(session)
        self.categoria_repo = CategoriaClasificacionRepository(session)
        self.orden_repo = OrdenClasificacionRepository(session)
        self.linea_repo = OrdenClasificacionLineaRepository(session)
        self.lote_repo = LoteRepository(session)
        self.producto_repo = ProductoRepository(session)
        self.stock_repo = StockActualRepository(session)

    # Criterios
    async def create_criterio(self, criterio_in: CriterioClasificacionCreate) -> CriterioClasificacion:
        return await self.criterio_repo.create(criterio_in.model_dump())

    async def update_criterio(self, criterio_id: int, criterio_in: CriterioClasificacionUpdate) -> Optional[CriterioClasificacion]:
        criterio = await self.criterio_repo.get(criterio_id)
        if not criterio:
            return None
        return await self.criterio_repo.update(criterio, criterio_in.model_dump(exclude_unset=True))

    async def get_criterios_activos(self) -> List[CriterioClasificacion]:
        return await self.criterio_repo.get_activos()

    async def get_criterio_with_categorias(self, criterio_id: int) -> Optional[CriterioClasificacion]:
        return await self.criterio_repo.get_with_categorias(criterio_id)

    # Categorias
    async def create_categoria(self, categoria_in: CategoriaClasificacionCreate) -> CategoriaClasificacion:
        return await self.categoria_repo.create(categoria_in.model_dump())

    async def update_categoria(self, categoria_id: int, categoria_in: CategoriaClasificacionUpdate) -> Optional[CategoriaClasificacion]:
        categoria = await self.categoria_repo.get(categoria_id)
        if not categoria:
            return None
        return await self.categoria_repo.update(categoria, categoria_in.model_dump(exclude_unset=True))

    async def get_categorias_by_criterio(self, criterio_id: int) -> List[CategoriaClasificacion]:
        return await self.categoria_repo.get_by_criterio(criterio_id)

    # Órdenes de clasificación
    async def create_orden(self, orden_in: OrdenClasificacionCreate, operario_id: int) -> OrdenClasificacion:
        # Validate lote exists and has enough stock
        lote = await self.lote_repo.get(orden_in.lote_origen_id)
        if not lote:
            raise ValueError("Lote no encontrado")
        
        # Get stock of "sin clasificar" product for this lote
        stock = await self._get_stock_sin_clasificar(lote)
        if stock < orden_in.kilos_entrada:
            raise ValueError(f"Stock insuficiente en lote. Disponible: {stock}, Solicitado: {orden_in.kilos_entrada}")
        
        # Validate balance
        balance = self._calcular_balance(orden_in.lineas, orden_in.kilos_entrada)
        if not balance.esta_balanceado:
            raise ValueError(f"Balance no cuadra: diferencia {balance.diferencia} kg")
        
        orden_data = orden_in.model_dump(exclude={"lineas"})
        orden_data["operario_id"] = operario_id
        orden_data["kilos_clasificados"] = balance.kilos_clasificados
        orden_data["kilos_merma"] = balance.kilos_merma
        orden_data["merma_porcentaje"] = balance.merma_porcentaje
        orden_data["estado"] = "borrador"
        
        orden = await self.orden_repo.create(orden_data)
        
        # Create lines
        for linea_in in orden_in.lineas:
            linea_data = linea_in.model_dump()
            linea_data["orden_id"] = orden.id
            await self.linea_repo.create(linea_data)
        
        await self.session.flush()
        return await self.orden_repo.get_with_lineas(orden.id)

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
        merma_porcentaje = (kilos_merma / kilos_entrada * 100) if kilos_entrada > 0 else Decimal("0")
        tolerancia = Decimal(str(settings.CLASSIFICATION_TOLERANCE_KG))
        esta_balanceado = abs(diferencia) <= tolerancia
        
        return OrdenClasificacionBalanceInfo(
            kilos_entrada=kilos_entrada,
            kilos_clasificados=kilos_clasificados,
            kilos_merma=kilos_merma,
            diferencia=diferencia,
            merma_porcentaje=merma_porcentaje.quantize(Decimal("0.01")),
            esta_balanceado=esta_balanceado,
            tolerancia_kg=tolerancia
        )

    async def get_balance_info(self, orden_id: int) -> OrdenClasificacionBalanceInfo:
        orden = await self.orden_repo.get_with_lineas(orden_id)
        if not orden:
            raise ValueError("Orden no encontrada")
        
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

    async def cerrar_orden(self, orden_id: int, usuario_id: int) -> OrdenClasificacion:
        orden = await self.orden_repo.get_with_lineas(orden_id)
        if not orden:
            raise ValueError("Orden no encontrada")
        if orden.estado != "borrador":
            raise ValueError("Solo se pueden cerrar órdenes en estado borrador")
        
        # Validate balance one more time
        balance = await self.get_balance_info(orden_id)
        if not balance.esta_balanceado:
            raise ValueError(f"Balance no cuadra: diferencia {balance.diferencia} kg (tolerancia: {balance.tolerancia_kg} kg)")
        
        # Get lote and source product (sin clasificar)
        lote = await self.lote_repo.get(orden.lote_origen_id)
        if not lote:
            raise ValueError("Lote de origen no encontrado")
        
        producto_sin_clasificar = await self._get_producto_sin_clasificar(lote.variedad)
        almacen_origen = await self._get_almacen_lote(lote.id)
        
        # Create salida movement for sin clasificar
        movimiento_salida = MovimientoModel(
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
        await self.stock_repo.decrement_stock(
            producto_sin_clasificar.id, almacen_origen, lote.id, orden.kilos_entrada,
            allow_negative=settings.ALLOW_NEGATIVE_STOCK
        )
        
        # Distribute cost
        costo_total_lote = lote.costo_por_kilo * orden.kilos_entrada
        await self._repartir_costo(orden, costo_total_lote)
        
        # Create entrada movements for each result line
        for linea in orden.lineas:
            if linea.es_merma:
                continue
            
            # Get or create product for this classification result
            producto_resultado = await self._get_or_create_producto_clasificado(
                lote.variedad, linea.categoria_clasificacion_id, linea.atributos_jsonb
            )
            
            movimiento_entrada = MovimientoModel(
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
            await self.stock_repo.increment_stock(
                producto_resultado.id, linea.almacen_destino_id, lote.id, linea.kilos
            )
        
        # Create merma movement if applicable
        if orden.kilos_merma > 0:
            movimiento_merma = MovimientoModel(
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
            await self.stock_repo.decrement_stock(
                producto_sin_clasificar.id, almacen_origen, lote.id, orden.kilos_merma,
                allow_negative=settings.ALLOW_NEGATIVE_STOCK
            )
        
        # Update orden
        orden.estado = "cerrada"
        orden.cerrada_en = datetime.utcnow()
        await self.session.flush()
        
        return await self.orden_repo.get_with_lineas(orden.id)

    async def _repartir_costo(self, orden: OrdenClasificacion, costo_total: Decimal):
        """Distribute cost among result lines based on method."""
        if orden.costo_reparto_metodo == "peso":
            # By weight
            total_kilos = sum(l.kilos for l in orden.lineas if not l.es_merma)
            if total_kilos > 0:
                for linea in orden.lineas:
                    if not linea.es_merma:
                        proporcion = linea.kilos / total_kilos
                        linea.costo_asignado = (costo_total * proporcion).quantize(Decimal("0.01"))
                        linea.costo_por_kilo = (linea.costo_asignado / linea.kilos).quantize(Decimal("0.0001")) if linea.kilos > 0 else Decimal("0")
        else:
            # By relative price (precio_relativo)
            # Get suggested prices for each product
            precios = {}
            for linea in orden.lineas:
                if not linea.es_merma:
                    producto = await self.producto_repo.get(linea.producto_id)
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

    async def _get_stock_sin_clasificar(self, lote: Lote) -> Decimal:
        producto = await self._get_producto_sin_clasificar(lote.variedad)
        if not producto:
            return Decimal("0")
        stocks = await self.stock_repo.get_stock_by_producto(producto.id)
        total = Decimal("0")
        for s in stocks:
            if s["lote_id"] == lote.id:
                total += s["kilos"]
        return total

    async def _get_producto_sin_clasificar(self, variedad: str) -> Optional[Producto]:
        stmt = select(Producto).where(
            Producto.nombre == f"Papa {variedad} (Sin clasificar)",
            Producto.activo == True
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_or_create_producto_clasificado(
        self, variedad: str, categoria_id: Optional[int], atributos: Optional[dict]
    ) -> Producto:
        # Build product name based on criteria
        if categoria_id:
            categoria = await self.categoria_repo.get(categoria_id)
            nombre = f"Papa {variedad} ({categoria.nombre if categoria else 'Clasificado'})"
        else:
            nombre = f"Papa {variedad} (Clasificado)"
        
        stmt = select(Producto).where(Producto.nombre == nombre, Producto.activo == True)
        result = await self.session.execute(stmt)
        producto = result.scalar_one_or_none()
        
        if not producto:
            # Get categoria "Clasificado" or first active
            categoria_prod = await self.producto_repo.categoria_repo.get_by(nombre="Clasificado")
            if not categoria_prod:
                categorias = await self.producto_repo.categoria_repo.list(activo=True, limit=1)
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
        # Get the almacen where the lote's sin clasificar stock is stored
        stmt = select(StockActual.almacen_id).where(
            StockActual.lote_id == lote_id,
            StockActual.kilos > 0
        ).limit(1)
        result = await self.session.execute(stmt)
        almacen_id = result.scalar_one_or_none()
        return almacen_id or 1

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
        return await self.orden_repo.list_with_filters(
            fecha_desde, fecha_hasta, lote_origen_id, estado, skip, limit
        )