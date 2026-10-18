import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUTH_RULES, type EmailCodeSent, type Me, SESSION_COOKIE } from '@mmm/shared';
import type { Request, Response } from 'express';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { type ApiEnv, EMAIL_CODE_IP_LIMIT } from '../../config/env';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { EmailCodeRequestDto, EmailCodeVerifyDto } from './auth.dto';
import { LoginCodesService } from './login-codes.service';
import { MeService } from './me.service';
import { sessionCookieOptions } from '../session/session-cookie';
import { SessionsService } from '../session/sessions.service';

const clientIp = (req: Request) => req.ip ?? 'unknown';

/** Email-code login (API Design §11.3–11.5). Google sign-in (AUTH-01) comes next. */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginCodes: LoginCodesService,
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
    private readonly me: MeService,
    private readonly notifications: NotificationsService,
    private readonly rateLimits: RateLimitService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  /** Always the same reply, whether or not the email has an account (AUTH-03). */
  @Post('email-code')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestCode(
    @Body() body: EmailCodeRequestDto,
    @Req() req: Request,
  ): Promise<{ data: EmailCodeSent }> {
    await this.rateLimits.enforce(
      'email_code_ip',
      clientIp(req),
      {
        limit: this.config.get('EMAIL_CODE_IP_LIMIT', { infer: true }) ?? EMAIL_CODE_IP_LIMIT,
        windowSeconds: 60 * 60,
      },
      'Too many code requests from this network. Please try again later.',
    );
    const issued = await this.loginCodes.issue(body.email);
    await this.notifications.sendEmail({
      kind: 'login_code',
      to: body.email,
      templateData: {
        code: issued.code,
        expiresInMinutes: AUTH_RULES.codeTtlSeconds / 60,
        expiresAt: issued.expiresAt.toISOString(),
      },
      idempotencyKey: `login_code:${String(issued.id)}`,
    });
    return { data: { sent: true, expiresInSeconds: AUTH_RULES.codeTtlSeconds } };
  }

  @Post('email-code/verify')
  @HttpCode(HttpStatus.OK)
  async verifyCode(
    @Body() body: EmailCodeVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: Me }> {
    await this.rateLimits.enforce(
      'email_verify_ip',
      clientIp(req),
      { limit: 30, windowSeconds: 60 * 60 },
      'Too many attempts from this network. Please try again later.',
    );
    await this.loginCodes.verify(body.email, body.code);
    const user = await this.users.signInWithVerifiedEmail(body.email);
    const session = await this.sessions.createForUser(user._id, {
      userAgent: req.headers['user-agent'] ?? null,
      ip: clientIp(req),
    });
    res.cookie(SESSION_COOKIE, session.token, {
      ...this.cookieOptions(),
      expires: session.expiresAt,
    });
    return { data: await this.me.toMe(user) };
  }

  /** Ends this browser's session. Safe to call when already logged out. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token) await this.sessions.revoke(token);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  private cookieOptions() {
    return sessionCookieOptions({
      COOKIE_DOMAIN: this.config.get('COOKIE_DOMAIN', { infer: true }),
      COOKIE_SECURE: this.config.get('COOKIE_SECURE', { infer: true }),
    });
  }
}
