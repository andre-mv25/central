import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { ProveedoresModule } from '../proveedores/proveedores.module';
import { InventarioController } from './inventario.controller';
import { InventarioRepository } from './inventario.repository';
import { InventarioService } from './inventario.service';

@Module({
  imports: [RealtimeModule, ProveedoresModule],
  controllers: [InventarioController],
  providers: [InventarioService, InventarioRepository],
  exports: [InventarioService],
})
export class InventarioModule {}
