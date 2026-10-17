import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Types } from 'mongoose';
import type { MemberRole } from '../members/membership.schema';
import type { SessionKind } from './session.schema';

/**
 * Who is calling, set by SessionGuard. The wedding comes from the user's membership, never from
 * the request (System Design §10.2): organiser requests never carry a wedding ID.
 */
export type AuthContext = {
  sessionId: Types.ObjectId;
  kind: SessionKind;
  userId: Types.ObjectId;
  weddingId: Types.ObjectId | null;
  role: MemberRole | null;
};

/** A caller that passed WeddingMemberGuard: the wedding is always known. */
export type WeddingContext = AuthContext & { weddingId: Types.ObjectId; role: MemberRole };

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
