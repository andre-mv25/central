import { api } from './api';
import type { EvaluacionPrecio, Kpis } from '../types';

export const historialService = {
  async evaluarPrecioPorNombres(clase: string, precio?: number): Promise<EvaluacionPrecio> {
    const { data } = await api.get<EvaluacionPrecio>('/historial-precios/sugerencia', {
      params: { clase, precio },
    });
    return data;
  },
};

export const reportesService = {
  async kpis(fecha?: string, sucursal?: string): Promise<Kpis> {
    const { data } = await api.get<Kpis>('/reportes/kpis', { params: { fecha, sucursal } });
    return data;
  },
};
