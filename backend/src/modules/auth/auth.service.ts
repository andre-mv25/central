import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../common/enums/roles.enum';
import { verifyPassword } from '../../common/utils/password.util';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosRepository: UsuariosRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosRepository.findByEmail(dto.email);
    if (!usuario || !usuario.activo || !verifyPassword(dto.password, usuario.password_hash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol as Role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }
}
