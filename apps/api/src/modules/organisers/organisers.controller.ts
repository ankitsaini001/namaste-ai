import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { OrganiserInvite, OrganisersList } from '@mmm/shared';
import { Types } from 'mongoose';
import { CurrentAuth, type WeddingContext } from '../session/auth-context';
import { Roles, RolesGuard } from '../session/roles.guard';
import { SessionGuard } from '../session/session.guard';
import { WeddingMemberGuard } from '../session/wedding-member.guard';
import {
  ChangeOrganiserRoleDto,
  InviteIdParamDto,
  InviteOrganiserDto,
  UserIdParamDto,
} from './organisers.dto';
import { OrganisersService } from './organisers.service';

/** The caller's wedding's organisers (API Design §13.1). Changes are for Admins only (PRD §28). */
@Controller('organisers')
@UseGuards(SessionGuard, WeddingMemberGuard, RolesGuard)
export class OrganisersController {
  constructor(private readonly organisers: OrganisersService) {}

  @Get()
  async list(@CurrentAuth() auth: WeddingContext): Promise<{ data: OrganisersList }> {
    return { data: await this.organisers.list(auth) };
  }

  @Post('invites')
  @Roles('admin')
  async invite(
    @CurrentAuth() auth: WeddingContext,
    @Body() body: InviteOrganiserDto,
  ): Promise<{ data: OrganiserInvite }> {
    return { data: await this.organisers.invite(auth, body) };
  }

  @Post('invites/:id/resend')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async resend(
    @CurrentAuth() auth: WeddingContext,
    @Param() params: InviteIdParamDto,
  ): Promise<{ data: OrganiserInvite }> {
    return { data: await this.organisers.resend(auth, params.id) };
  }

  @Delete('invites/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@CurrentAuth() auth: WeddingContext, @Param() params: InviteIdParamDto) {
    await this.organisers.cancel(auth, params.id);
  }

  /** Managers only; checked in the service so an Admin hears how to leave instead. */
  @Post('leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(@CurrentAuth() auth: WeddingContext) {
    await this.organisers.leave(auth);
  }

  @Patch(':userId')
  @Roles('admin')
  async changeRole(
    @CurrentAuth() auth: WeddingContext,
    @Param() params: UserIdParamDto,
    @Body() body: ChangeOrganiserRoleDto,
  ): Promise<{ data: OrganisersList }> {
    await this.organisers.changeRole(auth, new Types.ObjectId(params.userId), body.role);
    return { data: await this.organisers.list(auth) };
  }

  @Delete(':userId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentAuth() auth: WeddingContext, @Param() params: UserIdParamDto) {
    await this.organisers.remove(auth, new Types.ObjectId(params.userId));
  }
}
