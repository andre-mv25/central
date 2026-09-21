import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CompradoresRepository } from '../compradores/compradores.repository';
import { ClasesRepository } from '../clases/clases.repository';
import { CalidadesRepository } from '../calidades/calidades.repository';
import {
  HistorialPreciosRepository,
  HistorialPrecioRow,
} from '../historial-precios/historial-precios.repository';
import { HistorialPreciosService } from '../historial-precios/historial-precios.service';
import { InventarioService } from '../inventario/inventario.service';
import { BulkCreateRegistroVentaDto } from './dto/bulk-create-registro-venta.dto';
import { CreateRegistroVentaDto } from './dto/create-registro-venta.dto';
import { QueryRegistrosVentaDto } from './dto/query-registros-venta.dto';
import { UpdateRegistroVentaDto } from './dto/update-registro-venta.dto';
import { RegistrosVentasRepository } from './registros-ventas.repository';
import { RealtimeGateway } from '../../modules/realtime/realtime.gateway';
import type { DbExecutor } from './registros-ventas.repository';

const CALIDAD_ESTANDAR = 'Estándar';

@Injectable()
export class RegistrosVentasService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly repository: RegistrosVentasRepository,
    private readonly historialService: HistorialPreciosService,
    private readonly historialRepository: HistorialPreciosRepository,
    private readonly compradoresRepository: CompradoresRepository,
    private readonly clasesRepository: ClasesRepository,
    private readonly calidadesRepository: CalidadesRepository,
    private readonly inventarioService: InventarioService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  private async resolverCatalogos(
    ejecutor: DbExecutor,
    comprador: string,
    clase: string,
  ): Promise<{ compradorId: number; claseId: number; calidadId: number }> {
    return {
      compradorId: await this.compradoresRepository.findOrCreateByName(comprador.trim(), ejecutor),
      claseId: await this.clasesRepository.findOrCreateByName(clase.trim(), ejecutor),
      calidadId: await this.calidadesRepository.findOrCreateByName(CALIDAD_ESTANDAR, ejecutor),
    };
  }

  findAll(query: QueryRegistrosVentaDto) {
    return this.repository.findAll({
      fecha: query.fecha,
      compradorId: query.compradorId,
      sucursal: query.sucursal,
    });
  }

  async findById(id: number) {
    const registro = await this.repository.findById(id);
    if (!registro) {
      throw new NotFoundException(`Registro de venta ${id} no encontrado`);
    }
    return registro;
  }

  private async registrarHistorialSiCambia(
    client: PoolClient,
    claseId: number,
    calidadId: number,
    precio: number,
    usuarioId: number,
  ): Promise<void> {
    const ultimo: HistorialPrecioRow | null = await this.historialRepository.findUltimo(
      claseId,
      calidadId,
      client,
    );
    if (!ultimo || Number(ultimo.precio) !== precio) {
      await this.historialRepository.create(
        { claseId, calidadId, precio, registradoPorId: usuarioId },
        client,
      );
    }
  }

  async create(dto: CreateRegistroVentaDto, usuario: AuthUser) {
    const ids = await this.resolverCatalogos(this.pool, dto.comprador, dto.clase);
    const evaluacion = await this.historialService.evaluarPrecio(ids.claseId, ids.calidadId, dto.precio);
    if (evaluacion.alerta && !dto.confirmarPrecioAnomalo) {
      throw new UnprocessableEntityException({
        message: evaluacion.mensaje,
        requiereConfirmacion: true,
        evaluacion,
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const registro = await this.repository.create(
        {
          ...ids,
          usuarioRegistroId: usuario.id,
          bolsas: dto.bolsas,
          kilos: dto.kilos,
          precio: dto.precio,
          fecha: dto.fecha,
        },
        client,
      );
      await this.inventarioService.aplicarSalidaVenta(
        {
          nombreProducto: dto.clase,
          bolsas: dto.bolsas,
          kilos: dto.kilos,
          registroVentaId: registro.id,
          usuarioId: usuario.id,
        },
        client,
      );
      await this.registrarHistorialSiCambia(
        client,
        ids.claseId,
        ids.calidadId,
        dto.precio,
        usuario.id,
      );
      await client.query('COMMIT');
      const nuevo = await this.findById(registro.id);
      this.realtimeGateway.emitirRegistroVenta(dto.fecha ?? new Date().toISOString().split('T')[0], {
        tipo: 'creado',
        registro: nuevo,
        timestamp: new Date().toISOString(),
      });
      return nuevo;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createBulk(dto: BulkCreateRegistroVentaDto, usuario: AuthUser) {
    const items = await Promise.all(
      dto.registros.map(async (item) => {
        const ids = await this.resolverCatalogos(this.pool, item.comprador, item.clase);
        return { ...item, ...ids };
      }),
    );

    const anomalias: Array<{ index: number; mensaje: string }> = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const evaluacion = await this.historialService.evaluarPrecio(
        item.claseId,
        item.calidadId,
        item.precio,
      );
      if (evaluacion.alerta) {
        anomalias.push({ index, mensaje: evaluacion.mensaje });
      }
    }

    const confirmado = dto.confirmarPrecioAnomalo === true;
    if (anomalias.length > 0 && !confirmado) {
      throw new UnprocessableEntityException({
        message: 'Uno o más precios superan el umbral de variación permitido',
        requiereConfirmacion: true,
        anomalias,
      });
    }

    const client = await this.pool.connect();
    const idsGuardados: number[] = [];
    try {
      await client.query('BEGIN');
      for (const item of items) {
        const registro = await this.repository.create(
          {
            compradorId: item.compradorId,
            claseId: item.claseId,
            calidadId: item.calidadId,
            usuarioRegistroId: usuario.id,
            bolsas: item.bolsas,
            kilos: item.kilos,
            precio: item.precio,
            fecha: item.fecha,
          },
          client,
        );
        idsGuardados.push(registro.id);
        await this.inventarioService.aplicarSalidaVenta(
          {
            nombreProducto: item.clase,
            bolsas: item.bolsas,
            kilos: item.kilos,
            registroVentaId: registro.id,
            usuarioId: usuario.id,
          },
          client,
        );
        await this.registrarHistorialSiCambia(
          client,
          item.claseId,
          item.calidadId,
          item.precio,
          usuario.id,
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const registros = await Promise.all(idsGuardados.map((id) => this.repository.findById(id)));
    const fecha = dto.registros[0]?.fecha ?? new Date().toISOString().split('T')[0];
    for (const r of registros) {
      if (r) {
        this.realtimeGateway.emitirRegistroVenta(fecha, {
          tipo: 'creado',
          registro: r,
          timestamp: new Date().toISOString(),
        });
      }
    }
    return { total: registros.length, registros };
  }

  async update(id: number, dto: UpdateRegistroVentaDto, usuario: AuthUser) {
    const actual = await this.findById(id);

    if (dto.precio || dto.claseId || dto.calidadId) {
      const evaluacion = await this.historialService.evaluarPrecio(
        dto.claseId ?? actual.clase_id,
        dto.calidadId ?? actual.calidad_id,
        dto.precio ?? Number(actual.precio),
      );
      if (evaluacion.alerta) {
        throw new UnprocessableEntityException({
          message: evaluacion.mensaje,
          requiereConfirmacion: true,
          evaluacion,
        });
      }
    }

    const cambiaInventario =
      dto.bolsas !== undefined || dto.kilos !== undefined || dto.claseId !== undefined;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await this.repository.update(id, dto, client);
      if (!updated) {
        throw new NotFoundException(`Registro de venta ${id} no encontrado`);
      }
      if (cambiaInventario) {
        await this.inventarioService.reponerPorVenta(id, usuario.id, client);
        const clase = dto.claseId
          ? await this.clasesRepository.findById(dto.claseId)
          : { nombre_clase: actual.clase };
        if (!clase) {
          throw new NotFoundException(`Clase ${dto.claseId} no encontrada`);
        }
        await this.inventarioService.aplicarSalidaVenta(
          {
            nombreProducto: clase.nombre_clase,
            bolsas: dto.bolsas ?? actual.bolsas,
            kilos: dto.kilos ?? Number(actual.kilos),
            registroVentaId: id,
            usuarioId: usuario.id,
          },
          client,
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    const actualizado = await this.findById(id);
    const fechaStr = actualizado.fecha instanceof Date ? actualizado.fecha.toISOString().split('T')[0] : actualizado.fecha;
    this.realtimeGateway.emitirRegistroVenta(fechaStr, {
      tipo: 'actualizado',
      registro: actualizado,
      timestamp: new Date().toISOString(),
    });
    return actualizado;
  }

  async remove(id: number, usuario: AuthUser) {
    const registro = await this.findById(id);
    const fecha = registro.fecha instanceof Date ? registro.fecha.toISOString().split('T')[0] : registro.fecha;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.inventarioService.reponerPorVenta(id, usuario.id, client);
      await this.repository.remove(id, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    this.realtimeGateway.emitirRegistroVenta(fecha, {
      tipo: 'eliminado',
      registro: { id },
      timestamp: new Date().toISOString(),
    });
    return { id, eliminado: true };
  }
}
