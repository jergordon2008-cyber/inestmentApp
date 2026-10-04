/**
 * Price robot client.
 *
 * Prices come from our Cloudflare Worker (workers/price-robot), which
 * refreshes every ticker from Alpaca every 2 minutes during market hours and
 * cross-checks against Finnhub. The app holds no API keys: it reads one
 * public URL, EXPO_PUBLIC_PRICE_API_URL.
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

/** The robot refreshes every 2 minutes; polling faster only re-reads the same prices. */
export const POLL_MS = 2 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 5000;
const STORAGE_KEY = 'priceRobot:v1';

/** Failures are logged, never thrown: the prices already on screen stay. */
function logFailure(where: string, e: unknown): void {
  console.warn(`[price robot] ${where} failed:`, e);
}

/** Shown next to prices; both providers' display approvals ask for credit. */
export const PRICE_CREDIT = 'Prices from Alpaca/Finnhub';

interface RobotQuote extends LiveQuoteInput { stale?: boolean }

export interface RobotPrices {
  v: 1;
  asOf: string;
  market: 'open' | 'closed' | 'after-close';
  final: boolean;
  session: { date: string } | null;
  alpacaOk: boolean;
  quotes: Record<string, RobotQuote>;
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
      const body = await fetchJson('/v1/prices');
      if (!isRobotPrices(body)) throw new Error('price robot: unexpected /v1/prices payload');
      const quotes = cleanQuotes(body.quotes);
      const now = Date.now();
      applyLiveQuotes(quotes, 'live', now);
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
 * One ticker, straight from the robot. The robot refetches it from Alpaca if
 * its stored price is more than 4 minutes old, so a stock a student opens
 * jumps the queue. Returns whether the robot answered with a price.
 */
export async function refreshQuote(symbol: string): Promise<boolean> {
  if (!LIVE_DATA_ENABLED) return false;
  try {
    const body = await fetchJson(`/v1/quote/${encodeURIComponent(symbol.toUpperCase())}`) as { quote?: unknown };
    if (!isQuote(body?.quote)) throw new Error('price robot: unexpected /v1/quote payload');
    applyLiveQuotes({ [symbol]: body.quote }, 'live', Date.now());
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

/** Boot: saved prices first (instant), then the robot, then every 2 minutes. */
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
  const source = stock.priceSource === 'finnhub' ? 'Finnhub' : 'Alpaca';
  if (stock.priceOrigin === 'saved') return `Saved price from ${day(stock.lastUpdated)}, ${time(stock.lastUpdated)} · ${source}`;
  if (s.kind === 'live' && s.market !== 'open') return `Closing price · ${day(stock.lastUpdated)} · ${source}`;
  const today = new Date().toDateString() === new Date(stock.lastUpdated).toDateString();
  return today
    ? `Price as of ${time(stock.lastUpdated)} · ${source}`
    : `Last trade ${day(stock.lastUpdated)}, ${time(stock.lastUpdated)} · ${source}`;
}
