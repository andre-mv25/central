import { IsNumber, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class SugerenciaPrecioQueryDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  claseId!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  calidadId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  precio?: number;
}
