import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { CreateProductoDto, UpdateProductoDto } from './dto/create-producto.dto';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { CreateReservaDto, UpdateReservaDto } from './dto/create-reserva.dto';
import { InventarioService } from './inventario.service';
import { ProveedoresService } from '../proveedores/proveedores.service';

@Controller('inventario')
export class InventarioController {
  constructor(
    private readonly service: InventarioService,
    private readonly proveedoresService: ProveedoresService,
  ) {}

  @Get('productos')
  productos(@Query('buscar') buscar?: string) { return this.service.productos(buscar); }

  @Post('productos')
  crearProducto(@Body() dto: CreateProductoDto) { return this.service.crearProducto(dto); }

  @Get('productos/:id')
  producto(@Param('id', ParseIntPipe) id: number) { return this.service.producto(id); }

  @Patch('productos/:id')
  actualizarProducto(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductoDto) {
    return this.service.actualizarProducto(id, dto);
  }

  @Get('movimientos')
  movimientos(@Query('productoId') productoId?: string) {
    return this.service.movimientos(productoId ? Number(productoId) : undefined);
  }

  @Post('movimientos')
  movimiento(@Body() dto: CreateMovimientoDto, @CurrentUser() user: AuthUser) {
    return this.service.registrarMovimiento(dto, user);
  }

  @Post('recepciones')
  recepcion(@Body() dto: CreateRecepcionDto, @CurrentUser() user: AuthUser) {
    return this.service.registrarRecepcion(dto, user);
  }

  @Get('proveedores')
  proveedores() {
    return this.proveedoresService.getActivosParaSelect();
  }

  // ===== RESERVAS =====
  @Post('reservas')
  crearReserva(@Body() dto: CreateReservaDto, @CurrentUser() user: AuthUser) {
    return this.service.crearReserva(dto, user);
  }

  @Get('reservas')
  listarReservas(@Query('productoId') productoId?: string, @Query('estado') estado?: string) {
    return this.service.listarReservas(productoId ? Number(productoId) : undefined, estado);
  }

  @Get('reservas/origen')
  reservasPorOrigen(@Query('tipo') tipo: string, @Query('id') id: string) {
    return this.service.getReservasByOrigen(tipo, Number(id));
  }

  @Patch('reservas/:id/confirmar')
  confirmarReserva(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.confirmarReserva(id, user);
  }

  @Patch('reservas/:id/liberar')
  liberarReserva(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReservaDto, @CurrentUser() user: AuthUser) {
    return this.service.liberarReserva(id, user, dto);
  }

  @Post('reservas/limpiar-vencidas')
  limpiarReservasVencidas() {
    return this.service.liberarReservasVencidas();
  }
}
