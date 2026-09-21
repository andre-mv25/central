import { api } from './api';
import type { Clase, Comprador } from '../types';

export const catalogosService = {
  async clases(): Promise<Clase[]> {
    const { data } = await api.get<Clase[]>('/clases');
    return data;
  },
  async compradores(): Promise<Comprador[]> {
    const { data } = await api.get<Comprador[]>('/compradores');
    return data;
  },
};
