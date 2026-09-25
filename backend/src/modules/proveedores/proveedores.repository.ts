import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { withRetry } from '../../common/utils/db-retry.util';

export interface ProveedorRow {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  rfc: string | null;
  condiciones_pago: string | null;
  dias_credito: number;
  activo: boolean;
  creado_at: Date;
  actualizado_at: Date;
}

@Injectable()
export class ProveedoresRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(activo?: boolean, buscar?: string): Promise<ProveedorRow[]> {
    return withRetry(async () => {
      const params: unknown[] = [];
      const conditions: string[] = [];

      if (activo !== undefined) {
        params.push(activo);
        conditions.push(`activo = $${params.length}`);
      }

      if (buscar?.trim()) {
        params.push(`%${buscar.trim()}%`);
        conditions.push(`(nombre ILIKE $${params.length} OR contacto ILIKE $${params.length} OR email ILIKE $${params.length})`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows } = await this.pool.query<ProveedorRow>(
        `SELECT * FROM proveedores ${where} ORDER BY activo DESC, nombre`,
        params,
      );
      return rows;
    });
  }

  async findById(id: number): Promise<ProveedorRow | null> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ProveedorRow>(
        `SELECT * FROM proveedores WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    });
  }

  async findByNombre(nombre: string): Promise<ProveedorRow | null> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ProveedorRow>(
        `SELECT * FROM proveedores WHERE lower(trim(nombre)) = lower(trim($1))`,
        [nombre],
      );
      return rows[0] ?? null;
    });
  }

  async create(data: {
    nombre: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    rfc?: string;
    condicionesPago?: string;
    diasCredito?: number;
  }): Promise<ProveedorRow> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ProveedorRow>(
        `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, rfc, condiciones_pago, dias_credito)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          data.nombre,
          data.contacto || null,
          data.telefono || null,
          data.email || null,
          data.direccion || null,
          data.rfc || null,
          data.condicionesPago || null,
          data.diasCredito ?? 0,
        ],
      );
      return rows[0];
    });
  }

  async update(id: number, data: Partial<{
    nombre: string;
    contacto: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    rfc: string | null;
    condicionesPago: string | null;
    diasCredito: number;
    activo: boolean;
  }>): Promise<ProveedorRow | null> {
    return withRetry(async () => {
      const fields: string[] = [];
      const values: unknown[] = [id];
      let paramIndex = 2;

      const fieldMap: Record<string, string> = {
        nombre: 'nombre',
        contacto: 'contacto',
        telefono: 'telefono',
        email: 'email',
        direccion: 'direccion',
        rfc: 'rfc',
        condicionesPago: 'condiciones_pago',
        diasCredito: 'dias_credito',
        activo: 'activo',
      };

      for (const [key, column] of Object.entries(fieldMap)) {
        if (data[key as keyof typeof data] !== undefined) {
          fields.push(`${column} = $${paramIndex}`);
          values.push(data[key as keyof typeof data]);
          paramIndex++;
        }
      }

      if (fields.length === 0) return this.findById(id);

      const { rows } = await this.pool.query<ProveedorRow>(
        `UPDATE proveedores SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
        values,
      );
      return rows[0] ?? null;
    });
  }

  async delete(id: number): Promise<boolean> {
    return withRetry(async () => {
      const { rowCount } = await this.pool.query(
        `DELETE FROM proveedores WHERE id = $1`,
        [id],
      );
      return (rowCount ?? 0) > 0;
    });
  }

  async hasRecepciones(proveedorId: number): Promise<boolean> {
    return withRetry(async () => {
      const { rows } = await this.pool.query(
        `SELECT 1 FROM recepciones_inventario WHERE proveedor_id = $1 LIMIT 1`,
        [proveedorId],
      );
      return rows.length > 0;
    });
  }
}