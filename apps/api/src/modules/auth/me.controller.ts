import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { Me } from '@mmm/shared';
import { UsersService } from '../users/users.service';
import { type AuthContext, CurrentAuth } from './auth-context';
import { UpdateMeDto } from './auth.dto';
import { MeService } from './me.service';
import { SessionGuard } from './session.guard';

/** The current user (API Design §12). Account deletion (AUTH-08) comes later. */
@Controller('me')
@UseGuards(SessionGuard)
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly users: UsersService,
  ) {}

  @Get()
  async get(@CurrentAuth() auth: AuthContext): Promise<{ data: Me }> {
    return { data: await this.me.forUser(auth.userId) };
  }

  @Patch()
  async update(@CurrentAuth() auth: AuthContext, @Body() body: UpdateMeDto): Promise<{ data: Me }> {
    await this.users.updateName(auth.userId, body.name);
    return { data: await this.me.forUser(auth.userId) };
  }
}
