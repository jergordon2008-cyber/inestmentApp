/**
 * One refresh run (cron every 2 minutes on weekdays, 13:00–21:59 UTC).
 *
 * Outside market hours it returns before any data call. During the session:
 * one Alpaca batch for all tickers, up to FINNHUB_PER_RUN Finnhub quotes,
 * then one KV write. The first run after the close takes the closing
 * snapshot and marks the day final; later runs that day do nothing.
 *
 * Subrequests per run: calendar ≤ 1 + Alpaca ≤ 3 + Finnhub ≤ 15 = 19,
 * under the free plan's 50.
 */
import { fetchAlpacaSnapshots } from './alpaca';
import { defaultSession, etNow, fetchSession, phaseAt, type EtTime, type Phase, type Session } from './calendar';
import { fetchFinnhubBatch, FINNHUB_PER_RUN } from './finnhub';
import { PRICES_KEY, readBlob, writeJson } from './kv';
import { mergeRun, planFinnhub } from './merge';
import { SYMBOLS } from './symbols';
import type { Deps, Env, PriceBlob } from './types';

// The calendar answer for today, kept for the life of the isolate so a
// holiday doesn't cost a calendar call on every run.
const sessionMemo = new Map<string, Session>();

/** Today's session: from the blob, this isolate's memo, Alpaca's calendar, or the weekday default. */
export async function getSession(
  et: EtTime,
  prev: PriceBlob | null,
  env: Env,
  fetchFn: typeof fetch,
): Promise<{ session: Session; calls: number }> {
  if (env.DEV_FORCE_OPEN === '1') {
    return { session: { date: et.date, open: 0, close: 24 * 60, source: 'default' }, calls: 0 };
  }
  if (prev?.session?.date === et.date && prev.session.source === 'alpaca') return { session: prev.session, calls: 0 };
  const memo = sessionMemo.get(et.date);
  if (memo) return { session: memo, calls: 0 };
  const fetched = await fetchSession(et.date, env, fetchFn);
  if (fetched) {
    sessionMemo.clear();
    sessionMemo.set(et.date, fetched);
    return { session: fetched, calls: 1 };
  }
  return { session: defaultSession(et), calls: 1 };
}

export function clearSessionMemo(): void {
  sessionMemo.clear();
}

export interface RefreshSummary {
  ran: boolean;
  reason?: string;
  phase: Phase;
  date: string;
  alpacaOk?: boolean;
  finnhubCalls?: number;
  subrequests: number;
  wrote: boolean;
  counts?: { alpaca: number; finnhub: number; stale: number };
}

export async function refresh(env: Env, deps: Deps, opts: { finnhub: boolean } = { finnhub: true }): Promise<RefreshSummary> {
  const now = deps.now();
  const et = etNow(now);
  const prev = await readBlob(env.PRICES);
  const { session, calls: calendarCalls } = await getSession(et, prev, env, deps.fetch);
  const phase = phaseAt(et.minutes, session);
  let subrequests = calendarCalls;

  if (phase === 'closed') {
    // Store a new day's session once, so the app and the watchdog can tell
    // "holiday" from "robot broken". One KV write per day at most.
    let wrote = false;
    if (prev && prev.session?.date !== session.date) {
      wrote = await writeJson(env.PRICES, PRICES_KEY, { ...prev, session, market: 'closed', final: false });
    }
    return { ran: false, reason: 'market closed', phase, date: et.date, subrequests, wrote };
  }

  if (phase === 'after-close' && prev?.final && prev.session?.date === et.date) {
    return { ran: false, reason: 'closing snapshot already taken', phase, date: et.date, subrequests, wrote: false };
  }

  const alpaca = await fetchAlpacaSnapshots(SYMBOLS, env, deps.fetch, deps.sleep);
  subrequests += alpaca.calls;

  let finnhub = { quotes: {}, tried: [] as string[], calls: 0, authStatus: null as number | null };
  if (opts.finnhub) {
    finnhub = await fetchFinnhubBatch(planFinnhub(prev, FINNHUB_PER_RUN), env.FINNHUB_KEY, deps.fetch);
    subrequests += finnhub.calls;
  }

  const blob = mergeRun({ prev, now, session, phase, alpaca, finnhub });
  const wrote = await writeJson(env.PRICES, PRICES_KEY, blob);

  const counts = { alpaca: 0, finnhub: 0, stale: 0 };
  for (const q of Object.values(blob.quotes)) {
    if (q.stale) counts.stale++;
    else counts[q.src]++;
  }
  return { ran: true, phase, date: et.date, alpacaOk: alpaca.ok, finnhubCalls: finnhub.calls, subrequests, wrote, counts };
}
