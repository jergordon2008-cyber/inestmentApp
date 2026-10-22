/**
 * Finnhub (free plan): the only live price source, one /quote call per ticker.
 *
 * Budget: the free plan allows 60 calls a minute. The refresh runs once a
 * minute and makes at most FINNHUB_PER_RUN calls (calendar included), so it
 * stays at 45/min; the watchdog's rare catch-up adds at most CATCHUP_PER_RUN.
 * Nothing else in the Worker calls Finnhub: /v1/quote and /v1/prices only
 * read KV. That also keeps every run under the Free plan's 50 subrequests.
 *
 * Display: Finnhub has not approved showing its data to our students; both
 * founders accepted that risk (docs/PRICE-ROBOT-DESIGN.md §0).
 */
import type { SourceQuote } from './types';

export const FINNHUB_BASE = 'https://finnhub.io/api/v1';
/** Finnhub calls per refresh run (one run a minute): 45/min, under the 60/min limit. */
export const FINNHUB_PER_RUN = 45;
/** Of those, at most this many go to tickers students hold or opened recently. */
export const PRIORITY_SLOTS = 12;
/** Finnhub calls for the watchdog's catch-up run: 45 + 10 stays under 60/min. */
export const CATCHUP_PER_RUN = 10;
const CONCURRENCY = 5;

export type FinnhubResult = { ok: true; q: SourceQuote } | { ok: false; status: number };

interface FinnhubQuote { c?: number; pc?: number; h?: number; l?: number; t?: number }

export async function fetchFinnhubQuote(sym: string, key: string, fetchFn: typeof fetch): Promise<FinnhubResult> {
  try {
    const res = await fetchFn(`${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(sym)}`, {
      headers: { 'X-Finnhub-Token': key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const body = (await res.json()) as FinnhubQuote;
    // c = 0 is Finnhub's "no data for this symbol".
    if (typeof body.c !== 'number' || !(body.c > 0) || typeof body.t !== 'number' || !(body.t > 0)) {
      return { ok: false, status: 204 };
    }
    const q: SourceQuote = { p: body.c, pc: typeof body.pc === 'number' && body.pc > 0 ? body.pc : null, t: new Date(body.t * 1000).toISOString() };
    if (typeof body.h === 'number' && body.h > 0) q.hi = body.h;
    if (typeof body.l === 'number' && body.l > 0) q.lo = body.l;
    return { ok: true, q };
  } catch {
    return { ok: false, status: 0 };
  }
}

export interface FinnhubBatch {
  quotes: Record<string, SourceQuote>;
  tried: string[];
  calls: number;
  /** 401/403 if Finnhub refused the key during this batch. */
  authStatus: number | null;
}

/**
 * Fetches the planned tickers, a few at a time. Stops early on 429 (over the
 * limit) or 401/403 (key refused): the remaining tickers wait for the next run.
 */
export async function fetchFinnhubBatch(symbols: readonly string[], key: string, fetchFn: typeof fetch): Promise<FinnhubBatch> {
  const out: FinnhubBatch = { quotes: {}, tried: [], calls: 0, authStatus: null };
  let stop = false;
  for (let i = 0; i < symbols.length && !stop; i += CONCURRENCY) {
    const group = symbols.slice(i, i + CONCURRENCY);
    const results = await Promise.all(group.map(s => fetchFinnhubQuote(s, key, fetchFn)));
    group.forEach((sym, j) => {
      const r = results[j]!;
      out.calls++;
      out.tried.push(sym);
      if (r.ok) out.quotes[sym] = r.q;
      else if (r.status === 429) stop = true;
      else if (r.status === 401 || r.status === 403) { stop = true; out.authStatus = r.status; }
    });
  }
  return out;
}
