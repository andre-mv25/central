from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict


class DashboardStats(BaseModel):
    stock_bajo_count: int
    ventas_hoy_count: int
    kilos_vendidos_hoy: Decimal
    valor_inventario_total: Decimal
    ultimos_movimientos: List["MovimientoResumen"]
    alertas_stock_minimo: List["AlertaStockMinimo"]

    model_config = ConfigDict(from_attributes=True)


class MovimientoResumen(BaseModel):
    id: int
    fecha: datetime
    tipo: str
    producto_nombre: str
    almacen_nombre: str
    kilos: Decimal
    usuario_nombre: str

    model_config = ConfigDict(from_attributes=True)


class AlertaStockMinimo(BaseModel):
    producto_id: int
    sku: str
    nombre: str
    stock_actual: Decimal
    stock_minimo: Decimal
    almacen_nombre: str

    model_config = ConfigDict(from_attributes=True)


class VentaReporteFiltros(BaseModel):
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None
    comprador_id: Optional[int] = None
    producto_id: Optional[int] = None
    usuario_id: Optional[int] = None


class VentaReporteItem(BaseModel):
    venta_id: int
    fecha: datetime
    comprador_nombre: Optional[str] = None
    usuario_nombre: str
    total: Decimal
    estado: str
    lineas_count: int

    model_config = ConfigDict(from_attributes=True)


class VentasPorProductoItem(BaseModel):
    producto_id: int
    sku: str
    nombre: str
    categoria: str
    kilos_vendidos: Decimal
    total_ventas: Decimal
    precio_promedio_kg: Decimal
    num_ventas: int

    model_config = ConfigDict(from_attributes=True)


class VentasPorCompradorItem(BaseModel):
    comprador_id: int
    nombre: str
    telefono: Optional[str] = None
    kilos_comprados: Decimal
    total_compras: Decimal
    num_ventas: int
    ultima_compra: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RendimientoLoteItem(BaseModel):
    lote_id: int
    variedad: str
    fecha_cosecha: Optional[datetime] = None
    proveedor_nombre: Optional[str] = None
    kilos_entrada: Decimal
    categorias: List[Dict[str, any]]
    merma_kg: Decimal
    merma_porcentaje: Decimal

    model_config = ConfigDict(from_attributes=True)


class ValorizacionInventarioItem(BaseModel):
    producto_id: int
    sku: str
    nombre: str
    categoria: str
    stock_total_kg: Decimal
    costo_promedio_kg: Decimal
    valor_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class MovimientoReporteFiltros(BaseModel):
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None
    producto_id: Optional[int] = None
    almacen_id: Optional[int] = None
    lote_id: Optional[int] = None
    tipo: Optional[str] = None
    usuario_id: Optional[int] = None


class MovimientoReporteItem(BaseModel):
    id: int
    fecha: datetime
    tipo: str
    producto_sku: str
    producto_nombre: str
    almacen_nombre: str
    lote_variedad: Optional[str] = None
    kilos: Decimal
    costo_por_kilo: Optional[Decimal] = None
    usuario_nombre: str
    referencia_tipo: Optional[str] = None
    referencia_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ExportRequest(BaseModel):
    formato: str = Field("csv", pattern="^(csv|excel)$")
    filtros: Optional[dict] = None


class AuditoriaFiltros(BaseModel):
    tabla: Optional[str] = None
    registro_id: Optional[int] = None
    accion: Optional[str] = None
    usuario_id: Optional[int] = None
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None


class AuditoriaItem(BaseModel):
    id: int
    tabla: str
    registro_id: int
    accion: str
    valores_anteriores: Optional[dict] = None
    valores_nuevos: Optional[dict] = None
    usuario_nombre: str
    ip: Optional[str] = None
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)