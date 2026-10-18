import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HistorialService } from './historial.service';

@Injectable()
export class HistorialCleanupService {
  private readonly logger = new Logger(HistorialCleanupService.name);

  constructor(private readonly historialService: HistorialService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'limpieza-historial-antiguo'
  })
  async limpiarHistorialAntiguo() {
    this.logger.log('Iniciando limpieza automática de historial (>3 días)');
    const eliminados = await this.historialService.limpiar(3);
    this.logger.log(`Limpieza completada: ${eliminados} registros eliminados.`);
  }
}
