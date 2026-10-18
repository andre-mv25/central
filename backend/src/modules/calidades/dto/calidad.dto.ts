import { IsString, MaxLength, MinLength } from 'class-validator';

export class CalidadDto {
  @IsString()
  @MinLength(1, { message: 'El nombre de la calidad es obligatorio' })
  @MaxLength(50)
  nombre_calidad!: string;
}
