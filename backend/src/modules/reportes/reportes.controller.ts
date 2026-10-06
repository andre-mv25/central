import { Controller, Get, Query } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ReportesService } from './reportes.service';
import { ResumenEjecutivoService } from './resumen-ejecutivo.service';

class ReportesQueryDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  sucursal?: string;
}

@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly service: ReportesService,
    private readonly resumenService: ResumenEjecutivoService,
  ) {}

  @Get('kpis')
  kpis(@Query() query: ReportesQueryDto) {
    return this.service.kpis(query.fecha, query.sucursal);
  }

  @Get('por-clase-calidad')
  porClaseCalidad(@Query() query: ReportesQueryDto) {
    return this.service.resumenPorClaseCalidad(query.fecha, query.sucursal);
  }

  @Get('resumen-diario')
  async resumenDiario(@Query() query: ReportesQueryDto) {
    const data = await this.resumenService.generarResumenDiario(query.fecha, query.sucursal);
    const narrativa = await this.resumenService.generarNarrativa(data);
    return { ...data, narrativa };
  }

  @Get('resumen-diario/narrativa')
  async soloNarrativa(@Query() query: ReportesQueryDto) {
    const data = await this.resumenService.generarResumenDiario(query.fecha, query.sucursal);
    const narrativa = await this.resumenService.generarNarrativa(data);
    return { narrativa, fecha: data.fecha };
  }
}
