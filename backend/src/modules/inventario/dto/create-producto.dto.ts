import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  numeroLote?: string;

  @IsOptional()
  @IsDateString()
  fechaCosecha?: string;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  origen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidadMedida?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsIn(['disponible', 'cuarentena', 'bloqueado', 'reservado', 'en_transito', 'merma', 'devuelto'])
  estado?: string;
}

export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  codigo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  numeroLote?: string | null;

  @IsOptional()
  @IsDateString()
  fechaCosecha?: string | null;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  origen?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  unidadMedida?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsIn(['disponible', 'cuarentena', 'bloqueado', 'reservado', 'en_transito', 'merma', 'devuelto'])
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costoPromedio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costoUltimo?: number;
}
