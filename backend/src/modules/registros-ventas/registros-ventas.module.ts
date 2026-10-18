import { Module } from '@nestjs/common';
import { HistorialPreciosModule } from '../historial-precios/historial-precios.module';
import { HistorialModule } from '../historial/historial.module';
import { RegistrosVentasController } from './registros-ventas.controller';
import { RegistrosVentasRepository } from './registros-ventas.repository';
import { RegistrosVentasService } from './registros-ventas.service';

@Module({
  imports: [HistorialPreciosModule, HistorialModule],
  controllers: [RegistrosVentasController],
  providers: [RegistrosVentasService, RegistrosVentasRepository],
  exports: [RegistrosVentasService],
})
export class RegistrosVentasModule {}
