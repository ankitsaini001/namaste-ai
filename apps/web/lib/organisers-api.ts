import {
  dataResponse,
  type InviteOrganiser,
  joinDetailsSchema,
  meSchema,
  organiserInviteSchema,
  type OrganiserRole,
  organisersListSchema,
} from '@mmm/shared';
import { z } from 'zod';
import { apiRequest } from './api-client';

const list = dataResponse(organisersListSchema);

export const organisersApi = {
  list: () => apiRequest('/organisers', { schema: list }).then((res) => res.data),

  invite: (body: InviteOrganiser) =>
    apiRequest('/organisers/invites', {
      method: 'POST',
      body,
      schema: dataResponse(organiserInviteSchema),
    }).then((res) => res.data),

  resend: (inviteId: string) =>
    apiRequest(`/organisers/invites/${inviteId}/resend`, {
      method: 'POST',
      schema: dataResponse(organiserInviteSchema),
    }).then((res) => res.data),

  cancel: (inviteId: string) =>
    apiRequest(`/organisers/invites/${inviteId}`, { method: 'DELETE', schema: z.undefined() }),

  changeRole: (userId: string, role: OrganiserRole) =>
    apiRequest(`/organisers/${userId}`, { method: 'PATCH', body: { role }, schema: list }).then(
      (res) => res.data,
    ),

  remove: (userId: string) =>
    apiRequest(`/organisers/${userId}`, { method: 'DELETE', schema: z.undefined() }),

  leave: () => apiRequest('/organisers/leave', { method: 'POST', schema: z.undefined() }),

  /** Public: what the join page shows before signing in. */
  joinDetails: (token: string) =>
    apiRequest(`/join/${encodeURIComponent(token)}`, {
      schema: dataResponse(joinDetailsSchema),
    }).then((res) => res.data),

  accept: (token: string) =>
    apiRequest(`/join/${encodeURIComponent(token)}`, {
      method: 'POST',
      schema: dataResponse(meSchema),
    }).then((res) => res.data),
};

export const organisersQueryKey = ['organisers'] as const;
export const ROLE_LABEL: Record<OrganiserRole, string> = { admin: 'Admin', manager: 'Manager' };
