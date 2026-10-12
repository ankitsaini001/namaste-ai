import { dataResponse, emailCodeSentSchema, meSchema } from '@mmm/shared';
import { z } from 'zod';
import { apiRequest } from './api-client';

const meResponse = dataResponse(meSchema);

export const authApi = {
  requestCode: (email: string) =>
    apiRequest('/auth/email-code', {
      method: 'POST',
      body: { email },
      schema: dataResponse(emailCodeSentSchema),
    }).then((res) => res.data),

  verifyCode: (email: string, code: string) =>
    apiRequest('/auth/email-code/verify', {
      method: 'POST',
      body: { email, code },
      schema: meResponse,
    }).then((res) => res.data),

  me: () => apiRequest('/me', { schema: meResponse }).then((res) => res.data),

  updateName: (name: string) =>
    apiRequest('/me', { method: 'PATCH', body: { name }, schema: meResponse }).then(
      (res) => res.data,
    ),

  logout: () => apiRequest('/auth/logout', { method: 'POST', schema: z.undefined() }),
};

export const meQueryKey = ['me'] as const;
