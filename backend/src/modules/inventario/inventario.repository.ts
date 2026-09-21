import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';

export type DbExecutor = Pool | PoolClient;

export interface ProductoInventarioRow {
  id: number;
  nombre: string;
  codigo: string | null;
  unidad_medida: string;
  stock_minimo: string;
  activo: boolean;
  stock_actual: string;
  creado_at: Date;
  actualizado_at: Date;
}

@Injectable()
export class InventarioRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findProductos(buscar?: string): Promise<ProductoInventarioRow[]> {
    const params: unknown[] = [];
    const filtro = buscar?.trim()
      ? (() => {
          params.push(`%${buscar.trim()}%`);
          return `WHERE p.nombre ILIKE $1 OR p.codigo ILIKE $1`;
        })()
      : '';
    const { rows } = await this.pool.query<ProductoInventarioRow>(
      `SELECT p.*, COALESCE(SUM(CASE m.tipo
          WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0) AS stock_actual
       FROM productos p LEFT JOIN movimientos_inventario m ON m.producto_id = p.id
       ${filtro}
       GROUP BY p.id ORDER BY p.activo DESC, p.nombre`,
      params,
    );
    return rows;
  }

  async findProductoById(id: number): Promise<ProductoInventarioRow | null> {
    const { rows } = await this.pool.query<ProductoInventarioRow>(
      `SELECT p.*, COALESCE((SELECT SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad
          WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END) FROM movimientos_inventario m
          WHERE m.producto_id = p.id), 0) AS stock_actual FROM productos p WHERE p.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async lockProducto(id: number, executor: PoolClient): Promise<ProductoInventarioRow | null> {
    const { rows } = await executor.query<ProductoInventarioRow>(
      `SELECT p.*, COALESCE((SELECT SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad
          WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END) FROM movimientos_inventario m
          WHERE m.producto_id = p.id), 0) AS stock_actual FROM productos p WHERE p.id = $1 FOR UPDATE OF p`,
      [id],
    );
    return rows[0] ?? null;
  }

  async createProducto(data: { nombre: string; codigo?: string; unidadMedida?: string; stockMinimo?: number }) {
    const { rows } = await this.pool.query<ProductoInventarioRow>(
      `INSERT INTO productos (nombre, codigo, unidad_medida, stock_minimo)
       VALUES ($1, $2, $3, $4) RETURNING *, 0::numeric AS stock_actual`,
      [data.nombre, data.codigo || null, data.unidadMedida || 'pieza', data.stockMinimo ?? 0],
    );
    return rows[0];
  }

  async updateProducto(id: number, data: Record<string, unknown>) {
    const { rows } = await this.pool.query<ProductoInventarioRow>(
      `UPDATE productos SET nombre = COALESCE($2, nombre), codigo = COALESCE($3, codigo),
       unidad_medida = COALESCE($4, unidad_medida), stock_minimo = COALESCE($5, stock_minimo),
       activo = COALESCE($6, activo) WHERE id = $1
       RETURNING *, 0::numeric AS stock_actual`,
      [id, data.nombre ?? null, data.codigo ?? null, data.unidadMedida ?? null, data.stockMinimo ?? null, data.activo ?? null],
    );
    return rows[0] ?? null;
  }

  async insertMovimiento(data: { productoId: number; tipo: string; cantidad: number; motivo?: string; referencia?: string; recepcionId?: number; usuarioId: number }, executor: DbExecutor) {
    const { rows } = await executor.query(
      `INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo, referencia, recepcion_id, usuario_registro_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.productoId, data.tipo, data.cantidad, data.motivo || null, data.referencia || null, data.recepcionId || null, data.usuarioId],
    );
    return rows[0];
  }

  async createRecepcion(data: { proveedor?: string; referencia?: string; fecha?: string; notas?: string; usuarioId: number }, executor: PoolClient) {
    const { rows } = await executor.query(
      `INSERT INTO recepciones_inventario (proveedor, referencia, fecha, notas, usuario_registro_id)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5) RETURNING *`,
      [data.proveedor || null, data.referencia || null, data.fecha || null, data.notas || null, data.usuarioId],
    );
    return rows[0];
  }

  async findMovimientos(productoId?: number) {
    const params = productoId ? [productoId] : [];
    const where = productoId ? 'WHERE m.producto_id = $1' : '';
    const { rows } = await this.pool.query(
      `SELECT m.*, p.nombre AS producto, p.unidad_medida, u.email AS usuario,
       r.proveedor, r.fecha AS fecha_recepcion
       FROM movimientos_inventario m JOIN productos p ON p.id = m.producto_id
       JOIN usuarios u ON u.id = m.usuario_registro_id
       LEFT JOIN recepciones_inventario r ON r.id = m.recepcion_id
       ${where} ORDER BY m.creado_at DESC LIMIT 100`, params,
    );
    return rows;
  }
}
