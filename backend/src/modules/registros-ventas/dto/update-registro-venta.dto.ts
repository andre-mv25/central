import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateRegistroVentaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  compradorId?: number;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  bolsas?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  kilos?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio?: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
