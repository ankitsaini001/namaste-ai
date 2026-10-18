import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AUTH_RULES } from '@mmm/shared';
import { createHash, randomBytes } from 'node:crypto';
import type { Model, Types } from 'mongoose';
import { Session, type SessionDocument } from './session.schema';

const TOUCH_INTERVAL_MS = 10 * 60_000;

export const hashSessionToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Logged-in browsers. The cookie holds a random 32-byte token; only its hash is stored. */
@Injectable()
export class SessionsService {
  constructor(@InjectModel(Session.name) private readonly sessions: Model<Session>) {}

  async createForUser(
    userId: Types.ObjectId,
    meta: { userAgent?: string | null; ip?: string | null },
    now = new Date(),
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + AUTH_RULES.sessionDays * 24 * 60 * 60_000);
    await this.sessions.create({
      tokenHash: hashSessionToken(token),
      kind: 'user',
      userId,
      expiresAt,
      lastSeenAt: now,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ip: meta.ip ?? null,
    });
    return { token, expiresAt };
  }

  /** The live session for a cookie value, or null if it is unknown or expired. */
  async findValid(token: string, now = new Date()): Promise<SessionDocument | null> {
    const session = await this.sessions.findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: now },
    });
    if (session && now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.sessions.updateOne({ _id: session._id }, { $set: { lastSeenAt: now } });
    }
    return session;
  }

  async revoke(token: string): Promise<void> {
    await this.sessions.deleteOne({ tokenHash: hashSessionToken(token) });
  }

  /** Logs the user out everywhere, for example when they are removed from a wedding (ORG-08). */
  async revokeAllForUser(userId: Types.ObjectId): Promise<void> {
    await this.sessions.deleteMany({ userId });
  }
}
