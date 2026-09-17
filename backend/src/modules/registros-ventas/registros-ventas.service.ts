import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  HistorialPreciosRepository,
  HistorialPrecioRow,
} from '../historial-precios/historial-precios.repository';
import { HistorialPreciosService } from '../historial-precios/historial-precios.service';
import { BulkCreateRegistroVentaDto } from './dto/bulk-create-registro-venta.dto';
import { CreateRegistroVentaDto } from './dto/create-registro-venta.dto';
import { QueryRegistrosVentaDto } from './dto/query-registros-venta.dto';
import { UpdateRegistroVentaDto } from './dto/update-registro-venta.dto';
import { RegistrosVentasRepository } from './registros-ventas.repository';

@Injectable()
export class RegistrosVentasService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly repository: RegistrosVentasRepository,
    private readonly historialService: HistorialPreciosService,
    private readonly historialRepository: HistorialPreciosRepository,
  ) {}

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
    const evaluacion = await this.historialService.evaluarPrecio(dto.claseId, dto.calidadId, dto.precio);
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
          compradorId: dto.compradorId,
          claseId: dto.claseId,
          calidadId: dto.calidadId,
          usuarioRegistroId: usuario.id,
          bolsas: dto.bolsas,
          kilos: dto.kilos,
          precio: dto.precio,
          fecha: dto.fecha,
        },
        client,
      );
      await this.registrarHistorialSiCambia(
        client,
        dto.claseId,
        dto.calidadId,
        dto.precio,
        usuario.id,
      );
      await client.query('COMMIT');
      return this.findById(registro.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createBulk(dto: BulkCreateRegistroVentaDto, usuario: AuthUser) {
    const anomalias: Array<{ index: number; mensaje: string }> = [];

    for (let index = 0; index < dto.registros.length; index++) {
      const item = dto.registros[index];
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
    const ids: number[] = [];
    try {
      await client.query('BEGIN');
      for (const item of dto.registros) {
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
        ids.push(registro.id);
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

    const registros = await Promise.all(ids.map((id) => this.repository.findById(id)));
    return { total: registros.length, registros };
  }

  async update(id: number, dto: UpdateRegistroVentaDto) {
    await this.findById(id);

    if (dto.precio || dto.claseId || dto.calidadId) {
      const actual = await this.repository.findById(id);
      const evaluacion = await this.historialService.evaluarPrecio(
        dto.claseId ?? actual!.clase_id,
        dto.calidadId ?? actual!.calidad_id,
        dto.precio ?? Number(actual!.precio),
      );
      if (evaluacion.alerta) {
        throw new UnprocessableEntityException({
          message: evaluacion.mensaje,
          requiereConfirmacion: true,
          evaluacion,
        });
      }
    }

    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`Registro de venta ${id} no encontrado`);
    }
    return this.findById(id);
  }

  async remove(id: number) {
    await this.findById(id);
    await this.repository.remove(id);
    return { id, eliminado: true };
  }
}
