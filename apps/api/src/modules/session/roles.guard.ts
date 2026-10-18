import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from '../../common/app.exception';
import type { MemberRole } from '../members/membership.schema';

const ROLES_KEY = 'mmm:roles';

/** Limits an endpoint to these roles (PRD §28). Use with SessionGuard, WeddingMemberGuard, RolesGuard. */
export const Roles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);

const MESSAGES: Record<MemberRole, string> = {
  admin: 'Only Admins can do this. Ask an Admin of your wedding.',
  manager: 'Only Managers can do this.',
};

/** Returns 403 FORBIDDEN when the caller's role isn't one the endpoint allows. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<MemberRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;
    const role = context.switchToHttp().getRequest<Request>().auth?.role;
    if (role && allowed.includes(role)) return true;
    throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN', MESSAGES[allowed[0]!]);
  }
}
