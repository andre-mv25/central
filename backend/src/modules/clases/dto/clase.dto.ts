import { IsString, MaxLength, MinLength } from 'class-validator';

export class ClaseDto {
  @IsString()
  @MinLength(1, { message: 'El nombre de la clase es obligatorio' })
  @MaxLength(50)
  nombre_clase!: string;
}
