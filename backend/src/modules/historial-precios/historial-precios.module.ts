import { Module } from '@nestjs/common';
import { ClasesModule } from '../clases/clases.module';
import { CalidadesModule } from '../calidades/calidades.module';
import { HistorialPreciosController } from './historial-precios.controller';
import { HistorialPreciosRepository } from './historial-precios.repository';
import { HistorialPreciosService } from './historial-precios.service';

@Module({
  imports: [ClasesModule, CalidadesModule],
  controllers: [HistorialPreciosController],
  providers: [HistorialPreciosService, HistorialPreciosRepository],
  exports: [HistorialPreciosService, HistorialPreciosRepository],
})
export class HistorialPreciosModule {}
