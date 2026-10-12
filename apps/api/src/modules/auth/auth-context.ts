import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Types } from 'mongoose';
import type { SessionKind } from './session.schema';

/** Who is calling, set by SessionGuard. The wedding and role are added with WED. */
export type AuthContext = {
  sessionId: Types.ObjectId;
  kind: SessionKind;
  userId: Types.ObjectId;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- augmenting Express's global types
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/** Injects the caller's AuthContext into a handler guarded by SessionGuard. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const auth = context.switchToHttp().getRequest<Express.Request>().auth;
    if (!auth) throw new Error('CurrentAuth used without SessionGuard');
    return auth;
  },
);
