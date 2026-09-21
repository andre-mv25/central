import { Module } from '@nestjs/common';
import { InventarioController } from './inventario.controller';
import { InventarioRepository } from './inventario.repository';
import { InventarioService } from './inventario.service';

@Module({
  controllers: [InventarioController],
  providers: [InventarioService, InventarioRepository],
})
export class InventarioModule {}
