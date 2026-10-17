import { Controller, Get, UseGuards } from '@nestjs/common';
import type { WeddingEvent } from '@mmm/shared';
import { CurrentAuth, type WeddingContext } from '../session/auth-context';
import { SessionGuard } from '../session/session.guard';
import { WeddingMemberGuard } from '../session/wedding-member.guard';
import { EventsService } from './events.service';

/** The wedding's ceremonies (API Design §14). Creating, editing and deleting come with EVT. */
@Controller('events')
@UseGuards(SessionGuard, WeddingMemberGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** At most 20 ceremonies, so one page always holds them all. */
  @Get()
  async list(
    @CurrentAuth() auth: WeddingContext,
  ): Promise<{ data: WeddingEvent[]; page: { nextCursor: null; hasMore: false } }> {
    const events = await this.events.listForWedding(auth.weddingId);
    return {
      data: events.map((event) => this.events.toDto(event)),
      page: { nextCursor: null, hasMore: false },
    };
  }
}
