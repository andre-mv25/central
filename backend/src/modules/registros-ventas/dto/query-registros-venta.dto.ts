import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class QueryRegistrosVentaDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  compradorId?: number;

  @IsOptional()
  @IsString()
  sucursal?: string;
}
