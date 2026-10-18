import { api } from './api';
import type { EntradaMercancia, FilaEntrada, StockActual } from '../types';

export interface FiltrosEntrada {
  fecha?: string;
  proveedorId?: number;
  claseId?: number;
  calidadId?: number;
}

export const entradasMercanciaService = {
  async listar(filtros: FiltrosEntrada): Promise<EntradaMercancia[]> {
    const { data } = await api.get<EntradaMercancia[]>('/entradas-mercancia', { params: filtros });
    return data;
  },

  async crearLote(
    filas: FilaEntrada[],
  ): Promise<{ total: number; entradas: EntradaMercancia[] }> {
    const { data } = await api.post('/entradas-mercancia/bulk', {
      registros: filas.map((fila) => ({
        proveedorNombre: fila.proveedorNombre,
        claseNombre: fila.claseNombre,
        calidadNombre: fila.calidadNombre,
        bolsas: fila.bolsas,
        kilos: fila.kilos,
        precio: fila.precio,
        observaciones: fila.observaciones,
      })),
    });
    return data;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/entradas-mercancia/${id}`);
  },

  async obtenerStock(): Promise<StockActual[]> {
    const { data } = await api.get<StockActual[]>('/entradas-mercancia/stock');
    return data;
  },
};