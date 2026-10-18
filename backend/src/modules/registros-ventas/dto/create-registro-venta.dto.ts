import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateRegistroVentaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  compradorId?: number;

  @IsOptional()
  @IsString()
  compradorNombre?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  claseId?: number;

  @IsOptional()
  @IsString()
  claseNombre?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  calidadId?: number;

  @IsOptional()
  @IsString()
  calidadNombre?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  bolsas!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  kilos!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio!: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsBoolean()
  confirmarPrecioAnomalo?: boolean;
}
