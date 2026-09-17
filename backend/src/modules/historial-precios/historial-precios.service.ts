import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  async registrar(data: {
    claseId: number;
    calidadId: number;
    precio: number;
    registradoPorId?: number;
  }) {
    return this.repository.create(data);
  }
}
