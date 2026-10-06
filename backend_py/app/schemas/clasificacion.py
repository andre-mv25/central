from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class CriterioClasificacionBase(BaseModel):
    nombre: str = Field(..., max_length=50)
    es_mixto: bool = False
    activo: bool = True


class CriterioClasificacionCreate(CriterioClasificacionBase):
    pass


class CriterioClasificacionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    es_mixto: Optional[bool] = None
    activo: Optional[bool] = None


class CriterioClasificacionResponse(CriterioClasificacionBase):
    id: int
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoriaClasificacionBase(BaseModel):
    criterio_id: int
    nombre: str = Field(..., max_length=50)
    orden: int = 0
    activa: bool = True


class CategoriaClasificacionCreate(CategoriaClasificacionBase):
    pass


class CategoriaClasificacionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    orden: Optional[int] = None
    activa: Optional[bool] = None


class CategoriaClasificacionResponse(CategoriaClasificacionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class OrdenClasificacionLineaBase(BaseModel):
    producto_id: int
    categoria_clasificacion_id: Optional[int] = None
    almacen_destino_id: int
    kilos: Decimal = Field(..., gt=0, max_digits=14, decimal_places=3)
    atributos_jsonb: Optional[Dict[str, Any]] = None
    es_merma: bool = False


class OrdenClasificacionLineaCreate(OrdenClasificacionLineaBase):
    pass


class OrdenClasificacionLineaUpdate(BaseModel):
    producto_id: Optional[int] = None
    categoria_clasificacion_id: Optional[int] = None
    almacen_destino_id: Optional[int] = None
    kilos: Optional[Decimal] = Field(None, gt=0, max_digits=14, decimal_places=3)
    atributos_jsonb: Optional[Dict[str, Any]] = None
    es_merma: Optional[bool] = None


class OrdenClasificacionLineaResponse(OrdenClasificacionLineaBase):
    id: int
    orden_id: int
    costo_asignado: Decimal
    costo_por_kilo: Decimal
    creada_en: datetime
    producto: Optional["ProductoResponse"] = None
    categoria_clasificacion: Optional[CategoriaClasificacionResponse] = None
    almacen_destino: Optional["AlmacenResponse"] = None

    model_config = ConfigDict(from_attributes=True)


class OrdenClasificacionBase(BaseModel):
    lote_origen_id: int
    criterio_id: int
    kilos_entrada: Decimal = Field(..., gt=0, max_digits=14, decimal_places=3)
    costo_reparto_metodo: str = Field("peso", pattern="^(peso|precio_relativo)$")


class OrdenClasificacionCreate(OrdenClasificacionBase):
    lineas: List[OrdenClasificacionLineaCreate] = Field(..., min_length=1)


class OrdenClasificacionUpdate(BaseModel):
    criterio_id: Optional[int] = None
    kilos_entrada: Optional[Decimal] = Field(None, gt=0, max_digits=14, decimal_places=3)
    costo_reparto_metodo: Optional[str] = Field(None, pattern="^(peso|precio_relativo)$")
    lineas: Optional[List[OrdenClasificacionLineaCreate]] = None


class OrdenClasificacionBalanceInfo(BaseModel):
    kilos_entrada: Decimal
    kilos_clasificados: Decimal
    kilos_merma: Decimal
    diferencia: Decimal
    merma_porcentaje: Decimal
    esta_balanceado: bool
    tolerancia_kg: Decimal


class OrdenClasificacionResponse(OrdenClasificacionBase):
    id: int
    fecha: datetime
    operario_id: int
    kilos_clasificados: Decimal
    kilos_merma: Decimal
    merma_porcentaje: Decimal
    estado: str
    cerrada_en: Optional[datetime]
    creada_en: datetime
    actualizada_en: datetime
    lote_origen: Optional["LoteResponse"] = None
    criterio: Optional[CriterioClasificacionResponse] = None
    operario: Optional["UserResponse"] = None
    lineas: List[OrdenClasificacionLineaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class OrdenClasificacionCerrar(BaseModel):
    pass


class RendimientoLote(BaseModel):
    lote_id: int
    variedad: str
    fecha_cosecha: Optional[datetime]
    kilos_totales: Decimal
    categorias: List[Dict[str, Any]]
    merma_kg: Decimal
    merma_porcentaje: Decimal
    costo_por_categoria: Dict[str, Decimal]

    model_config = ConfigDict(from_attributes=True)


# Forward references
from app.schemas.inventario import ProductoResponse, AlmacenResponse, LoteResponse
from app.schemas.auth import UserResponse

OrdenClasificacionLineaResponse.model_rebuild()
OrdenClasificacionResponse.model_rebuild()