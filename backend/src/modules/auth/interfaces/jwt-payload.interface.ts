import { Role } from '../../../common/enums/roles.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: Role;
}
