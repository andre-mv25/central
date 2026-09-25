import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  condicionesPago?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  diasCredito?: number;
}

export class UpdateProveedorDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rfc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  condicionesPago?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  diasCredito?: number;

  @IsOptional()
  activo?: boolean;
}