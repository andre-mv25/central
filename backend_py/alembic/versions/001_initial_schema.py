"""Initial schema for inventario papa

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')
    op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm')

    # Roles
    op.create_table(
        'roles',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    # Usuarios
    op.create_table(
        'usuarios',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('rol_id', sa.SmallInteger(), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, default=True),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actualizado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['rol_id'], ['roles.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # Categorias producto
    op.create_table(
        'categorias_producto',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('descripcion', sa.Text()),
        sa.Column('activa', sa.Boolean(), nullable=False, default=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    # Presentaciones
    op.create_table(
        'presentaciones',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(50), nullable=False),
        sa.Column('kilos_defecto', sa.Numeric(10, 3)),
        sa.Column('activa', sa.Boolean(), nullable=False, default=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    # Almacenes
    op.create_table(
        'almacenes',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(100), nullable=False),
        sa.Column('ubicacion', sa.Text()),
        sa.Column('activo', sa.Boolean(), nullable=False, default=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    # Proveedores
    op.create_table(
        'proveedores',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(150), nullable=False),
        sa.Column('contacto', sa.String(150)),
        sa.Column('telefono', sa.String(30)),
        sa.Column('email', sa.String(150)),
        sa.Column('direccion', sa.Text()),
        sa.Column('rfc', sa.String(20)),
        sa.Column('condiciones_pago', sa.String(100)),
        sa.Column('dias_credito', sa.SmallInteger(), nullable=False, default=0),
        sa.Column('activo', sa.Boolean(), nullable=False, default=True),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actualizado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )
    op.create_index('idx_proveedores_activo', 'proveedores', ['activo'])
    op.create_index('idx_proveedores_nombre', 'proveedores', ['nombre'])

    # Productos
    op.create_table(
        'productos',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('sku', sa.String(80), nullable=False),
        sa.Column('nombre', sa.String(150), nullable=False),
        sa.Column('categoria_id', sa.SmallInteger(), nullable=False),
        sa.Column('unidad_base', sa.String(30), nullable=False, default='kg'),
        sa.Column('costo', sa.Numeric(14, 4), nullable=False, default=0),
        sa.Column('precio_sugerido_kg', sa.Numeric(12, 4), nullable=False, default=0),
        sa.Column('stock_minimo', sa.Numeric(14, 3), nullable=False, default=0),
        sa.Column('activo', sa.Boolean(), nullable=False, default=True),
        sa.Column('eliminado_en', sa.TIMESTAMP(timezone=True)),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actualizado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['categoria_id'], ['categorias_producto.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sku')
    )

    # Lotes
    op.create_table(
        'lotes',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('proveedor_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite')),
        sa.Column('parcela', sa.String(150)),
        sa.Column('fecha_cosecha', sa.Date()),
        sa.Column('fecha_recepcion', sa.Date(), server_default=sa.func.current_date(), nullable=False),
        sa.Column('variedad', sa.String(100), nullable=False),
        sa.Column('kilos_recibidos', sa.Numeric(14, 3), nullable=False),
        sa.Column('costo_total', sa.Numeric(14, 2), nullable=False),
        sa.Column('costo_por_kilo', sa.Numeric(12, 4), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, default=True),
        sa.Column('eliminado_en', sa.TIMESTAMP(timezone=True)),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actualizado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['proveedor_id'], ['proveedores.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Stock actual
    op.create_table(
        'stock_actual',
        sa.Column('producto_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('almacen_id', sa.SmallInteger(), nullable=False),
        sa.Column('lote_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('kilos', sa.Numeric(14, 3), nullable=False, default=0),
        sa.Column('actualizado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id']),
        sa.ForeignKeyConstraint(['almacen_id'], ['almacenes.id']),
        sa.ForeignKeyConstraint(['lote_id'], ['lotes.id']),
        sa.PrimaryKeyConstraint('producto_id', 'almacen_id', 'lote_id')
    )
    op.create_check_constraint('ck_stock_actual_kilos_nonneg', 'stock_actual', 'kilos >= 0')

    # Movimientos
    op.create_table(
        'movimientos',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('producto_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('almacen_id', sa.SmallInteger(), nullable=False),
        sa.Column('lote_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite')),
        sa.Column('tipo', sa.String(30), nullable=False),
        sa.Column('kilos', sa.Numeric(14, 3), nullable=False),
        sa.Column('costo_por_kilo', sa.Numeric(12, 4)),
        sa.Column('fecha', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('usuario_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('referencia_tipo', sa.String(50)),
        sa.Column('referencia_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite')),
        sa.Column('notas', sa.Text()),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id']),
        sa.ForeignKeyConstraint(['almacen_id'], ['almacenes.id']),
        sa.ForeignKeyConstraint(['lote_id'], ['lotes.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('kilos <> 0', name='ck_movimientos_kilos_no_zero')
    )
    op.create_index('ix_movimientos_producto_almacen_fecha', 'movimientos', ['producto_id', 'almacen_id', 'fecha'])
    op.create_index('ix_movimientos_lote_id', 'movimientos', ['lote_id'])
    op.create_index('ix_movimientos_fecha_brin', 'movimientos', ['fecha'], postgresql_using='brin')
    op.create_index('ix_movimientos_referencia', 'movimientos', ['referencia_tipo', 'referencia_id'])

    # Compradores
    op.create_table(
        'compradores',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(150), nullable=False),
        sa.Column('telefono', sa.String(30)),
        sa.Column('activo', sa.Boolean(), nullable=False, default=True),
        sa.Column('eliminado_en', sa.TIMESTAMP(timezone=True)),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actualizado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_compradores_nombre_trgm', 'compradores', ['nombre'], postgresql_using='gin', postgresql_ops={'nombre': 'gin_trgm_ops'})

    # Ventas
    op.create_table(
        'ventas',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('fecha', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('comprador_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite')),
        sa.Column('usuario_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('total', sa.Numeric(14, 2), nullable=False),
        sa.Column('estado', sa.String(20), nullable=False, default='completada'),
        sa.Column('anulada_en', sa.TIMESTAMP(timezone=True)),
        sa.Column('anulada_por_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite')),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['comprador_id'], ['compradores.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['anulada_por_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("estado IN ('completada', 'anulada')", name='ck_ventas_estado'),
        sa.CheckConstraint('total >= 0', name='ck_ventas_total_nonneg')
    )

    # Ventas lineas
    op.create_table(
        'ventas_lineas',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('venta_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('producto_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('lote_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite')),
        sa.Column('kilos', sa.Numeric(14, 3), nullable=False),
        sa.Column('presentacion', sa.String(50)),
        sa.Column('unidades', sa.Numeric(10, 2)),
        sa.Column('precio_por_kilo', sa.Numeric(12, 4), nullable=False),
        sa.Column('total_linea', sa.Numeric(14, 2), nullable=False),
        sa.ForeignKeyConstraint(['venta_id'], ['ventas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id']),
        sa.ForeignKeyConstraint(['lote_id'], ['lotes.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('kilos > 0', name='ck_ventas_lineas_kilos_pos'),
        sa.CheckConstraint('precio_por_kilo >= 0', name='ck_ventas_lineas_precio_nonneg'),
        sa.CheckConstraint('total_linea >= 0', name='ck_ventas_lineas_total_nonneg')
    )

    # Criterios clasificacion
    op.create_table(
        'criterios_clasificacion',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('nombre', sa.String(50), nullable=False),
        sa.Column('es_mixto', sa.Boolean(), nullable=False, default=False),
        sa.Column('activo', sa.Boolean(), nullable=False, default=True),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre')
    )

    # Categorias clasificacion
    op.create_table(
        'categorias_clasificacion',
        sa.Column('id', sa.SmallInteger(), autoincrement=True, nullable=False),
        sa.Column('criterio_id', sa.SmallInteger(), nullable=False),
        sa.Column('nombre', sa.String(50), nullable=False),
        sa.Column('orden', sa.SmallInteger(), nullable=False, default=0),
        sa.Column('activa', sa.Boolean(), nullable=False, default=True),
        sa.ForeignKeyConstraint(['criterio_id'], ['criterios_clasificacion.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('criterio_id', 'nombre', name='uq_categoria_clasificacion_criterio_nombre')
    )

    # Ordenes clasificacion
    op.create_table(
        'ordenes_clasificacion',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('lote_origen_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('criterio_id', sa.SmallInteger(), nullable=False),
        sa.Column('fecha', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('operario_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('kilos_entrada', sa.Numeric(14, 3), nullable=False),
        sa.Column('kilos_clasificados', sa.Numeric(14, 3), nullable=False, default=0),
        sa.Column('kilos_merma', sa.Numeric(14, 3), nullable=False, default=0),
        sa.Column('merma_porcentaje', sa.Numeric(5, 2), nullable=False, default=0),
        sa.Column('costo_reparto_metodo', sa.String(20), nullable=False, default='peso'),
        sa.Column('estado', sa.String(20), nullable=False, default='borrador'),
        sa.Column('cerrada_en', sa.TIMESTAMP(timezone=True)),
        sa.Column('creada_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('actualizada_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['lote_origen_id'], ['lotes.id']),
        sa.ForeignKeyConstraint(['criterio_id'], ['criterios_clasificacion.id']),
        sa.ForeignKeyConstraint(['operario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("estado IN ('borrador', 'cerrada', 'cancelada')", name='ck_ordenes_estado'),
        sa.CheckConstraint('kilos_entrada > 0', name='ck_ordenes_kilos_entrada_pos'),
        sa.CheckConstraint("costo_reparto_metodo IN ('peso', 'precio_relativo')", name='ck_ordenes_metodo_reparto')
    )

    # Ordenes clasificacion lineas
    op.create_table(
        'ordenes_clasificacion_lineas',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('orden_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('producto_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('categoria_clasificacion_id', sa.SmallInteger()),
        sa.Column('almacen_destino_id', sa.SmallInteger(), nullable=False),
        sa.Column('kilos', sa.Numeric(14, 3), nullable=False),
        sa.Column('costo_asignado', sa.Numeric(14, 2), nullable=False, default=0),
        sa.Column('costo_por_kilo', sa.Numeric(12, 4), nullable=False, default=0),
        sa.Column('atributos_jsonb', postgresql.JSONB()),
        sa.Column('es_merma', sa.Boolean(), nullable=False, default=False),
        sa.Column('creada_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['orden_id'], ['ordenes_clasificacion.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id']),
        sa.ForeignKeyConstraint(['categoria_clasificacion_id'], ['categorias_clasificacion.id']),
        sa.ForeignKeyConstraint(['almacen_destino_id'], ['almacenes.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('kilos > 0', name='ck_ordenes_lineas_kilos_pos')
    )

    # Ajustes inventario
    op.create_table(
        'ajustes_inventario',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('almacen_id', sa.SmallInteger(), nullable=False),
        sa.Column('producto_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('lote_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite')),
        sa.Column('stock_sistema', sa.Numeric(14, 3), nullable=False),
        sa.Column('stock_fisico', sa.Numeric(14, 3), nullable=False),
        sa.Column('diferencia', sa.Numeric(14, 3), nullable=False),
        sa.Column('motivo', sa.Text(), nullable=False),
        sa.Column('usuario_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('fecha', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['almacen_id'], ['almacenes.id']),
        sa.ForeignKeyConstraint(['producto_id'], ['productos.id']),
        sa.ForeignKeyConstraint(['lote_id'], ['lotes.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Auditoria
    op.create_table(
        'auditoria',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), autoincrement=True, nullable=False),
        sa.Column('tabla', sa.String(100), nullable=False),
        sa.Column('registro_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('accion', sa.String(20), nullable=False),
        sa.Column('valores_anteriores', postgresql.JSONB()),
        sa.Column('valores_nuevos', postgresql.JSONB()),
        sa.Column('usuario_id', sa.BigInteger().with_variant(sa.Integer, 'sqlite'), nullable=False),
        sa.Column('ip', sa.String(45)),
        sa.Column('user_agent', sa.Text()),
        sa.Column('creado_en', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("accion IN ('INSERT', 'UPDATE', 'DELETE')", name='ck_auditoria_accion')
    )
    op.create_index('ix_auditoria_tabla_registro', 'auditoria', ['tabla', 'registro_id'])
    op.create_index('ix_auditoria_usuario_fecha', 'auditoria', ['usuario_id', 'creado_en'])

    # Trigger function for updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION set_actualizado_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.actualizado_en = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # Triggers
    op.execute("DROP TRIGGER IF EXISTS trg_usuarios_actualizar ON usuarios;")
    op.execute("CREATE TRIGGER trg_usuarios_actualizar BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();")
    
    op.execute("DROP TRIGGER IF EXISTS trg_proveedores_actualizar ON proveedores;")
    op.execute("CREATE TRIGGER trg_proveedores_actualizar BEFORE UPDATE ON proveedores FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();")
    
    op.execute("DROP TRIGGER IF EXISTS trg_productos_actualizar ON productos;")
    op.execute("CREATE TRIGGER trg_productos_actualizar BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION set_actualizado_at();")

    # Seed default roles
    op.bulk_insert(
        sa.table('roles', sa.column('nombre', sa.String)),
        [
            {'nombre': 'admin'},
            {'nombre': 'almacenista'},
            {'nombre': 'vendedor'},
            {'nombre': 'solo_lectura'},
        ]
    )
    # Seed data moved to scripts/seed.py
    pass


def downgrade() -> None:
    op.drop_table('auditoria')
    op.drop_table('ajustes_inventario')
    op.drop_table('ordenes_clasificacion_lineas')
    op.drop_table('ordenes_clasificacion')
    op.drop_table('categorias_clasificacion')
    op.drop_table('criterios_clasificacion')
    op.drop_table('ventas_lineas')
    op.drop_table('ventas')
    op.drop_table('compradores')
    op.drop_index('ix_movimientos_referencia', table_name='movimientos')
    op.drop_index('ix_movimientos_fecha_brin', table_name='movimientos')
    op.drop_index('ix_movimientos_lote_id', table_name='movimientos')
    op.drop_index('ix_movimientos_producto_almacen_fecha', table_name='movimientos')
    op.drop_table('movimientos')
    op.drop_table('stock_actual')
    op.drop_table('lotes')
    op.drop_table('productos')
    op.drop_index('idx_proveedores_nombre', table_name='proveedores')
    op.drop_index('idx_proveedores_activo', table_name='proveedores')
    op.drop_table('proveedores')
    op.drop_table('almacenes')
    op.drop_table('presentaciones')
    op.drop_table('categorias_producto')
    op.drop_table('usuarios')
    op.drop_table('roles')
    op.execute('DROP FUNCTION IF EXISTS set_actualizado_at()')
    op.execute('DROP EXTENSION IF EXISTS pg_trgm')
    op.execute('DROP EXTENSION IF EXISTS pgcrypto')