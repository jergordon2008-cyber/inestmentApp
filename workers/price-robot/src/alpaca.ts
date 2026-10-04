/**
 * Alpaca Market Data (free Basic plan, IEX feed): the primary source.
 *
 * One multi-symbol snapshot call returns every ticker. Display to our
 * students is covered by Alpaca's written approval (docs/PRICE-ROBOT-DESIGN.md §0).
 */
import type { SourceQuote } from './types';

export const ALPACA_DATA_BASE = 'https://data.alpaca.markets';
export const ALPACA_TRADING_BASE = 'https://paper-api.alpaca.markets';

export interface AlpacaKeys { ALPACA_KEY_ID: string; ALPACA_SECRET_KEY: string }

export function alpacaHeaders(keys: AlpacaKeys): Record<string, string> {
  return { 'APCA-API-KEY-ID': keys.ALPACA_KEY_ID, 'APCA-API-SECRET-KEY': keys.ALPACA_SECRET_KEY };
}

export type AlpacaResult =
  | { ok: true; quotes: Record<string, SourceQuote>; calls: number }
  | { ok: false; status: number; calls: number };

/** Waits between attempts. Retries only for network errors, 429 and 5xx. */
export const RETRY_DELAYS_MS = [1000, 3000];

interface Snapshot {
  latestTrade?: { p?: number; t?: string };
  dailyBar?: { h?: number; l?: number; t?: string };
  prevDailyBar?: { c?: number };
}

export async function fetchAlpacaSnapshots(
  symbols: readonly string[],
  keys: AlpacaKeys,
  fetchFn: typeof fetch,
  sleep: (ms: number) => Promise<void>,
  retryDelays: readonly number[] = RETRY_DELAYS_MS,
): Promise<AlpacaResult> {
  const url = `${ALPACA_DATA_BASE}/v2/stocks/snapshots?feed=iex&symbols=${symbols.join(',')}`;
  let calls = 0;
  let status = 0;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    if (attempt > 0) await sleep(retryDelays[attempt - 1] ?? 0);
    calls++;
    try {
      const res = await fetchFn(url, { headers: alpacaHeaders(keys), signal: AbortSignal.timeout(5000) });
      status = res.status;
      if (res.ok) {
        const body = (await res.json()) as Record<string, Snapshot | null>;
        return { ok: true, quotes: parseSnapshots(body), calls };
      }
      // A refused key won't start working on a retry.
      if (res.status === 401 || res.status === 403) break;
      if (res.status !== 429 && res.status < 500) break;
    } catch {
      status = 0; // network error or timeout
    }
  }
  return { ok: false, status, calls };
}

export function parseSnapshots(body: Record<string, Snapshot | null>): Record<string, SourceQuote> {
  const out: Record<string, SourceQuote> = {};
  for (const [sym, s] of Object.entries(body ?? {})) {
    const p = s?.latestTrade?.p;
    const t = s?.latestTrade?.t;
    if (typeof p !== 'number' || !(p > 0) || typeof t !== 'string' || Number.isNaN(Date.parse(t))) continue;
    const q: SourceQuote = { p, pc: null, t: new Date(t).toISOString() };
    const pc = s?.prevDailyBar?.c;
    if (typeof pc === 'number' && pc > 0) q.pc = pc;
    if (typeof s?.dailyBar?.h === 'number') q.hi = s.dailyBar.h;
    if (typeof s?.dailyBar?.l === 'number') q.lo = s.dailyBar.l;
    out[sym] = q;
  }
  return out;
}
