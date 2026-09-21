import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
  @MaxLength(30)
  unidadMedida?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockMinimo?: number;
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
}
