import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SugerenciaPrecioQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  claseId?: number;

  @IsOptional()
  @IsString()
  claseNombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  calidadId?: number;

  @IsOptional()
  @IsString()
  calidadNombre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio?: number;
}
