import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { SlugAvailability, Wedding } from '@mmm/shared';
import { AppException } from '../../common/app.exception';
import { type AuthContext, CurrentAuth, type WeddingContext } from '../session/auth-context';
import { Roles, RolesGuard } from '../session/roles.guard';
import { SessionGuard } from '../session/session.guard';
import { WeddingMemberGuard } from '../session/wedding-member.guard';
import { UsersService } from '../users/users.service';
import { CreateWeddingDto, SetupStepDto, SlugQueryDto, UpdateWeddingDto } from './wedding.dto';
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
    return { data: await this.weddings.toDto(wedding) };
  }

  @Get()
  @UseGuards(WeddingMemberGuard)
  async get(@CurrentAuth() auth: WeddingContext): Promise<{ data: Wedding }> {
    const wedding = await this.weddings.findById(auth.weddingId);
    if (!wedding)
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', "We couldn't find your wedding.");
    return { data: await this.weddings.toDto(wedding) };
  }

  /** WED-07: an Admin changes the wedding's details (API Design §13.3). */
  @Patch()
  @UseGuards(WeddingMemberGuard, RolesGuard)
  @Roles('admin')
  async update(
    @CurrentAuth() auth: WeddingContext,
    @Body() body: UpdateWeddingDto,
  ): Promise<{ data: Wedding }> {
    const wedding = await this.weddings.update(auth.weddingId, body, auth.userId);
    return { data: await this.weddings.toDto(wedding) };
  }

  /** Moves setup forward, for example past "Invite your family" (API Design §13.1). */
  @Post('setup-step')
  @UseGuards(WeddingMemberGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async setupStep(
    @CurrentAuth() auth: WeddingContext,
    @Body() body: SetupStepDto,
  ): Promise<{ data: Wedding }> {
    const wedding = await this.weddings.advanceSetup(auth.weddingId, body.step);
    return { data: await this.weddings.toDto(wedding) };
  }

  @Get('slug-available')
  async slugAvailable(@Query() query: SlugQueryDto): Promise<{ data: SlugAvailability }> {
    return { data: await this.weddings.slugAvailability(query.slug) };
  }
}
