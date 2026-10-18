import { Module } from '@nestjs/common';
import { HistorialPreciosController } from './historial-precios.controller';
import { HistorialPreciosRepository } from './historial-precios.repository';
import { HistorialPreciosService } from './historial-precios.service';

@Module({
  controllers: [HistorialPreciosController],
  providers: [HistorialPreciosService, HistorialPreciosRepository],
  exports: [HistorialPreciosService, HistorialPreciosRepository],
})
export class HistorialPreciosModule {}
