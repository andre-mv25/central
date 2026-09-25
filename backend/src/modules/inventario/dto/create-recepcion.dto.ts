import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class RecepcionItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productoId!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costo?: number; // Costo unitario para cálculo de costo promedio ponderado (WAC)
}

export class CreateRecepcionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  proveedorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecepcionItemDto)
  items!: RecepcionItemDto[];
}
