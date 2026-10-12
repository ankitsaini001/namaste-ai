import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESSION_COOKIE } from '@mmm/shared';
import type { Request, Response } from 'express';
import { AppException } from '../../common/app.exception';
import type { ApiEnv } from '../../config/env';
import { sessionCookieOptions } from './session-cookie';
import { SessionsService } from './sessions.service';

/** Requires a logged-in organiser. Sets `req.auth`. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionsService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length === 0) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'AUTH_REQUIRED',
        'Please log in to continue.',
      );
    }

    const session = await this.sessions.findValid(token);
    if (!session || session.kind !== 'user' || !session.userId) {
      http.getResponse<Response>().clearCookie(SESSION_COOKIE, this.cookieOptions());
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'SESSION_EXPIRED',
        'Your session has ended. Please log in again.',
      );
    }

    req.auth = { sessionId: session._id, kind: session.kind, userId: session.userId };
    return true;
  }

  private cookieOptions() {
    return sessionCookieOptions({
      COOKIE_DOMAIN: this.config.get('COOKIE_DOMAIN', { infer: true }),
      COOKIE_SECURE: this.config.get('COOKIE_SECURE', { infer: true }),
    });
  }
}
