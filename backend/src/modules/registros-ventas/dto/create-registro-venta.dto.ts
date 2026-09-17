import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class CreateRegistroVentaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  compradorId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  claseId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  calidadId!: number;

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
