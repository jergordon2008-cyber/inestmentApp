/**
 * Price robot client.
 *
 * Prices come from our Cloudflare Worker (workers/price-robot), which
 * refreshes prices from Finnhub every minute during market hours: the
 * tickers students hold or opened recently every minute, every other ticker
 * at least every 3 minutes. The app holds no API keys: it reads one public
 * URL, EXPO_PUBLIC_PRICE_API_URL, and tells the robot which tickers this
 * student holds (?held=) so they are refreshed first.
 *
 * Never blank, never stuck: screens render at once from stockDataService
 * (live → saved → January snapshot), and every fetch here gives up after
 * 5 seconds. The last good answer is kept on the device, so a cold start
 * without network shows the last real prices, labelled as saved.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyLiveQuotes, type LiveQuoteInput } from './stockDataService';

export const PRICE_API_URL = (process.env.EXPO_PUBLIC_PRICE_API_URL ?? '').replace(/\/+$/, '');
export const LIVE_DATA_ENABLED = !!PRICE_API_URL;

/**
 * The robot writes new prices every minute. Polling every minute keeps a
 * price's age (robot confirmation + time on this device) under the 5-minute
 * trade rule between polls.
 */
export const POLL_MS = 60 * 1000;
export const FETCH_TIMEOUT_MS = 5000;
const STORAGE_KEY = 'priceRobot:v1';

/** Failures are logged, never thrown: the prices already on screen stay. */
function logFailure(where: string, e: unknown): void {
  console.warn(`[price robot] ${where} failed:`, e);
}

/** Shown next to prices: credits the source. */
export const PRICE_CREDIT = 'Prices from Finnhub';

type RobotQuote = LiveQuoteInput;

export interface RobotPrices {
  v: 1;
  asOf: string;
  market: 'open' | 'closed' | 'after-close';
  quotes: Record<string, RobotQuote>;
}

/** Tickers this student holds; sent with each poll so the robot refreshes them first. */
let heldSymbols: () => readonly string[] = () => [];
const MAX_HELD = 40;

export function setHeldSymbolsProvider(provider: () => readonly string[]): void {
  heldSymbols = provider;
}

function pricesPath(): string {
  let held: string[] = [];
  try {
    held = [...new Set(heldSymbols().map(s => s.toUpperCase()).filter(s => /^[A-Z.]{1,10}$/.test(s)))].sort().slice(0, MAX_HELD);
  } catch (e) {
    logFailure('held', e);
  }
  return held.length ? `/v1/prices?held=${held.join(',')}` : '/v1/prices';
}

/**
 * When the robot last confirmed each price with Finnhub, on this device's
 * clock. During the session that's the robot's own confirmation (`at`),
 * measured against the robot's run time (`asOf`) so a wrong device clock
 * doesn't matter; the 5-minute trade rule (CONFIRMED_FOR_MS) then counts
 * from it. Outside the session closing prices don't change, so they count
 * from this fetch.
 */
function confirmedAtFor(asOf: string, market: RobotPrices['market'], now: number): (q: LiveQuoteInput) => number {
  const asOfMs = Date.parse(asOf);
  return q => {
    if (market !== 'open') return now;
    const at = Date.parse(q.at ?? '');
    if (!Number.isFinite(at) || !Number.isFinite(asOfMs)) return 0;
    return now - Math.max(0, asOfMs - at);
  };
}

export type PriceStatus =
  | { kind: 'simulated' }                 // no robot URL configured (local dev)
  | { kind: 'snapshot' }                  // nothing from the robot yet
  | { kind: 'live' | 'saved'; asOf: string; market: RobotPrices['market']; latestTrade: string };

let status: PriceStatus = LIVE_DATA_ENABLED ? { kind: 'snapshot' } : { kind: 'simulated' };
const listeners = new Set<() => void>();
let lastLiveFetchAt = 0;
let inflight: Promise<boolean> | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export function getPriceStatus(): PriceStatus {
  return status;
}

export function subscribePriceStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function setStatus(next: PriceStatus): void {
  status = next;
  listeners.forEach(l => l());
}

function isQuote(q: unknown): q is RobotQuote {
  const x = q as RobotQuote;
  return !!x && typeof x === 'object' && typeof x.p === 'number' && x.p > 0
    && typeof x.t === 'string' && Number.isFinite(Date.parse(x.t))
    && (x.src === 'alpaca' || x.src === 'finnhub');
}

export function isRobotPrices(body: unknown): body is RobotPrices {
  const b = body as RobotPrices;
  return !!b && typeof b === 'object' && b.v === 1 && typeof b.asOf === 'string'
    && Number.isFinite(Date.parse(b.asOf)) && !!b.quotes && typeof b.quotes === 'object';
}

function latestTradeOf(quotes: Record<string, RobotQuote>): string {
  let latest = '';
  for (const q of Object.values(quotes)) if (q.t > latest) latest = q.t;
  return latest;
}

function cleanQuotes(quotes: Record<string, unknown>): Record<string, RobotQuote> {
  const out: Record<string, RobotQuote> = {};
  for (const [sym, q] of Object.entries(quotes)) if (isQuote(q)) out[sym] = q;
  return out;
}

async function fetchJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${PRICE_API_URL}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`price robot ${path}: HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches every price from the robot. Concurrent callers share one request. */
export function refreshPrices(): Promise<boolean> {
  if (!LIVE_DATA_ENABLED) return Promise.resolve(false);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const body = await fetchJson(pricesPath());
      if (!isRobotPrices(body)) throw new Error('price robot: unexpected /v1/prices payload');
      const quotes = cleanQuotes(body.quotes);
      const now = Date.now();
      applyLiveQuotes(quotes, 'live', confirmedAtFor(body.asOf, body.market, now));
      lastLiveFetchAt = now;
      setStatus({ kind: 'live', asOf: body.asOf, market: body.market, latestTrade: latestTradeOf(quotes) });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...body, quotes }))
        .catch(e => logFailure('save', e));
      return true;
    } catch (e) {
      logFailure('refresh', e);
      // Prices already on screen stay. Once they're too old to count as
      // confirmed, the label says so.
      if (status.kind === 'live' && Date.now() - lastLiveFetchAt > POLL_MS * 2) {
        setStatus({ ...status, kind: 'saved' });
      }
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Refreshes only if the last successful fetch is older than `maxAgeMs`. */
export async function ensureFresh(maxAgeMs: number = POLL_MS): Promise<void> {
  if (!LIVE_DATA_ENABLED) return;
  if (Date.now() - lastLiveFetchAt <= maxAgeMs) return;
  await refreshPrices();
}

/**
 * One ticker, straight from the robot's store. Asking also tells the robot a
 * student opened this stock, so its next run (within a minute) refreshes it
 * first. Returns whether the robot answered with a price.
 */
export async function refreshQuote(symbol: string): Promise<boolean> {
  if (!LIVE_DATA_ENABLED) return false;
  try {
    const body = await fetchJson(`/v1/quote/${encodeURIComponent(symbol.toUpperCase())}`) as { quote?: unknown; asOf?: unknown; market?: unknown };
    if (!isQuote(body?.quote)) throw new Error('price robot: unexpected /v1/quote payload');
    const asOf = typeof body.asOf === 'string' ? body.asOf : '';
    const market = body.market === 'open' || body.market === 'closed' || body.market === 'after-close' ? body.market : 'open';
    applyLiveQuotes({ [symbol]: body.quote }, 'live', confirmedAtFor(asOf, market, Date.now()));
    return true;
  } catch (e) {
    logFailure('quote', e);
    return false;
  }
}

/** Prices saved on this device by an earlier session; display only. */
export async function loadSavedPrices(): Promise<boolean> {
  if (!LIVE_DATA_ENABLED) return false;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const body: unknown = JSON.parse(raw);
    if (!isRobotPrices(body)) return false;
    const quotes = cleanQuotes(body.quotes);
    applyLiveQuotes(quotes, 'saved', 0);
    if (status.kind === 'snapshot') {
      setStatus({ kind: 'saved', asOf: body.asOf, market: body.market, latestTrade: latestTradeOf(quotes) });
    }
    return true;
  } catch (e) {
    logFailure('load', e);
    return false;
  }
}

/** Boot: saved prices first (instant), then the robot, then every minute. */
export async function startPriceRobot(): Promise<void> {
  if (!LIVE_DATA_ENABLED || timer) return;
  // The timer is set before any await, so a second call (React runs effects
  // twice in development) can't start a second poller.
  timer = setInterval(() => { refreshPrices(); }, POLL_MS);
  await loadSavedPrices();
  await refreshPrices();
}

export function stopPriceRobot(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Test helper. */
export function resetPriceRobotForTests(): void {
  stopPriceRobot();
  status = LIVE_DATA_ENABLED ? { kind: 'snapshot' } : { kind: 'simulated' };
  lastLiveFetchAt = 0;
  inflight = null;
  listeners.clear();
}

// ── Labels ─────────────────────────────────────────────────────────────────

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * The line shown with price lists: "Prices as of 3:58 PM", "Closing prices
 * · Oct 2", "Saved prices from Oct 2, 3:58 PM", or the snapshot notice.
 */
export function getPricesLabel(s: PriceStatus = status): string {
  switch (s.kind) {
    case 'simulated': return 'Simulated prices';
    case 'snapshot': return 'Not live · Jan 15 snapshot';
    case 'saved': return `Saved prices from ${day(s.latestTrade || s.asOf)}, ${time(s.latestTrade || s.asOf)}`;
    case 'live':
      return s.market === 'open'
        ? `Prices as of ${time(s.asOf)}`
        : `Closing prices · ${day(s.latestTrade || s.asOf)}`;
  }
}

/** Per-stock version for the stock page: the stock's own trade time and source. */
export function getStockPriceLabel(
  stock: { lastUpdated: string; priceSource?: 'alpaca' | 'finnhub'; priceOrigin?: 'live' | 'saved' } | null | undefined,
  s: PriceStatus = status,
): string {
  if (s.kind === 'simulated') return 'Simulated prices';
  if (!stock?.priceOrigin) return 'Not live · Jan 15 snapshot';
  // 'alpaca' only on prices saved on a device before the switch to Finnhub.
  const source = stock.priceSource === 'alpaca' ? 'Alpaca' : 'Finnhub';
  if (stock.priceOrigin === 'saved') return `Saved price from ${day(stock.lastUpdated)}, ${time(stock.lastUpdated)} · ${source}`;
  if (s.kind === 'live' && s.market !== 'open') return `Closing price · ${day(stock.lastUpdated)} · ${source}`;
  const today = new Date().toDateString() === new Date(stock.lastUpdated).toDateString();
  return today
    ? `Price as of ${time(stock.lastUpdated)} · ${source}`
    : `Last trade ${day(stock.lastUpdated)}, ${time(stock.lastUpdated)} · ${source}`;
}
