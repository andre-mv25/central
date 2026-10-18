import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { CreateHistorialDto } from './dto/create-historial.dto';
import { QueryHistorialDto } from './dto/query-historial.dto';

@Injectable()
export class HistorialRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(dto: CreateHistorialDto) {
    const result = await this.pool.query(
      `INSERT INTO historial_acciones (usuario_id, accion, entidad, entidad_id, detalles)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [dto.usuarioId, dto.accion, dto.entidad, dto.entidadId ?? null, dto.detalles ?? null]
    );
    return result.rows[0];
  }

  async findAll(query: QueryHistorialDto) {
    const valores: unknown[] = [];
    let filtros = 'WHERE 1=1';

    if (query.fechaDesde) {
      valores.push(query.fechaDesde);
      filtros += ` AND fecha >= $${valores.length}`;
    }
    if (query.fechaHasta) {
      valores.push(query.fechaHasta);
      filtros += ` AND fecha <= $${valores.length}`;
    }
    if (query.accion) {
      valores.push(query.accion);
      filtros += ` AND accion ILIKE $${valores.length}`;
    }
    if (query.entidad) {
      valores.push(query.entidad);
      filtros += ` AND entidad = $${valores.length}`;
    }

    const limite = query.limite ?? 50;
    const pagina = query.pagina ?? 1;
    const offset = (pagina - 1) * limite;

    valores.push(limite, offset);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT h.*, u.email as usuario_email
         FROM historial_acciones h
         LEFT JOIN usuarios u ON u.id = h.usuario_id
         ${filtros}
         ORDER BY h.fecha DESC
         LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
        valores
      ),
      this.pool.query(
        `SELECT COUNT(*)::int as total FROM historial_acciones h ${filtros}`,
        valores.slice(0, -2)
      )
    ]);

    return {
      data: dataResult.rows,
      total: countResult.rows[0].total,
      pagina,
      limite
    };
  }

  async limpiarAntiguo(dias: number) {
    const result = await this.pool.query(
      'SELECT limpiar_historial_antiguo($1) AS eliminados',
      [dias]
    );
    return result.rows[0].eliminados;
  }
}
