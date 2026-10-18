import { IST_TIME_ZONE, todayInIst } from '@mmm/shared';

const DAY_MS = 86_400_000;

/** The wedding's main day (stored as midnight UTC of that calendar day) as YYYY-MM-DD. */
export const weddingDay = (iso: string) => iso.slice(0, 10);

/** "Sunday, 14 February 2027" — a calendar day, so it is formatted in UTC. */
export function formatWeddingDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** "Fri, 12 Feb · 4:00 pm" in IST (PRD §4: times are shown in IST). */
export function formatCeremonyTime(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  return {
    date: new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: IST_TIME_ZONE,
    }).format(date),
    time: new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: IST_TIME_ZONE,
    })
      .format(date)
      .toLowerCase(),
  };
}

/** "17 Oct" in IST, for when something happened or ends, such as an invitation. */
export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: IST_TIME_ZONE,
  }).format(new Date(iso));
}

/** "Princi Sharma" → "PS", for avatars. */
export function initials(name: string | null, fallback = '?'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0]![0]! + (parts.length > 1 ? parts.at(-1)![0]! : '')).toUpperCase();
}

export type Countdown = { state: 'upcoming' | 'today' | 'married'; days: number; label: string };

/** DASH-01: "42 days to go", "Today is the day!", "Married 12 days ago" — counted in IST days. */
export function countdown(weddingDateIso: string, now = new Date()): Countdown {
  const today = Date.parse(`${todayInIst(now)}T00:00:00Z`);
  const days = Math.round((Date.parse(`${weddingDay(weddingDateIso)}T00:00:00Z`) - today) / DAY_MS);
  if (days > 0)
    return { state: 'upcoming', days, label: `${days} ${days === 1 ? 'day' : 'days'} to go` };
  if (days === 0) return { state: 'today', days: 0, label: 'Today is the day!' };
  const ago = -days;
  return { state: 'married', days: ago, label: `Married ${ago} ${ago === 1 ? 'day' : 'days'} ago` };
}
