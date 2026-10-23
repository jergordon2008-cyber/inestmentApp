/**
 * One refresh run (cron every minute on weekdays, 13:00–21:59 UTC).
 *
 * Outside market hours it returns before any price call. During the session:
 * up to FINNHUB_PER_RUN Finnhub calls (priority tickers first, then the
 * rotation), then one KV write. After the close it keeps going until every
 * ticker has a closing price, marks the day final, and later runs that day
 * do nothing.
 *
 * Subrequests per run: Finnhub ≤ 45 (calendar included) + KV 3 = 48, under
 * the Free plan's 50.
 */
import { defaultSession, etNow, fetchSession, phaseAt, type EtTime, type Phase, type Session } from './calendar';
import { activeDemand, readDemand } from './demand';
import { fetchFinnhubBatch, FINNHUB_PER_RUN } from './finnhub';
import { PRICES_KEY, readBlob, writeJson } from './kv';
import { countOld, mergeRun, planRun } from './merge';
import type { Deps, Env, PriceBlob } from './types';

// The calendar answer for today, kept for the life of the isolate so a
// holiday doesn't cost a calendar call on every run.
const sessionMemo = new Map<string, Session>();

/** Today's session: from the blob, this isolate's memo, Finnhub's holiday list, or the weekday default. */
export async function getSession(
  et: EtTime,
  prev: PriceBlob | null,
  env: Env,
  fetchFn: typeof fetch,
): Promise<{ session: Session; calls: number }> {
  if (env.DEV_FORCE_OPEN === '1') {
    return { session: { date: et.date, open: 0, close: 24 * 60, source: 'default' }, calls: 0 };
  }
  if (prev?.session?.date === et.date && prev.session.source !== 'default') return { session: prev.session, calls: 0 };
  const memo = sessionMemo.get(et.date);
  if (memo) return { session: memo, calls: 0 };
  // Weekends need no call.
  if (et.weekday === 0 || et.weekday === 6) return { session: defaultSession(et), calls: 0 };
  const fetched = await fetchSession(et.date, env.FINNHUB_KEY, fetchFn);
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
  /** Every Finnhub call this run, calendar included. */
  finnhubCalls: number;
  priority?: number;
  subrequests: number;
  wrote: boolean;
  quotes?: number;
  /** Tickers not confirmed within the last 5 minutes after this run. */
  old?: number;
  final?: boolean;
}

export async function refresh(env: Env, deps: Deps, opts: { budget: number } = { budget: FINNHUB_PER_RUN }): Promise<RefreshSummary> {
  const now = deps.now();
  const et = etNow(now);
  const prev = await readBlob(env.PRICES);
  const { session, calls: calendarCalls } = await getSession(et, prev, env, deps.fetch);
  const phase = phaseAt(et.minutes, session);
  let subrequests = calendarCalls + 1;

  if (phase === 'closed') {
    // Store a new day's session once, so the app and the watchdog can tell
    // "holiday" from "robot broken". One KV write per day at most.
    let wrote = false;
    if (prev && prev.session?.date !== session.date) {
      wrote = await writeJson(env.PRICES, PRICES_KEY, { ...prev, session, market: 'closed', final: false, closeFrom: null });
      subrequests++;
    }
    return { ran: false, reason: 'market closed', phase, date: et.date, finnhubCalls: calendarCalls, subrequests, wrote };
  }

  if (phase === 'after-close' && prev?.final && prev.session?.date === et.date) {
    return { ran: false, reason: 'closing snapshot already taken', phase, date: et.date, finnhubCalls: calendarCalls, subrequests, wrote: false };
  }

  const priority = activeDemand(await readDemand(env.PRICES), now);
  subrequests++;
  const plan = planRun(prev, priority, Math.max(0, opts.budget - calendarCalls));
  const finnhub = await fetchFinnhubBatch(plan, env.FINNHUB_KEY, deps.fetch);
  subrequests += finnhub.calls;

  const blob = mergeRun({ prev, now, session, phase, finnhub });
  const wrote = await writeJson(env.PRICES, PRICES_KEY, blob);
  subrequests++;

  return {
    ran: true, phase, date: et.date,
    finnhubCalls: finnhub.calls + calendarCalls,
    priority: Math.min(priority.length, plan.length),
    subrequests, wrote,
    quotes: Object.keys(blob.quotes).length,
    old: countOld(blob, now),
    final: blob.final,
  };
}
