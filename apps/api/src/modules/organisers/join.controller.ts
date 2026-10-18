import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { JoinDetails, Me } from '@mmm/shared';
import type { Request } from 'express';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { MeService } from '../auth/me.service';
import { type AuthContext, CurrentAuth } from '../session/auth-context';
import { SessionGuard } from '../session/session.guard';
import { JoinTokenParamDto } from './organisers.dto';
import { OrganisersService } from './organisers.service';

/** The organiser join link from the invitation email (API Design §13.6). */
@Controller('join')
export class JoinController {
  constructor(
    private readonly organisers: OrganisersService,
    private readonly me: MeService,
    private readonly rateLimits: RateLimitService,
  ) {}

  /** Public: what the join page shows before signing in. */
  @Get(':token')
  async details(
    @Param() params: JoinTokenParamDto,
    @Req() req: Request,
  ): Promise<{ data: JoinDetails }> {
    await this.rateLimits.enforce('join_details_ip', req.ip ?? 'unknown', {
      limit: 60,
      windowSeconds: 60,
    });
    return { data: await this.organisers.joinDetails(params.token) };
  }

  /** Called after login; returns the updated Me with the wedding and role. */
  @Post(':token')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param() params: JoinTokenParamDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<{ data: Me }> {
    await this.organisers.accept(params.token, auth.userId);
    return { data: await this.me.forUser(auth.userId) };
  }
}
