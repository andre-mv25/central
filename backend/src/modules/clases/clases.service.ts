import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClaseDto } from './dto/clase.dto';
import { ClasesRepository } from './clases.repository';

@Injectable()
export class ClasesService {
  constructor(private readonly repository: ClasesRepository) {}

  findAll() {
    return this.repository.findAll();
  }

  async findById(id: number) {
    const clase = await this.repository.findById(id);
    if (!clase) {
      throw new NotFoundException(`Clase ${id} no encontrada`);
    }
    return clase;
  }

  async create(dto: ClaseDto) {
    try {
      return await this.repository.create(dto.nombre_clase);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe esa clase');
      }
      throw error;
    }
  }

  async update(id: number, dto: ClaseDto) {
    await this.findById(id);
    const updated = await this.repository.update(id, dto.nombre_clase);
    if (!updated) {
      throw new NotFoundException(`Clase ${id} no encontrada`);
    }
    return updated;
  }

  async remove(id: number) {
    await this.findById(id);
    await this.repository.remove(id);
    return { id, eliminado: true };
  }
}
