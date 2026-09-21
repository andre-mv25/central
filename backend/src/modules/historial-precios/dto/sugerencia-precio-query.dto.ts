import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SugerenciaPrecioQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  claseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  calidadId?: number;

  @IsOptional()
  @IsString()
  clase?: string;

  @IsOptional()
  @IsString()
  calidad?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio?: number;
}