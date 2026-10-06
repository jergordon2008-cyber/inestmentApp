/**
 * US market hours, in New York time.
 *
 * The cron runs every 2 minutes from 13:00 to 21:59 UTC on weekdays, which
 * covers 9:30–16:00 ET in both EDT and EST. Each run asks this module whether
 * the market is actually open: holidays and early closes come from Alpaca's
 * trading calendar (fetched once per day and kept in the price blob), so
 * nights, weekends and holidays make no data calls.
 */
import { ALPACA_TRADING_BASE, alpacaHeaders, type AlpacaKeys } from './alpaca';

/** One trading day. open/close are minutes after midnight ET; null = closed all day. */
export interface Session {
  date: string;           // YYYY-MM-DD, New York date
  open: number | null;
  close: number | null;
  source: 'alpaca' | 'default';
}

export type Phase = 'closed' | 'open' | 'after-close';

/** Refresh starts one minute before the open. */
export const PRE_OPEN_MIN = 1;
/** Runs this many minutes after the close may take the closing snapshot. */
export const AFTER_CLOSE_MIN = 6;

const ET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
});
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export interface EtTime { date: string; minutes: number; weekday: number }

export function etNow(now: Date): EtTime {
  const parts: Record<string, string> = {};
  for (const p of ET.formatToParts(now)) parts[p.type] = p.value;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: WEEKDAYS[parts.weekday ?? ''] ?? 0,
  };
}

/** "09:30" → 570 */
export function parseHhmm(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Used only when the calendar can't be fetched: regular hours on weekdays, no holidays. */
export function defaultSession(et: EtTime): Session {
  const weekday = et.weekday >= 1 && et.weekday <= 5;
  return { date: et.date, open: weekday ? 570 : null, close: weekday ? 960 : null, source: 'default' };
}

/**
 * Alpaca's calendar for one date. An empty answer means the market is closed
 * that day (holiday). Returns null on any failure so the caller can fall back.
 */
export async function fetchSession(
  date: string,
  keys: AlpacaKeys,
  fetchFn: typeof fetch,
): Promise<Session | null> {
  try {
    const res = await fetchFn(`${ALPACA_TRADING_BASE}/v2/calendar?start=${date}&end=${date}`, {
      headers: alpacaHeaders(keys),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return null;
    const day = body.find((d: { date?: string }) => d?.date === date) as { open?: string; close?: string } | undefined;
    if (!day) return { date, open: null, close: null, source: 'alpaca' };
    const open = parseHhmm(day.open ?? '');
    const close = parseHhmm(day.close ?? '');
    if (open === null || close === null) return null;
    return { date, open, close, source: 'alpaca' };
  } catch {
    return null;
  }
}

/** Where the refresh cron is in the trading day. */
export function phaseAt(minutes: number, session: Session): Phase {
  if (session.open === null || session.close === null) return 'closed';
  if (minutes >= session.open - PRE_OPEN_MIN && minutes < session.close) return 'open';
  if (minutes >= session.close && minutes <= session.close + AFTER_CLOSE_MIN) return 'after-close';
  return 'closed';
}

/** HH:MM in New York time, for alert messages. */
export function formatEt(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '??:??';
  const m = etNow(t).minutes;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ET`;
}
