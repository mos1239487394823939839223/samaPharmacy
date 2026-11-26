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

function lastDayOfMonth(y: number, mo: number): number {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

/**
 * Expiry as a pharmacist types it, to 'YYYY-MM-DD' — or null while it is not
 * (yet) a date. Boxes print a month, so a month alone means its last day:
 *   "1227", "12/27", "12-2027", "12/2027"  → 2027-12-31
 *   "15/12/2027", "15122027"              → 2027-12-15
 *   "2027-12-15"                          → 2027-12-15
 * Any of / . - or space separates; Arabic-Indic digits are accepted.
 */
export function parseExpiry(raw: string): string | null {
  const s: string = raw
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  if (ISO_DATE.test(s)) return isIsoDate(s) ? s : null;
  let day: number | null = null;
  let mo: number;
  let y: number;
  // Any non-digit separates: with the Windows input language on Arabic the
  // "/" key types "ظ" and "." types "ز", so a fixed separator list fails.
  const parts = s.split(/\D+/).filter(Boolean);
  const yearOk = (p: string) => p.length === 2 || p.length === 4;
  if (parts.length === 1) {
    if (s.length === 4 || s.length === 6) [mo, y] = [Number(s.slice(0, 2)), Number(s.slice(2))];
    else if (s.length === 8) [day, mo, y] = [Number(s.slice(0, 2)), Number(s.slice(2, 4)), Number(s.slice(4))];
    else return null;
  } else if (parts.length === 2 || parts.length === 3) {
    if (parts[0]!.length === 4) {
      // Year first: 2027/12 or 2027/12/15.
      [y, mo] = [Number(parts[0]), Number(parts[1])];
      if (parts[2] !== undefined) day = Number(parts[2]);
    } else {
      const yp = parts[parts.length - 1]!;
      if (!yearOk(yp)) return null;
      if (parts.length === 2) [mo, y] = [Number(parts[0]), Number(yp)];
      else [day, mo, y] = [Number(parts[0]), Number(parts[1]), Number(yp)];
    }
  } else return null;
  if (y < 100) y += 2000;
  if (!(mo >= 1 && mo <= 12) || y < 2000 || y > 2099) return null;
  const d = day ?? lastDayOfMonth(y, mo);
  const iso = `${y}-${pad(mo)}-${pad(d)}`;
  return isIsoDate(iso) ? iso : null;
}

/** How an ISO expiry is shown for editing: "MM/YYYY" for a month-end, else "DD/MM/YYYY". */
export function formatExpiry(iso: string): string {
  const m = ISO_DATE.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return d === lastDayOfMonth(y, mo) ? `${m[2]}/${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
}
