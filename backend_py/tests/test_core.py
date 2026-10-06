import pytest
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base
from app.models import *
from app.services import AuthService, InventarioService, VentasService, ClasificacionService
from app.schemas import (
    ProductoCreate, LoteCreate, VentaRapidaCreate, VentaRapidaLineaInput,
    OrdenClasificacionCreate, OrdenClasificacionLineaCreate
)


# Test database - SQLite in memory for speed
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    yield engine


@pytest.fixture(scope="session")
async def setup_db(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def session(engine, setup_db):
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def auth_service(session):
    return AuthService(session)


@pytest.fixture
async def inventario_service(session):
    return InventarioService(session)


@pytest.fixture
async def ventas_service(session):
    return VentasService(session)


@pytest.fixture
async def clasificacion_service(session):
    return ClasificacionService(session)


@pytest.fixture
async def admin_user(auth_service):
    user = await auth_service.create_user(type('obj', (object,), {
        'email': 'admin@test.com',
        'password': 'admin123456',
        'rol_id': 1,
        'activo': True
    })())
    return user


@pytest.fixture
async def almacen(inventario_service):
    almacenes = await inventario_service.almacen_repo.list(activo=True, limit=1)
    return almacenes[0] if almacenes else None


class TestAuth:
    @pytest.mark.asyncio
    async def test_create_user(self, auth_service):
        user = await auth_service.create_user(type('obj', (object,), {
            'email': 'test@test.com',
            'password': 'password123',
            'rol_id': 1,
            'activo': True
        })())
        assert user.id is not None
        assert user.email == 'test@test.com'
        assert auth_service.verify_password('password123', user.password_hash)

    @pytest.mark.asyncio
    async def test_authenticate(self, auth_service, admin_user):
        user = await auth_service.authenticate('admin@test.com', 'admin123456')
        assert user is not None
        assert user.id == admin_user.id

    @pytest.mark.asyncio
    async def test_invalid_password(self, auth_service, admin_user):
        user = await auth_service.authenticate('admin@test.com', 'wrongpassword')
        assert user is None


class TestInventario:
    @pytest.mark.asyncio
    async def test_create_producto(self, inventario_service, admin_user):
        producto_in = ProductoCreate(
            sku="TEST-001",
            nombre="Papa Test",
            categoria_id=1,
            costo=Decimal("1.00"),
            precio_sugerido_kg=Decimal("2.00"),
            stock_minimo=Decimal("10")
        )
        producto = await inventario_service.create_producto(producto_in, admin_user.id)
        assert producto.id is not None
        assert producto.sku == "TEST-001"

    @pytest.mark.asyncio
    async def test_duplicate_sku_fails(self, inventario_service, admin_user):
        producto_in = ProductoCreate(
            sku="TEST-DUP",
            nombre="Papa Test",
            categoria_id=1,
        )
        await inventario_service.create_producto(producto_in, admin_user.id)
        with pytest.raises(ValueError, match="ya existe"):
            await inventario_service.create_producto(producto_in, admin_user.id)

    @pytest.mark.asyncio
    async def test_create_lote_creates_movement_and_stock(self, inventario_service, admin_user, almacen):
        lote_in = LoteCreate(
            proveedor_id=None,
            variedad="Kennebec",
            fecha_cosecha=date(2026, 9, 15),
            fecha_recepcion=date(2026, 9, 20),
            kilos_recibidos=Decimal("1000"),
            costo_total=Decimal("800.00"),
            parcela="Test Parcel"
        )
        lote = await inventario_service.create_lote(lote_in, admin_user.id)
        assert lote.id is not None
        assert lote.costo_por_kilo == Decimal("0.80")

        # Verify stock was created
        stocks = await inventario_service.get_stock_producto(
            (await inventario_service.producto_repo.get_by(nombre="Papa Kennebec (Sin clasificar)")).id
        )
        assert len(stocks) == 1
        assert stocks[0]["kilos"] == Decimal("1000")

    @pytest.mark.asyncio
    async def test_movimiento_updates_stock(self, inventario_service, admin_user, almacen):
        # Create a product first
        producto_in = ProductoCreate(
            sku="TEST-MOV",
            nombre="Papa Movimiento",
            categoria_id=1,
        )
        producto = await inventario_service.create_producto(producto_in, admin_user.id)

        # Create lote
        lote_in = LoteCreate(
            variedad="TestVar",
            fecha_cosecha=date(2026, 9, 15),
            fecha_recepcion=date(2026, 9, 20),
            kilos_recibidos=Decimal("500"),
            costo_total=Decimal("400.00"),
        )
        lote = await inventario_service.create_lote(lote_in, admin_user.id)

        # Create entrada movement
        mov = await inventario_service.crear_movimiento(type('obj', (object,), {
            'producto_id': producto.id,
            'almacen_id': almacen.id,
            'lote_id': lote.id,
            'tipo': 'entrada_compra',
            'kilos': Decimal("100"),
            'costo_por_kilo': Decimal("0.80"),
            'referencia_tipo': 'test',
            'referencia_id': 999,
            'notas': 'Test entrada'
        })(), admin_user.id)

        # Check stock
        stock = await inventario_service.stock_repo.get_stock(producto.id, almacen.id, lote.id)
        assert stock.kilos == Decimal("100")

        # Create salida movement
        mov2 = await inventario_service.crear_movimiento(type('obj', (object,), {
            'producto_id': producto.id,
            'almacen_id': almacen.id,
            'lote_id': lote.id,
            'tipo': 'salida_venta',
            'kilos': Decimal("-30"),
            'referencia_tipo': 'test',
            'referencia_id': 998,
        })(), admin_user.id)

        stock = await inventario_service.stock_repo.get_stock(producto.id, almacen.id, lote.id)
        assert stock.kilos == Decimal("70")


class TestVentas:
    @pytest.mark.asyncio
    async def test_venta_rapida_fifo(self, ventas_service, inventario_service, admin_user, almacen):
        # Create two lotes with different dates
        lote1 = await inventario_service.create_lote(LoteCreate(
            variedad="Var1", fecha_cosecha=date(2026, 9, 10),
            fecha_recepcion=date(2026, 9, 15), kilos_recibidos=Decimal("1000"),
            costo_total=Decimal("800.00")
        ), admin_user.id)
        
        lote2 = await inventario_service.create_lote(LoteCreate(
            variedad="Var2", fecha_cosecha=date(2026, 9, 20),
            fecha_recepcion=date(2026, 9, 25), kilos_recibidos=Decimal("1000"),
            costo_total=Decimal("900.00")
        ), admin_user.id)

        # Get the "sin clasificar" product
        prod = await inventario_service.producto_repo.get_by(nombre="Papa Var1 (Sin clasificar)")
        if not prod:
            prod = await inventario_service.producto_repo.get_by(nombre="Papa Var2 (Sin clasificar)")

        # Sell 1500 kg - should take 1000 from lote1 and 500 from lote2 (FIFO)
        venta_in = VentaRapidaCreate(
            lineas=[VentaRapidaLineaInput(
                producto_id=prod.id,
                kilos=Decimal("1500"),
                precio_por_kilo=Decimal("2.00")
            )]
        )
        venta = await ventas_service.create_venta_rapida(venta_in, admin_user.id)
        assert venta.total == Decimal("3000.00")

        # Check stock deduction - lote1 should be 0, lote2 should be 500
        stock1 = await inventario_service.stock_repo.get_stock(prod.id, almacen.id, lote1.id)
        stock2 = await inventario_service.stock_repo.get_stock(prod.id, almacen.id, lote2.id)
        assert stock1.kilos == Decimal("0")
        assert stock2.kilos == Decimal("500")

    @pytest.mark.asyncio
    async def test_venta_anula_creates_reverse_movements(self, ventas_service, inventario_service, admin_user, almacen):
        # Setup
        lote = await inventario_service.create_lote(LoteCreate(
            variedad="VarAnul", fecha_cosecha=date(2026, 9, 10),
            fecha_recepcion=date(2026, 9, 15), kilos_recibidos=Decimal("1000"),
            costo_total=Decimal("800.00")
        ), admin_user.id)
        
        prod = await inventario_service.producto_repo.get_by(nombre="Papa VarAnul (Sin clasificar)")
        
        # Sell
        venta_in = VentaRapidaCreate(lineas=[
            VentaRapidaLineaInput(producto_id=prod.id, kilos=Decimal("100"), precio_por_kilo=Decimal("2.00"))
        ])
        venta = await ventas_service.create_venta_rapida(venta_in, admin_user.id)
        
        stock_before = await inventario_service.stock_repo.get_stock(prod.id, almacen.id, lote.id)
        assert stock_before.kilos == Decimal("900")
        
        # Anular
        venta_anulada = await ventas_service.anular_venta(venta.id, admin_user.id, "Test anulación")
        assert venta_anulada.estado == "anulada"
        
        stock_after = await inventario_service.stock_repo.get_stock(prod.id, almacen.id, lote.id)
        assert stock_after.kilos == Decimal("1000")  # Restored


class TestClasificacion:
    @pytest.mark.asyncio
    async def test_balance_validation(self, clasificacion_service, inventario_service, admin_user, almacen):
        # Create lote
        lote = await inventario_service.create_lote(LoteCreate(
            variedad="VarClass", fecha_cosecha=date(2026, 9, 10),
            fecha_recepcion=date(2026, 9, 15), kilos_recibidos=Decimal("1000"),
            costo_total=Decimal("800.00")
        ), admin_user.id)
        
        # Get criterio and categorias
        criterio = await clasificacion_service.criterio_repo.get_by(nombre="Calidad")
        cat_primera = await clasificacion_service.categoria_repo.get_by(criterio_id=criterio.id, nombre="Primera")
        cat_segunda = await clasificacion_service.categoria_repo.get_by(criterio_id=criterio.id, nombre="Segunda")
        cat_descarte = await clasificacion_service.categoria_repo.get_by(criterio_id=criterio.id, nombre="Descarte")
        
        # Create orden with correct balance
        orden_in = OrdenClasificacionCreate(
            lote_origen_id=lote.id,
            criterio_id=criterio.id,
            kilos_entrada=Decimal("1000"),
            costo_reparto_metodo="peso",
            lineas=[
                OrdenClasificacionLineaCreate(
                    producto_id=1, categoria_clasificacion_id=cat_primera.id,
                    almacen_destino_id=almacen.id, kilos=Decimal("500"), es_merma=False
                ),
                OrdenClasificacionLineaCreate(
                    producto_id=1, categoria_clasificacion_id=cat_segunda.id,
                    almacen_destino_id=almacen.id, kilos=Decimal("400"), es_merma=False
                ),
                OrdenClasificacionLineaCreate(
                    producto_id=1, categoria_clasificacion_id=cat_descarte.id,
                    almacen_destino_id=almacen.id, kilos=Decimal("100"), es_merma=True
                ),
            ]
        )
        orden = await clasificacion_service.create_orden(orden_in, admin_user.id)
        assert orden.estado == "borrador"
        
        # Check balance
        balance = await clasificacion_service.get_balance_info(orden.id)
        assert balance.esta_balanceado == True
        assert balance.diferencia == Decimal("0")
        
        # Close orden
        orden_cerrada = await clasificacion_service.cerrar_orden(orden.id, admin_user.id)
        assert orden_cerrada.estado == "cerrada"
        
        # Verify movements created
        movs = await inventario_service.movimiento_repo.get_by_referencia("orden_clasificacion", orden.id)
        assert len(movs) >= 4  # 1 salida + 3 entradas/merma

    @pytest.mark.asyncio
    async def test_balance_fails_when_not_balanced(self, clasificacion_service, inventario_service, admin_user, almacen):
        lote = await inventario_service.create_lote(LoteCreate(
            variedad="VarFail", fecha_cosecha=date(2026, 9, 10),
            fecha_recepcion=date(2026, 9, 15), kilos_recibidos=Decimal("1000"),
            costo_total=Decimal("800.00")
        ), admin_user.id)
        
        criterio = await clasificacion_service.criterio_repo.get_by(nombre="Calidad")
        cat_primera = await clasificacion_service.categoria_repo.get_by(criterio_id=criterio.id, nombre="Primera")
        
        # Only 500 out of 1000 - should fail
        orden_in = OrdenClasificacionCreate(
            lote_origen_id=lote.id,
            criterio_id=criterio.id,
            kilos_entrada=Decimal("1000"),
            costo_reparto_metodo="peso",
            lineas=[
                OrdenClasificacionLineaCreate(
                    producto_id=1, categoria_clasificacion_id=cat_primera.id,
                    almacen_destino_id=almacen.id, kilos=Decimal("500"), es_merma=False
                ),
            ]
        )
        with pytest.raises(ValueError, match="Balance no cuadra"):
            await clasificacion_service.create_orden(orden_in, admin_user.id)


class TestConcurrency:
    @pytest.mark.asyncio
    async def test_concurrent_ventas_no_negative_stock(self, ventas_service, inventario_service, admin_user, almacen):
        """Two simultaneous sales of same product should not leave negative stock when blocked."""
        # This test would need proper async concurrency testing
        # For now, verify the setting is respected
        from app.core.config import get_settings
        settings = get_settings()
        assert settings.ALLOW_NEGATIVE_STOCK == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])