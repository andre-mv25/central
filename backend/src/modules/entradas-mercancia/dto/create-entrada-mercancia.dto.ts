import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEntradaMercanciaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  proveedorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  proveedorNombre?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  claseId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  claseNombre?: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  calidadId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
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
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}