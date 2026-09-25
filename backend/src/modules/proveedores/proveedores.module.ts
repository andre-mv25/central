import { Module } from '@nestjs/common';
import { ProveedoresController } from './proveedores.controller';
import { ProveedoresRepository } from './proveedores.repository';
import { ProveedoresService } from './proveedores.service';

@Module({
  controllers: [ProveedoresController],
  providers: [ProveedoresService, ProveedoresRepository],
  exports: [ProveedoresService, ProveedoresRepository],
})
export class ProveedoresModule {}