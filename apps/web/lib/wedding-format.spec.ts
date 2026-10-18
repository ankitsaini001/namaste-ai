import { describe, expect, it } from 'vitest';
import {
  countdown,
  formatCeremonyTime,
  formatDayMonth,
  formatStampTime,
  formatWeddingDate,
  initials,
} from './wedding-format';

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

describe('formatDayMonth', () => {
  it('shows the IST day', () => {
    // 20:00 UTC on 16 Oct is already 17 Oct in India.
    expect(formatDayMonth('2026-10-16T20:00:00.000Z')).toBe('17 Oct');
  });
});

describe('initials', () => {
  it.each([
    ['Princi Sharma', 'PS'],
    ['Rohit', 'R'],
    ['  meera   kabir nair ', 'MN'],
    [null, '?'],
  ])('%j → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe('formatStampTime', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  it('shows the IST day and time, and the year only for other years', () => {
    expect(formatStampTime('2026-10-18T11:00:00.000Z', now)).toBe('18 Oct, 4:30 pm');
    expect(formatStampTime('2025-06-10T06:30:00.000Z', now)).toBe('10 Jun 2025, 12:00 pm');
    // 8 pm UTC on 31 Dec 2025 is already 1 Jan 2026 in India: this year.
    expect(formatStampTime('2025-12-31T20:00:00.000Z', now)).toBe('1 Jan, 1:30 am');
    expect(formatStampTime('2026-01-01T03:30:00.000Z', now)).toBe('1 Jan, 9:00 am');
  });
});
