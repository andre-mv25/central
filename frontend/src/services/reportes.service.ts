import { api } from './api';

export interface ResumenDiarioData {
  fecha: string;
  ventas: {
    totalKilos: number;
    totalDinero: number;
    totalRegistros: number;
    precioPromedio: number;
    porVariedad: Array<{ variedad: string; kilos: number; dinero: number; registros: number }>;
  };
  inventario: {
    totalVariedades: number;
    stockTotal: number;
    valorTotal: number;
    requierenReposicion: Array<{ variedad: string; stockDisponible: number; stockMinimo: number; deficit: number }>;
    enCuarentena: number;
    enTransito: number;
    proximosAVencer: Array<{ variedad: string; lote: string; diasRestantes: number }>;
  };
  alertas: {
    stockCritico: number;
    preciosAnomalos: number;
    lotesVencidos: number;
  };
  narrativa: string;
}

export const historialService = {
  async evaluarPrecioPorNombres(clase: string, precio?: number) {
    const { data } = await api.get('/historial-precios/sugerencia', {
      params: { clase, precio },
    });
    return data;
  },
};

export const reportesService = {
  async kpis(fecha?: string, sucursal?: string) {
    const { data } = await api.get('/reportes/kpis', { params: { fecha, sucursal } });
    return data;
  },

  async resumenDiario(fecha?: string, sucursal?: string) {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    if (sucursal) params.set('sucursal', sucursal);
    const { data } = await api.get(`/reportes/resumen-diario?${params.toString()}`);
    return data;
  },

  async soloNarrativa(fecha?: string, sucursal?: string) {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    if (sucursal) params.set('sucursal', sucursal);
    const { data } = await api.get(`/reportes/resumen-diario/narrativa?${params.toString()}`);
    return data;
  },
};
