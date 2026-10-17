import { describe, expect, it } from 'vitest';
import { countdown, formatCeremonyTime, formatWeddingDate } from './wedding-format';

const WEDDING = '2027-02-14T00:00:00.000Z';

describe('countdown (DASH-01)', () => {
  it.each([
    ['2026-12-31T06:00:00Z', 'upcoming', '45 days to go'],
    ['2027-02-13T06:00:00Z', 'upcoming', '1 day to go'],
    ['2027-02-14T06:00:00Z', 'today', 'Today is the day!'],
    ['2027-02-15T06:00:00Z', 'married', 'Married 1 day ago'],
    ['2027-02-26T06:00:00Z', 'married', 'Married 12 days ago'],
  ])('on %s it says %s: %s', (now, state, label) => {
    expect(countdown(WEDDING, new Date(now))).toMatchObject({ state, label });
  });

  it('counts IST days: 13 Feb 19:00 UTC is already 14 Feb in India', () => {
    expect(countdown(WEDDING, new Date('2027-02-13T19:00:00Z')).state).toBe('today');
  });
});

describe('formatting', () => {
  it('shows the wedding day as a calendar day', () => {
    expect(formatWeddingDate(WEDDING)).toBe('Sunday, 14 February 2027');
  });

  it('shows ceremony times in IST', () => {
    expect(formatCeremonyTime('2027-02-12T10:30:00.000Z')).toEqual({
      date: 'Fri, 12 Feb',
      time: '4:00 pm',
    });
  });
});
