import { api } from './api';
import type { EvaluacionPrecio, Kpis } from '../types';

export const historialService = {
  async evaluarPrecio(claseId: number, calidadId: number, precio?: number): Promise<EvaluacionPrecio> {
    const { data } = await api.get<EvaluacionPrecio>('/historial-precios/sugerencia', {
      params: { claseId, calidadId, precio },
    });
    return data;
  },
  async evaluarPrecioPorNombre(claseNombre: string, calidadNombre: string, precio?: number): Promise<EvaluacionPrecio> {
    const { data } = await api.get<EvaluacionPrecio>('/historial-precios/sugerencia', {
      params: { claseNombre, calidadNombre, precio },
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
