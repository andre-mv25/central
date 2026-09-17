import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hashPassword } from '../../common/utils/password.util';
import { UsuarioConRolRow } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuariosRepository } from './usuarios.repository';

@Injectable()
export class UsuariosService {
  constructor(private readonly repository: UsuariosRepository) {}

  private toPublic(row: UsuarioConRolRow) {
    const { password_hash, ...rest } = row;
    return rest;
  }

  async findAll() {
    const rows = await this.repository.findAll();
    return rows.map((row) => this.toPublic(row));
  }

  async findById(id: number) {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return this.toPublic(row);
  }

  async create(dto: CreateUsuarioDto) {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const created = await this.repository.create({
      email: dto.email,
      passwordHash: hashPassword(dto.password),
      rolId: dto.rolId,
    });
    const full = await this.repository.findById(created.id);
    return this.toPublic(full!);
  }

  async update(id: number, dto: UpdateUsuarioDto) {
    await this.findById(id);
    const updated = await this.repository.update(id, {
      email: dto.email,
      passwordHash: dto.password ? hashPassword(dto.password) : undefined,
      rolId: dto.rolId,
      activo: dto.activo,
    });
    if (!updated) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return this.toPublic(updated);
  }

  async remove(id: number) {
    await this.findById(id);
    await this.repository.remove(id);
    return { id, eliminado: true };
  }
}
