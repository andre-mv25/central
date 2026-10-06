from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    BIGINT,
    BigInteger,
    Boolean,
    DATE,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
    func,
    text,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    usuarios: Mapped[list["User"]] = relationship(back_populates="rol")


class User(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    rol_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("roles.id"), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    rol: Mapped["Role"] = relationship(back_populates="usuarios")
    movimientos: Mapped[list["Movimiento"]] = relationship(back_populates="usuario")
    ventas: Mapped[list["Venta"]] = relationship(back_populates="usuario", foreign_keys="Venta.usuario_id")
    ordenes_clasificacion: Mapped[list["OrdenClasificacion"]] = relationship(back_populates="operario")


class CategoriaProducto(Base):
    __tablename__ = "categorias_producto"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Presentacion(Base):
    __tablename__ = "presentaciones"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    kilos_defecto: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3))
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Almacen(Base):
    __tablename__ = "almacenes"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    ubicacion: Mapped[Optional[str]] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    contacto: Mapped[Optional[str]] = mapped_column(String(150))
    telefono: Mapped[Optional[str]] = mapped_column(String(30))
    email: Mapped[Optional[str]] = mapped_column(String(150))
    direccion: Mapped[Optional[str]] = mapped_column(Text)
    rfc: Mapped[Optional[str]] = mapped_column(String(20))
    condiciones_pago: Mapped[Optional[str]] = mapped_column(String(100))
    dias_credito: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    lotes: Mapped[list["Lote"]] = relationship(back_populates="proveedor")


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    categoria_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("categorias_producto.id"), nullable=False)
    unidad_base: Mapped[str] = mapped_column(String(30), default="kg", nullable=False)
    costo: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    precio_sugerido_kg: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0, nullable=False)
    stock_minimo: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    eliminado_en: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    categoria: Mapped["CategoriaProducto"] = relationship()
    stock_actual: Mapped[list["StockActual"]] = relationship(back_populates="producto", foreign_keys="StockActual.producto_id")
    movimientos: Mapped[list["Movimiento"]] = relationship(back_populates="producto")
    ventas_lineas: Mapped[list["VentaLinea"]] = relationship(back_populates="producto")
    ordenes_lineas: Mapped[list["OrdenClasificacionLinea"]] = relationship(back_populates="producto")


class Lote(Base):
    __tablename__ = "lotes"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    proveedor_id: Mapped[Optional[int]] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), ForeignKey("proveedores.id"), nullable=True
    )
    parcela: Mapped[Optional[str]] = mapped_column(String(150))
    fecha_cosecha: Mapped[Optional[datetime]] = mapped_column(DATE)
    fecha_recepcion: Mapped[datetime] = mapped_column(DATE, server_default=func.current_date(), nullable=False)
    variedad: Mapped[str] = mapped_column(String(100), nullable=False)
    kilos_recibidos: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    costo_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    costo_por_kilo: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    eliminado_en: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    proveedor: Mapped[Optional["Proveedor"]] = relationship(back_populates="lotes")
    stock_actual: Mapped[list["StockActual"]] = relationship(back_populates="lote", foreign_keys="StockActual.lote_id")
    movimientos: Mapped[list["Movimiento"]] = relationship(back_populates="lote")
    ventas_lineas: Mapped[list["VentaLinea"]] = relationship(back_populates="lote")
    ordenes_clasificacion: Mapped[list["OrdenClasificacion"]] = relationship(back_populates="lote_origen")


class StockActual(Base):
    __tablename__ = "stock_actual"

    producto_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), ForeignKey("productos.id"), primary_key=True
    )
    almacen_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("almacenes.id"), primary_key=True)
    lote_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), ForeignKey("lotes.id"), primary_key=True
    )
    kilos: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    producto: Mapped["Producto"] = relationship(back_populates="stock_actual", foreign_keys=[producto_id])
    almacen: Mapped["Almacen"] = relationship()
    lote: Mapped["Lote"] = relationship(back_populates="stock_actual", foreign_keys=[lote_id])

    __table_args__ = (
        CheckConstraint("kilos >= 0", name="ck_stock_actual_kilos_nonneg"),
    )


class MovimientoTipo:
    ENTRADA_COMPRA = "entrada_compra"
    SALIDA_VENTA = "salida_venta"
    ENTRADA_CLASIFICACION = "entrada_clasificacion"
    SALIDA_CLASIFICACION = "salida_clasificacion"
    MERMA = "merma"
    AJUSTE_INVENTARIO = "ajuste_inventario"
    TRASLADO_ENTRADA = "traslado_entrada"
    TRASLADO_SALIDA = "salida_traslado"


class Movimiento(Base):
    __tablename__ = "movimientos"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    producto_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), ForeignKey("productos.id"), nullable=False
    )
    almacen_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("almacenes.id"), nullable=False)
    lote_id: Mapped[Optional[int]] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), ForeignKey("lotes.id"), nullable=True
    )
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    kilos: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    costo_por_kilo: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4))
    fecha: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    usuario_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("usuarios.id"), nullable=False)
    referencia_tipo: Mapped[Optional[str]] = mapped_column(String(50))
    referencia_id: Mapped[Optional[int]] = mapped_column(BigInteger().with_variant(Integer, "sqlite"))
    notas: Mapped[Optional[str]] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    producto: Mapped["Producto"] = relationship(back_populates="movimientos")
    almacen: Mapped["Almacen"] = relationship()
    lote: Mapped[Optional["Lote"]] = relationship(back_populates="movimientos")
    usuario: Mapped["User"] = relationship(back_populates="movimientos")

    __table_args__ = (
        Index("ix_movimientos_producto_almacen_fecha", "producto_id", "almacen_id", "fecha"),
        Index("ix_movimientos_lote_id", "lote_id"),
        Index("ix_movimientos_fecha_brin", "fecha", postgresql_using="brin"),
        Index("ix_movimientos_referencia", "referencia_tipo", "referencia_id"),
        CheckConstraint("kilos <> 0", name="ck_movimientos_kilos_no_zero"),
    )


class Comprador(Base):
    __tablename__ = "compradores"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(30))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    eliminado_en: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    ventas: Mapped[list["Venta"]] = relationship(back_populates="comprador")

    __table_args__ = (
        Index("ix_compradores_nombre_trgm", "nombre", postgresql_using="gin", postgresql_ops={"nombre": "gin_trgm_ops"}),
    )


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    fecha: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    comprador_id: Mapped[Optional[int]] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), ForeignKey("compradores.id"), nullable=True
    )
    usuario_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("usuarios.id"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="completada", nullable=False)
    anulada_en: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    anulada_por_id: Mapped[Optional[int]] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("usuarios.id"))
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    comprador: Mapped[Optional["Comprador"]] = relationship(back_populates="ventas")
    usuario: Mapped["User"] = relationship(back_populates="ventas", foreign_keys=[usuario_id])
    anulada_por: Mapped[Optional["User"]] = relationship(foreign_keys=[anulada_por_id])
    lineas: Mapped[list["VentaLinea"]] = relationship(back_populates="venta", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("estado IN ('completada', 'anulada')", name="ck_ventas_estado"),
        CheckConstraint("total >= 0", name="ck_ventas_total_nonneg"),
    )


class VentaLinea(Base):
    __tablename__ = "ventas_lineas"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    venta_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False)
    producto_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("productos.id"), nullable=False)
    lote_id: Mapped[Optional[int]] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("lotes.id"), nullable=True)
    kilos: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    presentacion: Mapped[Optional[str]] = mapped_column(String(50))
    unidades: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    precio_por_kilo: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    total_linea: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    venta: Mapped["Venta"] = relationship(back_populates="lineas")
    producto: Mapped["Producto"] = relationship(back_populates="ventas_lineas")
    lote: Mapped[Optional["Lote"]] = relationship(back_populates="ventas_lineas")

    __table_args__ = (
        CheckConstraint("kilos > 0", name="ck_ventas_lineas_kilos_pos"),
        CheckConstraint("precio_por_kilo >= 0", name="ck_ventas_lineas_precio_nonneg"),
        CheckConstraint("total_linea >= 0", name="ck_ventas_lineas_total_nonneg"),
    )


class CriterioClasificacion(Base):
    __tablename__ = "criterios_clasificacion"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    es_mixto: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class CategoriaClasificacion(Base):
    __tablename__ = "categorias_clasificacion"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, autoincrement=True)
    criterio_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("criterios_clasificacion.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False)
    orden: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    criterio: Mapped["CriterioClasificacion"] = relationship()

    __table_args__ = (
        UniqueConstraint("criterio_id", "nombre", name="uq_categoria_clasificacion_criterio_nombre"),
    )


class OrdenClasificacion(Base):
    __tablename__ = "ordenes_clasificacion"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    lote_origen_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("lotes.id"), nullable=False)
    criterio_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("criterios_clasificacion.id"), nullable=False)
    fecha: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    operario_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("usuarios.id"), nullable=False)
    kilos_entrada: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    kilos_clasificados: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    kilos_merma: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    merma_porcentaje: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    costo_reparto_metodo: Mapped[str] = mapped_column(String(20), default="peso", nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="borrador", nullable=False)
    cerrada_en: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    creada_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    actualizada_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    lote_origen: Mapped["Lote"] = relationship(back_populates="ordenes_clasificacion")
    criterio: Mapped["CriterioClasificacion"] = relationship()
    operario: Mapped["User"] = relationship(back_populates="ordenes_clasificacion")
    lineas: Mapped[list["OrdenClasificacionLinea"]] = relationship(back_populates="orden", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("estado IN ('borrador', 'cerrada', 'cancelada')", name="ck_ordenes_estado"),
        CheckConstraint("kilos_entrada > 0", name="ck_ordenes_kilos_entrada_pos"),
        CheckConstraint("costo_reparto_metodo IN ('peso', 'precio_relativo')", name="ck_ordenes_metodo_reparto"),
    )


class OrdenClasificacionLinea(Base):
    __tablename__ = "ordenes_clasificacion_lineas"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    orden_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("ordenes_clasificacion.id", ondelete="CASCADE"), nullable=False)
    producto_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("productos.id"), nullable=False)
    categoria_clasificacion_id: Mapped[Optional[int]] = mapped_column(SmallInteger, ForeignKey("categorias_clasificacion.id"), nullable=True)
    almacen_destino_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("almacenes.id"), nullable=False)
    kilos: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    costo_asignado: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    costo_por_kilo: Mapped[Decimal] = mapped_column(Numeric(12, 4), default=0, nullable=False)
    atributos_jsonb: Mapped[Optional[dict]] = mapped_column(JSONB)
    es_merma: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    creada_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    orden: Mapped["OrdenClasificacion"] = relationship(back_populates="lineas")
    producto: Mapped["Producto"] = relationship(back_populates="ordenes_lineas")
    categoria_clasificacion: Mapped[Optional["CategoriaClasificacion"]] = relationship()
    almacen_destino: Mapped["Almacen"] = relationship()

    __table_args__ = (
        CheckConstraint("kilos > 0", name="ck_ordenes_lineas_kilos_pos"),
    )


class AjusteInventario(Base):
    __tablename__ = "ajustes_inventario"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    almacen_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("almacenes.id"), nullable=False)
    producto_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("productos.id"), nullable=False)
    lote_id: Mapped[Optional[int]] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("lotes.id"), nullable=True)
    stock_sistema: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    stock_fisico: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    diferencia: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    motivo: Mapped[str] = mapped_column(Text, nullable=False)
    usuario_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("usuarios.id"), nullable=False)
    fecha: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    almacen: Mapped["Almacen"] = relationship()
    producto: Mapped["Producto"] = relationship()
    lote: Mapped[Optional["Lote"]] = relationship()
    usuario: Mapped["User"] = relationship()


class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    tabla: Mapped[str] = mapped_column(String(100), nullable=False)
    registro_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), nullable=False)
    accion: Mapped[str] = mapped_column(String(20), nullable=False)
    valores_anteriores: Mapped[Optional[dict]] = mapped_column(JSONB)
    valores_nuevos: Mapped[Optional[dict]] = mapped_column(JSONB)
    usuario_id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey("usuarios.id"), nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    usuario: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_auditoria_tabla_registro", "tabla", "registro_id"),
        Index("ix_auditoria_usuario_fecha", "usuario_id", "creado_en"),
        CheckConstraint("accion IN ('INSERT', 'UPDATE', 'DELETE')", name="ck_auditoria_accion"),
    )