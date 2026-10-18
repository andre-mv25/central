import { IsOptional, IsString, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryHistorialDto {
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsString()
  accion?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limite?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  pagina?: number;
}
