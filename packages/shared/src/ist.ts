/**
 * India Standard Time helpers. Moments are stored in UTC and always entered and shown in IST
 * (PRD §4). IST is UTC+5:30 all year (no daylight saving), so the offset is fixed.
 */
export const IST_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;

/** Today's calendar day in IST, as YYYY-MM-DD. */
export function todayInIst(now = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Adds whole years to a YYYY-MM-DD day (29 Feb becomes 28 Feb when needed). */
export function addYears(day: string, years: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const result = new Date(Date.UTC(y + years, m - 1, d));
  if (result.getUTCMonth() !== m - 1) result.setUTCDate(0);
  return result.toISOString().slice(0, 10);
}

/** Adds (or with a negative number, subtracts) whole days to a YYYY-MM-DD day. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A date and time entered in IST ("2027-02-12", "16:30") as a UTC ISO string. */
export function istToUtcIso(day: string, time: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS).toISOString();
}

/** A UTC moment split back into the IST day and time a form shows. */
export function utcToIstParts(iso: string): { day: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString();
  return { day: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/**
 * A calendar day (YYYY-MM-DD) as the Date we store: midnight UTC of that day, so it reads back as
 * the same day everywhere.
 */
export function calendarDayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
