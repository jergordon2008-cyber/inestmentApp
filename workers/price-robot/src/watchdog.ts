/**
 * Watchdog (cron every 5 minutes). During the session and up to 15 minutes
 * after the close it checks the price blob; if prices are more than
 * 10 minutes old it runs one small catch-up refresh (CATCHUP_PER_RUN Finnhub
 * calls, so even on top of a normal run Finnhub stays under 60/min) and
 * alerts if that didn't fix it.
 *
 * Alerts fire on changes only, one when a problem starts and one when it
 * clears, so a long outage doesn't send a message every 5 minutes. The
 * state is a small KV key written only on a change.
 */
import { AFTER_CLOSE_MIN, defaultSession, etNow, formatEt, type Session } from './calendar';
import { CATCHUP_PER_RUN } from './finnhub';
import { readBlob, WATCHDOG_KEY, writeJson } from './kv';
import { countOld } from './merge';
import { getSession, refresh } from './refresh';
import type { Deps, Env, PriceBlob } from './types';

export const STALE_AFTER_MS = 10 * 60_000;
/** Give the first runs of the day time to land before judging. */
const WATCH_FROM_OPEN_MIN = 5;
const WATCH_AFTER_CLOSE_MIN = 15;
const FINNHUB_DOWN_RUNS = 3;
const MANY_OLD = 10;

export interface WatchState { stale: boolean; finnhubDown: boolean; manyOld: boolean; authError: boolean }
const OK: WatchState = { stale: false, finnhubDown: false, manyOld: false, authError: false };

export function inWatchWindow(minutes: number, session: Session): boolean {
  if (session.open === null || session.close === null) return false;
  return minutes >= session.open + WATCH_FROM_OPEN_MIN && minutes <= session.close + WATCH_AFTER_CLOSE_MIN;
}

export function evaluate(blob: PriceBlob | null, now: Date, today: string): WatchState {
  if (!blob) return { ...OK, stale: true };
  const age = now.getTime() - Date.parse(blob.asOf);
  const sameDay = blob.session?.date === today;
  // The closing snapshot is done, or its window has passed after at least one run.
  const close = blob.session?.close;
  const closeWindowOver = typeof close === 'number' && etNow(now).minutes > close + AFTER_CLOSE_MIN;
  const closedForToday = sameDay && (blob.final || (blob.market === 'after-close' && closeWindowOver));
  return {
    stale: !closedForToday && !(age <= STALE_AFTER_MS),
    finnhubDown: (blob.finnhubFails ?? 0) >= FINNHUB_DOWN_RUNS,
    // Only while the market is open: at the close every confirmation ages out.
    manyOld: blob.market === 'open' && countOld(blob, now) > MANY_OLD,
    authError: !!blob.authError,
  };
}

/** Messages for every condition that changed since the last check. */
export function transitions(prev: WatchState, next: WatchState, blob: PriceBlob | null, now: Date): string[] {
  const out: string[] = [];
  const ageMin = blob ? Math.round((now.getTime() - Date.parse(blob.asOf)) / 60_000) : null;
  if (next.stale !== prev.stale) {
    out.push(next.stale
      ? (blob ? `Prices are stale: last update ${formatEt(blob.asOf)} (${ageMin} min ago).` : 'No prices stored yet.')
      : 'Prices are updating again.');
  }
  if (next.finnhubDown !== prev.finnhubDown) {
    out.push(next.finnhubDown
      ? `Finnhub returned no prices for ${blob?.finnhubFails ?? '?'} runs in a row.`
      : 'Finnhub is answering again.');
  }
  if (next.manyOld !== prev.manyOld) {
    out.push(next.manyOld
      ? `More than ${MANY_OLD} tickers have no price confirmed in the last 5 minutes; trades in them are blocked.`
      : 'Almost all tickers are confirmed within 5 minutes again.');
  }
  if (next.authError !== prev.authError) {
    out.push(next.authError && blob?.authError
      ? `${blob.authError.source} refused the API key (HTTP ${blob.authError.status}). Check the key.`
      : 'API keys are accepted again.');
  }
  return out;
}

/** ntfy.sh (plain text) or a Discord webhook (JSON). Failures are logged, never thrown. */
export async function sendAlert(url: string | undefined, lines: string[], fetchFn: typeof fetch): Promise<boolean> {
  const text = `Price robot: ${lines.join(' ')}`;
  if (!url) {
    console.warn(text);
    return false;
  }
  try {
    const discord = /discord(app)?\.com\/api\/webhooks\//.test(url);
    const res = await fetchFn(url, discord
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }), signal: AbortSignal.timeout(5000) }
      : { method: 'POST', headers: { Title: 'Price robot', 'Content-Type': 'text/plain' }, body: text, signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch (e) {
    console.error('alert failed', e);
    return false;
  }
}

export interface WatchdogSummary { checked: boolean; refreshed: boolean; state: WatchState; alerts: string[] }

export async function watchdog(env: Env, deps: Deps): Promise<WatchdogSummary> {
  const now = deps.now();
  const et = etNow(now);
  // Nights and weekends: skip before reading anything. (The cron fires every
  // 5 minutes around the clock; holidays and early closes are within regular
  // weekday hours and are handled by the calendar below.)
  if (env.DEV_FORCE_OPEN !== '1' && !inWatchWindow(et.minutes, defaultSession(et))) {
    return { checked: false, refreshed: false, state: OK, alerts: [] };
  }
  let blob = await readBlob(env.PRICES);
  const { session } = await getSession(et, blob, env, deps.fetch);
  if (!inWatchWindow(et.minutes, session)) return { checked: false, refreshed: false, state: OK, alerts: [] };

  let state = evaluate(blob, now, et.date);
  let refreshed = false;
  if (state.stale) {
    await refresh(env, deps, { budget: CATCHUP_PER_RUN });
    refreshed = true;
    blob = await readBlob(env.PRICES);
    state = evaluate(blob, deps.now(), et.date);
  }

  const prev = (await env.PRICES.get<WatchState>(WATCHDOG_KEY, { type: 'json' }).catch(() => null)) ?? OK;
  const alerts = transitions(prev, state, blob, deps.now());
  if (alerts.length > 0) {
    await writeJson(env.PRICES, WATCHDOG_KEY, state);
    await sendAlert(env.ALERT_URL, alerts, deps.fetch);
  }
  return { checked: true, refreshed, state, alerts };
}
