import { Module } from '@nestjs/common';
import { ClasesController } from './clases.controller';
import { ClasesRepository } from './clases.repository';
import { ClasesService } from './clases.service';

@Module({
  controllers: [ClasesController],
  providers: [ClasesService, ClasesRepository],
  exports: [ClasesService, ClasesRepository],
})
export class ClasesModule {}
