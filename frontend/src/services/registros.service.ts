import { api } from './api';
import type { FilaCaptura, RegistroVenta } from '../types';

export interface FiltrosVenta {
  fecha?: string;
  compradorId?: number;
  sucursal?: string;
}

export const registrosService = {
  async listar(filtros: FiltrosVenta): Promise<RegistroVenta[]> {
    const { data } = await api.get<RegistroVenta[]>('/registros-ventas', { params: filtros });
    return data;
  },

  async crear(payload: Record<string, unknown>): Promise<RegistroVenta> {
    const { data } = await api.post<RegistroVenta>('/registros-ventas', payload);
    return data;
  },

  async crearLote(
    filas: FilaCaptura[],
    confirmarPrecioAnomalo = false,
  ): Promise<{ total: number; registros: RegistroVenta[] }> {
    const { data } = await api.post('/registros-ventas/bulk', {
      confirmarPrecioAnomalo,
      registros: filas.map((fila) => ({
        compradorId: fila.compradorId,
        claseId: fila.claseId,
        calidadId: fila.calidadId,
        bolsas: fila.bolsas,
        kilos: fila.kilos,
        precio: fila.precio,
      })),
    });
    return data;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/registros-ventas/${id}`);
  },
};
