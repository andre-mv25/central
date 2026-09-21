import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';

export interface RegistroVentaEvent {
  tipo: 'creado' | 'actualizado' | 'eliminado';
  registro: unknown;
  timestamp: string;
}

export interface KpiEvent {
  fecha: string;
  kpis: Record<string, unknown>;
  timestamp: string;
}

export interface InventarioEvent {
  tipo: 'actualizado';
  productos: unknown[];
  timestamp: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
@UseGuards() // Desactiva guards globales para este gateway
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private connectedClients = new Set<string>();

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    console.log(`Cliente conectado: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Cliente desconectado: ${client.id} (Total: ${this.connectedClients.size})`);
  }

  @SubscribeMessage('suscribirFecha')
  handleSuscribirFecha(@ConnectedSocket() client: Socket, @MessageBody() fecha: string) {
    client.join(`fecha:${fecha}`);
    return { evento: 'suscrito', fecha };
  }

  @SubscribeMessage('desuscribirFecha')
  handleDesuscribirFecha(@ConnectedSocket() client: Socket, @MessageBody() fecha: string) {
    client.leave(`fecha:${fecha}`);
    return { evento: 'desuscrito', fecha };
  }

  emitirRegistroVenta(fecha: string, event: RegistroVentaEvent) {
    this.server.to(`fecha:${fecha}`).emit('registroVenta', event);
  }

  emitirKpis(fecha: string, event: KpiEvent) {
    this.server.to(`fecha:${fecha}`).emit('kpis', event);
  }

  emitirInventario(event: InventarioEvent) {
    this.server.emit('inventario', event);
  }

  getConnectedCount(): number {
    return this.connectedClients.size;
  }
}