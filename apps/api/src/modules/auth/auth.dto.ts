import { emailCodeRequestSchema, emailCodeVerifySchema, updateMeSchema } from '@mmm/shared';
import { createZodDto } from 'nestjs-zod';

export class EmailCodeRequestDto extends createZodDto(emailCodeRequestSchema) {}
export class EmailCodeVerifyDto extends createZodDto(emailCodeVerifySchema) {}
export class UpdateMeDto extends createZodDto(updateMeSchema) {}
