#!/usr/bin/env python3
"""Seed script for development/test data."""
import asyncio
from decimal import Decimal
from datetime import datetime, date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.db.session import AsyncSessionLocal, engine
from app.models import Base
from app.modules.auth.models import User, Role
from app.modules.products.models import Producto, CategoriaProducto, Almacen, Presentacion
from app.modules.lots.models import Proveedor, Lote
from app.modules.stock.models import Movimiento, StockActual
from app.modules.classification.models import CriterioClasificacion, CategoriaClasificacion
from app.modules.sales.models import Comprador, Venta, VentaLinea
from app.modules.auth.service import AuthService
from app.modules.products.service import ProductoService
from app.modules.lots.service import LoteService
from app.modules.stock.service import StockService
from app.modules.classification.service import ClasificacionService
from app.modules.sales.service import VentasService
from app.modules.products.schemas import ProductoCreate
from app.modules.lots.schemas import LoteCreate, ProveedorCreate
from app.modules.sales.schemas import VentaRapidaCreate, VentaRapidaLineaInput
from app.modules.classification.schemas import OrdenClasificacionCreate, OrdenClasificacionLineaCreate
from app.modules.auth.schemas import UserCreate


async def seed_data():
    # Create extensions using sync engine (pg_trgm needed for GIN index)
    from app.db.session import sync_engine
    with sync_engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        conn.commit()
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        auth_service = AuthService(session)
        inventario_service = ProductoService(session)
        lote_service = LoteService(session)
        stock_service = StockService(session)
        clasificacion_service = ClasificacionService(session)
        ventas_service = VentasService(session)
        
        # Seed reference data first
        print("Seeding reference data...")
        
        # Roles
        roles_data = [
            {"id": 1, "nombre": "admin"},
            {"id": 2, "nombre": "operario"},
            {"id": 3, "nombre": "vendedor"},
            {"id": 4, "nombre": "gerente"},
        ]
        for r_data in roles_data:
            existing = await session.execute(select(Role).where(Role.id == r_data["id"]))
            if not existing.scalar_one_or_none():
                session.add(Role(**r_data))
        await session.commit()
        
        # Get or create admin user
        admin = await auth_service.authenticate("admin", "admin123")
        if not admin:
            print("Creating admin user...")
            admin = await auth_service.create_user(UserCreate(
                username="admin",
                password="admin123",
                rol_id=1,
                activo=True
            ))
        
        # Almacenes
        almacenes_data = [
            {"id": 1, "nombre": "Almacén Principal", "ubicacion": "Planta 1", "activo": True},
            {"id": 2, "nombre": "Almacén Secundario", "ubicacion": "Planta 2", "activo": True},
        ]
        for a_data in almacenes_data:
            existing = await session.execute(select(Almacen).where(Almacen.id == a_data["id"]))
            if not existing.scalar_one_or_none():
                session.add(Almacen(**a_data))
        
        # Categorías de producto
        categorias_data = [
            {"id": 1, "nombre": "Clasificado", "descripcion": "Papa clasificada para venta", "activa": True},
            {"id": 2, "nombre": "Proceso", "descripcion": "Papa para proceso industrial", "activa": True},
            {"id": 3, "nombre": "Descarte", "descripcion": "Papa descartada/merma", "activa": True},
        ]
        for c_data in categorias_data:
            existing = await session.execute(select(CategoriaProducto).where(CategoriaProducto.id == c_data["id"]))
            if not existing.scalar_one_or_none():
                session.add(CategoriaProducto(**c_data))
        
        # Presentaciones
        presentaciones_data = [
            {"id": 1, "nombre": "Bolsa 25kg", "kilos_defecto": Decimal("25.000"), "activa": True},
            {"id": 2, "nombre": "Bolsa 50kg", "kilos_defecto": Decimal("50.000"), "activa": True},
            {"id": 3, "nombre": "Big Bag 1000kg", "kilos_defecto": Decimal("1000.000"), "activa": True},
            {"id": 4, "nombre": "Cajón 20kg", "kilos_defecto": Decimal("20.000"), "activa": True},
        ]
        for p_data in presentaciones_data:
            existing = await session.execute(select(Presentacion).where(Presentacion.id == p_data["id"]))
            if not existing.scalar_one_or_none():
                session.add(Presentacion(**p_data))
        
        # Criterios de clasificación
        criterios_data = [
            {"id": 1, "nombre": "Calibre", "es_mixto": False, "activo": True},
            {"id": 2, "nombre": "Calidad", "es_mixto": False, "activo": True},
            {"id": 3, "nombre": "Mixto", "es_mixto": True, "activo": True},
        ]
        for c_data in criterios_data:
            existing = await session.execute(select(CriterioClasificacion).where(CriterioClasificacion.id == c_data["id"]))
            if not existing.scalar_one_or_none():
                session.add(CriterioClasificacion(**c_data))
        
        # Categorías de clasificación
        cats_clas_data = [
            {"id": 1, "criterio_id": 1, "nombre": "Grande", "orden": 1, "activa": True},
            {"id": 2, "criterio_id": 1, "nombre": "Mediano", "orden": 2, "activa": True},
            {"id": 3, "criterio_id": 1, "nombre": "Chico", "orden": 3, "activa": True},
            {"id": 4, "criterio_id": 2, "nombre": "Primera", "orden": 1, "activa": True},
            {"id": 5, "criterio_id": 2, "nombre": "Segunda", "orden": 2, "activa": True},
            {"id": 6, "criterio_id": 2, "nombre": "Tercera", "orden": 3, "activa": True},
        ]
        for c_data in cats_clas_data:
            existing = await session.execute(select(CategoriaClasificacion).where(CategoriaClasificacion.id == c_data["id"]))
            if not existing.scalar_one_or_none():
                session.add(CategoriaClasificacion(**c_data))
        
        await session.commit()
        
        # Get default almacen
        almacenes = await inventario_service.list_almacenes(activo=True)
        almacen = almacenes[0] if almacenes else None
        if not almacen:
            print("No almacen found")
            return
        
        # Create proveedores
        proveedores_data = [
            {"nombre": "Campo Verde SA", "contacto": "Juan Pérez", "telefono": "111-222-333", "email": "juan@campoverde.com"},
            {"nombre": "El Potrero", "contacto": "María González", "telefono": "444-555-666", "email": "maria@elpotrero.com"},
            {"nombre": "Don José", "contacto": "José López", "telefono": "777-888-999", "email": "jose@donjose.com"},
        ]
        
        proveedores = []
        for p_data in proveedores_data:
            prov = await lote_service.proveedor_repo.get_by_nombre(p_data["nombre"])
            if not prov:
                prov = await lote_service.create_proveedor(ProveedorCreate(**p_data))
            proveedores.append(prov)
        
        # Create productos vendibles
        categoria_clasificada = await inventario_service.categoria_repo.get_by_nombre("Clasificado")
        if not categoria_clasificada:
            cats = await inventario_service.categoria_repo.list(activo=True)
            categoria_clasificada = cats[0]
        
        productos_data = [
            {"sku": "PAPA-PRIM-001", "nombre": "Papa Primera", "categoria_id": categoria_clasificada.id, 
             "costo": Decimal("0.80"), "precio_sugerido_kg": Decimal("1.50"), "stock_minimo": Decimal("100")},
            {"sku": "PAPA-SEG-001", "nombre": "Papa Segunda", "categoria_id": categoria_clasificada.id,
             "costo": Decimal("0.60"), "precio_sugerido_kg": Decimal("1.20"), "stock_minimo": Decimal("100")},
            {"sku": "PAPA-TER-001", "nombre": "Papa Tercera", "categoria_id": categoria_clasificada.id,
             "costo": Decimal("0.40"), "precio_sugerido_kg": Decimal("0.90"), "stock_minimo": Decimal("50")},
            {"sku": "PAPA-GRA-001", "nombre": "Papa Grande", "categoria_id": categoria_clasificada.id,
             "costo": Decimal("0.90"), "precio_sugerido_kg": Decimal("1.80"), "stock_minimo": Decimal("50")},
            {"sku": "PAPA-MED-001", "nombre": "Papa Mediana", "categoria_id": categoria_clasificada.id,
             "costo": Decimal("0.70"), "precio_sugerido_kg": Decimal("1.40"), "stock_minimo": Decimal("50")},
        ]
        
        productos = []
        for p_data in productos_data:
            prod = await inventario_service.producto_repo.get_by_sku(p_data["sku"])
            if not prod:
                prod = await inventario_service.create_producto(ProductoCreate(**p_data), admin.id)
            productos.append(prod)
        
        # Create lotes
        lotes_data = [
            {"proveedor_id": proveedores[0].id, "variedad": "Kennebec", "fecha_cosecha": date(2026, 9, 15),
             "fecha_recepcion": date(2026, 9, 20), "kilos_recibidos": Decimal("5000"), "costo_total": Decimal("3500.00"),
             "parcela": "Lote Norte A"},
            {"proveedor_id": proveedores[1].id, "variedad": "Agria", "fecha_cosecha": date(2026, 9, 18),
             "fecha_recepcion": date(2026, 9, 22), "kilos_recibidos": Decimal("3000"), "costo_total": Decimal("2100.00"),
             "parcela": "Campo Sur 3"},
            {"proveedor_id": proveedores[2].id, "variedad": "Spunta", "fecha_cosecha": date(2026, 9, 20),
             "fecha_recepcion": date(2026, 9, 25), "kilos_recibidos": Decimal("4000"), "costo_total": Decimal("2800.00"),
             "parcela": "Parcela 7"},
        ]
        
        lotes = []
        for l_data in lotes_data:
            lote = await lote_service.create_lote(LoteCreate(**l_data))
            lotes.append(lote)
        
        # Create compradores
        compradores_data = [
            {"nombre": "Verdulería Central", "telefono": "11-2222-3333"},
            {"nombre": "Mercado Norte", "telefono": "11-4444-5555"},
            {"nombre": "Don Pedro", "telefono": "11-6666-7777"},
            {"nombre": "Mostrador", "telefono": None},
        ]
        
        for c_data in compradores_data:
            comp = await ventas_service.comprador_repo.get_by_nombre(c_data["nombre"])
            if not comp:
                from app.modules.sales.schemas import CompradorCreate
                await ventas_service.create_comprador(CompradorCreate(**c_data))
        
        # Create some ventas rápidas
        print("Creating test ventas...")
        for i in range(10):
            venta_in = VentaRapidaCreate(
                comprador_id=(i % 3) + 1,
                lineas=[
                    VentaRapidaLineaInput(
                        producto_id=productos[i % len(productos)].id,
                        kilos=Decimal(str(10 + i * 5)),
                        precio_por_kilo=productos[i % len(productos)].precio_sugerido_kg,
                        presentacion="bolsa",
                        unidades=Decimal(str(1 + i % 3))
                    )
                ]
            )
            try:
                await ventas_service.create_venta_rapida(venta_in, admin.id)
            except Exception as e:
                print(f"Error creating venta {i}: {e}")
        
        # Create a classification order
        print("Creating test classification order...")
        criterio_calidad = await clasificacion_service.criterio_repo.get_by_nombre("Calidad")
        if criterio_calidad:
            cat_primera = await clasificacion_service.categoria_repo.get_by_criterio_y_nombre(criterio_calidad.id, "Primera")
            cat_segunda = await clasificacion_service.categoria_repo.get_by_criterio_y_nombre(criterio_calidad.id, "Segunda")
            cat_tercera = await clasificacion_service.categoria_repo.get_by_criterio_y_nombre(criterio_calidad.id, "Tercera")
            cat_descarte = await clasificacion_service.categoria_repo.get_by_criterio_y_nombre(criterio_calidad.id, "Descarte")
            
            if all([cat_primera, cat_segunda, cat_tercera, cat_descarte]):
                orden_in = OrdenClasificacionCreate(
                    lote_origen_id=lotes[0].id,
                    criterio_id=criterio_calidad.id,
                    kilos_entrada=Decimal("5000"),
                    costo_reparto_metodo="peso",
                    lineas=[
                        OrdenClasificacionLineaCreate(
                            producto_id=productos[0].id,
                            categoria_clasificacion_id=cat_primera.id,
                            almacen_destino_id=almacen.id,
                            kilos=Decimal("2000"),
                            es_merma=False
                        ),
                        OrdenClasificacionLineaCreate(
                            producto_id=productos[1].id,
                            categoria_clasificacion_id=cat_segunda.id,
                            almacen_destino_id=almacen.id,
                            kilos=Decimal("1500"),
                            es_merma=False
                        ),
                        OrdenClasificacionLineaCreate(
                            producto_id=productos[2].id,
                            categoria_clasificacion_id=cat_tercera.id,
                            almacen_destino_id=almacen.id,
                            kilos=Decimal("1000"),
                            es_merma=False
                        ),
                        OrdenClasificacionLineaCreate(
                            producto_id=productos[0].id,
                            categoria_clasificacion_id=cat_descarte.id,
                            almacen_destino_id=almacen.id,
                            kilos=Decimal("500"),
                            es_merma=True
                        ),
                    ]
                )
                try:
                    orden = await clasificacion_service.create_orden(orden_in, admin.id)
                    print(f"Created orden {orden.id}, closing...")
                    await clasificacion_service.cerrar_orden(orden.id, admin.id)
                    print("Order closed successfully")
                except Exception as e:
                    print(f"Error creating classification order: {e}")
        
        print("Seed data created successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())