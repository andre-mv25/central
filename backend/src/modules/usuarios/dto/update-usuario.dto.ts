import { IsBoolean, IsEmail, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  rolId?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
