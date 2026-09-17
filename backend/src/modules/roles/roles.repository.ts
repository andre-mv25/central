import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';

export interface RolRow {
  id: number;
  nombre: string;
}

@Injectable()
export class RolesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<RolRow[]> {
    const { rows } = await this.pool.query<RolRow>('SELECT id, nombre FROM roles ORDER BY id');
    return rows;
  }

  async findById(id: number): Promise<RolRow | null> {
    const { rows } = await this.pool.query<RolRow>('SELECT id, nombre FROM roles WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByName(nombre: string): Promise<RolRow | null> {
    const { rows } = await this.pool.query<RolRow>('SELECT id, nombre FROM roles WHERE nombre = $1', [nombre]);
    return rows[0] ?? null;
  }
}
