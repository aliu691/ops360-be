import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole, ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles → allow
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Unauthenticated');
    }

    /**
     * USER routes
     */
    if (requiredRoles.includes('USER')) {
      return user.type === 'USER';
    }

    /**
     * ADMIN / SUPER_ADMIN routes
     */
    if (user.type === 'ADMIN') {
      // SUPER_ADMIN satisfies both ADMIN and SUPER_ADMIN
      if (
        user.role === 'SUPER_ADMIN' &&
        requiredRoles.includes('SUPER_ADMIN')
      ) {
        return true;
      }

      // Regular ADMIN
      if (user.role === 'ADMIN' && requiredRoles.includes('ADMIN')) {
        return true;
      }

      // SUPER_ADMIN accessing ADMIN route
      if (user.role === 'SUPER_ADMIN' && requiredRoles.includes('ADMIN')) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
