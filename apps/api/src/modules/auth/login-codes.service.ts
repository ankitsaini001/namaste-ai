import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { AUTH_RULES } from '@mmm/shared';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Model, Types } from 'mongoose';
import { AppException } from '../../common/app.exception';
import type { ApiEnv } from '../../config/env';
import { LoginCode } from './login-code.schema';

export type IssuedCode = { id: Types.ObjectId; code: string; expiresAt: Date };

/** 6-digit email login codes (AUTH-02 to AUTH-04). */
@Injectable()
export class LoginCodesService {
  private readonly secret: string;

  constructor(
    @InjectModel(LoginCode.name) private readonly codes: Model<LoginCode>,
    config: ConfigService<ApiEnv, true>,
  ) {
    this.secret = config.get('LOGIN_CODE_SECRET', { infer: true });
  }

  /** Creates a new code for the email, cancelling any older unused one. */
  async issue(email: string, now = new Date()): Promise<IssuedCode> {
    const { max, windowSeconds } = AUTH_RULES.codesPerEmail;
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);
    const recent = await this.codes
      .find({ email, createdAt: { $gt: windowStart } })
      .sort({ createdAt: 1 })
      .select({ createdAt: 1 })
      .lean();
    if (recent.length >= max) {
      const oldest = recent[0]!.createdAt.getTime();
      throw new AppException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        "You've asked for several codes already. Please wait a few minutes and try again.",
        null,
        { retryAfterSeconds: Math.ceil((oldest + windowSeconds * 1000 - now.getTime()) / 1000) },
      );
    }

    // Only the newest unused code works.
    await this.codes.updateMany({ email, usedAt: null }, { $set: { usedAt: now } });

    const code = randomInt(0, 1_000_000).toString().padStart(AUTH_RULES.codeLength, '0');
    const expiresAt = new Date(now.getTime() + AUTH_RULES.codeTtlSeconds * 1000);
    const doc = await this.codes.create({
      email,
      codeHash: this.hash(email, code),
      attempts: 0,
      expiresAt,
      usedAt: null,
    });
    return { id: doc._id, code, expiresAt };
  }

  /** Checks the code and uses it up. Throws LOGIN_CODE_INVALID, _EXPIRED or _LOCKED. */
  async verify(email: string, code: string, now = new Date()): Promise<void> {
    const latest = await this.codes.findOne({ email }).sort({ createdAt: -1 });
    if (!latest) throw invalid();
    if (latest.usedAt || latest.expiresAt <= now) throw expired();
    if (latest.attempts >= AUTH_RULES.maxWrongAttempts) throw locked();

    if (!this.matches(latest.codeHash, email, code)) {
      // Counted atomically so parallel guesses can't exceed the limit.
      const updated = await this.codes.findOneAndUpdate(
        { _id: latest._id, attempts: { $lt: AUTH_RULES.maxWrongAttempts } },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      const attemptsLeft = updated ? AUTH_RULES.maxWrongAttempts - updated.attempts : 0;
      throw attemptsLeft > 0 ? invalid(attemptsLeft) : locked();
    }

    // Single use, even if the same code is submitted twice at once.
    const used = await this.codes.findOneAndUpdate(
      {
        _id: latest._id,
        usedAt: null,
        expiresAt: { $gt: now },
        attempts: { $lt: AUTH_RULES.maxWrongAttempts },
      },
      { $set: { usedAt: now } },
    );
    if (!used) throw expired();
  }

  private hash(email: string, code: string): string {
    return createHmac('sha256', this.secret).update(`${email}:${code}`).digest('hex');
  }

  private matches(storedHash: string, email: string, code: string): boolean {
    const expected = Buffer.from(storedHash, 'hex');
    const actual = Buffer.from(this.hash(email, code), 'hex');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}

function invalid(attemptsLeft?: number): AppException {
  const tries = attemptsLeft === 1 ? '1 try' : `${attemptsLeft} tries`;
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'LOGIN_CODE_INVALID',
    attemptsLeft === undefined ? "That code isn't right." : `That code isn't right. ${tries} left.`,
    'code',
    attemptsLeft === undefined ? undefined : { attemptsLeft },
  );
}

function expired(): AppException {
  return new AppException(
    HttpStatus.GONE,
    'LOGIN_CODE_EXPIRED',
    'This code has expired or was already used. Please ask for a new one.',
    'code',
  );
}

function locked(): AppException {
  return new AppException(
    HttpStatus.TOO_MANY_REQUESTS,
    'LOGIN_CODE_LOCKED',
    'Too many wrong tries. Please ask for a new code.',
    'code',
  );
}
