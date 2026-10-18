import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { EntradasMercanciaRepository, EntradaMercanciaCreateInput, EntradaMercanciaUpdateInput, EntradaMercanciaRow } from './entradas-mercancia.repository';
import { CreateEntradaMercanciaDto } from './dto/create-entrada-mercancia.dto';
import { QueryEntradasMercanciaDto } from './dto/query-entradas-mercancia.dto';
import { UpdateEntradaMercanciaDto } from './dto/update-entrada-mercancia.dto';
import { BulkCreateEntradaMercanciaDto } from './dto/bulk-create-entrada-mercancia.dto';

@Injectable()
export class EntradasMercanciaService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly repository: EntradasMercanciaRepository,
  ) {}

  findAll(query: QueryEntradasMercanciaDto) {
    return this.repository.findAll({
      fecha: query.fecha,
      proveedorId: query.proveedorId,
      claseId: query.claseId,
      calidadId: query.calidadId,
    });
  }

  async findById(id: number): Promise<EntradaMercanciaRow> {
    const entrada = await this.repository.findById(id);
    if (!entrada) {
      throw new NotFoundException(`Entrada de mercancía ${id} no encontrada`);
    }
    return entrada;
  }

  private async obtenerProveedorId(
    client: PoolClient,
    dto: CreateEntradaMercanciaDto,
  ): Promise<number> {
    if (dto.proveedorId) return dto.proveedorId;
    if (!dto.proveedorNombre) {
      throw new UnprocessableEntityException('proveedorId o proveedorNombre es requerido');
    }
    const result = await client.query(
      `INSERT INTO compradores (nombre, sucursal) VALUES ($1, 'PROVEEDOR')
       ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [dto.proveedorNombre],
    );
    return result.rows[0].id;
  }

  private async obtenerClaseId(
    client: PoolClient,
    dto: CreateEntradaMercanciaDto,
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
    dto: CreateEntradaMercanciaDto,
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

  async create(dto: CreateEntradaMercanciaDto, usuario: AuthUser): Promise<EntradaMercanciaRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const proveedorId = await this.obtenerProveedorId(client, dto);
      const claseId = await this.obtenerClaseId(client, dto);
      const calidadId = await this.obtenerCalidadId(client, dto);

      await this.repository.create(
        {
          proveedorId,
          claseId,
          calidadId,
          usuarioRegistroId: usuario.id,
          bolsas: dto.bolsas,
          kilos: dto.kilos,
          precio: dto.precio,
          fecha: dto.fecha,
          observaciones: dto.observaciones,
        },
        client,
      );
      await client.query('COMMIT');
      return this.findById((await client.query('SELECT LASTVAL()')).rows[0].lastval);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createBulk(dto: BulkCreateEntradaMercanciaDto, usuario: AuthUser) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const resolvedItems = await Promise.all(
        dto.registros.map(async (item) => ({
          ...item,
          proveedorId: await this.obtenerProveedorId(client, item),
          claseId: await this.obtenerClaseId(client, item),
          calidadId: await this.obtenerCalidadId(client, item),
        })),
      );

      const ids: number[] = [];
      for (const item of resolvedItems) {
        const result = await this.repository.create(
          {
            proveedorId: item.proveedorId,
            claseId: item.claseId,
            calidadId: item.calidadId,
            usuarioRegistroId: usuario.id,
            bolsas: item.bolsas,
            kilos: item.kilos,
            precio: item.precio,
            fecha: item.fecha,
            observaciones: item.observaciones,
          },
          client,
        );
        ids.push(result.id);
      }
      await client.query('COMMIT');

      const entradas = await Promise.all(ids.map((id) => this.repository.findById(id)));
      return { total: entradas.length, entradas: entradas.filter((e): e is EntradaMercanciaRow => e !== null) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async obtenerStock() {
    const result = await this.pool.query(`
      SELECT
        em.clase_id,
        c.nombre_clase,
        em.calidad_id,
        ca.nombre_calidad,
        COALESCE(SUM(em.kilos)::numeric, 0) AS kilos_entrados,
        COALESCE(SUM(rv.kilos)::numeric, 0) AS kilos_vendidos,
        COALESCE(SUM(em.kilos)::numeric, 0) - COALESCE(SUM(rv.kilos)::numeric, 0) AS stock_kilos,
        COALESCE(SUM(em.bolsas)::int, 0) AS bolsas_entradas,
        COALESCE(SUM(rv.bolsas)::int, 0) AS bolsas_vendidas,
        COALESCE(SUM(em.bolsas)::int, 0) - COALESCE(SUM(rv.bolsas)::int, 0) AS stock_bolsas
      FROM entradas_mercancia em
      JOIN clases c ON c.id = em.clase_id
      JOIN calidades ca ON ca.id = em.calidad_id
      LEFT JOIN registros_ventas rv ON rv.clase_id = em.clase_id AND rv.calidad_id = em.calidad_id
      GROUP BY em.clase_id, c.nombre_clase, em.calidad_id, ca.nombre_calidad
      ORDER BY c.nombre_clase, ca.nombre_calidad
    `);
    return result.rows;
  }

  async update(id: number, dto: UpdateEntradaMercanciaDto): Promise<EntradaMercanciaRow> {
    await this.findById(id);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let proveedorId: number | undefined;
      let claseId: number | undefined;
      let calidadId: number | undefined;

      if (dto.proveedorNombre) {
        proveedorId = await this.obtenerProveedorId(client, dto as CreateEntradaMercanciaDto);
      } else if (dto.proveedorId) {
        proveedorId = dto.proveedorId;
      }

      if (dto.claseNombre) {
        claseId = await this.obtenerClaseId(client, dto as CreateEntradaMercanciaDto);
      } else if (dto.claseId) {
        claseId = dto.claseId;
      }

      if (dto.calidadNombre) {
        calidadId = await this.obtenerCalidadId(client, dto as CreateEntradaMercanciaDto);
      } else if (dto.calidadId) {
        calidadId = dto.calidadId;
      }

      await this.repository.update(
        id,
        {
          proveedorId,
          claseId,
          calidadId,
          bolsas: dto.bolsas,
          kilos: dto.kilos,
          precio: dto.precio,
          fecha: dto.fecha,
          observaciones: dto.observaciones,
        },
        client,
      );

      await client.query('COMMIT');
      return this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(id: number): Promise<{ id: number; eliminado: boolean }> {
    await this.findById(id);
    await this.repository.remove(id);
    return { id, eliminado: true };
  }
}