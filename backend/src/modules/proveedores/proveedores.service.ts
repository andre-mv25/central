import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProveedoresRepository, ProveedorRow } from './proveedores.repository';
import { CreateProveedorDto, UpdateProveedorDto } from './dto/create-proveedor.dto';

@Injectable()
export class ProveedoresService {
  constructor(private readonly repository: ProveedoresRepository) {}

  async findAll(activo?: boolean, buscar?: string): Promise<ProveedorRow[]> {
    return this.repository.findAll(activo, buscar);
  }

  async findById(id: number): Promise<ProveedorRow> {
    const proveedor = await this.repository.findById(id);
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async create(dto: CreateProveedorDto): Promise<ProveedorRow> {
    const existing = await this.repository.findByNombre(dto.nombre);
    if (existing) throw new ConflictException('Ya existe un proveedor con ese nombre');
    return this.repository.create({
      nombre: dto.nombre.trim(),
      contacto: dto.contacto?.trim(),
      telefono: dto.telefono?.trim(),
      email: dto.email?.trim().toLowerCase(),
      direccion: dto.direccion?.trim(),
      rfc: dto.rfc?.trim().toUpperCase(),
      condicionesPago: dto.condicionesPago?.trim(),
      diasCredito: dto.diasCredito ?? 0,
    });
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<ProveedorRow> {
    if (dto.nombre !== undefined) {
      const existing = await this.repository.findByNombre(dto.nombre);
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un proveedor con ese nombre');
      }
    }

    const updateData: Partial<{
      nombre: string;
      contacto: string | null;
      telefono: string | null;
      email: string | null;
      direccion: string | null;
      rfc: string | null;
      condicionesPago: string | null;
      diasCredito: number;
      activo: boolean;
    }> = {};

    if (dto.nombre !== undefined) updateData.nombre = dto.nombre.trim();
    if (dto.contacto !== undefined) updateData.contacto = dto.contacto?.trim() || null;
    if (dto.telefono !== undefined) updateData.telefono = dto.telefono?.trim() || null;
    if (dto.email !== undefined) updateData.email = dto.email?.trim().toLowerCase() || null;
    if (dto.direccion !== undefined) updateData.direccion = dto.direccion?.trim() || null;
    if (dto.rfc !== undefined) updateData.rfc = dto.rfc?.trim().toUpperCase() || null;
    if (dto.condicionesPago !== undefined) updateData.condicionesPago = dto.condicionesPago?.trim() || null;
    if (dto.diasCredito !== undefined) updateData.diasCredito = dto.diasCredito;
    if (dto.activo !== undefined) updateData.activo = dto.activo;

    const proveedor = await this.repository.update(id, updateData);
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async delete(id: number): Promise<void> {
    const proveedor = await this.repository.findById(id);
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');

    const hasRecepciones = await this.repository.hasRecepciones(id);
    if (hasRecepciones) {
      throw new BadRequestException('No se puede eliminar: el proveedor tiene recepciones registradas. Desactívelo en su lugar.');
    }

    await this.repository.delete(id);
  }

  async getActivosParaSelect(): Promise<{ id: number; nombre: string }[]> {
    const proveedores = await this.repository.findAll(true);
    return proveedores.map(p => ({ id: p.id, nombre: p.nombre }));
  }
}