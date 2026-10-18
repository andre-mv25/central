import { Module } from '@nestjs/common';
import { CalidadesController } from './calidades.controller';
import { CalidadesRepository } from './calidades.repository';
import { CalidadesService } from './calidades.service';

@Module({
  controllers: [CalidadesController],
  providers: [CalidadesService, CalidadesRepository],
  exports: [CalidadesService, CalidadesRepository],
})
export class CalidadesModule {}
