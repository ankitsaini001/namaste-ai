import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ErrorCode, ErrorResponse } from '@mmm/shared';
import type { Request, Response } from 'express';
import { AppException } from './app.exception';
import { newRequestId } from './request-id.middleware';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  400: 'VALIDATION_FAILED',
  401: 'AUTH_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

const DEFAULT_MESSAGES: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: 'Some of the information is missing or not valid.',
  AUTH_REQUIRED: 'Please log in to continue.',
  FORBIDDEN: "You don't have access to this.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  RATE_LIMITED: 'Too many attempts. Please try again shortly.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
};

/** Turns every thrown error into the standard envelope (API Design §4). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = req.requestId ?? newRequestId();
    const { status, error } = this.toError(exception);

    if (status >= 500 && !(exception instanceof AppException)) {
      // Method and request ID only: paths can contain guest codes.
      this.logger.error(
        `${req.method} request failed [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = { error, requestId };
    res.setHeader('X-Request-Id', requestId);
    res.status(status).json(body);
  }

  private toError(exception: unknown): { status: number; error: ErrorResponse['error'] } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        error: {
          code: exception.code,
          message: exception.message,
          field: exception.field,
          ...(exception.details && { details: exception.details }),
        },
      };
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_FAILED');
    return { status, error: { code, message: DEFAULT_MESSAGES[code] ?? '', field: null } };
  }
}
