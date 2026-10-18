import { Injectable, NotFoundException } from '@nestjs/common';
import { HistorialRepository } from './historial.repository';
import { CreateHistorialDto } from './dto/create-historial.dto';
import { QueryHistorialDto } from './dto/query-historial.dto';

@Injectable()
export class HistorialService {
  constructor(private readonly repository: HistorialRepository) {}

  registrar(dto: CreateHistorialDto) {
    return this.repository.create(dto);
  }

  listar(query: QueryHistorialDto) {
    return this.repository.findAll(query);
  }

  limpiar(dias: number) {
    return this.repository.limpiarAntiguo(dias);
  }
}
