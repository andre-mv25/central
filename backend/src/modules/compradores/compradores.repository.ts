import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { withRetry } from '../../common/utils/db-retry.util';

export type DbExecutor = Pool | PoolClient;

export interface CompradorRow {
  id: number;
  nombre: string;
  telefono: string | null;
  sucursal: string;
  creado_at: Date;
  actualizado_at: Date;
}

@Injectable()
export class CompradoresRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByName(nombre: string, executor: DbExecutor = this.pool): Promise<CompradorRow | null> {
    return withRetry(async () => {
      const { rows } = await executor.query<CompradorRow>(
        'SELECT * FROM compradores WHERE nombre = $1',
        [nombre],
      );
      return rows[0] ?? null;
    });
  }

  async findOrCreateByName(nombre: string, executor: DbExecutor = this.pool): Promise<number> {
    return withRetry(async () => {
      const existente = await this.findByName(nombre, executor);
      if (existente) return existente.id;
      const { rows } = await executor.query<Pick<CompradorRow, 'id'>>(
        `INSERT INTO compradores (nombre, telefono, sucursal)
         VALUES ($1, NULL, '')
         ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
         RETURNING id`,
        [nombre],
      );
      return rows[0].id;
    });
  }

  async findAll(sucursal?: string): Promise<CompradorRow[]> {
    return withRetry(async () => {
      if (sucursal) {
        const { rows } = await this.pool.query<CompradorRow>(
          `SELECT * FROM compradores WHERE sucursal = $1 ORDER BY nombre`,
          [sucursal],
        );
        return rows;
      }
      const { rows } = await this.pool.query<CompradorRow>('SELECT * FROM compradores ORDER BY nombre');
      return rows;
    });
  }

  async findById(id: number): Promise<CompradorRow | null> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<CompradorRow>('SELECT * FROM compradores WHERE id = $1', [id]);
      return rows[0] ?? null;
    });
  }

  async create(data: { nombre: string; telefono?: string; sucursal: string }): Promise<CompradorRow> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<CompradorRow>(
        `INSERT INTO compradores (nombre, telefono, sucursal)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.nombre, data.telefono ?? null, data.sucursal],
      );
      return rows[0];
    });
  }

  async update(
    id: number,
    data: { nombre?: string; telefono?: string; sucursal?: string },
  ): Promise<CompradorRow | null> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<CompradorRow>(
        `UPDATE compradores
            SET nombre = COALESCE($2, nombre),
                telefono = COALESCE($3, telefono),
                sucursal = COALESCE($4, sucursal)
          WHERE id = $1
          RETURNING *`,
        [id, data.nombre ?? null, data.telefono ?? null, data.sucursal ?? null],
      );
      return rows[0] ?? null;
    });
  }

  async remove(id: number): Promise<boolean> {
    return withRetry(async () => {
      const result = await this.pool.query('DELETE FROM compradores WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    });
  }
}
