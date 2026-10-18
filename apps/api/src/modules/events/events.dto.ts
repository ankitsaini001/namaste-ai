import { createEventSchema, updateEventSchema } from '@mmm/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateEventDto extends createZodDto(createEventSchema) {}
export class UpdateEventDto extends createZodDto(updateEventSchema) {}

export class EventIdParamDto extends createZodDto(
  z.object({ id: z.string().regex(/^[0-9a-f]{24}$/, "We couldn't find that ceremony.") }),
) {}

/** `?include=impact` adds what deleting the ceremony would do (API Design §14). */
export class EventQueryDto extends createZodDto(
  z.object({ include: z.enum(['impact']).optional() }),
) {}
