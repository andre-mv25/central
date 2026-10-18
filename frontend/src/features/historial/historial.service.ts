import { api } from '../../services/api';

export interface HistorialItem {
  id: number;
  usuario_id: number;
  usuario_email: string;
  accion: string;
  entidad: string;
  entidad_id: number | null;
  detalles: Record<string, unknown> | null;
  fecha: string;
}

export interface HistorialResponse {
  data: HistorialItem[];
  total: number;
  pagina: number;
  limite: number;
}

export interface FiltrosHistorial {
  fechaDesde?: string;
  fechaHasta?: string;
  accion?: string;
  entidad?: string;
  limite?: number;
  pagina?: number;
}

export const historialService = {
  async listar(filtros: FiltrosHistorial): Promise<HistorialResponse> {
    const { data } = await api.get<HistorialResponse>('/historial', { params: filtros });
    return data;
  },

  async registrar(payload: {
    accion: string;
    entidad: string;
    entidadId?: number;
    detalles?: Record<string, unknown>;
  }) {
    const { data } = await api.post('/historial', payload);
    return data;
  },

  async limpiar(dias: number = 3) {
    const { data } = await api.delete('/historial/limpiar', { params: { dias } });
    return data;
  }
};
