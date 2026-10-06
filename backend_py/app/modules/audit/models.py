from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Text, SmallInteger, ForeignKey, TIMESTAMP, BigInteger, func, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import BIGINT, JSONB
from app.core.database import Base


class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    tabla: Mapped[str] = mapped_column(String(100), nullable=False)
    registro_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    accion: Mapped[str] = mapped_column(String(20), nullable=False)
    valores_anteriores: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    valores_nuevos: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    usuario_id: Mapped[int] = mapped_column(BIGINT, ForeignKey("usuarios.id"), nullable=False)
    ip: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    usuario: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_auditoria_tabla_registro", "tabla", "registro_id"),
        Index("ix_auditoria_usuario_fecha", "usuario_id", "creado_en"),
        CheckConstraint("accion IN ('INSERT', 'UPDATE', 'DELETE')", name="ck_auditoria_accion"),
    )