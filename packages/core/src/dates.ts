/**
 * Local calendar dates.
 *
 * The pharmacy works in Cairo time. `new Date().toISOString()` is UTC, so
 * between midnight and 02:00/03:00 it names yesterday — a sale rung up at
 * 00:30 would land in the previous day's report. Every "today" in the app
 * goes through todayLocal() instead.
 *
 * Timestamps in SQLite are written as datetime('now','localtime')
 * ('YYYY-MM-DD HH:MM:SS', local wall-clock), see packages/db/src/time.ts.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' in the machine's local time zone. */
export function toLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayLocal(): string {
  return toLocalIsoDate(new Date());
}

/** Shift an ISO date by whole days, staying on the local calendar. */
export function addDays(iso: string, days: number): string {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new RangeError(`Not an ISO date: ${iso}`);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

/** True for a real calendar date in 'YYYY-MM-DD' form (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(Date.UTC(y, mo - 1, day));
  return d.getUTCFullYear() === y && d.getUTCMonth() === mo - 1 && d.getUTCDate() === day;
}
