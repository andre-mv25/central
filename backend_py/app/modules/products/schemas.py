from datetime import datetime
from decimal import Decimal
from typing import Optional, List
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
    activa: Optional[bool] = None


class AlmacenResponse(AlmacenBase):
    id: int

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