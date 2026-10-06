import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { withRetry, withTransactionRetry } from '../../common/utils/db-retry.util';

export type DbExecutor = Pool | PoolClient;

export interface ProductoInventarioRow {
  id: number;
  nombre: string;
  codigo: string | null;
  numero_lote: string | null;
  fecha_cosecha: Date | null;
  fecha_caducidad: Date | null;
  origen: string | null;
  unidad_medida: string;
  stock_minimo: string;
  activo: boolean;
  estado: string;
  costo_promedio: string;
  costo_ultimo: string;
  stock_real: string;
  stock_reservado: string;
  stock_disponible: string;
  creado_at: Date;
  actualizado_at: Date;
}

export interface MovimientoInventarioRow {
  id: number;
  producto_id: number;
  tipo: string;
  cantidad: string;
  motivo: string | null;
  referencia: string | null;
  recepcion_id: number | null;
  registro_venta_id: number | null;
  usuario_registro_id: number;
  creado_at: Date;
}

export interface RecepcionInventarioRow {
  id: number;
  proveedor_id: number | null;
  referencia: string | null;
  fecha: Date;
  notas: string | null;
  usuario_registro_id: number;
  creado_at: Date;
}

export interface ReservaStockRow {
  id: number;
  producto_id: number;
  cantidad: string;
  estado: string;
  origen_tipo: string;
  origen_id: number | null;
  referencia: string | null;
  notas: string | null;
  usuario_creacion_id: number;
  usuario_confirmacion_id: number | null;
  fecha_vencimiento: Date | null;
  creado_at: Date;
  confirmado_at: Date | null;
  liberado_at: Date | null;
}

@Injectable()
export class InventarioRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private readonly productoSelect = `
    p.id, p.nombre, p.codigo, p.numero_lote, p.fecha_cosecha, p.fecha_caducidad, p.origen,
    p.unidad_medida, p.stock_minimo, p.activo, p.estado, p.costo_promedio, p.costo_ultimo,
    p.creado_at, p.actualizado_at,
    COALESCE(SUM(CASE m.tipo
        WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0) AS stock_real,
    COALESCE((SELECT SUM(cantidad) FROM reservas_stock r WHERE r.producto_id = p.id AND r.estado IN ('activa', 'confirmada')), 0) AS stock_reservado,
    COALESCE(SUM(CASE m.tipo
        WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END), 0)
      - COALESCE((SELECT SUM(cantidad) FROM reservas_stock r WHERE r.producto_id = p.id AND r.estado IN ('activa', 'confirmada')), 0) AS stock_disponible
  `;

  async findProductos(buscar?: string): Promise<ProductoInventarioRow[]> {
    return withRetry(async () => {
      const params: unknown[] = [];
      const filtro = buscar?.trim()
        ? (() => {
            params.push(`%${buscar.trim()}%`);
            return `WHERE (p.nombre ILIKE $1 OR p.codigo ILIKE $1 OR p.numero_lote ILIKE $1)`;
          })()
        : '';
      const { rows } = await this.pool.query<ProductoInventarioRow>(
        `SELECT ${this.productoSelect}
         FROM productos p LEFT JOIN movimientos_inventario m ON m.producto_id = p.id
         ${filtro}
         GROUP BY p.id ORDER BY p.activo DESC, p.nombre`,
        params,
      );
      return rows;
    });
  }

  async findProductoById(id: number): Promise<ProductoInventarioRow | null> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ProductoInventarioRow>(
        `SELECT ${this.productoSelect}
         FROM productos p LEFT JOIN movimientos_inventario m ON m.producto_id = p.id
         WHERE p.id = $1
         GROUP BY p.id`,
        [id],
      );
      return rows[0] ?? null;
    });
  }

  async lockProducto(id: number, executor: PoolClient): Promise<ProductoInventarioRow | null> {
    // Primero bloquear la fila del producto
    const lockResult = await executor.query(
      `SELECT id FROM productos p WHERE p.id = $1 FOR UPDATE OF p`,
      [id]
    );
    if (lockResult.rows.length === 0) return null;
    
    // Luego obtener datos con stock calculado
    const { rows } = await executor.query<ProductoInventarioRow>(
      `SELECT ${this.productoSelect}
       FROM productos p LEFT JOIN movimientos_inventario m ON m.producto_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id],
    );
    return rows[0] ?? null;
  }

  async lockProductoByNombre(nombre: string, executor: PoolClient): Promise<ProductoInventarioRow | null> {
    // Primero bloquear la fila del producto
    const lockResult = await executor.query(
      `SELECT id FROM productos p WHERE lower(trim(p.nombre)) = lower(trim($1)) FOR UPDATE OF p`,
      [nombre]
    );
    if (lockResult.rows.length === 0) return null;
    
    // Luego obtener datos con stock calculado
    const { rows } = await executor.query<ProductoInventarioRow>(
      `SELECT ${this.productoSelect}
       FROM productos p LEFT JOIN movimientos_inventario m ON m.producto_id = p.id
       WHERE lower(trim(p.nombre)) = lower(trim($1))
       GROUP BY p.id`,
      [nombre],
    );
    return rows[0] ?? null;
  }

  async createProducto(data: { 
    nombre: string; 
    codigo?: string; 
    numeroLote?: string;
    fechaCosecha?: string;
    fechaCaducidad?: string;
    origen?: string;
    unidadMedida?: string; 
    stockMinimo?: number 
  }) {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ProductoInventarioRow>(
        `INSERT INTO productos (nombre, codigo, numero_lote, fecha_cosecha, fecha_caducidad, origen, unidad_medida, stock_minimo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *, 0::numeric AS stock_real, 0::numeric AS stock_reservado, 0::numeric AS stock_disponible`,
        [
          data.nombre, 
          data.codigo || null, 
          data.numeroLote || null, 
          data.fechaCosecha || null, 
          data.fechaCaducidad || null, 
          data.origen || null, 
          data.unidadMedida || 'kg', 
          data.stockMinimo ?? 0
        ],
      );
      return rows[0];
    });
  }

  async updateProducto(id: number, data: Record<string, unknown>) {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ProductoInventarioRow>(
        `UPDATE productos SET 
          nombre = COALESCE($2, nombre), 
          codigo = COALESCE($3, codigo),
          numero_lote = COALESCE($4, numero_lote),
          fecha_cosecha = COALESCE($5, fecha_cosecha),
          fecha_caducidad = COALESCE($6, fecha_caducidad),
          origen = COALESCE($7, origen),
          unidad_medida = COALESCE($8, unidad_medida), 
          stock_minimo = COALESCE($9, stock_minimo),
          activo = COALESCE($10, activo),
          estado = COALESCE($11, estado),
          costo_promedio = COALESCE($12, costo_promedio),
          costo_ultimo = COALESCE($13, costo_ultimo)
         WHERE id = $1
         RETURNING *, 0::numeric AS stock_real, 0::numeric AS stock_reservado, 0::numeric AS stock_disponible`,
        [
          id, 
          data.nombre ?? null, 
          data.codigo ?? null,
          data.numeroLote ?? null,
          data.fechaCosecha ?? null,
          data.fechaCaducidad ?? null,
          data.origen ?? null,
          data.unidadMedida ?? null, 
          data.stockMinimo ?? null, 
          data.activo ?? null,
          data.estado ?? null,
          data.costoPromedio ?? null,
          data.costoUltimo ?? null
        ],
      );
      return rows[0] ?? null;
    });
  }

  async insertMovimiento(data: {
    productoId: number;
    tipo: string;
    cantidad: number;
    motivo?: string;
    referencia?: string;
    recepcionId?: number;
    registroVentaId?: number;
    usuarioId: number;
  }, executor: DbExecutor) {
    const { rows } = await executor.query<MovimientoInventarioRow>(
      `INSERT INTO movimientos_inventario
         (producto_id, tipo, cantidad, motivo, referencia, recepcion_id, registro_venta_id, usuario_registro_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.productoId,
        data.tipo,
        data.cantidad,
        data.motivo || null,
        data.referencia || null,
        data.recepcionId || null,
        data.registroVentaId || null,
        data.usuarioId,
      ],
    );
    return rows[0];
  }

  async findMovimientosByRegistroVenta(registroVentaId: number, executor: DbExecutor) {
    const { rows } = await executor.query<{
      id: number;
      producto_id: number;
      tipo: string;
      cantidad: string;
      motivo: string | null;
    }>(
      `SELECT id, producto_id, tipo, cantidad, motivo
         FROM movimientos_inventario
        WHERE registro_venta_id = $1
        ORDER BY id`,
      [registroVentaId],
    );
    return rows;
  }

  async createRecepcion(data: { proveedorId?: number; referencia?: string; fecha?: string; notas?: string; usuarioId: number }, executor: PoolClient) {
    const { rows } = await executor.query<RecepcionInventarioRow>(
      `INSERT INTO recepciones_inventario (proveedor_id, referencia, fecha, notas, usuario_registro_id)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5) RETURNING *`,
      [data.proveedorId || null, data.referencia || null, data.fecha || null, data.notas || null, data.usuarioId],
    );
    return rows[0];
  }

  async findMovimientos(productoId?: number) {
    return withRetry(async () => {
      const params = productoId ? [productoId] : [];
      const where = productoId ? 'WHERE m.producto_id = $1' : '';
      const { rows } = await this.pool.query(
        `SELECT m.*, p.nombre AS producto, p.unidad_medida, u.email AS usuario,
         pr.nombre AS proveedor_nombre, r.fecha AS fecha_recepcion
         FROM movimientos_inventario m JOIN productos p ON p.id = m.producto_id
         JOIN usuarios u ON u.id = m.usuario_registro_id
         LEFT JOIN recepciones_inventario r ON r.id = m.recepcion_id
         LEFT JOIN proveedores pr ON pr.id = r.proveedor_id
         ${where} ORDER BY m.creado_at DESC LIMIT 100`, params,
      );
      return rows;
    });
  }

  // ===== RESERVAS =====

  async crearReserva(data: {
    productoId: number;
    cantidad: number;
    estado?: string;
    origenTipo: string;
    origenId?: number;
    referencia?: string;
    notas?: string;
    usuarioCreacionId: number;
    fechaVencimiento?: string;
  }, executor: DbExecutor): Promise<ReservaStockRow> {
    const { rows } = await executor.query<ReservaStockRow>(
      `INSERT INTO reservas_stock 
         (producto_id, cantidad, estado, origen_tipo, origen_id, referencia, notas, usuario_creacion_id, fecha_vencimiento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.productoId,
        data.cantidad,
        data.estado || 'activa',
        data.origenTipo,
        data.origenId || null,
        data.referencia || null,
        data.notas || null,
        data.usuarioCreacionId,
        data.fechaVencimiento || null,
      ],
    );
    return rows[0];
  }

  async findReservasByProducto(productoId: number, estado?: string): Promise<ReservaStockRow[]> {
    return withRetry(async () => {
      const params: unknown[] = [productoId];
      let where = 'WHERE producto_id = $1';
      if (estado) {
        params.push(estado);
        where += ` AND estado = $${params.length}`;
      }
      const { rows } = await this.pool.query<ReservaStockRow>(
        `SELECT * FROM reservas_stock ${where} ORDER BY creado_at DESC`,
        params,
      );
      return rows;
    });
  }

  async findReservaById(id: number): Promise<ReservaStockRow | null> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ReservaStockRow>(
        `SELECT * FROM reservas_stock WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    });
  }

  async findReservasByOrigen(origenTipo: string, origenId: number): Promise<ReservaStockRow[]> {
    return withRetry(async () => {
      const { rows } = await this.pool.query<ReservaStockRow>(
        `SELECT * FROM reservas_stock WHERE origen_tipo = $1 AND origen_id = $2 ORDER BY creado_at`,
        [origenTipo, origenId],
      );
      return rows;
    });
  }

  async actualizarReserva(id: number, data: {
    estado?: string;
    cantidad?: number;
    usuarioConfirmacionId?: number;
    fechaVencimiento?: string | null;
  }, executor: DbExecutor): Promise<ReservaStockRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [id];
    let paramIndex = 2;

    if (data.estado !== undefined) {
      fields.push(`estado = $${paramIndex}`);
      values.push(data.estado);
      paramIndex++;
      if (data.estado === 'confirmada') {
        fields.push(`confirmado_at = now()`);
        fields.push(`usuario_confirmacion_id = $${paramIndex}`);
        values.push(data.usuarioConfirmacionId || null);
        paramIndex++;
      } else if (data.estado === 'liberada' || data.estado === 'vencida') {
        fields.push(`liberado_at = now()`);
      }
    }
    if (data.cantidad !== undefined) {
      fields.push(`cantidad = $${paramIndex}`);
      values.push(data.cantidad);
      paramIndex++;
    }
    if (data.fechaVencimiento !== undefined) {
      fields.push(`fecha_vencimiento = $${paramIndex}`);
      values.push(data.fechaVencimiento);
      paramIndex++;
    }

    if (fields.length === 0) return this.findReservaById(id);

    const { rows } = await executor.query<ReservaStockRow>(
      `UPDATE reservas_stock SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  }

  async liberarReservasVencidas(): Promise<number> {
    return withRetry(async () => {
      const { rowCount } = await this.pool.query(
        `UPDATE reservas_stock 
         SET estado = 'vencida', liberado_at = now()
         WHERE estado = 'activa' AND fecha_vencimiento IS NOT NULL AND fecha_vencimiento < now()`
      );
      return rowCount ?? 0;
    });
  }

  async getStockDisponible(productoId: number, executor: DbExecutor): Promise<number> {
    const { rows } = await executor.query<{ stock: string }>(
      `SELECT get_stock_disponible($1) AS stock`,
      [productoId]
    );
    return Number(rows[0]?.stock ?? 0);
  }
}
