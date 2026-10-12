import { HttpStatus } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod';
import { AppException } from './app.exception';

const FALLBACK_MESSAGE = 'Some of the information is missing or not valid.';

/** ['events', 1, 'count'] → 'events[1].count' (the `field` format in API Design §4). */
export function toFieldPath(path: readonly PropertyKey[]): string | null {
  if (path.length === 0) return null;
  return path
    .map((part, index) =>
      typeof part === 'number' ? `[${part}]` : `${index === 0 ? '' : '.'}${String(part)}`,
    )
    .join('');
}

/** Turns a zod error into VALIDATION_FAILED, using the first problem's message for the person. */
export function validationException(error: ZodError): AppException {
  const issues = error.issues.map((issue) => ({
    field: toFieldPath(issue.path),
    message: issue.message,
  }));
  const first = issues[0];
  // Messages on field-level issues come from our shared schemas and are written for people.
  const message = first?.field ? first.message : FALLBACK_MESSAGE;
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_FAILED',
    message,
    first?.field ?? null,
    { issues },
  );
}

/** Validates `@Body()`, `@Query()` and `@Param()` DTOs made with `createZodDto`. */
export const AppValidationPipe = createZodValidationPipe({
  createValidationException: (error) => validationException(error as ZodError),
});
