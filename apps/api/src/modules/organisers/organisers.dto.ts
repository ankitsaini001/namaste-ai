import { changeOrganiserRoleSchema, inviteOrganiserSchema } from '@mmm/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class InviteOrganiserDto extends createZodDto(inviteOrganiserSchema) {}
export class ChangeOrganiserRoleDto extends createZodDto(changeOrganiserRoleSchema) {}

const objectId = z
  .string()
  .regex(/^[0-9a-f]{24}$/, "We couldn't find that organiser or invitation.");
export class InviteIdParamDto extends createZodDto(z.object({ id: objectId })) {}
export class UserIdParamDto extends createZodDto(z.object({ userId: objectId })) {}

/** Any string: a malformed link gets the same JOIN_LINK_INVALID reply as an unknown one. */
export class JoinTokenParamDto extends createZodDto(z.object({ token: z.string().max(200) })) {}
