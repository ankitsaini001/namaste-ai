import { describe, expect, it } from 'vitest';
import { emailCodeRequestSchema, emailCodeVerifySchema, meSchema, updateMeSchema } from './auth';

describe('emailCodeRequestSchema', () => {
  it('trims and lowercases the email', () => {
    expect(emailCodeRequestSchema.parse({ email: '  Princi@Gmail.COM ' })).toEqual({
      email: 'princi@gmail.com',
    });
  });

  it.each([[''], ['not-an-email'], [`${'a'.repeat(250)}@x.com`]])(
    'rejects %j with a readable message',
    (email) => {
      const result = emailCodeRequestSchema.safeParse({ email });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toMatch(/email/i);
    },
  );
});

describe('emailCodeVerifySchema', () => {
  it('accepts exactly six digits', () => {
    expect(emailCodeVerifySchema.parse({ email: 'a@b.co', code: ' 482913 ' }).code).toBe('482913');
  });

  it.each(['48291', '4829134', 'abcdef', ''])('rejects code %j', (code) => {
    expect(emailCodeVerifySchema.safeParse({ email: 'a@b.co', code }).success).toBe(false);
  });
});

describe('updateMeSchema', () => {
  it('trims the name and rejects empty or over-long names', () => {
    expect(updateMeSchema.parse({ name: '  Princi Sharma ' })).toEqual({ name: 'Princi Sharma' });
    expect(updateMeSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(updateMeSchema.safeParse({ name: 'x'.repeat(61) }).success).toBe(false);
  });
});

describe('meSchema', () => {
  it('accepts a new user without a name or wedding', () => {
    const me = {
      user: {
        id: '66f0a1b2c3d4e5f60718293a',
        name: null,
        email: 'princi@gmail.com',
        avatarUrl: null,
        hasGoogle: false,
      },
      needsName: true,
      wedding: null,
      role: null,
    };
    expect(meSchema.parse(me)).toEqual(me);
  });
});
