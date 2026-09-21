import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, NotEquals } from 'class-validator';

export class CreateMovimientoDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productoId!: number;

  @IsIn(['entrada', 'salida', 'ajuste'])
  tipo!: 'entrada' | 'salida' | 'ajuste';

  @Type(() => Number)
  @IsNumber()
  @NotEquals(0)
  cantidad!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;
}
