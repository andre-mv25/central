import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesRepository } from './reportes.repository';
import { ReportesService } from './reportes.service';
import { ResumenEjecutivoService } from './resumen-ejecutivo.service';

@Module({
  controllers: [ReportesController],
  providers: [ReportesService, ReportesRepository, ResumenEjecutivoService],
})
export class ReportesModule {}
