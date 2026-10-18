import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { HistorialPreciosRepository } from './historial-precios.repository';

export interface EvaluacionPrecio {
  ultimoPrecio: number | null;
  precioSugerido: number | null;
  variacionPct: number | null;
  umbral: number;
  alerta: boolean;
  mensaje: string;
}

@Injectable()
export class HistorialPreciosService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly repository: HistorialPreciosRepository,
    private readonly config: ConfigService,
  ) {}

  private get umbral(): number {
    return this.config.get<number>('priceAlertThreshold') ?? 20;
  }

  async findHistorial(claseId: number, calidadId: number) {
    const rows = await this.repository.findByClaseCalidad(claseId, calidadId);
    return rows.map((row) => ({
      ...row,
      precio: Number(row.precio),
    }));
  }

  async findHistorialPorNombre(claseNombre: string, calidadNombre: string) {
    const claseResult = await this.pool.query('SELECT id FROM clases WHERE nombre_clase = $1', [claseNombre]);
    if (claseResult.rows.length === 0) return [];
    const calidadResult = await this.pool.query('SELECT id FROM calidades WHERE nombre_calidad = $1', [calidadNombre]);
    if (calidadResult.rows.length === 0) return [];
    return this.findHistorial(claseResult.rows[0].id, calidadResult.rows[0].id);
  }

  async evaluarPrecio(
    claseId: number,
    calidadId: number,
    precioCapturado?: number,
  ): Promise<EvaluacionPrecio> {
    const ultimo = await this.repository.findUltimo(claseId, calidadId);
    const umbral = this.umbral;

    if (!ultimo) {
      return {
        ultimoPrecio: null,
        precioSugerido: null,
        variacionPct: null,
        umbral,
        alerta: false,
        mensaje: 'Sin historial de precios para esta clase y calidad. Se registrará como primer precio.',
      };
    }

    const ultimoPrecio = Number(ultimo.precio);

    if (precioCapturado === undefined || precioCapturado === null) {
      return {
        ultimoPrecio,
        precioSugerido: ultimoPrecio,
        variacionPct: null,
        umbral,
        alerta: false,
        mensaje: `Último precio registrado: $${ultimoPrecio.toFixed(2)}`,
      };
    }

    const variacionPct = (Math.abs(precioCapturado - ultimoPrecio) / ultimoPrecio) * 100;
    const redondeada = Number(variacionPct.toFixed(2));
    const alerta = redondeada > umbral;

    return {
      ultimoPrecio,
      precioSugerido: ultimoPrecio,
      variacionPct: redondeada,
      umbral,
      alerta,
      mensaje: alerta
        ? `El precio difiere en ${redondeada}% respecto al último ($${ultimoPrecio.toFixed(2)}), supera el ${umbral}%`
        : `Precio dentro del rango permitido (${redondeada}% de variación)`,
    };
  }

  async evaluarPrecioPorNombre(
    claseNombre: string,
    calidadNombre: string,
    precioCapturado?: number,
  ): Promise<EvaluacionPrecio> {
    const claseResult = await this.pool.query('SELECT id FROM clases WHERE nombre_clase = $1', [claseNombre]);
    if (claseResult.rows.length === 0) {
      return {
        ultimoPrecio: null,
        precioSugerido: null,
        variacionPct: null,
        umbral: this.umbral,
        alerta: false,
        mensaje: `Clase "${claseNombre}" no existe. Se creará al guardar.`,
      };
    }
    const calidadResult = await this.pool.query('SELECT id FROM calidades WHERE nombre_calidad = $1', [calidadNombre]);
    if (calidadResult.rows.length === 0) {
      return {
        ultimoPrecio: null,
        precioSugerido: null,
        variacionPct: null,
        umbral: this.umbral,
        alerta: false,
        mensaje: `Calidad "${calidadNombre}" no existe. Se creará al guardar.`,
      };
    }
    return this.evaluarPrecio(claseResult.rows[0].id, calidadResult.rows[0].id, precioCapturado);
  }

  async registrar(data: {
    claseId: number;
    calidadId: number;
    precio: number;
    registradoPorId?: number;
  }) {
    return this.repository.create(data);
  }
}
