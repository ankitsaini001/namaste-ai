import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWeddingSchema,
  defaultWeddingTitle,
  slugProblem,
  slugSchema,
  suggestSlug,
} from './wedding';

describe('website address (slug)', () => {
  it.each([
    ['princi-akshay', null],
    ['ab', 'invalid'],
    ['Princi Akshay', 'invalid'],
    ['x'.repeat(41), 'invalid'],
    ['admin', 'reserved'],
    ['login', 'reserved'],
  ])('%j → %s', (slug, problem) => {
    expect(slugProblem(slug)).toBe(problem);
  });

  it('lowercases and trims before checking', () => {
    expect(slugSchema.parse('  Princi-Akshay ')).toBe('princi-akshay');
    expect(slugSchema.safeParse('app').error?.issues[0]?.message).toMatch(/reserved/);
  });

  it('suggests an address from the couple’s names', () => {
    expect(suggestSlug('Princi', 'Akshay')).toBe('princi-akshay');
    expect(suggestSlug('Zoë Anne', "D'Souza")).toBe('zoe-anne-d-souza');
    expect(suggestSlug('', '')).toBe('wedding');
    expect(suggestSlug('A', '')).toBe('a-wedding');
    expect(
      suggestSlug('Rajeshwari'.repeat(3), 'Venkataraman'.repeat(2)).length,
    ).toBeLessThanOrEqual(40);
  });
});

describe('defaultWeddingTitle', () => {
  it('puts the bride first, joined with "&" (no emoji)', () => {
    expect(defaultWeddingTitle(' Princi ', 'Akshay')).toBe('Princi & Akshay');
    expect(defaultWeddingTitle('Princi', '')).toBe('Princi');
  });
});

describe('createWeddingSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-17T06:00:00Z')); // 11:30 IST, 17 Oct 2026
  });
  afterEach(() => vi.useRealTimers());

  const valid = {
    brideName: 'Princi',
    groomName: 'Akshay',
    title: 'Princi & Akshay',
    date: '2027-02-14',
    city: 'Dehradun',
    slug: 'princi-akshay',
    events: [{ type: 'wedding', name: 'Wedding', startsAt: '2027-02-14T13:30:00.000Z' }],
  };

  it('accepts a valid wedding and fills defaults', () => {
    const parsed = createWeddingSchema.parse(valid);
    expect(parsed.description).toBeNull();
    expect(parsed.events[0]?.showOnWebsite).toBe(true);
  });

  it.each([
    ['a past date', { date: '2026-10-16' }, /today or later/],
    ['a date more than 3 years ahead', { date: '2029-10-18' }, /within 3 years/],
    ['no ceremonies', { events: [] }, /at least one ceremony/],
    ['a one-letter city', { city: 'X' }, /at least 2 characters/],
    ['a blank bride name', { brideName: '   ' }, /bride's name/],
  ])('rejects %s', (_label, change, message) => {
    const result = createWeddingSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(message);
  });

  it('accepts today and exactly 3 years ahead', () => {
    expect(createWeddingSchema.safeParse({ ...valid, date: '2026-10-17' }).success).toBe(true);
    expect(createWeddingSchema.safeParse({ ...valid, date: '2029-10-17' }).success).toBe(true);
  });

  it('allows at most 20 ceremonies', () => {
    const events = Array.from({ length: 21 }, () => valid.events[0]);
    expect(createWeddingSchema.safeParse({ ...valid, events }).error?.issues[0]?.message).toMatch(
      /up to 20/,
    );
  });
});
