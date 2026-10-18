import { api } from './api';
import type { FilaCaptura, RegistroVenta } from '../types';
import { fechaHoy } from '../utils/format';

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
    const payload = {
      confirmarPrecioAnomalo,
      fecha: fechaHoy(),
      registros: filas.map((fila) => ({
        compradorNombre: fila.compradorNombre,
        claseNombre: fila.claseNombre,
        calidadNombre: fila.calidadNombre,
        bolsas: fila.bolsas,
        kilos: fila.kilos,
        precio: fila.precio,
      })),
    };
    console.log('📤 Enviando payload:', JSON.stringify(payload, null, 2));
    const { data } = await api.post('/registros-ventas/bulk', payload);
    console.log('📥 Respuesta:', data);
    return data;
  },

  async eliminar(id: number): Promise<void> {
    await api.delete(`/registros-ventas/${id}`);
  },
};
