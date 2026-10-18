import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HistorialService } from './historial.service';
import { HistorialController } from './historial.controller';
import { HistorialRepository } from './historial.repository';
import { HistorialCleanupService } from './historial-cleanup.service';
import { DatabaseModule } from '../../config/database.module';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  providers: [HistorialService, HistorialRepository, HistorialCleanupService],
  controllers: [HistorialController],
  exports: [HistorialService],
})
export class HistorialModule {}
