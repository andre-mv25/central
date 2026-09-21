import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateRegistroVentaDto {
  @IsString()
  @IsNotEmpty({ message: 'El comprador es obligatorio' })
  comprador!: string;

  @IsString()
  @IsNotEmpty({ message: 'La clase es obligatoria' })
  clase!: string;

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
