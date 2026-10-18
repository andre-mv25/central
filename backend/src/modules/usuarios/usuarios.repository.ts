import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { UsuarioConRolRow, UsuarioRow } from './usuario.entity';

@Injectable()
export class UsuariosRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<UsuarioConRolRow[]> {
    const { rows } = await this.pool.query<UsuarioConRolRow>(
      `SELECT u.id,
              u.email,
              u.password_hash,
              u.rol_id,
              u.activo,
              u.creado_at,
              u.actualizado_at,
              r.nombre AS rol
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        ORDER BY u.email`,
    );
    return rows;
  }

  async findById(id: number): Promise<UsuarioConRolRow | null> {
    const { rows } = await this.pool.query<UsuarioConRolRow>(
      `SELECT u.id,
              u.email,
              u.password_hash,
              u.rol_id,
              u.activo,
              u.creado_at,
              u.actualizado_at,
              r.nombre AS rol
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE u.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<UsuarioConRolRow | null> {
    const { rows } = await this.pool.query<UsuarioConRolRow>(
      `SELECT u.id,
              u.email,
              u.password_hash,
              u.rol_id,
              u.activo,
              u.creado_at,
              u.actualizado_at,
              r.nombre AS rol
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
        WHERE u.email = $1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    rolId: number;
  }): Promise<UsuarioRow> {
    const { rows } = await this.pool.query<UsuarioRow>(
      `INSERT INTO usuarios (email, password_hash, rol_id)
       VALUES ($1, $2, $3)
       RETURNING id, email, password_hash, rol_id, activo, creado_at, actualizado_at`,
      [data.email, data.passwordHash, data.rolId],
    );
    return rows[0];
  }

  async update(
    id: number,
    data: { email?: string; passwordHash?: string; rolId?: number; activo?: boolean },
  ): Promise<UsuarioConRolRow | null> {
    const { rows } = await this.pool.query<UsuarioRow>(
      `UPDATE usuarios
          SET email = COALESCE($2, email),
              password_hash = COALESCE($3, password_hash),
              rol_id = COALESCE($4, rol_id),
              activo = COALESCE($5, activo)
        WHERE id = $1
        RETURNING id, email, password_hash, rol_id, activo, creado_at, actualizado_at`,
      [id, data.email ?? null, data.passwordHash ?? null, data.rolId ?? null, data.activo ?? null],
    );
    if (!rows[0]) {
      return null;
    }
    return this.findById(id);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
