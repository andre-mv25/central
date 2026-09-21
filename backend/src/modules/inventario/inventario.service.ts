import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PG_POOL } from '../../config/database.constants';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { CreateProductoDto, UpdateProductoDto } from './dto/create-producto.dto';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { InventarioRepository, ProductoInventarioRow } from './inventario.repository';
import { RealtimeGateway } from '../../modules/realtime/realtime.gateway';

@Injectable()
export class InventarioService {
  constructor(
    private readonly repository: InventarioRepository,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private productoDto(row: ProductoInventarioRow) {
    return {
      ...row,
      stock_minimo: Number(row.stock_minimo),
      stock_actual: Number(row.stock_actual),
      requiere_reposicion: Number(row.stock_actual) <= Number(row.stock_minimo),
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
        nombre: dto.nombre.trim(), codigo: dto.codigo?.trim(),
        unidadMedida: dto.unidadMedida?.trim(), stockMinimo: dto.stockMinimo,
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
        unidadMedida: dto.unidadMedida,
        stockMinimo: dto.stockMinimo,
        activo: dto.activo,
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
      throw new BadRequestException(`"${producto.nombre}" está inactiva y no se puede vender`);
    }
    const nuevoStock = Number(producto.stock_actual) + this.cambioStock('salida', cantidad);
    if (nuevoStock < 0) {
      throw new BadRequestException(
        `Stock insuficiente de ${producto.nombre}. Disponible: ${producto.stock_actual} ${producto.unidad_medida}. Requerido: ${cantidad}`,
      );
    }
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
        productos,
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
      const nuevoStock = Number(producto.stock_actual) + this.cambioStock(dto.tipo, dto.cantidad);
      if (nuevoStock < 0) throw new BadRequestException(`Stock insuficiente. Disponible: ${producto.stock_actual}`);
      const movimiento = await this.repository.insertMovimiento({
        productoId: dto.productoId, tipo: dto.tipo, cantidad: dto.cantidad,
        motivo: dto.motivo?.trim(), referencia: dto.referencia?.trim(), usuarioId: user.id,
      }, client);
      await client.query('COMMIT');
      await this.emitirActualizacionInventario();
      return { ...movimiento, stock_actual: nuevoStock };
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
      const recepcion = await this.repository.createRecepcion({ ...dto, usuarioId: user.id }, client);
      const movimientos = [];
      for (const item of dto.items) {
        const producto = await this.repository.lockProducto(item.productoId, client);
        if (!producto) throw new NotFoundException(`Producto ${item.productoId} no encontrado`);
        if (!producto.activo) throw new BadRequestException(`${producto.nombre} está inactivo`);
        movimientos.push(await this.repository.insertMovimiento({
          productoId: item.productoId, tipo: 'entrada', cantidad: item.cantidad,
          motivo: 'Recepción de carga', referencia: dto.referencia?.trim(), recepcionId: recepcion.id,
          usuarioId: user.id,
        }, client));
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

  movimientos(productoId?: number) {
    return this.repository.findMovimientos(productoId);
  }
}
