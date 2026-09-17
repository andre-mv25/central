import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';

export interface CalidadRow {
  id: number;
  nombre_calidad: string;
}

@Injectable()
export class CalidadesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<CalidadRow[]> {
    const { rows } = await this.pool.query<CalidadRow>('SELECT * FROM calidades ORDER BY nombre_calidad');
    return rows;
  }

  async findById(id: number): Promise<CalidadRow | null> {
    const { rows } = await this.pool.query<CalidadRow>('SELECT * FROM calidades WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async create(nombreCalidad: string): Promise<CalidadRow> {
    const { rows } = await this.pool.query<CalidadRow>(
      'INSERT INTO calidades (nombre_calidad) VALUES ($1) RETURNING *',
      [nombreCalidad],
    );
    return rows[0];
  }

  async update(id: number, nombreCalidad: string): Promise<CalidadRow | null> {
    const { rows } = await this.pool.query<CalidadRow>(
      'UPDATE calidades SET nombre_calidad = $2 WHERE id = $1 RETURNING *',
      [id, nombreCalidad],
    );
    return rows[0] ?? null;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM calidades WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
