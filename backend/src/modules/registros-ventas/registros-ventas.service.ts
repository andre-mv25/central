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
import { HistorialService } from '../historial/historial.service';
import { CreateHistorialDto } from '../historial/dto/create-historial.dto';

@Injectable()
export class RegistrosVentasService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly repository: RegistrosVentasRepository,
    private readonly historialService: HistorialPreciosService,
    private readonly historialRepository: HistorialPreciosRepository,
    private readonly auditoriaService: HistorialService,
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

  private async obtenerCompradorId(
    client: PoolClient,
    dto: CreateRegistroVentaDto,
  ): Promise<number> {
    if (dto.compradorId) return dto.compradorId;
    if (!dto.compradorNombre) {
      throw new UnprocessableEntityException('compradorId o compradorNombre es requerido');
    }
    const result = await client.query(
      `INSERT INTO compradores (nombre, sucursal) VALUES ($1, 'DEFAULT')
       ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [dto.compradorNombre],
    );
    return result.rows[0].id;
  }

  private async obtenerClaseId(
    client: PoolClient,
    dto: CreateRegistroVentaDto,
  ): Promise<number> {
    if (dto.claseId) return dto.claseId;
    if (!dto.claseNombre) {
      throw new UnprocessableEntityException('claseId o claseNombre es requerido');
    }
    const result = await client.query(
      `INSERT INTO clases (nombre_clase) VALUES ($1)
       ON CONFLICT (nombre_clase) DO UPDATE SET nombre_clase = EXCLUDED.nombre_clase
       RETURNING id`,
      [dto.claseNombre],
    );
    return result.rows[0].id;
  }

  private async obtenerCalidadId(
    client: PoolClient,
    dto: CreateRegistroVentaDto,
  ): Promise<number> {
    if (dto.calidadId) return dto.calidadId;
    if (!dto.calidadNombre) {
      throw new UnprocessableEntityException('calidadId o calidadNombre es requerido');
    }
    const result = await client.query(
      `INSERT INTO calidades (nombre_calidad) VALUES ($1)
       ON CONFLICT (nombre_calidad) DO UPDATE SET nombre_calidad = EXCLUDED.nombre_calidad
       RETURNING id`,
      [dto.calidadNombre],
    );
    return result.rows[0].id;
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
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const compradorId = await this.obtenerCompradorId(client, dto);
      const claseId = await this.obtenerClaseId(client, dto);
      const calidadId = await this.obtenerCalidadId(client, dto);

      const evaluacion = await this.historialService.evaluarPrecio(claseId, calidadId, dto.precio);
      if (evaluacion.alerta && !dto.confirmarPrecioAnomalo) {
        throw new UnprocessableEntityException({
          message: evaluacion.mensaje,
          requiereConfirmacion: true,
          evaluacion,
        });
      }

      const registro = await this.repository.create(
        {
          compradorId,
          claseId,
          calidadId,
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
        claseId,
        calidadId,
        dto.precio,
        usuario.id,
      );
      await client.query('COMMIT');
      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'VENTA_CREAR',
        entidad: 'registros_ventas',
        entidadId: registro.id,
        detalles: { compradorId, claseId, calidadId, bolsas: dto.bolsas, kilos: dto.kilos, precio: dto.precio, fecha: dto.fecha }
      });
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

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Primero obtener/resolver todos los IDs
      const resolvedItems = await Promise.all(
        dto.registros.map(async (item) => ({
          ...item,
          compradorId: await this.obtenerCompradorId(client, item),
          claseId: await this.obtenerClaseId(client, item),
          calidadId: await this.obtenerCalidadId(client, item),
        })),
      );

      for (let index = 0; index < resolvedItems.length; index++) {
        const item = resolvedItems[index];
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

      const ids: number[] = [];
      for (const item of resolvedItems) {
        const registro = await this.repository.create(
          {
            compradorId: item.compradorId,
            claseId: item.claseId,
            calidadId: item.calidadId,
            usuarioRegistroId: usuario.id,
            bolsas: item.bolsas,
            kilos: item.kilos,
            precio: item.precio,
            fecha: item.fecha ?? dto.fecha,
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

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'VENTA_BULK_CREAR',
        entidad: 'registros_ventas',
        detalles: { total: ids.length, ids }
      });

      const registros = await Promise.all(ids.map((id) => this.repository.findById(id)));
      return { total: registros.length, registros };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
    await this.auditoriaService.registrar({
      usuarioId: usuario.id,
      accion: 'VENTA_EDITAR',
      entidad: 'registros_ventas',
      entidadId: id,
      detalles: dto
    });
    return this.findById(id);
  }

  async remove(id: number, usuario?: AuthUser) {
    await this.findById(id);
    await this.repository.remove(id);
    if (usuario) {
      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'VENTA_ELIMINAR',
        entidad: 'registros_ventas',
        entidadId: id
      });
    }
    return { id, eliminado: true };
  }
}
