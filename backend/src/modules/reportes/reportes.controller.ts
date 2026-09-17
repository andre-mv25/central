import { Controller, Get, Query } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ReportesService } from './reportes.service';

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
  constructor(private readonly service: ReportesService) {}

  @Get('kpis')
  kpis(@Query() query: ReportesQueryDto) {
    return this.service.kpis(query.fecha, query.sucursal);
  }

  @Get('por-clase-calidad')
  porClaseCalidad(@Query() query: ReportesQueryDto) {
    return this.service.resumenPorClaseCalidad(query.fecha, query.sucursal);
  }
}
