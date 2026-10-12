import { type CanActivate, type ExecutionContext, HttpStatus, SetMetadata } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from './app.exception';

const ALLOW_ANY_ORIGIN = 'allowAnyOrigin';

/** For endpoints called by other services (signed webhooks), not by browsers. */
export const AllowAnyOrigin = () => SetMetadata(ALLOW_ANY_ORIGIN, true);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Guards against other websites (API Design §7.2): every request that changes data must come from
 * the web app's origin, and any body must be JSON.
 */
// Created by configureApp() with the web origin, not through dependency injection.
export class OriginGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly webOrigin: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;
    const skip = this.reflector.getAllAndOverride<boolean>(ALLOW_ANY_ORIGIN, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const hasBody =
      Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] != null;
    const isJson = (req.headers['content-type'] ?? '').startsWith('application/json');
    if (req.headers.origin !== this.webOrigin || (hasBody && !isJson)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'ORIGIN_NOT_ALLOWED',
        'This request was blocked because it did not come from Make My Marriage.',
      );
    }
    return true;
  }
}
