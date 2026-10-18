import {
  type CreateEventInput,
  dataResponse,
  eventDeletedSchema,
  eventDetailSchema,
  eventSchema,
  type UpdateEventInput,
} from '@mmm/shared';
import { apiRequest } from './api-client';

/** Ceremonies (API Design §14). The list itself is `weddingApi.events`. */
export const eventsApi = {
  get: (id: string, { withImpact = false } = {}) =>
    apiRequest(`/events/${id}${withImpact ? '?include=impact' : ''}`, {
      schema: dataResponse(eventDetailSchema),
    }).then((res) => res.data),

  create: (body: CreateEventInput) =>
    apiRequest('/events', { method: 'POST', body, schema: dataResponse(eventSchema) }).then(
      (res) => res.data,
    ),

  /** Send only what changed. */
  update: (id: string, changes: UpdateEventInput) =>
    apiRequest(`/events/${id}`, {
      method: 'PATCH',
      body: changes,
      schema: dataResponse(eventSchema),
    }).then((res) => res.data),

  remove: (id: string) =>
    apiRequest(`/events/${id}`, {
      method: 'DELETE',
      schema: dataResponse(eventDeletedSchema),
    }).then((res) => res.data),
};

export const eventQueryKey = (id: string) => ['events', id] as const;
