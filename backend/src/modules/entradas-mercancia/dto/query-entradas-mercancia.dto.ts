import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class QueryEntradasMercanciaDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proveedorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  claseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  calidadId?: number;
}