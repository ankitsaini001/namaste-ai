import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@mmm/shared';

/**
 * The error every feature throws. `message` is shown to the person using the app as is;
 * `field` names the form field to highlight.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly field: string | null = null,
    readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }
}
