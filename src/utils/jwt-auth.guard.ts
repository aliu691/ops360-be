// utils/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorator.public';

@Injectable()
export class JwtAuthGuard extends AuthGuard(['admin-jwt', 'user-jwt']) {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );

    if (isPublic) return true;

    return super.canActivate(context);
  }
}
