import { describe, expect, it } from 'vitest';
import { addYears, calendarDayToDate, istToUtcIso, todayInIst, utcToIstParts } from './ist';

describe('IST helpers', () => {
  it('uses the IST day, which starts at 18:30 UTC the evening before', () => {
    expect(todayInIst(new Date('2026-10-17T18:29:00Z'))).toBe('2026-10-17');
    expect(todayInIst(new Date('2026-10-17T18:30:00Z'))).toBe('2026-10-18');
  });

  it('converts a time entered in IST to UTC and back', () => {
    expect(istToUtcIso('2027-02-12', '16:30')).toBe('2027-02-12T11:00:00.000Z');
    expect(istToUtcIso('2027-02-14', '02:00')).toBe('2027-02-13T20:30:00.000Z');
    expect(utcToIstParts('2027-02-13T20:30:00.000Z')).toEqual({ day: '2027-02-14', time: '02:00' });
  });

  it('adds years, turning 29 February into 28 February', () => {
    expect(addYears('2026-10-17', 3)).toBe('2029-10-17');
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28');
  });

  it('stores a calendar day as midnight UTC', () => {
    expect(calendarDayToDate('2027-02-14').toISOString()).toBe('2027-02-14T00:00:00.000Z');
  });
});
