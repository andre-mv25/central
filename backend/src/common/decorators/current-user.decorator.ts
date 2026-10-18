import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/roles.enum';

export interface AuthUser {
  id: number;
  email: string;
  rol: Role;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
