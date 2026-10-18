import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { Inject } from '@nestjs/common';

export interface EntradaMercanciaRow {
  id: number;
  proveedor_id: number;
  clase_id: number;
  calidad_id: number;
  usuario_registro_id: number;
  bolsas: number;
  kilos: string;
  precio: string;
  total: string;
  fecha: string;
  observaciones: string | null;
  creado_at: string;
  actualizado_at: string;
  proveedor: string;
  clase: string;
  calidad: string;
  usuario: string;
  sucursal: string;
}

export interface EntradaMercanciaCreateInput {
  proveedorId: number;
  claseId: number;
  calidadId: number;
  usuarioRegistroId: number;
  bolsas: number;
  kilos: number;
  precio: number;
  fecha?: string;
  observaciones?: string;
}

export interface EntradaMercanciaUpdateInput {
  proveedorId?: number;
  claseId?: number;
  calidadId?: number;
  bolsas?: number;
  kilos?: number;
  precio?: number;
  fecha?: string;
  observaciones?: string;
}

@Injectable()
export class EntradasMercanciaRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(query: {
    fecha?: string;
    proveedorId?: number;
    claseId?: number;
    calidadId?: number;
  }): Promise<EntradaMercanciaRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (query.fecha) {
      conditions.push(`em.fecha = $${paramIndex++}`);
      values.push(query.fecha);
    }
    if (query.proveedorId) {
      conditions.push(`em.proveedor_id = $${paramIndex++}`);
      values.push(query.proveedorId);
    }
    if (query.claseId) {
      conditions.push(`em.clase_id = $${paramIndex++}`);
      values.push(query.claseId);
    }
    if (query.calidadId) {
      conditions.push(`em.calidad_id = $${paramIndex++}`);
      values.push(query.calidadId);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        em.id,
        em.proveedor_id,
        em.clase_id,
        em.calidad_id,
        em.usuario_registro_id,
        em.bolsas,
        em.kilos,
        em.precio,
        em.total,
        em.fecha,
        em.observaciones,
        em.creado_at,
        em.actualizado_at,
        c.nombre AS proveedor,
        c.sucursal,
        cl.nombre_clase AS clase,
        ca.nombre_calidad AS calidad,
        u.email AS usuario
      FROM entradas_mercancia em
      JOIN compradores c ON c.id = em.proveedor_id
      JOIN clases cl ON cl.id = em.clase_id
      JOIN calidades ca ON ca.id = em.calidad_id
      JOIN usuarios u ON u.id = em.usuario_registro_id
      ${whereClause}
      ORDER BY em.fecha DESC, em.creado_at DESC
    `;

    const result = await this.pool.query(sql, values);
    return result.rows;
  }

  async findById(id: number): Promise<EntradaMercanciaRow | null> {
    const sql = `
      SELECT
        em.id,
        em.proveedor_id,
        em.clase_id,
        em.calidad_id,
        em.usuario_registro_id,
        em.bolsas,
        em.kilos,
        em.precio,
        em.total,
        em.fecha,
        em.observaciones,
        em.creado_at,
        em.actualizado_at,
        c.nombre AS proveedor,
        c.sucursal,
        cl.nombre_clase AS clase,
        ca.nombre_calidad AS calidad,
        u.email AS usuario
      FROM entradas_mercancia em
      JOIN compradores c ON c.id = em.proveedor_id
      JOIN clases cl ON cl.id = em.clase_id
      JOIN calidades ca ON ca.id = em.calidad_id
      JOIN usuarios u ON u.id = em.usuario_registro_id
      WHERE em.id = $1
    `;
    const result = await this.pool.query(sql, [id]);
    return result.rows[0] ?? null;
  }

  async create(
    data: EntradaMercanciaCreateInput,
    client: PoolClient = this.pool as unknown as PoolClient,
  ): Promise<{ id: number }> {
    const sql = `
      INSERT INTO entradas_mercancia
        (proveedor_id, clase_id, calidad_id, usuario_registro_id, bolsas, kilos, precio, fecha, observaciones)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;
    const values = [
      data.proveedorId,
      data.claseId,
      data.calidadId,
      data.usuarioRegistroId,
      data.bolsas,
      data.kilos,
      data.precio,
      data.fecha ?? new Date().toISOString().split('T')[0],
      data.observaciones ?? null,
    ];
    const result = await client.query(sql, values);
    return { id: result.rows[0].id };
  }

  async update(
    id: number,
    data: EntradaMercanciaUpdateInput,
    client: PoolClient = this.pool as unknown as PoolClient,
  ): Promise<EntradaMercanciaRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.proveedorId !== undefined) {
      sets.push(`proveedor_id = $${paramIndex++}`);
      values.push(data.proveedorId);
    }
    if (data.claseId !== undefined) {
      sets.push(`clase_id = $${paramIndex++}`);
      values.push(data.claseId);
    }
    if (data.calidadId !== undefined) {
      sets.push(`calidad_id = $${paramIndex++}`);
      values.push(data.calidadId);
    }
    if (data.bolsas !== undefined) {
      sets.push(`bolsas = $${paramIndex++}`);
      values.push(data.bolsas);
    }
    if (data.kilos !== undefined) {
      sets.push(`kilos = $${paramIndex++}`);
      values.push(data.kilos);
    }
    if (data.precio !== undefined) {
      sets.push(`precio = $${paramIndex++}`);
      values.push(data.precio);
    }
    if (data.fecha !== undefined) {
      sets.push(`fecha = $${paramIndex++}`);
      values.push(data.fecha);
    }
    if (data.observaciones !== undefined) {
      sets.push(`observaciones = $${paramIndex++}`);
      values.push(data.observaciones);
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const sql = `
      UPDATE entradas_mercancia
      SET ${sets.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(sql, values);
    if (result.rows.length === 0) return null;
    return this.findById(id);
  }

  async remove(id: number, client: PoolClient = this.pool as unknown as PoolClient): Promise<boolean> {
    const result = await client.query('DELETE FROM entradas_mercancia WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}