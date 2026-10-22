/**
 * US market hours, in New York time.
 *
 * The cron runs every minute from 13:00 to 21:59 UTC on weekdays, which
 * covers 9:30–16:00 ET in both EDT and EST. Each run asks this module whether
 * the market is actually open: holidays and early closes come from Finnhub's
 * market-holiday list (fetched once per day and kept in the price blob), so
 * nights, weekends and holidays make no price calls.
 */
import { FINNHUB_BASE } from './finnhub';

/** One trading day. open/close are minutes after midnight ET; null = closed all day. */
export interface Session {
  date: string;           // YYYY-MM-DD, New York date
  open: number | null;
  close: number | null;
  /** 'alpaca' only in blobs written before the switch to Finnhub. */
  source: 'finnhub' | 'alpaca' | 'default';
}

export type Phase = 'closed' | 'open' | 'after-close';

/** Refresh starts one minute before the open. */
export const PRE_OPEN_MIN = 1;
/**
 * Runs this many minutes after the close take the closing snapshot. At 45
 * tickers a run it takes 3 runs to cover all 110; the rest is slack for a
 * late or failed run.
 */
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

interface FinnhubHoliday { atDate?: string; tradingHour?: string }

/**
 * Today's session from Finnhub's US market-holiday list (one call; the list
 * covers this year and next). A date on the list with no trading hours is a
 * holiday; one with "09:30-13:00" is an early close; any other weekday has
 * regular hours. Returns null on any failure so the caller can fall back.
 */
export async function fetchSession(date: string, key: string, fetchFn: typeof fetch): Promise<Session | null> {
  try {
    const res = await fetchFn(`${FINNHUB_BASE}/stock/market-holiday?exchange=US`, {
      headers: { 'X-Finnhub-Token': key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: unknown };
    if (!Array.isArray(body?.data)) return null;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6) return { date, open: null, close: null, source: 'finnhub' };
    const day = (body.data as FinnhubHoliday[]).find(d => d?.atDate === date);
    if (!day) return { date, open: 570, close: 960, source: 'finnhub' };
    const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec((day.tradingHour ?? '').trim());
    if (!m) return { date, open: null, close: null, source: 'finnhub' };
    const open = parseHhmm(m[1]!);
    const close = parseHhmm(m[2]!);
    if (open === null || close === null) return null;
    return { date, open, close, source: 'finnhub' };
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
