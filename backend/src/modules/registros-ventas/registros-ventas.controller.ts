import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkCreateRegistroVentaDto } from './dto/bulk-create-registro-venta.dto';
import { CreateRegistroVentaDto } from './dto/create-registro-venta.dto';
import { QueryRegistrosVentaDto } from './dto/query-registros-venta.dto';
import { UpdateRegistroVentaDto } from './dto/update-registro-venta.dto';
import { RegistrosVentasService } from './registros-ventas.service';

@Controller('registros-ventas')
export class RegistrosVentasController {
  constructor(private readonly service: RegistrosVentasService) {}

  @Get()
  findAll(@Query() query: QueryRegistrosVentaDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateRegistroVentaDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Post('bulk')
  createBulk(@Body() dto: BulkCreateRegistroVentaDto, @CurrentUser() user: AuthUser) {
    return this.service.createBulk(dto, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegistroVentaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
