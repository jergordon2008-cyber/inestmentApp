/**
 * Which tickers to fetch this run, and how the answers are folded into the
 * stored prices. Pure functions; refresh.ts does the I/O.
 */
import type { Phase, Session } from './calendar';
import { PRIORITY_SLOTS } from './finnhub';
import { SYMBOLS, TIER1 } from './symbols';
import type { PriceBlob, Quote, SourceQuote } from './types';

/** A price confirmed longer ago than this is no longer "live" (the app's trade rule). */
export const CONFIRM_MS = 5 * 60_000;

const TIER1_SET = new Set(TIER1);

/**
 * Up to `n` tickers for this run:
 * 1. up to PRIORITY_SLOTS tickers students hold or opened recently, the
 *    least recently confirmed first;
 * 2. the rest of the budget goes to every other ticker, least recently
 *    confirmed first (never-confirmed first, Tier 1 before the rest on ties).
 *
 * With 45 calls a run and 12 priority slots, priority tickers are refreshed
 * every minute and every other ticker at least every 3 minutes, whatever
 * the priority list holds (docs/PRICE-ROBOT-DESIGN.md §3).
 */
export function planRun(
  prev: PriceBlob | null,
  priority: readonly string[],
  n: number,
  symbols: readonly string[] = SYMBOLS,
  slots: number = PRIORITY_SLOTS,
): string[] {
  const order = (list: readonly string[]) => list
    .map((s, i) => ({ s, i, at: prev?.quotes[s]?.at ?? '', tier: TIER1_SET.has(s) ? 0 : 1 }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.tier - b.tier || a.i - b.i))
    .map(r => r.s);
  const known = new Set(symbols);
  const plan = order([...new Set(priority)].filter(s => known.has(s))).slice(0, Math.max(0, Math.min(slots, n)));
  const chosen = new Set(plan);
  for (const s of order(symbols.filter(s => !chosen.has(s)))) {
    if (plan.length >= n) break;
    plan.push(s);
  }
  return plan;
}

export interface MergeInput {
  prev: PriceBlob | null;
  now: Date;
  session: Session | null;
  phase: Phase;
  finnhub: { quotes: Record<string, SourceQuote>; tried: string[]; authStatus: number | null };
  symbols?: readonly string[];
}

function fresh(q: SourceQuote, at: string): Quote {
  const out: Quote = { p: q.p, pc: q.pc, t: q.t, src: 'finnhub', at };
  if (q.hi !== undefined) out.hi = q.hi;
  if (q.lo !== undefined) out.lo = q.lo;
  return out;
}

/** A stored quote, trimmed to today's fields (older blobs carried a few more). */
function kept(q: Quote): Quote {
  const out: Quote = { p: q.p, pc: q.pc, t: q.t, src: q.src, at: q.at ?? '' };
  if (q.hi !== undefined) out.hi = q.hi;
  if (q.lo !== undefined) out.lo = q.lo;
  return out;
}

export function mergeRun(input: MergeInput): PriceBlob {
  const { prev, now, finnhub } = input;
  const nowIso = now.toISOString();
  const symbols = input.symbols ?? SYMBOLS;
  const quotes: Record<string, Quote> = {};

  for (const sym of symbols) {
    const f = finnhub.quotes[sym];
    const prevQ = prev?.quotes[sym];
    // A newer trade, or the same one re-confirmed, replaces the stored price;
    // an answer with an older trade time than we have is ignored.
    if (f && (!prevQ || Date.parse(f.t) >= Date.parse(prevQ.t))) quotes[sym] = fresh(f, nowIso);
    else if (f && prevQ) quotes[sym] = { ...kept(prevQ), at: nowIso };
    else if (prevQ) quotes[sym] = kept(prevQ);
  }

  const sameDay = prev?.session?.date === input.session?.date;
  let closeFrom: string | null = null;
  if (input.phase === 'after-close') closeFrom = sameDay && prev?.closeFrom ? prev.closeFrom : nowIso;
  const final = closeFrom !== null && symbols.every(s => (quotes[s]?.at ?? '') >= closeFrom!);

  const got = Object.keys(finnhub.quotes).length;
  const finnhubOk = got > 0 || finnhub.tried.length === 0;
  return {
    v: 1,
    asOf: nowIso,
    session: input.session,
    market: input.phase,
    final,
    closeFrom,
    finnhubOk,
    finnhubFails: finnhubOk ? 0 : (prev?.finnhubFails ?? 0) + 1,
    authError: finnhub.authStatus ? { source: 'finnhub', status: finnhub.authStatus, at: nowIso } : null,
    quotes,
  };
}

/** Tickers whose last confirmation is older than CONFIRM_MS (or that have none). */
export function countOld(blob: PriceBlob | null, now: Date, symbols: readonly string[] = SYMBOLS): number {
  let old = 0;
  for (const s of symbols) {
    const at = Date.parse(blob?.quotes[s]?.at ?? '');
    if (!(now.getTime() - at <= CONFIRM_MS)) old++;
  }
  return old;
}
