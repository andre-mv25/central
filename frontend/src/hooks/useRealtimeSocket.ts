import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RegistroVenta, Kpis, ProductoInventario } from '../types';

type RegistroVentaEvent = {
  tipo: 'creado' | 'actualizado' | 'eliminado';
  registro: RegistroVenta | { id: number };
  timestamp: string;
};

type KpiEvent = {
  fecha: string;
  kpis: Kpis;
  timestamp: string;
};

type InventarioEvent = {
  tipo: 'actualizado';
  productos: ProductoInventario[];
  timestamp: string;
};

type UseRealtimeSocketOptions = {
  fecha?: string;
  onRegistroVenta?: (event: RegistroVentaEvent) => void;
  onKpis?: (event: KpiEvent) => void;
  onInventario?: (event: InventarioEvent) => void;
};

export function useRealtimeSocket({
  fecha,
  onRegistroVenta,
  onKpis,
  onInventario,
}: UseRealtimeSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const wsUrl = apiBase.replace('/api', '') || window.location.origin;

    const socket = io(`${wsUrl}/realtime`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      if (fecha) {
        socket.emit('suscribirFecha', fecha);
      }
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('Socket desconectado:', reason);
    });

    socket.on('connect_error', (err) => {
      setError(err.message);
      console.error('Socket error:', err);
    });

    socket.on('registroVenta', (event: RegistroVentaEvent) => {
      if (onRegistroVenta) onRegistroVenta(event);
    });

    socket.on('kpis', (event: KpiEvent) => {
      if (onKpis) onKpis(event);
    });

    socket.on('inventario', (event: InventarioEvent) => {
      if (onInventario) onInventario(event);
    });

    socketRef.current = socket;

    return () => {
      if (fecha) {
        socket.emit('desuscribirFecha', fecha);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fecha]);

  const suscribirFecha = useCallback((nuevaFecha: string) => {
    socketRef.current?.emit('suscribirFecha', nuevaFecha);
  }, []);

  const desuscribirFecha = useCallback((nuevaFecha: string) => {
    socketRef.current?.emit('desuscribirFecha', nuevaFecha);
  }, []);

  return { connected, error, suscribirFecha, desuscribirFecha };
}