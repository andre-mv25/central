from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


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


class LoteBase(BaseModel):
    proveedor_id: Optional[int] = None
    parcela: Optional[str] = Field(None, max_length=150)
    fecha_cosecha: Optional[date] = None
    fecha_recepcion: date
    variedad: str = Field(..., max_length=100)
    kilos_recibidos: Decimal = Field(..., gt=0, max_digits=14, decimal_places=3)
    costo_total: Decimal = Field(..., ge=0, max_digits=14, decimal_places=2)


class LoteCreate(LoteBase):
    pass


class LoteUpdate(BaseModel):
    proveedor_id: Optional[int] = None
    parcela: Optional[str] = Field(None, max_length=150)
    fecha_cosecha: Optional[date] = None
    fecha_recepcion: Optional[date] = None
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


class LoteStockInfo(BaseModel):
    lote_id: int
    variedad: str
    fecha_cosecha: Optional[date]
    fecha_recepcion: date
    kilos_recibidos: Decimal
    costo_por_kilo: Decimal
    proveedor_nombre: Optional[str]
    stock_actual: Decimal

    model_config = ConfigDict(from_attributes=True)