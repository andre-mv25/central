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

      const [compradorRow, claseRow, calidadRow] = await Promise.all([
        client.query('SELECT nombre FROM compradores WHERE id = $1', [compradorId]),
        client.query('SELECT nombre_clase FROM clases WHERE id = $1', [claseId]),
        client.query('SELECT nombre_calidad FROM calidades WHERE id = $1', [calidadId]),
      ]);

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'VENTA_CREAR',
        entidad: 'registros_ventas',
        entidadId: registro.id,
        detalles: {
          ventaId: registro.id,
          comprador: compradorRow.rows[0]?.nombre,
          clase: claseRow.rows[0]?.nombre_clase,
          calidad: calidadRow.rows[0]?.nombre_calidad,
          bolsas: dto.bolsas,
          kilos: dto.kilos,
          precio: dto.precio,
          total: Number(dto.kilos) * Number(dto.precio),
          fecha: dto.fecha
        }
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

      const detalleBulk = resolvedItems.map((item, idx) => ({
        index: idx,
        ventaId: item.id ?? null,
        compradorId: item.compradorId,
        claseId: item.claseId,
        calidadId: item.calidadId,
        bolsas: item.bolsas,
        kilos: item.kilos,
        precio: item.precio,
        total: Number(item.kilos) * Number(item.precio),
        fecha: item.fecha ?? dto.fecha
      }));

      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'VENTA_BULK_CREAR',
        entidad: 'registros_ventas',
        detalles: { total: ids.length, ids, registros: detalleBulk }
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

  async update(id: number, dto: UpdateRegistroVentaDto, usuario?: AuthUser) {
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
    if (usuario) {
      const actualizado = await this.repository.findById(id);
      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'VENTA_EDITAR',
        entidad: 'registros_ventas',
        entidadId: id,
        detalles: {
          ventaId: id,
          compradorId: actualizado?.comprador_id,
          claseId: actualizado?.clase_id,
          calidadId: actualizado?.calidad_id,
          bolsas: actualizado?.bolsas,
          kilos: actualizado?.kilos,
          precio: actualizado?.precio,
          total: actualizado?.total,
          fecha: actualizado?.fecha,
          cambios: dto as Record<string, unknown>
        }
      });
    }
    return this.findById(id);
  }

  async remove(id: number, usuario?: AuthUser) {
    const registro = await this.repository.findById(id);
    await this.repository.remove(id);
    if (usuario && registro) {
      await this.auditoriaService.registrar({
        usuarioId: usuario.id,
        accion: 'VENTA_ELIMINAR',
        entidad: 'registros_ventas',
        entidadId: id,
        detalles: {
          ventaId: id,
          compradorId: registro.comprador_id,
          claseId: registro.clase_id,
          calidadId: registro.calidad_id,
          bolsas: registro.bolsas,
          kilos: registro.kilos,
          precio: registro.precio,
          total: registro.total,
          fecha: registro.fecha
        }
      });
    }
    return { id, eliminado: true };
  }
}
