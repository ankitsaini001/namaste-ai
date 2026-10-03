import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmenting Express's global types
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function newRequestId(): string {
  return `req_${randomUUID().replaceAll('-', '')}`;
}

/** Gives every request an ID, returned in `X-Request-Id` and in error bodies. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = newRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
