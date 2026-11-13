/** All schedule times are Asia/Dhaka (UTC+6, no DST). */
export const TZ = 'Asia/Dhaka';

const ymdFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export function dhakaToday(now = new Date()): string {
  return ymdFmt.format(now); // en-CA gives YYYY-MM-DD
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00+06:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return dhakaToday(d);
}

export function dayOffset(ymd: string, from = dhakaToday()): number {
  const a = new Date(`${from}T12:00:00+06:00`).getTime();
  const b = new Date(`${ymd}T12:00:00+06:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday, for a Dhaka calendar date. */
export function weekday(ymd: string): number {
  return new Date(`${ymd}T06:00:00Z`).getUTCDay();
}

export function at(ymd: string, hhmm: string): Date {
  return new Date(`${ymd}T${hhmm}:00+06:00`);
}

const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
export const formatTime = (d: Date) => timeFmt.format(d);

const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
const longDayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

export function formatDay(ymd: string, style: 'short' | 'long' = 'short') {
  const d = at(ymd, '12:00');
  return (style === 'long' ? longDayFmt : dayFmt).format(d);
}

export function relativeDayLabel(ymd: string) {
  const off = dayOffset(ymd);
  if (off === 0) return 'Today';
  if (off === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' }).format(at(ymd, '12:00'));
}

export function dayParts(ymd: string) {
  const d = at(ymd, '12:00');
  return {
    weekday: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' }).format(d),
    day: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric' }).format(d),
    month: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, month: 'short' }).format(d),
  };
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';
export function dayPart(hhmm: string): DayPart {
  const h = Number(hhmm.slice(0, 2));
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}
