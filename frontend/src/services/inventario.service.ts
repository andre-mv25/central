import { api } from './api';
import type { MovimientoInventario, ProductoInventario, Proveedor, ReservaStock } from '../types';

export const inventarioService = {
  async productos(buscar?: string): Promise<ProductoInventario[]> {
    const { data } = await api.get('/inventario/productos', { params: buscar ? { buscar } : undefined });
    return data;
  },
  async crearProducto(data: { 
    nombre: string; 
    codigo?: string; 
    numeroLote?: string;
    fechaCosecha?: string;
    fechaCaducidad?: string;
    origen?: string;
    unidadMedida: string; 
    stockMinimo: number;
    estado?: string;
  }) {
    const response = await api.post<ProductoInventario>('/inventario/productos', data);
    return response.data;
  },
  async actualizarProducto(id: number, data: Partial<{ 
    nombre: string; 
    codigo?: string; 
    numeroLote?: string;
    fechaCosecha?: string;
    fechaCaducidad?: string;
    origen?: string;
    unidadMedida: string; 
    stockMinimo: number; 
    activo: boolean;
    estado?: string;
    costoPromedio?: number;
    costoUltimo?: number;
  }>) {
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
  async recepcion(data: { 
    proveedorId?: number; 
    referencia?: string; 
    fecha?: string; 
    notas?: string; 
    items: Array<{ productoId: number; cantidad: number; costo?: number }> 
  }) {
    return api.post('/inventario/recepciones', data);
  },
  async getProveedores(): Promise<Proveedor[]> {
    const { data } = await api.get('/inventario/proveedores');
    return data;
  },
  // ===== RESERVAS =====
  async crearReserva(data: { 
    productoId: number; 
    cantidad: number; 
    estado?: string;
    origenTipo: string;
    origenId?: number;
    referencia?: string;
    notas?: string;
    fechaVencimiento?: string;
  }): Promise<ReservaStock> {
    const response = await api.post<ReservaStock>('/inventario/reservas', data);
    return response.data;
  },
  async listarReservas(productoId?: number, estado?: string): Promise<ReservaStock[]> {
    const params = new URLSearchParams();
    if (productoId) params.set('productoId', String(productoId));
    if (estado) params.set('estado', estado);
    const { data } = await api.get<ReservaStock[]>(`/inventario/reservas?${params.toString()}`);
    return data;
  },
  async getReservasByOrigen(tipo: string, id: number): Promise<ReservaStock[]> {
    const { data } = await api.get<ReservaStock[]>(`/inventario/reservas/origen?tipo=${tipo}&id=${id}`);
    return data;
  },
  async confirmarReserva(id: number): Promise<ReservaStock> {
    const response = await api.patch<ReservaStock>(`/inventario/reservas/${id}/confirmar`);
    return response.data;
  },
  async liberarReserva(id: number, data?: { estado?: string; fechaVencimiento?: string | null }): Promise<ReservaStock> {
    const response = await api.patch<ReservaStock>(`/inventario/reservas/${id}/liberar`, data || {});
    return response.data;
  },
  async limpiarReservasVencidas(): Promise<{ liberadas: number }> {
    const response = await api.post<{ liberadas: number }>('/inventario/reservas/limpiar-vencidas');
    return response.data;
  },
};
