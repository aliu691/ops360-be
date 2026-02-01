import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../modules/admins/admins.entity';
import { ROLES_KEY } from './decorator.roles';

// @Injectable()
// export class RolesGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
//       ROLES_KEY,
//       [context.getHandler(), context.getClass()],
//     );

//     if (!requiredRoles) return true;

//     const request = context.switchToHttp().getRequest();
//     const admin = request.user;

//     if (!admin || !requiredRoles.includes(admin.role)) {
//       throw new ForbiddenException('Insufficient permissions');
//     }

//     return true;
//   }
// }

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<any[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 🚨 NO ROLES → DO NOTHING
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const actor = request.user;

    // 🚨 MUST be admin
    if (!actor || !actor.role) {
      throw new ForbiddenException('Admins only');
    }

    if (!requiredRoles.includes(actor.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
