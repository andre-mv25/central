import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCompradorDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sucursal?: string;
}
