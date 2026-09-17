import { IsEmail, IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail({}, { message: 'El email no es válido' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

  @IsInt()
  @IsPositive()
  rolId!: number;
}
