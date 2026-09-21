import { Module } from '@nestjs/common';
import { CompradoresModule } from '../compradores/compradores.module';
import { ClasesModule } from '../clases/clases.module';
import { CalidadesModule } from '../calidades/calidades.module';
import { HistorialPreciosModule } from '../historial-precios/historial-precios.module';
import { RegistrosVentasController } from './registros-ventas.controller';
import { RegistrosVentasRepository } from './registros-ventas.repository';
import { RegistrosVentasService } from './registros-ventas.service';

@Module({
  imports: [HistorialPreciosModule, CompradoresModule, ClasesModule, CalidadesModule],
  controllers: [RegistrosVentasController],
  providers: [RegistrosVentasService, RegistrosVentasRepository],
  exports: [RegistrosVentasService],
})
export class RegistrosVentasModule {}
