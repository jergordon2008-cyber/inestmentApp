/**
 * Finnhub API Adapter
 * 
 * Connects to Finnhub's free stock market API for real price data.
 * 
 * To enable:
 * 1. Sign up at https://finnhub.io (free tier: 60 req/min, real-time for US stocks)
 * 2. Copy your API key
 * 3. Add to your .env file: EXPO_PUBLIC_FINNHUB_KEY=your_key_here
 * 4. The app automatically detects the key and uses real data
 * 
 * Without a key, the app uses mock data from stockDataService.ts —
 * the same realistic prices and simulated intraday movement.
 * 
 * Finnhub free tier gives us:
 * - Real-time US stock quotes
 * - Company profiles (sector, industry, market cap)
 * - Basic financials (P/E, EPS, beta, dividend yield)
 * - Company news
 * - Earnings calendar
 * 
 * For production we'll likely add Polygon.io for:
 * - Minute-level historical data
 * - Options data (Tier 3 users)
 * - More robust rate limits
 */

import { Stock } from '../types';
import { getAllTier1Stocks, getStock as getMockStock, getSharesOutstanding } from './stockDataService';

const FINNHUB_KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY ?? '';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
export const LIVE_DATA_ENABLED = !!FINNHUB_KEY;

// Cache: symbol → { data, fetchedAt }
// Per-device only — NOT shared across users. Finnhub's free tier is licensed
// for personal use and its terms prohibit redistributing/sharing access to
// its data with other parties, so a shared server-side cache would violate
// that license. 15 minutes keeps each student's own request volume low
// without needing a shared cache.
const cache = new Map<string, { data: Stock; fetchedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Token bucket in front of every Finnhub call.
 *
 * What this replaces: getLiveStocks() fired batches of 10 symbols — 20
 * simultaneous requests — every 200ms. That is roughly 100 requests/second,
 * against a documented 30 calls/second ceiling that applies to *every* plan
 * including paid, and a 60/minute quota on the free tier. A single device
 * opening the app blew both, which is why 429s were routine and why prices
 * silently fell back to the January snapshot.
 *
 * CAPACITY is the burst allowance: the first CAPACITY requests go straight
 * out, so a screen that needs a handful of symbols is still instant. After
 * that the bucket drains to REFILL_PER_MIN, deliberately under the 60/min
 * free-tier limit to leave room for the earnings and news calls.
 *
 * The jitter matters at cohort scale. Without it, 80 devices that opened the
 * app at the same time (a class starting) would also retry in lockstep and
 * rebuild the same spike they were throttled for.
 *
 * Note this is per device. It fixes the burst shape and keeps one student
 * inside the quota; it does NOT make 80 students on one shared key fit, since
 * the quota is per key. That needs a shared server-side layer, which has its
 * own licensing question — see the rate-limit options memo.
 */
// Sized so the WORST rolling minute stays under the 60/min free-tier quota.
// A token bucket's worst minute is capacity + refill (the full burst, then a
// minute of refill), so these must sum below 60 — not just the refill rate.
// 10 + 45 = 55 leaves ~5/min of headroom for earnings and news calls.
// Measured: 20 + 50 put the first minute at ~70 requests, over the limit.
const BUCKET_CAPACITY = 10;
const REFILL_PER_MIN = 45;
const REFILL_INTERVAL_MS = 60_000 / REFILL_PER_MIN; // ~1333ms per token
const JITTER_RATIO = 0.4;

let _tokens = BUCKET_CAPACITY;
let _lastRefill = Date.now();

function refillTokens(): void {
  const gained = (Date.now() - _lastRefill) / REFILL_INTERVAL_MS;
  if (gained < 1) return;
  const whole = Math.floor(gained);
  _tokens = Math.min(BUCKET_CAPACITY, _tokens + whole);
  // Advance by exactly what was consumed so partial progress isn't discarded.
  _lastRefill += whole * REFILL_INTERVAL_MS;
}

/**
 * Waiters are queued and served FIFO by a single timer, rather than each
 * polling on its own backoff.
 *
 * The polling version measured 24 requests/minute against a 45/min budget —
 * 44 symbols took 413 seconds. Every waiter that lost a race slept another
 * full interval, so it slept straight through the moment the next token
 * appeared and that token sat unclaimed until somebody happened to wake. One
 * timer, armed for exactly when the next token is due, wastes nothing.
 *
 * The jitter is still there and still matters: it decorrelates *devices*, so
 * 80 students opening the app at the same time don't refill in lockstep. It
 * costs no throughput, because refillTokens() advances _lastRefill only by
 * the tokens it actually granted, so any lateness is credited back on the
 * next pass.
 */
const _waiters: Array<() => void> = [];
let _pumpScheduled = false;

function pump(): void {
  _pumpScheduled = false;
  refillTokens();
  while (_tokens >= 1 && _waiters.length > 0) {
    _tokens -= 1;
    _waiters.shift()!();
  }
  if (_waiters.length > 0) schedulePump();
}

function schedulePump(): void {
  if (_pumpScheduled) return;
  _pumpScheduled = true;
  const sinceRefill = Date.now() - _lastRefill;
  const msUntilNext = Math.max(0, REFILL_INTERVAL_MS - sinceRefill);
  const jitter = Math.random() * REFILL_INTERVAL_MS * JITTER_RATIO;
  setTimeout(pump, msUntilNext + jitter);
}

function acquireToken(): Promise<void> {
  refillTokens();
  // The queue check keeps this FIFO — a late arrival can't jump ahead of
  // callers already waiting just because a token happens to be free.
  if (_tokens >= 1 && _waiters.length === 0) {
    _tokens -= 1;
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    _waiters.push(resolve);
    schedulePump();
  });
}

/** fetch(), gated on the bucket. Cache hits must not call this. */
async function rateLimitedFetch(url: string): Promise<Response> {
  await acquireToken();
  return fetch(url);
}

// ============================================================================
// PUBLIC API — mirrors stockDataService interface
// ============================================================================

/**
 * Get a single stock. Returns live data if API key available, mock otherwise.
 * Always returns data — never throws.
 */
export async function getLiveStock(symbol: string): Promise<Stock | null> {
  if (!LIVE_DATA_ENABLED) {
    return getMockStock(symbol);
  }
  
  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    // One request per symbol. /stock/profile2 used to be fetched alongside
    // this, doubling every fan-out, but everything it supplied already had a
    // static fallback (name, exchange, sector, industry) except market cap —
    // and market cap is shares × price, so holding the share count locally
    // (getSharesOutstanding) makes the quote sufficient. It also returned {}
    // for every ETF, so half its answers were empty anyway.
    const quoteRes = await rateLimitedFetch(
      `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_KEY}`
    );

    if (!quoteRes.ok) {
      throw new Error(`quote request failed: HTTP ${quoteRes.status}`);
    }

    const quote = await quoteRes.json() as FinnhubQuote;

    if (!quote.c) {
      // No real quote in the response — show the last real quote we have
      // (with its real timestamp) rather than substituting a static price.
      if (cached) return cached.data;
      return getMockStock(symbol);
    }

    const stock = mapFinnhubToStock(symbol, quote);
    cache.set(symbol, { data: stock, fetchedAt: Date.now() });
    return stock;

  } catch (error) {
    console.warn(`[finnhub] Failed to fetch ${symbol}:`, error);
    // Rate-limited or network failure: prefer the last real cached quote
    // (real price, real timestamp) over a fabricated/static substitute.
    // Only fall back to the static mock if we've never fetched this symbol.
    if (cached) return cached.data;
    return getMockStock(symbol);
  }
}

/**
 * Get multiple stocks.
 *
 * No manual batching any more. This used to fire groups of 10 symbols — 20
 * simultaneous requests with profile2 — every 200ms, about 100 requests per
 * second against a 30/sec ceiling. Pacing now lives in the token bucket, one
 * layer down, so every caller gets it rather than only this one.
 *
 * Requesting all symbols at once is intentional and cheap: the pending
 * promises are almost all parked in acquireToken(), not holding open sockets,
 * and cached symbols resolve immediately without spending a token at all.
 */
export async function getLiveStocks(symbols: string[]): Promise<Stock[]> {
  if (!LIVE_DATA_ENABLED) {
    return getAllTier1Stocks();
  }

  const results = await Promise.all(symbols.map(symbol => getLiveStock(symbol)));
  return results.filter((s): s is Stock => s !== null);
}

/**
 * Get company news from Finnhub.
 * Returns up to 20 news items from the past 7 days.
 */
export async function getCompanyNews(symbol: string): Promise<FinnhubNewsItem[]> {
  if (!LIVE_DATA_ENABLED) return [];
  
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  try {
    const res = await rateLimitedFetch(
      `${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${FINNHUB_KEY}`
    );
    // Same failure shape as earnings: a 429 body parses cleanly as JSON, so
    // status is the only reliable signal that this isn't a news list.
    if (!res.ok) return [];
    const items: unknown = await res.json();
    if (!Array.isArray(items)) return [];
    return (items as FinnhubNewsItem[]).slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * Get company earnings surprises (last 4 quarters).
 * Used to generate "earnings beat" signals.
 */
/**
 * Reported EPS vs. estimate for the last 4 quarters.
 *
 * Two things this now gets right:
 *
 * 1. It checks res.ok and validates the shape. Finnhub answers a rate limit
 *    with HTTP 429 and a JSON *object* body; `return await res.json()` parsed
 *    that happily and handed it back typed as EarningsSurprise[]. Nothing in
 *    the signature said otherwise, so the only thing standing between a 429
 *    and a fabricated earnings signal was the caller remembering to run
 *    Array.isArray — the adapter making its own failure the caller's problem.
 *    An error is now [] here, at the boundary that knows it's an error.
 *
 * 2. It caches per symbol, with a much longer TTL than quotes. Companies
 *    report quarterly, so a result is good for hours; re-fetching on every
 *    stock-detail open spent the shared 60/min budget re-reading a number
 *    that cannot have changed.
 */
const EARNINGS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — quarterly data
const earningsCache = new Map<string, { data: EarningsSurprise[]; fetchedAt: number }>();

function isEarningsSurprise(v: unknown): v is EarningsSurprise {
  const q = v as EarningsSurprise;
  return !!q && typeof q === 'object'
    && typeof q.actual === 'number'
    && typeof q.estimate === 'number'
    && typeof q.surprisePercent === 'number'
    && typeof q.period === 'string';
}

export async function getEarningsSurprises(symbol: string): Promise<EarningsSurprise[]> {
  if (!LIVE_DATA_ENABLED) return [];

  const key = symbol.toUpperCase();
  const cached = earningsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < EARNINGS_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await rateLimitedFetch(
      `${FINNHUB_BASE}/stock/earnings?symbol=${symbol}&limit=4&token=${FINNHUB_KEY}`
    );
    // 429 (rate limited), 401, 403 and friends all carry a JSON body that
    // parses cleanly. Status is the only reliable signal that it isn't data.
    if (!res.ok) return cached?.data ?? [];

    const body: unknown = await res.json();
    if (!Array.isArray(body)) return cached?.data ?? [];

    const quarters = body.filter(isEarningsSurprise);
    // A non-empty array that survives none of the shape checks is a payload
    // we don't understand — don't cache it as if it were an empty result.
    if (body.length > 0 && quarters.length === 0) return cached?.data ?? [];

    earningsCache.set(key, { data: quarters, fetchedAt: Date.now() });
    return quarters;
  } catch {
    return cached?.data ?? [];
  }
}

// ============================================================================
// TYPE MAPPING
// ============================================================================

interface FinnhubQuote {
  c: number;    // Current price
  d: number;    // Change
  dp: number;   // Change percent
  h: number;    // High
  l: number;    // Low
  o: number;    // Open
  pc: number;   // Previous close
  t: number;    // Timestamp
}

// FinnhubProfile was removed along with the /stock/profile2 call. If that
// endpoint is ever reinstated (e.g. for a real fundamentals refresh), note
// that it returns {} for ETFs, so every field needs a fallback.

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface EarningsSurprise {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

function mapFinnhubToStock(
  symbol: string,
  quote: FinnhubQuote
): Stock {
  // Descriptive metadata (name/exchange/sector/industry) now comes from the
  // static table outright, rather than from /stock/profile2 with this as a
  // fallback. That endpoint is no longer fetched — see getLiveStock.
  //
  // This also fixes a mapping bug: profile.finnhubIndustry was written into
  // BOTH sector and industry, so a live row's "sector" was actually Finnhub's
  // industry taxonomy. The static table uses GICS sector names, so the two
  // disagreed and the browse screen's sector chips could never match a live
  // row — "Consumer Discretionary" filtered to nothing. Every row is now
  // consistently GICS.
  //
  // Price fundamentals (peRatio, eps, dividendYield, beta, volume,
  // yearLow/High) stay undefined: the free /quote endpoint doesn't return
  // them, and backfilling from the static table would present frozen numbers
  // under a just-fetched timestamp. Screens render '—' when absent.
  const mock = getMockStock(symbol);

  return {
    symbol,
    name: mock?.name || symbol,
    exchange: (mock?.exchange || 'NASDAQ') as 'NYSE' | 'NASDAQ' | 'AMEX',
    sector: mock?.sector || 'Technology',
    industry: mock?.industry || '',

    // Real live data
    price: quote.c,
    change: quote.d,
    changePercent: quote.dp,
    previousClose: quote.pc,
    dayHigh: quote.h,
    dayLow: quote.l,
    lastUpdated: new Date(quote.t * 1000).toISOString(),

    // Market cap = shares outstanding × live price, instead of a second API
    // call. The share count comes from the static snapshot (see
    // getSharesOutstanding), so this tracks the live price rather than
    // sitting frozen at a January valuation. Funds carry 0 shares there, so
    // they keep returning 0 — the table's existing "not applicable"
    // convention, not an invented number.
    marketCap: getSharesOutstanding(symbol) * quote.c,

    // Not available from the free /quote endpoint — left undefined rather
    // than backfilled with static data. (52-week high/low isn't derivable
    // from a day-quote endpoint either.)
    volume: undefined,
    peRatio: undefined,
    eps: undefined,
    dividendYield: undefined,
    beta: undefined,
    yearLow: undefined,
    yearHigh: undefined,

    // No reported fundamentals were fetched, so there is no vintage to
    // claim. Left undefined rather than borrowing the snapshot's date, which
    // would date numbers this object doesn't carry. areFundamentalsStale()
    // treats undefined as stale, so nothing downstream states a fundamental
    // it can't attribute. marketCap is not covered by this: it's computed
    // from the live price above, not reported by Finnhub.
    fundamentalsAsOf: undefined,
  };
}
