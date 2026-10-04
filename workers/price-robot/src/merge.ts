/**
 * The per-ticker rules: which price to show, and which tickers Finnhub
 * should check next. Pure functions; refresh.ts does the I/O.
 */
import { SYMBOLS, TIER1 } from './symbols';
import type { AlpacaResult } from './alpaca';
import type { Phase, Session } from './calendar';
import type { PriceBlob, Quote, Source, SourceQuote } from './types';

/** An Alpaca trade older than this is stale ("no recent IEX trade"). */
export const FRESH_MS = 15 * 60_000;
/** Alpaca and Finnhub further apart than this (percent) → show Finnhub's price. */
export const DIVERGENCE_PCT = 1.0;
const MAX_RETRY = 30;

const TIER1_SET = new Set(TIER1);

/**
 * Up to `n` tickers for Finnhub this run: last run's flagged tickers first,
 * then the ones Finnhub checked longest ago (never-checked first), Tier 1
 * before the rest on ties. That one ordering is both the normal rotation
 * (every ticker is checked about every 15 minutes) and the outage plan
 * (when Alpaca is down, Tier 1 gets Finnhub prices first).
 */
export function planFinnhub(prev: PriceBlob | null, n: number, symbols: readonly string[] = SYMBOLS): string[] {
  const order = (list: readonly string[]) => list
    .map((s, i) => ({ s, i, at: prev?.quotes[s]?.chkAt ?? '', tier: TIER1_SET.has(s) ? 0 : 1 }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.tier - b.tier || a.i - b.i))
    .map(r => r.s);
  const known = new Set(symbols);
  // Flagged tickers are also served least-recently-checked first, so a few
  // that stay flagged can't take every slot run after run.
  const flagged = order([...new Set(prev?.retry ?? [])].filter(s => known.has(s)));
  const plan = flagged.slice(0, n);
  for (const s of order(symbols.filter(s => !plan.includes(s)))) {
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
  alpaca: AlpacaResult;
  finnhub: { quotes: Record<string, SourceQuote>; tried: string[]; authStatus: number | null };
  symbols?: readonly string[];
}

function withSrc(q: SourceQuote, src: Source): Quote {
  const out: Quote = { p: q.p, pc: q.pc, t: q.t, src };
  if (q.hi !== undefined) out.hi = q.hi;
  if (q.lo !== undefined) out.lo = q.lo;
  return out;
}

function pctDiff(a: number, b: number): number {
  return Math.round((Math.abs(a - b) / b) * 100 * 1000) / 1000;
}

export function mergeRun(input: MergeInput): PriceBlob {
  const { prev, now, alpaca, finnhub } = input;
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const symbols = input.symbols ?? SYMBOLS;
  const tried = new Set(finnhub.tried);
  const quotes: Record<string, Quote> = {};
  const retry: string[] = [];

  for (const sym of symbols) {
    const prevQ = prev?.quotes[sym];
    const a = alpaca.ok ? alpaca.quotes[sym] : undefined;
    const f = finnhub.quotes[sym];
    const aFresh = !!a && nowMs - Date.parse(a.t) <= FRESH_MS;
    let q: Quote | undefined;

    if (a && aFresh) {
      if (f) {
        const diff = pctDiff(a.p, f.p);
        if (diff > DIVERGENCE_PCT) {
          q = withSrc(f, 'finnhub');
          retry.push(sym); // look again next run
        } else {
          q = withSrc(a, 'alpaca');
        }
        q.chk = diff;
      } else {
        q = withSrc(a, 'alpaca');
        if (prevQ?.chk !== undefined) q.chk = prevQ.chk;
      }
    } else if (f) {
      q = withSrc(f, 'finnhub');
      if (a) q.chk = pctDiff(a.p, f.p);
    } else {
      // Nothing new this run: keep the newest price we have. If even that is
      // older than 15 minutes, mark it stale and ask Finnhub for it first
      // next run. (A Finnhub price from a recent run is still fresh.)
      const candidates: Quote[] = [];
      if (a) candidates.push(withSrc(a, 'alpaca'));
      if (prevQ) candidates.push({ ...prevQ });
      candidates.sort((x, y) => Date.parse(y.t) - Date.parse(x.t));
      q = candidates[0];
      if (!q || nowMs - Date.parse(q.t) > FRESH_MS) {
        if (q) q.stale = true;
        retry.push(sym);
      }
    }

    if (!q) continue;
    if (!q.stale) delete q.stale;
    const chkAt = tried.has(sym) ? nowIso : prevQ?.chkAt;
    if (chkAt) q.chkAt = chkAt;
    else delete q.chkAt;
    quotes[sym] = q;
  }

  let authError: PriceBlob['authError'] = null;
  if (!alpaca.ok && (alpaca.status === 401 || alpaca.status === 403)) {
    authError = { source: 'alpaca', status: alpaca.status, at: nowIso };
  } else if (finnhub.authStatus) {
    authError = { source: 'finnhub', status: finnhub.authStatus, at: nowIso };
  }

  return {
    v: 1,
    asOf: nowIso,
    session: input.session,
    market: input.phase,
    final: input.phase === 'after-close',
    alpacaOk: alpaca.ok,
    alpacaFails: alpaca.ok ? 0 : (prev?.alpacaFails ?? 0) + 1,
    authError,
    retry: retry.slice(0, MAX_RETRY),
    quotes,
  };
}
