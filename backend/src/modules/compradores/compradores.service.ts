import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CompradoresRepository } from './compradores.repository';
import { CreateCompradorDto } from './dto/create-comprador.dto';
import { UpdateCompradorDto } from './dto/update-comprador.dto';

@Injectable()
export class CompradoresService {
  constructor(private readonly repository: CompradoresRepository) {}

  findAll(sucursal?: string) {
    return this.repository.findAll(sucursal);
  }

  async findById(id: number) {
    const comprador = await this.repository.findById(id);
    if (!comprador) {
      throw new NotFoundException(`Comprador ${id} no encontrado`);
    }
    return comprador;
  }

  async create(dto: CreateCompradorDto) {
    try {
      return await this.repository.create({
        nombre: dto.nombre,
        telefono: dto.telefono,
        sucursal: dto.sucursal ?? '',
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un comprador con ese nombre');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateCompradorDto) {
    await this.findById(id);
    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`Comprador ${id} no encontrado`);
    }
    return updated;
  }

  async remove(id: number) {
    await this.findById(id);
    await this.repository.remove(id);
    return { id, eliminado: true };
  }
}
