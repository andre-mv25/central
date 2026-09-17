import { api } from './api';
import type { Clase, Calidad, Comprador } from '../types';

export const catalogosService = {
  async clases(): Promise<Clase[]> {
    const { data } = await api.get<Clase[]>('/clases');
    return data;
  },
  async calidades(): Promise<Calidad[]> {
    const { data } = await api.get<Calidad[]>('/calidades');
    return data;
  },
  async compradores(): Promise<Comprador[]> {
    const { data } = await api.get<Comprador[]>('/compradores');
    return data;
  },
};
