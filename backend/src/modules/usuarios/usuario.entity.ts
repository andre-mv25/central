import { Injectable } from '@nestjs/common';

export interface UsuarioRow {
  id: number;
  email: string;
  password_hash: string;
  rol_id: number;
  activo: boolean;
  creado_at: Date;
  actualizado_at: Date;
}

export interface UsuarioConRolRow extends UsuarioRow {
  rol: string;
}
