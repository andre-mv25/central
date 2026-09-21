import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, ValidateNested } from 'class-validator';

export class RecepcionItemDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productoId!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad!: number;
}

export class CreateRecepcionDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  proveedor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notas?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecepcionItemDto)
  items!: RecepcionItemDto[];
}
