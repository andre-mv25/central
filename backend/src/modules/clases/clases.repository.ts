import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';

export type DbExecutor = Pool | PoolClient;

export interface ClaseRow {
  id: number;
  nombre_clase: string;
}

@Injectable()
export class ClasesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByName(nombreClase: string, executor: DbExecutor = this.pool): Promise<ClaseRow | null> {
    const { rows } = await executor.query<ClaseRow>(
      'SELECT * FROM clases WHERE nombre_clase = $1',
      [nombreClase],
    );
    return rows[0] ?? null;
  }

  async findOrCreateByName(nombreClase: string, executor: DbExecutor = this.pool): Promise<number> {
    const existente = await this.findByName(nombreClase, executor);
    if (existente) return existente.id;
    const { rows } = await executor.query<Pick<ClaseRow, 'id'>>(
      `INSERT INTO clases (nombre_clase)
       VALUES ($1)
       ON CONFLICT (nombre_clase) DO UPDATE SET nombre_clase = EXCLUDED.nombre_clase
       RETURNING id`,
      [nombreClase],
    );
    return rows[0].id;
  }

  async findAll(): Promise<ClaseRow[]> {
    const { rows } = await this.pool.query<ClaseRow>('SELECT * FROM clases ORDER BY nombre_clase');
    return rows;
  }

  async findById(id: number): Promise<ClaseRow | null> {
    const { rows } = await this.pool.query<ClaseRow>('SELECT * FROM clases WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async create(nombreClase: string): Promise<ClaseRow> {
    const { rows } = await this.pool.query<ClaseRow>(
      'INSERT INTO clases (nombre_clase) VALUES ($1) RETURNING *',
      [nombreClase],
    );
    return rows[0];
  }

  async update(id: number, nombreClase: string): Promise<ClaseRow | null> {
    const { rows } = await this.pool.query<ClaseRow>(
      'UPDATE clases SET nombre_clase = $2 WHERE id = $1 RETURNING *',
      [id, nombreClase],
    );
    return rows[0] ?? null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM clases WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
