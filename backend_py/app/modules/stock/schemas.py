from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class MovimientoTipo(str, Enum):
    ENTRADA_COMPRA = "entrada_compra"
    SALIDA_VENTA = "salida_venta"
    ENTRADA_CLASIFICACION = "entrada_clasificacion"
    SALIDA_CLASIFICACION = "salida_clasificacion"
    MERMA = "merma"
    AJUSTE_INVENTARIO = "ajuste_inventario"
    TRASLADO_ENTRADA = "traslado_entrada"
    TRASLADO_SALIDA = "salida_traslado"


class StockActualBase(BaseModel):
    producto_id: int
    almacen_id: int
    lote_id: int
    kilos: Decimal = Field(0, ge=0, max_digits=14, decimal_places=3)


class StockActualResponse(StockActualBase):
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class StockPorAlmacen(BaseModel):
    almacen_id: int
    almacen_nombre: str
    kilos: Decimal


class StockPorLote(BaseModel):
    lote_id: int
    lote_variedad: str
    lote_fecha_cosecha: Optional[datetime]
    kilos: Decimal


class StockDetalle(BaseModel):
    producto_id: int
    sku: str
    nombre: str
    stock_total: Decimal
    por_almacen: List[StockPorAlmacen]
    por_lote: List[StockPorLote]

    model_config = ConfigDict(from_attributes=True)


class MovimientoBase(BaseModel):
    producto_id: int
    almacen_id: int
    lote_id: Optional[int] = None
    tipo: MovimientoTipo
    kilos: Decimal = Field(..., max_digits=14, decimal_places=3)
    costo_por_kilo: Optional[Decimal] = Field(None, max_digits=12, decimal_places=4)
    referencia_tipo: Optional[str] = Field(None, max_length=50)
    referencia_id: Optional[int] = None
    notas: Optional[str] = None


class MovimientoCreate(MovimientoBase):
    pass


class MovimientoResponse(MovimientoBase):
    id: int
    fecha: datetime
    usuario_id: int
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


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


class MovimientoReporteFiltros(BaseModel):
    fecha_desde: Optional[datetime] = None
    fecha_hasta: Optional[datetime] = None
    producto_id: Optional[int] = None
    almacen_id: Optional[int] = None
    lote_id: Optional[int] = None
    tipo: Optional[str] = None
    usuario_id: Optional[int] = None


class AjusteInventarioCreate(BaseModel):
    almacen_id: int
    producto_id: int
    lote_id: Optional[int] = None
    stock_fisico: Decimal = Field(..., max_digits=14, decimal_places=3)
    motivo: str

    model_config = ConfigDict(from_attributes=True)


class AjusteInventarioResponse(BaseModel):
    id: int
    almacen_id: int
    producto_id: int
    lote_id: Optional[int]
    stock_sistema: Decimal
    stock_fisico: Decimal
    diferencia: Decimal
    motivo: str
    usuario_id: int
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)