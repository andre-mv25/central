import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CalidadDto } from './dto/calidad.dto';
import { CalidadesRepository } from './calidades.repository';

@Injectable()
export class CalidadesService {
  constructor(private readonly repository: CalidadesRepository) {}

  findAll() {
    return this.repository.findAll();
  }

  async findById(id: number) {
    const calidad = await this.repository.findById(id);
    if (!calidad) {
      throw new NotFoundException(`Calidad ${id} no encontrada`);
    }
    return calidad;
  }

  async create(dto: CalidadDto) {
    try {
      return await this.repository.create(dto.nombre_calidad);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe esa calidad');
      }
      throw error;
    }
  }

  async update(id: number, dto: CalidadDto) {
    await this.findById(id);
    const updated = await this.repository.update(id, dto.nombre_calidad);
    if (!updated) {
      throw new NotFoundException(`Calidad ${id} no encontrada`);
    }
    return updated;
  }

  async remove(id: number) {
    await this.findById(id);
    await this.repository.remove(id);
    return { id, eliminado: true };
  }
}
