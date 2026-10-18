import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';

export type DbExecutor = Pool | PoolClient;

export interface RegistroVentaRow {
  id: number;
  comprador_id: number;
  clase_id: number;
  calidad_id: number;
  usuario_registro_id: number;
  bolsas: number;
  kilos: string;
  precio: string;
  total: string;
  fecha: Date;
  creado_at: Date;
  actualizado_at: Date;
}

export interface RegistroVentaDetalle extends RegistroVentaRow {
  comprador: string;
  sucursal: string;
  clase: string;
  calidad: string;
  usuario: string;
}

export interface RegistrosFiltro {
  fecha?: string;
  compradorId?: number;
  sucursal?: string;
}

@Injectable()
export class RegistrosVentasRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private readonly selectDetalle = `
    SELECT rv.*,
           c.nombre AS comprador,
           c.sucursal,
           cl.nombre_clase AS clase,
           ca.nombre_calidad AS calidad,
           u.email AS usuario
      FROM registros_ventas rv
      JOIN compradores c ON c.id = rv.comprador_id
      JOIN clases cl ON cl.id = rv.clase_id
      JOIN calidades ca ON ca.id = rv.calidad_id
      JOIN usuarios u ON u.id = rv.usuario_registro_id`;

  async findAll(filtro: RegistrosFiltro): Promise<RegistroVentaDetalle[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filtro.fecha) {
      params.push(filtro.fecha);
      conditions.push(`rv.fecha = $${params.length}`);
    }
    if (filtro.compradorId) {
      params.push(filtro.compradorId);
      conditions.push(`rv.comprador_id = $${params.length}`);
    }
    if (filtro.sucursal) {
      params.push(filtro.sucursal);
      conditions.push(`c.sucursal = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query<RegistroVentaDetalle>(
      `${this.selectDetalle} ${where} ORDER BY rv.creado_at DESC`,
      params,
    );
    return rows;
  }

  async findById(id: number): Promise<RegistroVentaDetalle | null> {
    const { rows } = await this.pool.query<RegistroVentaDetalle>(
      `${this.selectDetalle} WHERE rv.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(
    data: {
      compradorId: number;
      claseId: number;
      calidadId: number;
      usuarioRegistroId: number;
      bolsas: number;
      kilos: number;
      precio: number;
      fecha?: string;
    },
    executor: DbExecutor = this.pool,
  ): Promise<RegistroVentaRow> {
    const { rows } = await executor.query<RegistroVentaRow>(
      `INSERT INTO registros_ventas
         (comprador_id, clase_id, calidad_id, usuario_registro_id, bolsas, kilos, precio, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE))
       RETURNING *`,
      [
        data.compradorId,
        data.claseId,
        data.calidadId,
        data.usuarioRegistroId,
        data.bolsas,
        data.kilos,
        data.precio,
        data.fecha ?? null,
      ],
    );
    return rows[0];
  }

  async update(
    id: number,
    data: {
      compradorId?: number;
      claseId?: number;
      calidadId?: number;
      bolsas?: number;
      kilos?: number;
      precio?: number;
      fecha?: string;
    },
    executor: DbExecutor = this.pool,
  ): Promise<RegistroVentaRow | null> {
    const { rows } = await executor.query<RegistroVentaRow>(
      `UPDATE registros_ventas
          SET comprador_id = COALESCE($2, comprador_id),
              clase_id = COALESCE($3, clase_id),
              calidad_id = COALESCE($4, calidad_id),
              bolsas = COALESCE($5, bolsas),
              kilos = COALESCE($6, kilos),
              precio = COALESCE($7, precio),
              fecha = COALESCE($8, fecha)
        WHERE id = $1
        RETURNING *`,
      [
        id,
        data.compradorId ?? null,
        data.claseId ?? null,
        data.calidadId ?? null,
        data.bolsas ?? null,
        data.kilos ?? null,
        data.precio ?? null,
        data.fecha ?? null,
      ],
    );
    return rows[0] ?? null;
  }

  async remove(id: number, executor: DbExecutor = this.pool): Promise<boolean> {
    const result = await executor.query('DELETE FROM registros_ventas WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
