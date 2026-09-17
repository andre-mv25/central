import { Injectable } from '@nestjs/common';
import { ReportesRepository } from './reportes.repository';

@Injectable()
export class ReportesService {
  constructor(private readonly repository: ReportesRepository) {}

  async kpis(fecha?: string, sucursal?: string) {
    const row = await this.repository.kpis(fecha, sucursal);
    return {
      fecha: fecha ?? new Date().toISOString().slice(0, 10),
      sucursal: sucursal ?? null,
      totalKilos: Number(row.total_kilos),
      totalDinero: Number(row.total_dinero),
      totalRegistros: Number(row.total_registros),
    };
  }

  async resumenPorClaseCalidad(fecha?: string, sucursal?: string) {
    const rows = await this.repository.resumenPorClaseCalidad(fecha, sucursal);
    return rows.map((row) => ({
      clase: row.clase,
      calidad: row.calidad,
      totalKilos: Number(row.total_kilos),
      totalDinero: Number(row.total_dinero),
      totalRegistros: Number(row.total_registros),
    }));
  }
}
