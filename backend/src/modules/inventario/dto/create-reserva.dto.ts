import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min, IsDateString } from 'class-validator';

export class CreateReservaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productoId!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @IsIn(['activa', 'confirmada'])
  estado: 'activa' | 'confirmada' = 'activa';

  @IsIn(['venta', 'transferencia', 'produccion', 'ajuste', 'manual'])
  origenTipo!: 'venta' | 'transferencia' | 'produccion' | 'ajuste' | 'manual';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  origenId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;
}

export class UpdateReservaDto {
  @IsOptional()
  @IsIn(['activa', 'confirmada', 'liberada', 'vencida', 'parcial'])
  estado?: 'activa' | 'confirmada' | 'liberada' | 'vencida' | 'parcial';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad?: number;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string | null;
}

export class LiberarReservaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}