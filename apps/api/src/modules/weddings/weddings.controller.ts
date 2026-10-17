import { Body, Controller, Get, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import type { SlugAvailability, Wedding } from '@mmm/shared';
import { AppException } from '../../common/app.exception';
import { type AuthContext, CurrentAuth, type WeddingContext } from '../session/auth-context';
import { SessionGuard } from '../session/session.guard';
import { WeddingMemberGuard } from '../session/wedding-member.guard';
import { UsersService } from '../users/users.service';
import { CreateWeddingDto, SlugQueryDto } from './wedding.dto';
import { WeddingsService } from './weddings.service';

/** The caller's wedding (API Design §13). No wedding ID in the path: it comes from the session. */
@Controller('wedding')
@UseGuards(SessionGuard)
export class WeddingsController {
  constructor(
    private readonly weddings: WeddingsService,
    private readonly users: UsersService,
  ) {}

  /** Creates the wedding at the end of setup (WED-01, WED-02, WED-06). */
  @Post()
  async create(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CreateWeddingDto,
  ): Promise<{ data: Wedding }> {
    const user = await this.users.findById(auth.userId);
    if (!user)
      throw new AppException(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED', 'Please log in again.');
    const wedding = await this.weddings.create(
      { id: user._id, email: user.email, name: user.name },
      body,
    );
    return { data: this.weddings.toDto(wedding) };
  }

  @Get()
  @UseGuards(WeddingMemberGuard)
  async get(@CurrentAuth() auth: WeddingContext): Promise<{ data: Wedding }> {
    const wedding = await this.weddings.findById(auth.weddingId);
    if (!wedding)
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', "We couldn't find your wedding.");
    return { data: this.weddings.toDto(wedding) };
  }

  @Get('slug-available')
  async slugAvailable(@Query() query: SlugQueryDto): Promise<{ data: SlugAvailability }> {
    return { data: await this.weddings.slugAvailability(query.slug) };
  }
}
