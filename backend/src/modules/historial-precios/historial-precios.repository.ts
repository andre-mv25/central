import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';

export type DbExecutor = Pool | PoolClient;

export interface HistorialPrecioRow {
  id: number;
  clase_id: number;
  calidad_id: number;
  precio: string;
  vigente_desde: Date;
  registrado_por_id: number | null;
  creado_at: Date;
}

@Injectable()
export class HistorialPreciosRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByClaseCalidad(claseId: number, calidadId: number): Promise<HistorialPrecioRow[]> {
    const { rows } = await this.pool.query<HistorialPrecioRow>(
      `SELECT *
         FROM historial_precios
        WHERE clase_id = $1
          AND calidad_id = $2
        ORDER BY vigente_desde DESC`,
      [claseId, calidadId],
    );
    return rows;
  }

  async findUltimo(
    claseId: number,
    calidadId: number,
    executor: DbExecutor = this.pool,
  ): Promise<HistorialPrecioRow | null> {
    const { rows } = await executor.query<HistorialPrecioRow>(
      `SELECT *
         FROM historial_precios
        WHERE clase_id = $1
          AND calidad_id = $2
        ORDER BY vigente_desde DESC
        LIMIT 1`,
      [claseId, calidadId],
    );
    return rows[0] ?? null;
  }

  async create(
    data: {
      claseId: number;
      calidadId: number;
      precio: number;
      registradoPorId?: number;
    },
    executor: DbExecutor = this.pool,
  ): Promise<HistorialPrecioRow> {
    const { rows } = await executor.query<HistorialPrecioRow>(
      `INSERT INTO historial_precios (clase_id, calidad_id, precio, registrado_por_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.claseId, data.calidadId, data.precio, data.registradoPorId ?? null],
    );
    return rows[0];
  }
}
