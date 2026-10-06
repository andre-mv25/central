from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class CompradorBase(BaseModel):
    nombre: str = Field(..., max_length=150)
    telefono: Optional[str] = Field(None, max_length=30)
    activo: bool = True


class CompradorCreate(CompradorBase):
    pass


class CompradorUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=30)
    activo: Optional[bool] = None


class CompradorResponse(CompradorBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class CompradorAutocomplete(BaseModel):
    id: int
    nombre: str
    telefono: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VentaLineaBase(BaseModel):
    producto_id: int
    lote_id: Optional[int] = None
    kilos: Decimal = Field(..., gt=0, max_digits=14, decimal_places=3)
    presentacion: Optional[str] = Field(None, max_length=50)
    unidades: Optional[Decimal] = Field(None, max_digits=10, decimal_places=2)
    precio_por_kilo: Decimal = Field(..., ge=0, max_digits=12, decimal_places=4)


class VentaLineaCreate(VentaLineaBase):
    pass


class VentaLineaUpdate(BaseModel):
    producto_id: Optional[int] = None
    lote_id: Optional[int] = None
    kilos: Optional[Decimal] = Field(None, gt=0, max_digits=14, decimal_places=3)
    presentacion: Optional[str] = Field(None, max_length=50)
    unidades: Optional[Decimal] = Field(None, max_digits=10, decimal_places=2)
    precio_por_kilo: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=4)


class VentaLineaResponse(VentaLineaBase):
    id: int
    venta_id: int
    total_linea: Decimal

    model_config = ConfigDict(from_attributes=True)


class VentaBase(BaseModel):
    comprador_id: Optional[int] = None
    lineas: List[VentaLineaCreate] = Field(..., min_length=1)


class VentaCreate(VentaBase):
    pass


class VentaUpdate(BaseModel):
    comprador_id: Optional[int] = None


class VentaResponse(VentaBase):
    id: int
    fecha: datetime
    usuario_id: int
    total: Decimal
    estado: str
    anulada_en: Optional[datetime]
    anulada_por_id: Optional[int]
    creado_en: datetime
    comprador: Optional[CompradorResponse] = None
    lineas: List[VentaLineaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class VentaAnular(BaseModel):
    motivo: Optional[str] = None


class VentaRapidaLineaInput(BaseModel):
    producto_id: int
    kilos: Decimal = Field(..., gt=0, max_digits=14, decimal_places=3)
    presentacion: Optional[str] = Field(None, max_length=50)
    unidades: Optional[Decimal] = Field(None, max_digits=10, decimal_places=2)
    precio_por_kilo: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=4)
    total_linea: Optional[Decimal] = Field(None, ge=0, max_digits=14, decimal_places=2)


class VentaRapidaCreate(BaseModel):
    comprador_id: Optional[int] = None
    comprador_nombre: Optional[str] = Field(None, max_length=150)
    lineas: List[VentaRapidaLineaInput] = Field(..., min_length=1)


class VentaRapidaLineaResponse(BaseModel):
    producto_id: int
    sku: str
    nombre: str
    categoria: Optional[str] = None
    stock_disponible: Decimal
    kilos: Decimal
    presentacion: Optional[str] = None
    unidades: Optional[Decimal] = None
    precio_por_kilo: Decimal
    total_linea: Decimal
    lote_usado_id: Optional[int] = None
    lote_usado_variedad: Optional[str] = None


class VentaRapidaResponse(BaseModel):
    venta_id: int
    fecha: datetime
    total: Decimal
    comprador_nombre: Optional[str] = None
    lineas: List[VentaRapidaLineaResponse]

    model_config = ConfigDict(from_attributes=True)


class TicketVenta(BaseModel):
    venta_id: int
    fecha: datetime
    comprador_nombre: Optional[str] = None
    vendedor_nombre: str
    lineas: List[VentaLineaResponse]
    total: Decimal
    estado: str

    model_config = ConfigDict(from_attributes=True)


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


# Import List at the end to avoid circular import
from typing import List