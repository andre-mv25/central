import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { CreateRegistroVentaDto } from './create-registro-venta.dto';

export class BulkCreateRegistroVentaDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos un registro' })
  @ValidateNested({ each: true })
  @Type(() => CreateRegistroVentaDto)
  registros!: CreateRegistroVentaDto[];

  @IsOptional()
  @IsBoolean()
  confirmarPrecioAnomalo?: boolean;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
