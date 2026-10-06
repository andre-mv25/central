from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_active_user, require_roles
from app.services import InventarioService
from app.models import User
from app.schemas import (
    ProductoCreate, ProductoUpdate, ProductoResponse, ProductoStockInfo,
    LoteCreate, LoteUpdate, LoteResponse,
    MovimientoCreate, MovimientoResponse, MovimientoTipo,
    AlmacenCreate, AlmacenUpdate, AlmacenResponse,
    CategoriaProductoCreate, CategoriaProductoUpdate, CategoriaProductoResponse,
    PresentacionCreate, PresentacionUpdate, PresentacionResponse,
    ProveedorCreate, ProveedorUpdate, ProveedorResponse,
    StockActualResponse, StockDetalle
)

router = APIRouter(prefix="/inventario", tags=["Inventario"])


def get_inventario_service(session: AsyncSession = Depends(get_db)) -> InventarioService:
    return InventarioService(session)


# Productos
@router.post("/productos", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_producto(
    producto_in: ProductoCreate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        producto = await service.create_producto(producto_in, current_user.id)
        return ProductoResponse.model_validate(producto)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/productos", response_model=List[ProductoResponse])
async def list_productos(
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = True,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    # Simple list - in production use proper filtering
    stmt = f"SELECT * FROM productos WHERE activo = {activo} ORDER BY id LIMIT {limit} OFFSET {skip}"
    # For now return via service
    productos = await service.producto_repo.list(activo=activo, skip=skip, limit=limit)
    return [ProductoResponse.model_validate(p) for p in productos]


@router.get("/productos/search", response_model=List[ProductoResponse])
async def search_productos(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    productos = await service.producto_repo.search_trgm(q, limit)
    return [ProductoResponse.model_validate(p) for p in productos]


@router.get("/productos/{producto_id}", response_model=ProductoResponse)
async def get_producto(
    producto_id: int,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    producto = await service.producto_repo.get(producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductoResponse.model_validate(producto)


@router.get("/productos/{producto_id}/stock", response_model=StockDetalle)
async def get_producto_stock(
    producto_id: int,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    stocks = await service.get_stock_producto(producto_id)
    producto = await service.producto_repo.get(producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    stock_total = sum(s["kilos"] for s in stocks)
    por_almacen = {}
    por_lote = {}
    
    for s in stocks:
        almacen_key = s["almacen_id"]
        if almacen_key not in por_almacen:
            por_almacen[almacen_key] = {"almacen_id": almacen_key, "almacen_nombre": s["almacen_nombre"], "kilos": Decimal("0")}
        por_almacen[almacen_key]["kilos"] += s["kilos"]
        
        lote_key = s["lote_id"]
        if lote_key not in por_lote:
            por_lote[lote_key] = {
                "lote_id": lote_key,
                "lote_variedad": s["variedad"],
                "lote_fecha_cosecha": s["fecha_cosecha"],
                "kilos": Decimal("0")
            }
        por_lote[lote_key]["kilos"] += s["kilos"]
    
    return StockDetalle(
        producto_id=producto.id,
        sku=producto.sku,
        nombre=producto.nombre,
        stock_total=stock_total,
        por_almacen=list(por_almacen.values()),
        por_lote=list(por_lote.values())
    )


@router.put("/productos/{producto_id}", response_model=ProductoResponse)
async def update_producto(
    producto_id: int,
    producto_in: ProductoUpdate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    producto = await service.update_producto(producto_id, producto_in, current_user.id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductoResponse.model_validate(producto)


@router.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_producto(
    producto_id: int,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin"))
):
    success = await service.delete_producto(producto_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Producto no encontrado")


# Lotes
@router.post("/lotes", response_model=LoteResponse, status_code=status.HTTP_201_CREATED)
async def create_lote(
    lote_in: LoteCreate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        lote = await service.create_lote(lote_in, current_user.id)
        return LoteResponse.model_validate(lote)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lotes", response_model=List[LoteResponse])
async def list_lotes(
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = True,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    lotes = await service.lote_repo.list(activo=activo, skip=skip, limit=limit)
    return [LoteResponse.model_validate(l) for l in lotes]


@router.get("/lotes/{lote_id}", response_model=LoteResponse)
async def get_lote(
    lote_id: int,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    lote = await service.lote_repo.get(lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return LoteResponse.model_validate(lote)


@router.get("/lotes/{lote_id}/stock", response_model=dict)
async def get_lote_stock(
    lote_id: int,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    stock = await service.lote_repo.get_with_stock(lote_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Lote no encontrado")
    return dict(stock)


# Movimientos
@router.post("/movimientos", response_model=MovimientoResponse, status_code=status.HTTP_201_CREATED)
async def create_movimiento(
    mov_in: MovimientoCreate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    try:
        movimiento = await service.crear_movimiento(mov_in, current_user.id)
        return MovimientoResponse.model_validate(movimiento)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/movimientos", response_model=List[MovimientoResponse])
async def list_movimientos(
    producto_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    almacen_id: Optional[int] = None,
    limit: int = 100,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    movimientos = await service.get_movimientos_producto(
        producto_id or 0, fecha_desde, fecha_hasta, almacen_id, limit
    ) if producto_id else []
    return [MovimientoResponse.model_validate(m) for m in movimientos]


# Stock
@router.get("/stock/bajo", response_model=List[dict])
async def get_stock_bajo(
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_stock_bajo()


@router.get("/stock/valor", response_model=Decimal)
async def get_valor_inventario(
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    return await service.get_valor_inventario()


# Almacenes
@router.post("/almacenes", response_model=AlmacenResponse, status_code=status.HTTP_201_CREATED)
async def create_almacen(
    almacen_in: AlmacenCreate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin"))
):
    almacen = await service.almacen_repo.create(almacen_in.model_dump())
    return AlmacenResponse.model_validate(almacen)


@router.get("/almacenes", response_model=List[AlmacenResponse])
async def list_almacenes(
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    almacenes = await service.almacen_repo.list(activo=True)
    return [AlmacenResponse.model_validate(a) for a in almacenes]


# Categorías
@router.post("/categorias", response_model=CategoriaProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    cat_in: CategoriaProductoCreate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin"))
):
    categoria = await service.categoria_repo.create(cat_in.model_dump())
    return CategoriaProductoResponse.model_validate(categoria)


@router.get("/categorias", response_model=List[CategoriaProductoResponse])
async def list_categorias(
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    categorias = await service.categoria_repo.list(activo=True)
    return [CategoriaProductoResponse.model_validate(c) for c in categorias]


# Presentaciones
@router.post("/presentaciones", response_model=PresentacionResponse, status_code=status.HTTP_201_CREATED)
async def create_presentacion(
    pres_in: PresentacionCreate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin"))
):
    presentacion = await service.presentacion_repo.create(pres_in.model_dump())
    return PresentacionResponse.model_validate(presentacion)


@router.get("/presentaciones", response_model=List[PresentacionResponse])
async def list_presentaciones(
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    presentaciones = await service.presentacion_repo.list(activo=True)
    return [PresentacionResponse.model_validate(p) for p in presentaciones]


# Proveedores
@router.post("/proveedores", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED)
async def create_proveedor(
    prov_in: ProveedorCreate,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(require_roles("admin", "almacenista"))
):
    proveedor = await service.proveedor_repo.create(prov_in.model_dump())
    return ProveedorResponse.model_validate(proveedor)


@router.get("/proveedores", response_model=List[ProveedorResponse])
async def list_proveedores(
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    proveedores = await service.proveedor_repo.list(activo=True)
    return [ProveedorResponse.model_validate(p) for p in proveedores]


@router.get("/proveedores/search", response_model=List[ProveedorResponse])
async def search_proveedores(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    service: InventarioService = Depends(get_inventario_service),
    current_user: User = Depends(get_current_active_user)
):
    proveedores = await service.proveedor_repo.search(q, limit)
    return [ProveedorResponse.model_validate(p) for p in proveedores]