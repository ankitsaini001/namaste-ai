import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../common/app.exception';

/** Use after SessionGuard on endpoints for wedding data: the caller must belong to a wedding. */
@Injectable()
export class WeddingMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const auth = context.switchToHttp().getRequest<Request>().auth;
    if (!auth?.weddingId || !auth.role) {
      throw new AppException(HttpStatus.FORBIDDEN, 'NO_WEDDING', 'Set up your wedding first.');
    }
    return true;
  }
}
