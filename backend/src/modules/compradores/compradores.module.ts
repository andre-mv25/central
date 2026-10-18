import { Module } from '@nestjs/common';
import { CompradoresController } from './compradores.controller';
import { CompradoresRepository } from './compradores.repository';
import { CompradoresService } from './compradores.service';

@Module({
  controllers: [CompradoresController],
  providers: [CompradoresService, CompradoresRepository],
  exports: [CompradoresService, CompradoresRepository],
})
export class CompradoresModule {}
