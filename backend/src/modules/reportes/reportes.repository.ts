import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';

export interface KpisRow {
  total_kilos: string;
  total_dinero: string;
  total_registros: string;
}

export interface ResumenClaseRow {
  clase: string;
  calidad: string;
  total_kilos: string;
  total_dinero: string;
  total_registros: string;
}

@Injectable()
export class ReportesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async kpis(fecha?: string, sucursal?: string): Promise<KpisRow> {
    const { rows } = await this.pool.query<KpisRow>(
      `SELECT COALESCE(SUM(rv.kilos), 0) AS total_kilos,
              COALESCE(SUM(rv.total), 0) AS total_dinero,
              COUNT(*) AS total_registros
         FROM registros_ventas rv
         JOIN compradores c ON c.id = rv.comprador_id
        WHERE rv.fecha = COALESCE($1, CURRENT_DATE)
          AND ($2::text IS NULL OR c.sucursal = $2)`,
      [fecha ?? null, sucursal ?? null],
    );
    return rows[0];
  }

  async resumenPorClaseCalidad(fecha?: string, sucursal?: string): Promise<ResumenClaseRow[]> {
    const { rows } = await this.pool.query<ResumenClaseRow>(
      `SELECT cl.nombre_clase AS clase,
              ca.nombre_calidad AS calidad,
              SUM(rv.kilos) AS total_kilos,
              SUM(rv.total) AS total_dinero,
              COUNT(*) AS total_registros
         FROM registros_ventas rv
         JOIN compradores c ON c.id = rv.comprador_id
         JOIN clases cl ON cl.id = rv.clase_id
         JOIN calidades ca ON ca.id = rv.calidad_id
        WHERE rv.fecha = COALESCE($1, CURRENT_DATE)
          AND ($2::text IS NULL OR c.sucursal = $2)
        GROUP BY cl.nombre_clase, ca.nombre_calidad
        ORDER BY cl.nombre_clase, ca.nombre_calidad`,
      [fecha ?? null, sucursal ?? null],
    );
    return rows;
  }
}
