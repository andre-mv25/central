import { Module } from '@nestjs/common';
import { EntradasMercanciaController } from './entradas-mercancia.controller';
import { EntradasMercanciaService } from './entradas-mercancia.service';
import { EntradasMercanciaRepository } from './entradas-mercancia.repository';

@Module({
  controllers: [EntradasMercanciaController],
  providers: [EntradasMercanciaService, EntradasMercanciaRepository],
  exports: [EntradasMercanciaService],
})
export class EntradasMercanciaModule {}