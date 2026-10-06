from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class CategoriaProductoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    activa: bool = True


class CategoriaProductoCreate(CategoriaProductoBase):
    pass


class CategoriaProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None
    activa: Optional[bool] = None


class CategoriaProductoResponse(CategoriaProductoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class PresentacionBase(BaseModel):
    nombre: str = Field(..., max_length=50)
    kilos_defecto: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=3)
    activa: bool = True


class PresentacionCreate(PresentacionBase):
    pass


class PresentacionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    kilos_defecto: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=3)
    activa: Optional[bool] = None


class PresentacionResponse(PresentacionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AlmacenBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    ubicacion: Optional[str] = None
    activo: bool = True


class AlmacenCreate(AlmacenBase):
    pass


class AlmacenUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    ubicacion: Optional[str] = None
    activo: Optional[bool] = None


class AlmacenResponse(AlmacenBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ProveedorBase(BaseModel):
    nombre: str = Field(..., max_length=150)
    contacto: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=150)
    direccion: Optional[str] = None
    rfc: Optional[str] = Field(None, max_length=20)
    condiciones_pago: Optional[str] = Field(None, max_length=100)
    dias_credito: int = Field(0, ge=0)
    activo: bool = True


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    contacto: Optional[str] = Field(None, max_length=150)
    telefono: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=150)
    direccion: Optional[str] = None
    rfc: Optional[str] = Field(None, max_length=20)
    condiciones_pago: Optional[str] = Field(None, max_length=100)
    dias_credito: Optional[int] = Field(None, ge=0)
    activo: Optional[bool] = None


class ProveedorResponse(ProveedorBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductoBase(BaseModel):
    sku: str = Field(..., max_length=80)
    nombre: str = Field(..., max_length=150)
    categoria_id: int
    unidad_base: str = Field("kg", max_length=30)
    costo: Decimal = Field(0, ge=0, max_digits=14, decimal_places=4)
    precio_sugerido_kg: Decimal = Field(0, ge=0, max_digits=12, decimal_places=4)
    stock_minimo: Decimal = Field(0, ge=0, max_digits=14, decimal_places=3)
    activo: bool = True


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=80)
    nombre: Optional[str] = Field(None, max_length=150)
    categoria_id: Optional[int] = None
    unidad_base: Optional[str] = Field(None, max_length=30)
    costo: Optional[Decimal] = Field(None, ge=0, max_digits=14, decimal_places=4)
    precio_sugerido_kg: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=4)
    stock_minimo: Optional[Decimal] = Field(None, ge=0, max_digits=14, decimal_places=3)
    activo: Optional[bool] = None


class ProductoResponse(ProductoBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime
    categoria: Optional[CategoriaProductoResponse] = None

    model_config = ConfigDict(from_attributes=True)


class ProductoStockInfo(BaseModel):
    producto_id: int
    sku: str
    nombre: str
    categoria: Optional[str] = None
    stock_total: Decimal
    stock_disponible: Decimal
    precio_sugerido_kg: Decimal

    model_config = ConfigDict(from_attributes=True)


class LoteBase(BaseModel):
    proveedor_id: Optional[int] = None
    parcela: Optional[str] = Field(None, max_length=150)
    fecha_cosecha: Optional[datetime] = None
    fecha_recepcion: datetime
    variedad: str = Field(..., max_length=100)
    kilos_recibidos: Decimal = Field(..., gt=0, max_digits=14, decimal_places=3)
    costo_total: Decimal = Field(..., ge=0, max_digits=14, decimal_places=2)


class LoteCreate(LoteBase):
    pass


class LoteUpdate(BaseModel):
    proveedor_id: Optional[int] = None
    parcela: Optional[str] = Field(None, max_length=150)
    fecha_cosecha: Optional[datetime] = None
    fecha_recepcion: Optional[datetime] = None
    variedad: Optional[str] = Field(None, max_length=100)
    kilos_recibidos: Optional[Decimal] = Field(None, gt=0, max_digits=14, decimal_places=3)
    costo_total: Optional[Decimal] = Field(None, ge=0, max_digits=14, decimal_places=2)
    activo: Optional[bool] = None


class LoteResponse(LoteBase):
    id: int
    costo_por_kilo: Decimal
    activo: bool
    eliminado_en: Optional[datetime]
    creado_en: datetime
    actualizado_en: datetime
    proveedor: Optional[ProveedorResponse] = None

    model_config = ConfigDict(from_attributes=True)


class StockActualBase(BaseModel):
    producto_id: int
    almacen_id: int
    lote_id: int
    kilos: Decimal = Field(0, ge=0, max_digits=14, decimal_places=3)


class StockActualResponse(StockActualBase):
    actualizado_en: datetime
    producto: Optional[ProductoResponse] = None

    model_config = ConfigDict(from_attributes=True)


class MovimientoTipo(str, Enum):
    ENTRADA_COMPRA = "entrada_compra"
    SALIDA_VENTA = "salida_venta"
    ENTRADA_CLASIFICACION = "entrada_clasificacion"
    SALIDA_CLASIFICACION = "salida_clasificacion"
    MERMA = "merma"
    AJUSTE_INVENTARIO = "ajuste_inventario"
    TRASLADO_ENTRADA = "traslado_entrada"
    TRASLADO_SALIDA = "salida_traslado"


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
    producto: Optional[ProductoResponse] = None
    almacen: Optional[AlmacenResponse] = None
    lote: Optional[LoteResponse] = None

    model_config = ConfigDict(from_attributes=True)


class StockConsulta(BaseModel):
    producto_id: int
    almacen_id: Optional[int] = None
    lote_id: Optional[int] = None
    kilos: Decimal

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