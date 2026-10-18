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
  Query,
  UseGuards,
} from '@nestjs/common';
import type { EventDeleted, EventDetail, WeddingEvent } from '@mmm/shared';
import { CurrentAuth, type WeddingContext } from '../session/auth-context';
import { Roles, RolesGuard } from '../session/roles.guard';
import { SessionGuard } from '../session/session.guard';
import { WeddingMemberGuard } from '../session/wedding-member.guard';
import { CreateEventDto, EventIdParamDto, EventQueryDto, UpdateEventDto } from './events.dto';
import { EventsService } from './events.service';

/** The wedding's ceremonies (API Design §14). Admins and Managers change them (PRD §28). */
@Controller('events')
@UseGuards(SessionGuard, WeddingMemberGuard, RolesGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** At most 20 ceremonies, so one page always holds them all. */
  @Get()
  async list(
    @CurrentAuth() auth: WeddingContext,
  ): Promise<{ data: WeddingEvent[]; page: { nextCursor: null; hasMore: false } }> {
    const events = await this.events.listForWedding(auth.weddingId);
    return { data: await this.events.toDtos(events), page: { nextCursor: null, hasMore: false } };
  }

  @Post()
  @Roles('admin', 'manager')
  async create(
    @CurrentAuth() auth: WeddingContext,
    @Body() body: CreateEventDto,
  ): Promise<{ data: WeddingEvent }> {
    return { data: await this.events.toDto(await this.events.create(auth, body)) };
  }

  @Get(':id')
  async get(
    @CurrentAuth() auth: WeddingContext,
    @Param() params: EventIdParamDto,
    @Query() query: EventQueryDto,
  ): Promise<{ data: EventDetail }> {
    const event = await this.events.toDto(await this.events.get(auth, params.id));
    if (query.include !== 'impact') return { data: event };
    return { data: { ...event, impact: await this.events.impact(auth, params.id) } };
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  async update(
    @CurrentAuth() auth: WeddingContext,
    @Param() params: EventIdParamDto,
    @Body() body: UpdateEventDto,
  ): Promise<{ data: WeddingEvent }> {
    return { data: await this.events.toDto(await this.events.update(auth, params.id, body)) };
  }

  /** Replies with what was removed or unlinked (EVT-06). */
  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentAuth() auth: WeddingContext,
    @Param() params: EventIdParamDto,
  ): Promise<{ data: EventDeleted }> {
    return { data: { deleted: true, ...(await this.events.remove(auth, params.id)) } };
  }
}
