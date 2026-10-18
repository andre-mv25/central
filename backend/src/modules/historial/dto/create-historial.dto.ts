import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateHistorialDto {
  @IsInt()
  usuarioId: number;

  @IsString()
  accion: string;

  @IsString()
  entidad: string;

  @IsInt()
  @IsOptional()
  entidadId?: number;

  @IsOptional()
  detalles?: Record<string, unknown>;
}
