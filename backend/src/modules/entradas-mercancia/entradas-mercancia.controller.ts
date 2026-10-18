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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { EntradasMercanciaService } from './entradas-mercancia.service';
import { CreateEntradaMercanciaDto } from './dto/create-entrada-mercancia.dto';
import { UpdateEntradaMercanciaDto } from './dto/update-entrada-mercancia.dto';
import { QueryEntradasMercanciaDto } from './dto/query-entradas-mercancia.dto';
import { BulkCreateEntradaMercanciaDto } from './dto/bulk-create-entrada-mercancia.dto';

@Controller('entradas-mercancia')
export class EntradasMercanciaController {
  constructor(private readonly service: EntradasMercanciaService) {}

  @Get()
  findAll(@Query() query: QueryEntradasMercanciaDto) {
    return this.service.findAll(query);
  }

  @Get('stock')
  obtenerStock() {
    return this.service.obtenerStock();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateEntradaMercanciaDto, @CurrentUser() usuario: AuthUser) {
    return this.service.create(dto, usuario);
  }

  @Post('bulk')
  createBulk(@Body() dto: BulkCreateEntradaMercanciaDto, @CurrentUser() usuario: AuthUser) {
    return this.service.createBulk(dto, usuario);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEntradaMercanciaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}