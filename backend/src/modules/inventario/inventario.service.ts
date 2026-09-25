import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PG_POOL } from '../../config/database.constants';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { CreateProductoDto, UpdateProductoDto } from './dto/create-producto.dto';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { CreateReservaDto, UpdateReservaDto } from './dto/create-reserva.dto';
import { InventarioRepository, ProductoInventarioRow, ReservaStockRow } from './inventario.repository';
import { RealtimeGateway } from '../../modules/realtime/realtime.gateway';

@Injectable()
export class InventarioService {
  constructor(
    private readonly repository: InventarioRepository,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private productoDto(row: ProductoInventarioRow) {
    const stockReal = Number(row.stock_real);
    const stockReservado = Number(row.stock_reservado);
    const stockDisponible = Number(row.stock_disponible);
    const stockMinimo = Number(row.stock_minimo);
    const costoPromedio = Number(row.costo_promedio);
    const costoUltimo = Number(row.costo_ultimo);
    
    return {
      ...row,
      stock_minimo: stockMinimo,
      stock_real: stockReal,
      stock_reservado: stockReservado,
      stock_disponible: stockDisponible,
      stock_actual: stockDisponible, // compatibilidad: stock_actual = disponible
      costo_promedio: costoPromedio,
      costo_ultimo: costoUltimo,
      valor_stock: Number((stockReal * costoPromedio).toFixed(2)),
      requiere_reposicion: stockDisponible <= stockMinimo,
    };
  }

  async productos(buscar?: string) {
    return (await this.repository.findProductos(buscar)).map((producto) => this.productoDto(producto));
  }

  async producto(id: number) {
    const producto = await this.repository.findProductoById(id);
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return this.productoDto(producto);
  }

  async crearProducto(dto: CreateProductoDto) {
    try {
      return this.productoDto(await this.repository.createProducto({
        nombre: dto.nombre.trim(),
        codigo: dto.codigo?.trim(),
        numeroLote: dto.numeroLote?.trim(),
        fechaCosecha: dto.fechaCosecha,
        fechaCaducidad: dto.fechaCaducidad,
        origen: dto.origen?.trim(),
        unidadMedida: dto.unidadMedida?.trim(),
        stockMinimo: dto.stockMinimo,
      }));
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un producto con ese nombre o código');
      }
      throw error;
    }
  }

  async actualizarProducto(id: number, dto: UpdateProductoDto) {
    try {
      const producto = await this.repository.updateProducto(id, {
        nombre: dto.nombre,
        codigo: dto.codigo,
        numeroLote: dto.numeroLote,
        fechaCosecha: dto.fechaCosecha,
        fechaCaducidad: dto.fechaCaducidad,
        origen: dto.origen,
        unidadMedida: dto.unidadMedida,
        stockMinimo: dto.stockMinimo,
        activo: dto.activo,
        estado: dto.estado,
        costoPromedio: dto.costoPromedio,
        costoUltimo: dto.costoUltimo,
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      return this.productoDto(await this.repository.findProductoById(id) as ProductoInventarioRow);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un producto con ese nombre o código');
      }
      throw error;
    }
  }

  private cambioStock(tipo: CreateMovimientoDto['tipo'], cantidad: number) {
    if (tipo === 'salida') return -cantidad;
    return cantidad;
  }

  cantidadPorVenta(bolsas: number, kilos: number) {
    return Number((Number(bolsas) * Number(kilos)).toFixed(3));
  }

  async aplicarSalidaVenta(
    data: {
      nombreProducto: string;
      bolsas: number;
      kilos: number;
      registroVentaId: number;
      usuarioId: number;
    },
    client: PoolClient,
  ) {
    const cantidad = this.cantidadPorVenta(data.bolsas, data.kilos);
    const producto = await this.repository.lockProductoByNombre(data.nombreProducto.trim(), client);
    if (!producto) {
      throw new BadRequestException(
        `No hay inventario para "${data.nombreProducto}". Créala primero en Inventario y registra una carga.`,
      );
    }
    if (!producto.activo) {
      throw new BadRequestException(`"${producto.nombre}" está inactivo y no se puede vender`);
    }
    // Validar contra stock DISPONIBLE (real - reservado)
    const stockDisponible = Number(producto.stock_disponible);
    if (stockDisponible < cantidad) {
      throw new BadRequestException(
        `Stock disponible insuficiente de ${producto.nombre}. Disponible: ${stockDisponible} ${producto.unidad_medida} (Real: ${producto.stock_real}, Reservado: ${producto.stock_reservado}). Requerido: ${cantidad}`,
      );
    }
    // Crear reserva para esta venta (se confirmará al confirmar la venta)
    await this.repository.crearReserva({
      productoId: producto.id,
      cantidad,
      estado: 'confirmada', // Ventas se confirman directo
      origenTipo: 'venta',
      origenId: data.registroVentaId,
      referencia: `Venta #${data.registroVentaId}`,
      usuarioCreacionId: data.usuarioId,
    }, client);

    await this.repository.insertMovimiento({
      productoId: producto.id,
      tipo: 'salida',
      cantidad,
      motivo: 'Venta',
      referencia: `Venta #${data.registroVentaId}`,
      registroVentaId: data.registroVentaId,
      usuarioId: data.usuarioId,
    }, client);
    await this.emitirActualizacionInventario();
  }

  async reponerPorVenta(registroVentaId: number, usuarioId: number, client: PoolClient) {
    // Liberar reservas de esta venta
    const reservas = await this.repository.findReservasByOrigen('venta', registroVentaId);
    for (const reserva of reservas) {
      if (reserva.estado === 'confirmada' || reserva.estado === 'activa') {
        await this.repository.actualizarReserva(reserva.id, { 
          estado: 'liberada',
          usuarioConfirmacionId: usuarioId,
        }, client);
      }
    }

    const movimientos = await this.repository.findMovimientosByRegistroVenta(registroVentaId, client);
    const netoPorProducto = new Map<number, number>();
    for (const movimiento of movimientos) {
      const cantidad = Number(movimiento.cantidad);
      const actual = netoPorProducto.get(movimiento.producto_id) ?? 0;
      if (movimiento.tipo === 'salida') netoPorProducto.set(movimiento.producto_id, actual + cantidad);
      if (movimiento.tipo === 'entrada') netoPorProducto.set(movimiento.producto_id, actual - cantidad);
    }
    for (const [productoId, neto] of netoPorProducto) {
      if (neto <= 0) continue;
      const producto = await this.repository.lockProducto(productoId, client);
      if (!producto) continue;
      await this.repository.insertMovimiento({
        productoId,
        tipo: 'entrada',
        cantidad: Number(neto.toFixed(3)),
        motivo: 'Reverso de venta',
        referencia: `Venta #${registroVentaId}`,
        registroVentaId,
        usuarioId,
      }, client);
    }
    await this.emitirActualizacionInventario();
  }

  private async emitirActualizacionInventario() {
    try {
      const productos = await this.repository.findProductos();
      this.realtimeGateway.emitirInventario({
        tipo: 'actualizado',
        productos: productos.map(p => this.productoDto(p)),
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Silenciar errores de emisión para no afectar la operación principal
    }
  }

  async registrarMovimiento(dto: CreateMovimientoDto, user: AuthUser) {
    if ((dto.tipo === 'entrada' || dto.tipo === 'salida') && dto.cantidad < 0) {
      throw new BadRequestException('La cantidad de una entrada o salida debe ser positiva');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const producto = await this.repository.lockProducto(dto.productoId, client);
      if (!producto) throw new NotFoundException('Producto no encontrado');
      if (!producto.activo) throw new BadRequestException('No se pueden registrar movimientos para un producto inactivo');
      
      const stockDisponible = Number(producto.stock_disponible);
      if (dto.tipo === 'salida' && stockDisponible < dto.cantidad) {
        throw new BadRequestException(`Stock disponible insuficiente. Disponible: ${stockDisponible}`);
      }
      
      // Si es salida, crear reserva
      if (dto.tipo === 'salida') {
        await this.repository.crearReserva({
          productoId: dto.productoId,
          cantidad: dto.cantidad,
          estado: 'activa',
          origenTipo: 'ajuste',
          referencia: dto.referencia?.trim(),
          usuarioCreacionId: user.id,
        }, client);
      }
      
      const nuevoStock = stockDisponible + this.cambioStock(dto.tipo, dto.cantidad);
      const movimiento = await this.repository.insertMovimiento({
        productoId: dto.productoId, tipo: dto.tipo, cantidad: dto.cantidad,
        motivo: dto.motivo?.trim(), referencia: dto.referencia?.trim(), usuarioId: user.id,
      }, client);
      await client.query('COMMIT');
      await this.emitirActualizacionInventario();
      return { ...movimiento, stock_disponible: nuevoStock };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async registrarRecepcion(dto: CreateRecepcionDto, user: AuthUser) {
    const repetidos = new Set<number>();
    for (const item of dto.items) {
      if (repetidos.has(item.productoId)) throw new BadRequestException('Un producto solo puede aparecer una vez por carga');
      repetidos.add(item.productoId);
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const recepcion = await this.repository.createRecepcion({ 
        proveedorId: dto.proveedorId, 
        referencia: dto.referencia, 
        fecha: dto.fecha, 
        notas: dto.notas, 
        usuarioId: user.id 
      }, client);
      const movimientos = [];
      
      for (const item of dto.items) {
        const producto = await this.repository.lockProducto(item.productoId, client);
        if (!producto) throw new NotFoundException(`Producto ${item.productoId} no encontrado`);
        if (!producto.activo) throw new BadRequestException(`${producto.nombre} está inactivo`);
        
        // Calcular nuevo costo promedio ponderado (WAC)
        const stockActual = Number(producto.stock_real);
        const costoActual = Number(producto.costo_promedio);
        const nuevaCantidad = item.cantidad;
        const nuevoCosto = item.costo || 0; // Se pasará en el DTO extendido
        
        let costoPromedioNuevo = costoActual;
        if (stockActual > 0 && nuevoCosto > 0) {
          costoPromedioNuevo = ((stockActual * costoActual) + (nuevaCantidad * nuevoCosto)) / (stockActual + nuevaCantidad);
        } else if (nuevoCosto > 0) {
          costoPromedioNuevo = nuevoCosto;
        }
        
        // Actualizar costos en producto
        await this.repository.updateProducto(producto.id, {
          costoPromedio: Number(costoPromedioNuevo.toFixed(4)),
          costoUltimo: nuevoCosto,
        });
        
        movimientos.push(await this.repository.insertMovimiento({
          productoId: item.productoId, tipo: 'entrada', cantidad: item.cantidad,
          motivo: 'Recepción de carga', referencia: dto.referencia?.trim(), recepcionId: recepcion.id,
          usuarioId: user.id,
        }, client));
        
        // Si había reservas activas esperando stock, confirmarlas (FIFO)
        const reservasActivas = await this.repository.findReservasByProducto(item.productoId, 'activa');
        for (const reserva of reservasActivas) {
          // Lógica simple: confirmar reservas en orden de creación hasta cubrir la entrada
          // En producción se haría más sofisticado
        }
      }
      
      await client.query('COMMIT');
      await this.emitirActualizacionInventario();
      return { ...recepcion, movimientos, total_lineas: movimientos.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== RESERVAS =====

  async crearReserva(dto: CreateReservaDto, user: AuthUser) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const producto = await this.repository.lockProducto(dto.productoId, client);
      if (!producto) throw new NotFoundException('Producto no encontrado');
      if (!producto.activo) throw new BadRequestException('Producto inactivo');
      
      const stockDisponible = Number(producto.stock_disponible);
      if (stockDisponible < dto.cantidad) {
        throw new BadRequestException(`Stock disponible insuficiente. Disponible: ${stockDisponible}`);
      }
      
      const reserva = await this.repository.crearReserva({
        ...dto,
        usuarioCreacionId: user.id,
      }, client);
      
      await client.query('COMMIT');
      await this.emitirActualizacionInventario();
      return reserva;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmarReserva(id: number, user: AuthUser) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reserva = await this.repository.actualizarReserva(id, {
        estado: 'confirmada',
        usuarioConfirmacionId: user.id,
      }, client);
      if (!reserva) throw new NotFoundException('Reserva no encontrada');
      await client.query('COMMIT');
      await this.emitirActualizacionInventario();
      return reserva;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async liberarReserva(id: number, user: AuthUser, dto: UpdateReservaDto) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reserva = await this.repository.actualizarReserva(id, {
        estado: 'liberada',
        usuarioConfirmacionId: user.id,
      }, client);
      if (!reserva) throw new NotFoundException('Reserva no encontrada');
      await client.query('COMMIT');
      await this.emitirActualizacionInventario();
      return reserva;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listarReservas(productoId?: number, estado?: string) {
    if (productoId) {
      return this.repository.findReservasByProducto(productoId, estado);
    }
    // TODO: implementar listado general con filtros
    return [];
  }

  async getReservasByOrigen(origenTipo: string, origenId: number) {
    return this.repository.findReservasByOrigen(origenTipo, origenId);
  }

  async liberarReservasVencidas() {
    const count = await this.repository.liberarReservasVencidas();
    if (count > 0) await this.emitirActualizacionInventario();
    return { liberadas: count };
  }

  movimientos(productoId?: number) {
    return this.repository.findMovimientos(productoId);
  }
}
