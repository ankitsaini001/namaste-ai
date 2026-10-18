import { createWeddingSchema, setupStepSchema, updateWeddingSchema } from '@mmm/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateWeddingDto extends createZodDto(createWeddingSchema) {}
export class SetupStepDto extends createZodDto(setupStepSchema) {}
export class UpdateWeddingDto extends createZodDto(updateWeddingSchema) {}

/** The address is checked in the service, so any problem comes back as `available: false`. */
export class SlugQueryDto extends createZodDto(
  z.object({ slug: z.string({ error: 'Enter a website address.' }).max(100) }),
) {}
