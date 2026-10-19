import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { CreateEntradaMercanciaDto } from './create-entrada-mercancia.dto';

export class BulkCreateEntradaMercanciaDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos un registro' })
  @ValidateNested({ each: true })
  @Type(() => CreateEntradaMercanciaDto)
  registros!: CreateEntradaMercanciaDto[];
}