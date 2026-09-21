import { api } from './api';
import type { MovimientoInventario, ProductoInventario } from '../types';

export const inventarioService = {
  async productos(buscar?: string): Promise<ProductoInventario[]> {
    const { data } = await api.get('/inventario/productos', { params: buscar ? { buscar } : undefined });
    return data;
  },
  async crearProducto(data: { nombre: string; codigo?: string; unidadMedida: string; stockMinimo: number }) {
    const response = await api.post<ProductoInventario>('/inventario/productos', data);
    return response.data;
  },
  async actualizarProducto(id: number, data: Partial<{ nombre: string; codigo?: string; unidadMedida: string; stockMinimo: number; activo: boolean }>) {
    const response = await api.patch<ProductoInventario>(`/inventario/productos/${id}`, data);
    return response.data;
  },
  async movimientos(): Promise<MovimientoInventario[]> {
    const { data } = await api.get('/inventario/movimientos');
    return data;
  },
  async movimiento(data: { productoId: number; tipo: string; cantidad: number; motivo?: string; referencia?: string }) {
    return api.post('/inventario/movimientos', data);
  },
  async recepcion(data: { proveedor?: string; referencia?: string; fecha?: string; notas?: string; items: Array<{ productoId: number; cantidad: number }> }) {
    return api.post('/inventario/recepciones', data);
  },
};
