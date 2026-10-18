import {
  type CreateWeddingInput,
  dataResponse,
  type SetupStep,
  eventSchema,
  slugAvailabilitySchema,
  weddingSchema,
} from '@mmm/shared';
import { z } from 'zod';
import { apiRequest } from './api-client';

export const weddingApi = {
  create: (body: CreateWeddingInput) =>
    apiRequest('/wedding', { method: 'POST', body, schema: dataResponse(weddingSchema) }).then(
      (res) => res.data,
    ),

  get: () =>
    apiRequest('/wedding', { schema: dataResponse(weddingSchema) }).then((res) => res.data),

  slugAvailable: (slug: string) =>
    apiRequest(`/wedding/slug-available?slug=${encodeURIComponent(slug)}`, {
      schema: dataResponse(slugAvailabilitySchema),
    }).then((res) => res.data),

  setupStep: (step: SetupStep) =>
    apiRequest('/wedding/setup-step', {
      method: 'POST',
      body: { step },
      schema: dataResponse(weddingSchema),
    }).then((res) => res.data),

  events: () =>
    apiRequest('/events', { schema: z.object({ data: z.array(eventSchema) }) }).then(
      (res) => res.data,
    ),
};

export const weddingQueryKey = ['wedding'] as const;
export const eventsQueryKey = ['events'] as const;
