/**
 * Stock Data Service
 * 
 * The app's stock list (110 tickers) with a static January snapshot, plus
 * the live prices the price robot delivers (see priceRobotAdapter.ts).
 * Screens read prices from here: getStock() returns the latest live or saved
 * price when there is one, and the snapshot otherwise.
 */

import { Stock } from '../types';

// Fixed snapshot date for this static dataset — NOT Date.now(). These prices
// are a hand-authored snapshot, not a live feed; stamping them with the
// current time on every read would falsely claim they were just fetched.
// getStock() below overrides this with the real trade time whenever the
// price robot has delivered a price for the symbol (see applyLiveQuotes).
export const STATIC_SNAPSHOT_DATE = '2026-01-15T00:00:00.000Z';

/**
 * True only when this Stock's price came from a real quote rather than the
 * static snapshot above.
 *
 * `lastUpdated` is the one field that reliably distinguishes the two: the
 * static rows carry STATIC_SNAPSHOT_DATE verbatim, while a robot price
 * carries its real trade time. Anything unparseable, or older than the
 * snapshot itself, is treated as not-live rather than trusted.
 *
 * Saved prices (loaded from the device after a restart, or a live price that
 * hasn't been reconfirmed for CONFIRMED_FOR_MS) are real but may be old, so
 * they don't count either: they're fine to display, never to fill a trade,
 * mark a position or grade a prediction.
 *
 * Note this speaks only to price. P/E, EPS, dividend yield, market cap and the
 * 52-week range are never refreshed, so on a Stock from getStock() those stay
 * January-static even when this returns true.
 */
/**
 * One reporting quarter. Past this, a fundamental (P/E, EPS, dividend yield,
 * market cap) has had at least one earnings report to move it and can no
 * longer be presented as current.
 */
export const FUNDAMENTALS_MAX_AGE_DAYS = 90;

/**
 * True when a Stock's fundamentals are too old to state as fact — including
 * when their vintage is unknown, since an unattributable number is not
 * something to publish either.
 *
 * Distinct from isLiveQuote(): that asks about price. A Stock from getStock()
 * routinely has a live price AND stale fundamentals.
 */
export function areFundamentalsStale(stock: Stock | null | undefined): boolean {
  if (!stock?.fundamentalsAsOf) return true;
  const t = new Date(stock.fundamentalsAsOf).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > FUNDAMENTALS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Renders an ISO date for "as of" disclosure copy. Forced to UTC: the
 * snapshot constant is UTC midnight, and local formatting in a behind-UTC
 * zone renders it a day early.
 */
export function formatAsOfDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Shares outstanding, derived from the static snapshot as marketCap ÷ price.
 *
 * Deliberately reads the raw stockDatabase row rather than getStock(), whose
 * price may already be live-patched — dividing a January market cap by a live
 * price would invent a share count that never existed.
 *
 * This exists so market cap can be computed as shares × live price instead of
 * costing a second API call. Finnhub's /stock/profile2 was being fetched for
 * all 110 symbols purely to supply marketCap (everything else it returned had
 * a static fallback already), doubling every fan-out. Market cap is by
 * definition shares × price, so with the share count held locally the live
 * quote is enough.
 *
 * Honesty note: the share count is January's. Buybacks and issuance move it,
 * but slowly — a quarter of drift is a fraction of a percent for large caps,
 * against a price that moves that much in a morning. So "January shares ×
 * live price" is materially closer to the truth than the frozen January
 * market cap it replaces, without claiming to be exact.
 *
 * Funds carry marketCap 0 in the static table (the existing convention for
 * "not applicable"), so this returns 0 for them and the convention survives.
 */
export function getSharesOutstanding(symbol: string): number {
  const base = stockDatabase[symbol.toUpperCase()];
  if (!base || !base.price) return 0;
  return base.marketCap / base.price;
}

export function isLiveQuote(stock: Stock | null | undefined): boolean {
  if (!stock?.lastUpdated || stock.lastUpdated === STATIC_SNAPSHOT_DATE) return false;
  if (stock.priceOrigin !== 'live') return false;
  const t = new Date(stock.lastUpdated).getTime();
  return Number.isFinite(t) && t > new Date(STATIC_SNAPSHOT_DATE).getTime();
}

// ============================================================================
// MOCK STOCK DATABASE (Tier 1 approved blue chips)
// ============================================================================

export const stockDatabase: Record<string, Stock> = {

  // ── TECHNOLOGY ────────────────────────────────────────────────────────────
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    price: 211.45,
    previousClose: 209.80,
    change: 1.65,
    changePercent: 0.79,
    volume: 52_341_000,
    marketCap: 3_210_000_000_000,
    peRatio: 33.2,
    pegRatio: 2.4,
    dividendYield: 0.47,
    eps: 6.37,
    beta: 1.20,
    dayLow: 209.90,
    dayHigh: 212.30,
    yearLow: 164.08,
    yearHigh: 237.23,
    exchange: 'NASDAQ',
    lastUpdated: STATIC_SNAPSHOT_DATE,
  },
  MSFT: { symbol:'MSFT', name:'Microsoft Corporation', sector:'Technology', industry:'Software', price:421.45, previousClose:418.20, change:3.25, changePercent:0.78, volume:18_245_000, marketCap:3_130_000_000_000, peRatio:36.8, pegRatio:2.5, dividendYield:0.68, eps:11.45, beta:0.92, dayLow:418.80, dayHigh:422.60, yearLow:344.79, yearHigh:468.35, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  GOOGL: { symbol:'GOOGL', name:'Alphabet Inc.', sector:'Technology', industry:'Internet Services', price:176.40, previousClose:174.10, change:2.30, changePercent:1.32, volume:21_120_000, marketCap:2_188_000_000_000, peRatio:23.4, pegRatio:1.5, eps:7.53, beta:1.04, dayLow:174.60, dayHigh:177.80, yearLow:138.31, yearHigh:195.88, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  AMZN: { symbol:'AMZN', name:'Amazon.com Inc.', sector:'Consumer Discretionary', industry:'E-commerce & Cloud', price:205.80, previousClose:202.40, change:3.40, changePercent:1.68, volume:36_540_000, marketCap:2_158_000_000_000, peRatio:44.2, pegRatio:1.8, eps:4.65, beta:1.18, dayLow:202.90, dayHigh:207.20, yearLow:151.61, yearHigh:230.15, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  NVDA: { symbol:'NVDA', name:'NVIDIA Corporation', sector:'Technology', industry:'Semiconductors & AI', price:131.40, previousClose:128.60, change:2.80, changePercent:2.18, volume:248_120_000, marketCap:3_215_000_000_000, peRatio:51.2, pegRatio:1.2, eps:2.57, beta:1.69, dayLow:129.20, dayHigh:132.80, yearLow:66.25, yearHigh:153.13, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  TSLA: { symbol:'TSLA', name:'Tesla Inc.', sector:'Consumer Discretionary', industry:'Electric Vehicles', price:252.40, previousClose:248.10, change:4.30, changePercent:1.73, volume:78_320_000, marketCap:809_000_000_000, peRatio:68.4, pegRatio:3.1, eps:3.69, beta:2.31, dayLow:249.10, dayHigh:254.80, yearLow:138.80, yearHigh:365.20, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  META: { symbol:'META', name:'Meta Platforms Inc.', sector:'Communication Services', industry:'Social Media & AI', price:578.20, previousClose:572.80, change:5.40, changePercent:0.94, volume:14_320_000, marketCap:1_472_000_000_000, peRatio:28.1, pegRatio:1.4, dividendYield:0.35, eps:20.58, beta:1.21, dayLow:573.40, dayHigh:580.60, yearLow:364.36, yearHigh:638.40, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  NFLX: { symbol:'NFLX', name:'Netflix Inc.', sector:'Communication Services', industry:'Streaming', price:698.40, previousClose:691.20, change:7.20, changePercent:1.04, volume:4_820_000, marketCap:299_000_000_000, peRatio:44.8, pegRatio:2.1, eps:15.59, beta:1.32, dayLow:692.10, dayHigh:701.80, yearLow:478.14, yearHigh:763.99, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  AMD:  { symbol:'AMD',  name:'Advanced Micro Devices', sector:'Technology', industry:'Semiconductors', price:153.80, previousClose:151.40, change:2.40, changePercent:1.59, volume:42_680_000, marketCap:249_000_000_000, peRatio:189.2, pegRatio:2.4, eps:0.81, beta:1.72, dayLow:151.80, dayHigh:155.20, yearLow:111.40, yearHigh:227.30, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  INTC: { symbol:'INTC', name:'Intel Corporation', sector:'Technology', industry:'Semiconductors', price:21.45, previousClose:21.80, change:-0.35, changePercent:-1.61, volume:52_340_000, marketCap:91_000_000_000, peRatio:0, pegRatio:0, dividendYield:2.20, eps:-4.38, beta:1.12, dayLow:21.10, dayHigh:22.20, yearLow:18.51, yearHigh:43.63, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  CRM:  { symbol:'CRM',  name:'Salesforce Inc.', sector:'Technology', industry:'Enterprise Software', price:284.20, previousClose:281.40, change:2.80, changePercent:0.99, volume:5_680_000, marketCap:273_000_000_000, peRatio:45.2, pegRatio:2.8, dividendYield:0.56, eps:6.29, beta:1.16, dayLow:281.80, dayHigh:285.60, yearLow:212.00, yearHigh:318.71, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  ADBE: { symbol:'ADBE', name:'Adobe Inc.', sector:'Technology', industry:'Software', price:391.50, previousClose:388.20, change:3.30, changePercent:0.85, volume:3_240_000, marketCap:176_000_000_000, peRatio:37.8, pegRatio:2.5, eps:10.35, beta:1.26, dayLow:388.80, dayHigh:393.40, yearLow:304.71, yearHigh:587.75, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  ORCL: { symbol:'ORCL', name:'Oracle Corporation', sector:'Technology', industry:'Database & Cloud', price:139.80, previousClose:137.60, change:2.20, changePercent:1.60, volume:8_420_000, marketCap:385_000_000_000, peRatio:34.2, pegRatio:2.6, dividendYield:1.14, eps:4.09, beta:1.04, dayLow:138.10, dayHigh:141.20, yearLow:99.26, yearHigh:198.31, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  UBER: { symbol:'UBER', name:'Uber Technologies Inc.', sector:'Technology', industry:'Ridesharing & Delivery', price:77.60, previousClose:76.20, change:1.40, changePercent:1.84, volume:18_640_000, marketCap:164_000_000_000, peRatio:62.4, pegRatio:1.8, eps:1.24, beta:1.38, dayLow:76.40, dayHigh:78.40, yearLow:55.49, yearHigh:87.00, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  PLTR: { symbol:'PLTR', name:'Palantir Technologies', sector:'Technology', industry:'AI & Data Analytics', price:27.85, previousClose:27.10, change:0.75, changePercent:2.77, volume:88_420_000, marketCap:60_000_000_000, peRatio:220.0, pegRatio:4.2, eps:0.13, beta:1.74, dayLow:27.20, dayHigh:28.40, yearLow:14.78, yearHigh:34.83, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  SHOP: { symbol:'SHOP', name:'Shopify Inc.', sector:'Technology', industry:'E-commerce Platform', price:77.40, previousClose:75.80, change:1.60, changePercent:2.11, volume:12_840_000, marketCap:98_000_000_000, peRatio:88.6, pegRatio:2.2, eps:0.87, beta:1.58, dayLow:75.90, dayHigh:78.20, yearLow:54.32, yearHigh:102.71, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  SNOW: { symbol:'SNOW', name:'Snowflake Inc.', sector:'Technology', industry:'Cloud Data Platform', price:154.60, previousClose:151.80, change:2.80, changePercent:1.84, volume:8_240_000, marketCap:51_000_000_000, peRatio:0, pegRatio:4.8, eps:-2.10, beta:1.91, dayLow:152.10, dayHigh:156.40, yearLow:107.13, yearHigh:237.72, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── COMMUNICATION SERVICES ────────────────────────────────────────────────
  DIS:  { symbol:'DIS',  name:'The Walt Disney Company', sector:'Communication Services', industry:'Entertainment', price:109.80, previousClose:108.40, change:1.40, changePercent:1.29, volume:11_240_000, marketCap:200_000_000_000, peRatio:48.6, pegRatio:3.2, dividendYield:0.73, eps:2.26, beta:1.22, dayLow:108.60, dayHigh:110.60, yearLow:83.91, yearHigh:123.74, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  CMCSA:{ symbol:'CMCSA',name:'Comcast Corporation', sector:'Communication Services', industry:'Cable TV & Internet', price:38.40, previousClose:38.00, change:0.40, changePercent:1.05, volume:22_840_000, marketCap:145_000_000_000, peRatio:10.8, pegRatio:1.8, dividendYield:3.12, eps:3.56, beta:1.02, dayLow:37.90, dayHigh:38.80, yearLow:33.88, yearHigh:47.28, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  T:    { symbol:'T',    name:'AT&T Inc.', sector:'Communication Services', industry:'Telecom', price:19.80, previousClose:19.60, change:0.20, changePercent:1.02, volume:42_480_000, marketCap:142_000_000_000, peRatio:14.4, pegRatio:2.8, dividendYield:5.35, eps:1.37, beta:0.62, dayLow:19.50, dayHigh:20.00, yearLow:15.91, yearHigh:22.82, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  VZ:   { symbol:'VZ',   name:'Verizon Communications', sector:'Communication Services', industry:'Telecom', price:41.20, previousClose:40.80, change:0.40, changePercent:0.98, volume:19_840_000, marketCap:173_000_000_000, peRatio:17.2, pegRatio:3.4, dividendYield:6.12, eps:2.40, beta:0.38, dayLow:40.60, dayHigh:41.60, yearLow:36.48, yearHigh:45.34, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── FINANCIAL SERVICES ────────────────────────────────────────────────────
  V:    { symbol:'V',    name:'Visa Inc.', sector:'Financial Services', industry:'Payment Networks', price:291.20, previousClose:288.40, change:2.80, changePercent:0.97, volume:5_890_000, marketCap:604_000_000_000, peRatio:33.8, pegRatio:2.5, dividendYield:0.71, eps:8.61, beta:0.94, dayLow:288.80, dayHigh:292.60, yearLow:235.22, yearHigh:316.84, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  MA:   { symbol:'MA',   name:'Mastercard Incorporated', sector:'Financial Services', industry:'Payment Networks', price:492.80, previousClose:488.60, change:4.20, changePercent:0.86, volume:2_840_000, marketCap:462_000_000_000, peRatio:38.4, pegRatio:2.4, dividendYield:0.56, eps:12.83, beta:1.02, dayLow:489.20, dayHigh:494.60, yearLow:382.58, yearHigh:541.76, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  JPM:  { symbol:'JPM',  name:'JPMorgan Chase & Co.', sector:'Financial Services', industry:'Banking', price:216.40, previousClose:213.80, change:2.60, changePercent:1.22, volume:9_840_000, marketCap:622_000_000_000, peRatio:12.8, pegRatio:1.8, dividendYield:2.22, eps:16.91, beta:1.12, dayLow:214.20, dayHigh:218.00, yearLow:182.14, yearHigh:263.84, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  BAC:  { symbol:'BAC',  name:'Bank of America Corp.', sector:'Financial Services', industry:'Banking', price:40.25, previousClose:39.80, change:0.45, changePercent:1.13, volume:38_240_000, marketCap:318_000_000_000, peRatio:14.2, pegRatio:1.6, dividendYield:2.38, eps:2.84, beta:1.35, dayLow:39.90, dayHigh:40.60, yearLow:31.06, yearHigh:46.38, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  WFC:  { symbol:'WFC',  name:'Wells Fargo & Company', sector:'Financial Services', industry:'Banking', price:61.85, previousClose:61.00, change:0.85, changePercent:1.39, volume:19_640_000, marketCap:213_000_000_000, peRatio:11.8, pegRatio:1.4, dividendYield:2.91, eps:5.24, beta:1.18, dayLow:61.10, dayHigh:62.40, yearLow:44.38, yearHigh:78.29, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  GS:   { symbol:'GS',   name:'Goldman Sachs Group', sector:'Financial Services', industry:'Investment Banking', price:532.10, previousClose:526.80, change:5.30, changePercent:1.01, volume:2_140_000, marketCap:181_000_000_000, peRatio:17.4, pegRatio:1.8, dividendYield:2.10, eps:30.58, beta:1.38, dayLow:527.40, dayHigh:534.80, yearLow:389.58, yearHigh:624.67, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  MS:   { symbol:'MS',   name:'Morgan Stanley', sector:'Financial Services', industry:'Investment Banking', price:108.60, previousClose:107.20, change:1.40, changePercent:1.31, volume:8_640_000, marketCap:182_000_000_000, peRatio:19.2, pegRatio:2.1, dividendYield:3.68, eps:5.66, beta:1.28, dayLow:107.40, dayHigh:109.40, yearLow:83.66, yearHigh:134.34, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  AXP:  { symbol:'AXP',  name:'American Express Company', sector:'Financial Services', industry:'Credit Services', price:264.80, previousClose:261.40, change:3.40, changePercent:1.30, volume:3_840_000, marketCap:196_000_000_000, peRatio:22.4, pegRatio:1.8, dividendYield:1.21, eps:11.82, beta:1.16, dayLow:261.80, dayHigh:266.40, yearLow:188.93, yearHigh:315.98, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  PYPL: { symbol:'PYPL', name:'PayPal Holdings Inc.', sector:'Financial Services', industry:'Digital Payments', price:67.40, previousClose:66.20, change:1.20, changePercent:1.81, volume:14_840_000, marketCap:72_000_000_000, peRatio:17.8, pegRatio:1.2, eps:3.79, beta:1.28, dayLow:66.40, dayHigh:68.20, yearLow:56.64, yearHigh:82.47, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  BLK:  { symbol:'BLK',  name:'BlackRock Inc.', sector:'Financial Services', industry:'Asset Management', price:941.20, previousClose:932.80, change:8.40, changePercent:0.90, volume:540_000, marketCap:141_000_000_000, peRatio:24.8, pegRatio:2.4, dividendYield:2.34, eps:37.94, beta:1.28, dayLow:934.20, dayHigh:944.80, yearLow:744.52, yearHigh:1_084.22, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── HEALTHCARE ────────────────────────────────────────────────────────────
  JNJ:  { symbol:'JNJ',  name:'Johnson & Johnson', sector:'Healthcare', industry:'Drug Manufacturers', price:154.80, previousClose:153.40, change:1.40, changePercent:0.91, volume:8_120_000, marketCap:372_000_000_000, peRatio:23.8, pegRatio:3.8, dividendYield:3.28, eps:6.50, beta:0.55, dayLow:153.60, dayHigh:155.60, yearLow:143.13, yearHigh:168.73, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  PFE:  { symbol:'PFE',  name:'Pfizer Inc.', sector:'Healthcare', industry:'Drug Manufacturers', price:27.20, previousClose:26.80, change:0.40, changePercent:1.49, volume:38_640_000, marketCap:154_000_000_000, peRatio:9.8, pegRatio:2.4, dividendYield:6.47, eps:2.77, beta:0.48, dayLow:26.80, dayHigh:27.50, yearLow:24.48, yearHigh:34.96, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  UNH:  { symbol:'UNH',  name:'UnitedHealth Group Inc.', sector:'Healthcare', industry:'Health Insurance', price:521.40, previousClose:516.80, change:4.60, changePercent:0.89, volume:4_240_000, marketCap:481_000_000_000, peRatio:25.4, pegRatio:1.8, dividendYield:1.54, eps:20.53, beta:0.62, dayLow:517.20, dayHigh:523.80, yearLow:436.47, yearHigh:630.73, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  ABT:  { symbol:'ABT',  name:'Abbott Laboratories', sector:'Healthcare', industry:'Medical Devices', price:119.80, previousClose:118.40, change:1.40, changePercent:1.18, volume:6_840_000, marketCap:208_000_000_000, peRatio:26.4, pegRatio:2.8, dividendYield:1.88, eps:4.54, beta:0.78, dayLow:118.60, dayHigh:120.60, yearLow:96.04, yearHigh:131.12, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  LLY:  { symbol:'LLY',  name:'Eli Lilly and Company', sector:'Healthcare', industry:'Drug Manufacturers', price:828.60, previousClose:820.40, change:8.20, changePercent:1.00, volume:3_840_000, marketCap:786_000_000_000, peRatio:106.4, pegRatio:2.4, dividendYield:0.68, eps:7.79, beta:0.42, dayLow:821.40, dayHigh:832.80, yearLow:533.27, yearHigh:972.53, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  MRK:  { symbol:'MRK',  name:'Merck & Company Inc.', sector:'Healthcare', industry:'Drug Manufacturers', price:127.80, previousClose:126.40, change:1.40, changePercent:1.11, volume:9_840_000, marketCap:323_000_000_000, peRatio:17.4, pegRatio:1.8, dividendYield:2.65, eps:7.35, beta:0.40, dayLow:126.60, dayHigh:128.80, yearLow:107.82, yearHigh:134.63, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  TMO:  { symbol:'TMO',  name:'Thermo Fisher Scientific', sector:'Healthcare', industry:'Lab Equipment', price:539.20, previousClose:533.80, change:5.40, changePercent:1.01, volume:1_840_000, marketCap:209_000_000_000, peRatio:29.4, pegRatio:2.2, dividendYield:0.30, eps:18.35, beta:0.72, dayLow:534.40, dayHigh:541.80, yearLow:441.46, yearHigh:609.92, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── CONSUMER DEFENSIVE ───────────────────────────────────────────────────
  KO:   { symbol:'KO',   name:'Coca-Cola Company', sector:'Consumer Defensive', industry:'Beverages', price:63.80, previousClose:63.20, change:0.60, changePercent:0.95, volume:12_540_000, marketCap:275_000_000_000, peRatio:26.4, pegRatio:4.2, dividendYield:3.08, eps:2.42, beta:0.58, dayLow:63.10, dayHigh:64.20, yearLow:56.14, yearHigh:73.53, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  PEP:  { symbol:'PEP',  name:'PepsiCo Inc.', sector:'Consumer Defensive', industry:'Beverages & Snacks', price:161.40, previousClose:159.80, change:1.60, changePercent:1.00, volume:5_840_000, marketCap:221_000_000_000, peRatio:24.8, pegRatio:3.4, dividendYield:3.39, eps:6.51, beta:0.52, dayLow:159.80, dayHigh:162.40, yearLow:151.35, yearHigh:183.41, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  WMT:  { symbol:'WMT',  name:'Walmart Inc.', sector:'Consumer Defensive', industry:'Discount Retail', price:177.60, previousClose:175.80, change:1.80, changePercent:1.02, volume:14_840_000, marketCap:714_000_000_000, peRatio:46.2, pegRatio:3.8, dividendYield:1.01, eps:3.84, beta:0.51, dayLow:175.90, dayHigh:178.60, yearLow:142.98, yearHigh:194.29, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  COST: { symbol:'COST', name:'Costco Wholesale Corp.', sector:'Consumer Defensive', industry:'Wholesale Club', price:938.40, previousClose:929.80, change:8.60, changePercent:0.93, volume:1_840_000, marketCap:416_000_000_000, peRatio:55.8, pegRatio:4.2, dividendYield:0.56, eps:16.81, beta:0.82, dayLow:931.20, dayHigh:941.80, yearLow:686.78, yearHigh:1_078.22, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  MDLZ: { symbol:'MDLZ', name:'Mondelez International', sector:'Consumer Defensive', industry:'Packaged Foods', price:64.20, previousClose:63.60, change:0.60, changePercent:0.94, volume:4_840_000, marketCap:87_000_000_000, peRatio:23.4, pegRatio:3.8, dividendYield:2.61, eps:2.74, beta:0.62, dayLow:63.60, dayHigh:64.80, yearLow:59.48, yearHigh:75.48, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── CONSUMER DISCRETIONARY ───────────────────────────────────────────────
  MCD:  { symbol:'MCD',  name:"McDonald's Corporation", sector:'Consumer Discretionary', industry:'Fast Food', price:289.60, previousClose:286.80, change:2.80, changePercent:0.98, volume:3_840_000, marketCap:209_000_000_000, peRatio:24.8, pegRatio:2.8, dividendYield:2.39, eps:11.68, beta:0.72, dayLow:287.20, dayHigh:291.40, yearLow:243.54, yearHigh:317.90, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  SBUX: { symbol:'SBUX', name:'Starbucks Corporation', sector:'Consumer Discretionary', industry:'Coffee & Cafes', price:81.80, previousClose:80.40, change:1.40, changePercent:1.74, volume:9_840_000, marketCap:93_000_000_000, peRatio:34.8, pegRatio:2.8, dividendYield:2.58, eps:2.35, beta:0.98, dayLow:80.60, dayHigh:82.60, yearLow:70.15, yearHigh:111.00, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  NKE:  { symbol:'NKE',  name:'Nike Inc.', sector:'Consumer Discretionary', industry:'Apparel & Footwear', price:81.60, previousClose:80.20, change:1.40, changePercent:1.75, volume:10_840_000, marketCap:124_000_000_000, peRatio:28.4, pegRatio:2.8, dividendYield:2.06, eps:2.87, beta:0.88, dayLow:80.40, dayHigh:82.40, yearLow:70.24, yearHigh:114.50, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  TGT:  { symbol:'TGT',  name:'Target Corporation', sector:'Consumer Discretionary', industry:'Discount Retail', price:152.40, previousClose:150.20, change:2.20, changePercent:1.47, volume:5_840_000, marketCap:70_000_000_000, peRatio:16.8, pegRatio:1.8, dividendYield:3.30, eps:9.07, beta:0.88, dayLow:150.40, dayHigh:153.60, yearLow:121.97, yearHigh:181.86, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  HD:   { symbol:'HD',   name:'Home Depot Inc.', sector:'Consumer Discretionary', industry:'Home Improvement Retail', price:362.80, previousClose:359.20, change:3.60, changePercent:1.00, volume:3_840_000, marketCap:360_000_000_000, peRatio:24.4, pegRatio:2.4, dividendYield:2.49, eps:14.87, beta:0.98, dayLow:359.60, dayHigh:364.80, yearLow:304.25, yearHigh:395.41, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── ENERGY ───────────────────────────────────────────────────────────────
  XOM:  { symbol:'XOM',  name:'Exxon Mobil Corporation', sector:'Energy', industry:'Oil & Gas', price:114.80, previousClose:113.40, change:1.40, changePercent:1.23, volume:16_840_000, marketCap:458_000_000_000, peRatio:13.8, pegRatio:2.4, dividendYield:3.55, eps:8.32, beta:0.96, dayLow:113.60, dayHigh:115.80, yearLow:99.55, yearHigh:126.34, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  CVX:  { symbol:'CVX',  name:'Chevron Corporation', sector:'Energy', industry:'Oil & Gas', price:154.60, previousClose:152.80, change:1.80, changePercent:1.18, volume:7_840_000, marketCap:284_000_000_000, peRatio:17.4, pegRatio:3.2, dividendYield:4.19, eps:8.89, beta:1.02, dayLow:152.80, dayHigh:155.80, yearLow:135.39, yearHigh:175.71, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  COP:  { symbol:'COP',  name:'ConocoPhillips', sector:'Energy', industry:'Oil & Gas', price:114.40, previousClose:112.80, change:1.60, changePercent:1.42, volume:8_840_000, marketCap:138_000_000_000, peRatio:12.4, pegRatio:1.6, dividendYield:1.89, eps:9.23, beta:1.04, dayLow:112.80, dayHigh:115.60, yearLow:101.59, yearHigh:136.85, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  SLB:  { symbol:'SLB',  name:'Schlumberger Limited', sector:'Energy', industry:'Oil Services', price:44.20, previousClose:43.60, change:0.60, changePercent:1.38, volume:14_840_000, marketCap:62_000_000_000, peRatio:13.8, pegRatio:1.4, dividendYield:2.89, eps:3.20, beta:1.28, dayLow:43.60, dayHigh:44.80, yearLow:36.99, yearHigh:56.42, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── INDUSTRIAL ───────────────────────────────────────────────────────────
  CAT:  { symbol:'CAT',  name:'Caterpillar Inc.', sector:'Industrials', industry:'Heavy Machinery', price:344.80, previousClose:341.20, change:3.60, changePercent:1.05, volume:2_840_000, marketCap:168_000_000_000, peRatio:16.8, pegRatio:1.8, dividendYield:1.55, eps:20.53, beta:1.06, dayLow:341.60, dayHigh:346.80, yearLow:259.26, yearHigh:418.02, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  BA:   { symbol:'BA',   name:'Boeing Company', sector:'Industrials', industry:'Aerospace & Defense', price:194.60, previousClose:191.80, change:2.80, changePercent:1.46, volume:9_840_000, marketCap:122_000_000_000, peRatio:0, pegRatio:0, eps:-5.81, beta:1.58, dayLow:192.20, dayHigh:196.40, yearLow:159.70, yearHigh:267.54, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  HON:  { symbol:'HON',  name:'Honeywell International', sector:'Industrials', industry:'Conglomerates', price:204.80, previousClose:202.60, change:2.20, changePercent:1.09, volume:3_840_000, marketCap:134_000_000_000, peRatio:24.8, pegRatio:2.4, dividendYield:2.35, eps:8.26, beta:1.04, dayLow:202.80, dayHigh:206.40, yearLow:182.50, yearHigh:240.26, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  GE:   { symbol:'GE',   name:'GE Aerospace', sector:'Industrials', industry:'Aerospace & Defense', price:169.60, previousClose:167.40, change:2.20, changePercent:1.31, volume:7_840_000, marketCap:184_000_000_000, peRatio:28.4, pegRatio:1.8, dividendYield:0.71, eps:5.97, beta:1.18, dayLow:167.60, dayHigh:171.40, yearLow:118.57, yearHigh:218.18, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  UPS:  { symbol:'UPS',  name:'United Parcel Service', sector:'Industrials', industry:'Package Delivery', price:137.80, previousClose:136.20, change:1.60, changePercent:1.17, volume:4_840_000, marketCap:117_000_000_000, peRatio:19.4, pegRatio:2.4, dividendYield:5.24, eps:7.10, beta:1.08, dayLow:136.40, dayHigh:139.00, yearLow:124.76, yearHigh:171.33, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  LMT:  { symbol:'LMT',  name:'Lockheed Martin Corp.', sector:'Industrials', industry:'Defense Contractor', price:499.80, previousClose:495.20, change:4.60, changePercent:0.93, volume:840_000, marketCap:125_000_000_000, peRatio:21.8, pegRatio:2.2, dividendYield:2.92, eps:22.93, beta:0.50, dayLow:496.20, dayHigh:502.40, yearLow:427.14, yearHigh:593.28, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── ETFs ─────────────────────────────────────────────────────────────────
  SPY:  { symbol:'SPY',  name:'SPDR S&P 500 ETF Trust', sector:'ETF', industry:'US Large-Cap Equity', price:568.80, previousClose:562.40, change:6.40, changePercent:1.14, volume:65_320_000, marketCap:0, dividendYield:1.32, beta:1.00, dayLow:563.20, dayHigh:570.80, yearLow:443.26, yearHigh:614.70, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  VOO:  { symbol:'VOO',  name:'Vanguard S&P 500 ETF', sector:'ETF', industry:'US Large-Cap Equity', price:523.60, previousClose:517.80, change:5.80, changePercent:1.12, volume:4_120_000, marketCap:0, dividendYield:1.34, beta:1.00, dayLow:518.60, dayHigh:525.40, yearLow:408.96, yearHigh:566.56, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  QQQ:  { symbol:'QQQ',  name:'Invesco QQQ Trust (NASDAQ-100)', sector:'ETF', industry:'US Large-Cap Growth', price:479.20, previousClose:474.40, change:4.80, changePercent:1.01, volume:38_840_000, marketCap:0, dividendYield:0.62, beta:1.12, dayLow:475.20, dayHigh:481.60, yearLow:365.78, yearHigh:540.81, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  VTI:  { symbol:'VTI',  name:'Vanguard Total Stock Market ETF', sector:'ETF', industry:'Total US Market', price:277.40, previousClose:274.20, change:3.20, changePercent:1.17, volume:3_840_000, marketCap:0, dividendYield:1.38, beta:1.00, dayLow:274.60, dayHigh:278.80, yearLow:215.26, yearHigh:300.41, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  IWM:  { symbol:'IWM',  name:'iShares Russell 2000 ETF', sector:'ETF', industry:'US Small-Cap Equity', price:214.20, previousClose:211.80, change:2.40, changePercent:1.13, volume:24_840_000, marketCap:0, dividendYield:1.22, beta:1.24, dayLow:212.00, dayHigh:215.80, yearLow:171.76, yearHigh:240.48, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  GLD:  { symbol:'GLD',  name:'SPDR Gold Shares ETF', sector:'ETF', industry:'Precious Metals', price:224.80, previousClose:222.40, change:2.40, changePercent:1.08, volume:8_840_000, marketCap:0, dividendYield:0.00, beta:0.12, dayLow:222.60, dayHigh:226.40, yearLow:174.01, yearHigh:249.20, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  BND:  { symbol:'BND',  name:'Vanguard Total Bond Market ETF', sector:'ETF', industry:'US Bonds', price:72.80, previousClose:72.40, change:0.40, changePercent:0.55, volume:6_840_000, marketCap:0, dividendYield:3.48, beta:-0.08, dayLow:72.20, dayHigh:73.20, yearLow:69.22, yearHigh:76.64, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  VNQ:  { symbol:'VNQ',  name:'Vanguard Real Estate ETF', sector:'ETF', industry:'Real Estate', price:86.60, previousClose:85.80, change:0.80, changePercent:0.93, volume:5_840_000, marketCap:0, dividendYield:3.72, beta:0.78, dayLow:85.80, dayHigh:87.20, yearLow:72.73, yearHigh:96.32, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  ARKK: { symbol:'ARKK', name:'ARK Innovation ETF', sector:'ETF', industry:'Disruptive Innovation', price:47.80, previousClose:46.80, change:1.00, changePercent:2.14, volume:18_840_000, marketCap:0, dividendYield:0.00, beta:1.84, dayLow:46.80, dayHigh:48.60, yearLow:36.47, yearHigh:63.97, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── REAL ESTATE ──────────────────────────────────────────────────────────
  AMT:  { symbol:'AMT',  name:'American Tower Corp.', sector:'Real Estate', industry:'Cell Towers REIT', price:212.40, previousClose:210.20, change:2.20, changePercent:1.05, volume:2_840_000, marketCap:98_000_000_000, peRatio:36.4, pegRatio:2.8, dividendYield:2.93, eps:5.83, beta:0.82, dayLow:210.40, dayHigh:213.80, yearLow:168.53, yearHigh:243.15, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  EQIX: { symbol:'EQIX', name:'Equinix Inc.', sector:'Real Estate', industry:'Data Center REIT', price:876.40, previousClose:868.20, change:8.20, changePercent:0.94, volume:540_000, marketCap:77_000_000_000, peRatio:74.2, pegRatio:3.8, dividendYield:2.12, eps:11.81, beta:0.82, dayLow:869.40, dayHigh:879.80, yearLow:718.56, yearHigh:959.82, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  PLD:  { symbol:'PLD',  name:'Prologis Inc.', sector:'Real Estate', industry:'Industrial REIT', price:108.20, previousClose:106.80, change:1.40, changePercent:1.31, volume:3_240_000, marketCap:98_000_000_000, peRatio:34.8, pegRatio:2.8, dividendYield:3.56, eps:3.11, beta:0.92, dayLow:107.00, dayHigh:109.60, yearLow:94.14, yearHigh:128.52, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  O:    { symbol:'O',    name:'Realty Income Corporation', sector:'Real Estate', industry:'Net Lease REIT', price:58.40, previousClose:57.80, change:0.60, changePercent:1.04, volume:5_840_000, marketCap:49_000_000_000, peRatio:48.6, dividendYield:5.92, eps:1.20, beta:0.70, dayLow:57.60, dayHigh:59.00, yearLow:49.28, yearHigh:67.06, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── CLEAN ENERGY ─────────────────────────────────────────────────────────
  ENPH: { symbol:'ENPH', name:'Enphase Energy Inc.', sector:'Clean Energy', industry:'Solar Microinverters', price:88.60, previousClose:86.40, change:2.20, changePercent:2.55, volume:7_840_000, marketCap:12_000_000_000, peRatio:32.4, eps:2.73, beta:1.92, dayLow:86.60, dayHigh:90.40, yearLow:71.87, yearHigh:150.54, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  FSLR: { symbol:'FSLR', name:'First Solar Inc.', sector:'Clean Energy', industry:'Solar Panels', price:178.40, previousClose:175.20, change:3.20, changePercent:1.83, volume:2_640_000, marketCap:19_000_000_000, peRatio:15.8, eps:11.29, beta:1.42, dayLow:175.40, dayHigh:180.60, yearLow:146.38, yearHigh:306.81, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  NEE:  { symbol:'NEE',  name:'NextEra Energy Inc.', sector:'Clean Energy', industry:'Renewable Utilities', price:73.80, previousClose:72.80, change:1.00, changePercent:1.37, volume:14_840_000, marketCap:151_000_000_000, peRatio:21.4, dividendYield:2.93, eps:3.45, beta:0.62, dayLow:72.80, dayHigh:74.60, yearLow:59.47, yearHigh:85.65, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── SPACE & DEFENSE ───────────────────────────────────────────────────────
  RKLB: { symbol:'RKLB', name:'Rocket Lab USA Inc.', sector:'Industrials', industry:'Space Launch Services', price:18.60, previousClose:17.80, change:0.80, changePercent:4.49, volume:28_840_000, marketCap:8_600_000_000, peRatio:0, eps:-0.43, beta:1.98, dayLow:17.90, dayHigh:19.20, yearLow:4.28, yearHigh:25.36, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  ASTS: { symbol:'ASTS', name:'AST SpaceMobile Inc.', sector:'Communication Services', industry:'Space-Based Broadband', price:24.80, previousClose:23.60, change:1.20, changePercent:5.08, volume:18_640_000, marketCap:5_200_000_000, peRatio:0, eps:-1.82, beta:2.14, dayLow:23.80, dayHigh:25.60, yearLow:3.01, yearHigh:45.64, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  RTX:  { symbol:'RTX',  name:'RTX Corporation', sector:'Industrials', industry:'Aerospace & Defense', price:124.80, previousClose:123.20, change:1.60, changePercent:1.30, volume:7_840_000, marketCap:165_000_000_000, peRatio:33.8, dividendYield:2.18, eps:3.69, beta:0.89, dayLow:123.40, dayHigh:125.80, yearLow:92.06, yearHigh:130.86, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  NOC:  { symbol:'NOC',  name:'Northrop Grumman Corp.', sector:'Industrials', industry:'Defense Contractor', price:484.60, previousClose:480.20, change:4.40, changePercent:0.92, volume:680_000, marketCap:74_000_000_000, peRatio:16.8, dividendYield:1.79, eps:28.84, beta:0.50, dayLow:481.00, dayHigh:487.20, yearLow:435.63, yearHigh:569.32, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── CYBERSECURITY ─────────────────────────────────────────────────────────
  CRWD: { symbol:'CRWD', name:'CrowdStrike Holdings', sector:'Technology', industry:'Cybersecurity', price:362.80, previousClose:357.40, change:5.40, changePercent:1.51, volume:4_840_000, marketCap:90_000_000_000, peRatio:88.4, eps:4.10, beta:1.22, dayLow:358.40, dayHigh:365.60, yearLow:199.54, yearHigh:398.33, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  PANW: { symbol:'PANW', name:'Palo Alto Networks Inc.', sector:'Technology', industry:'Cybersecurity', price:184.40, previousClose:181.80, change:2.60, changePercent:1.43, volume:5_240_000, marketCap:125_000_000_000, peRatio:44.2, eps:4.17, beta:1.08, dayLow:182.20, dayHigh:186.20, yearLow:143.47, yearHigh:210.87, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  ZS:   { symbol:'ZS',   name:'Zscaler Inc.', sector:'Technology', industry:'Cloud Security', price:194.80, previousClose:191.60, change:3.20, changePercent:1.67, volume:2_640_000, marketCap:29_000_000_000, peRatio:0, eps:-2.68, beta:1.48, dayLow:192.00, dayHigh:196.80, yearLow:143.97, yearHigh:268.06, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── FINTECH ───────────────────────────────────────────────────────────────
  COIN: { symbol:'COIN', name:'Coinbase Global Inc.', sector:'Financial Services', industry:'Crypto Exchange', price:218.40, previousClose:212.80, change:5.60, changePercent:2.63, volume:8_840_000, marketCap:55_000_000_000, peRatio:42.8, eps:5.10, beta:3.12, dayLow:213.60, dayHigh:221.40, yearLow:103.46, yearHigh:349.75, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  XYZ:  { symbol:'XYZ',  name:'Block Inc.', sector:'Financial Services', industry:'Digital Payments', price:68.40, previousClose:66.80, change:1.60, changePercent:2.40, volume:9_840_000, marketCap:43_000_000_000, peRatio:28.4, eps:2.41, beta:2.18, dayLow:67.00, dayHigh:69.60, yearLow:47.22, yearHigh:100.57, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  HOOD: { symbol:'HOOD', name:'Robinhood Markets Inc.', sector:'Financial Services', industry:'Online Brokerage', price:24.80, previousClose:23.60, change:1.20, changePercent:5.08, volume:14_840_000, marketCap:22_000_000_000, peRatio:0, eps:-0.56, beta:2.04, dayLow:23.80, dayHigh:25.40, yearLow:9.74, yearHigh:63.80, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  SOFI: { symbol:'SOFI', name:'SoFi Technologies Inc.', sector:'Financial Services', industry:'Digital Banking', price:12.40, previousClose:12.00, change:0.40, changePercent:3.33, volume:38_840_000, marketCap:12_000_000_000, peRatio:0, eps:-0.38, beta:1.84, dayLow:12.00, dayHigh:12.80, yearLow:6.01, yearHigh:17.39, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  AFRM: { symbol:'AFRM', name:'Affirm Holdings Inc.', sector:'Financial Services', industry:'Buy Now Pay Later', price:38.40, previousClose:37.20, change:1.20, changePercent:3.23, volume:7_840_000, marketCap:12_000_000_000, peRatio:0, eps:-1.84, beta:2.88, dayLow:37.40, dayHigh:39.20, yearLow:21.39, yearHigh:62.30, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── GAMING & ENTERTAINMENT ────────────────────────────────────────────────
  RBLX: { symbol:'RBLX', name:'Roblox Corporation', sector:'Communication Services', industry:'Gaming Platform', price:48.40, previousClose:47.20, change:1.20, changePercent:2.54, volume:8_840_000, marketCap:28_000_000_000, peRatio:0, eps:-0.64, beta:1.68, dayLow:47.40, dayHigh:49.20, yearLow:24.84, yearHigh:57.93, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  EA:   { symbol:'EA',   name:'Electronic Arts Inc.', sector:'Communication Services', industry:'Video Games', price:138.40, previousClose:136.80, change:1.60, changePercent:1.17, volume:2_840_000, marketCap:37_000_000_000, peRatio:30.4, dividendYield:0.62, eps:4.55, beta:0.68, dayLow:137.00, dayHigh:139.80, yearLow:108.07, yearHigh:148.62, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  TTWO: { symbol:'TTWO', name:'Take-Two Interactive', sector:'Communication Services', industry:'Video Games', price:178.40, previousClose:175.80, change:2.60, changePercent:1.48, volume:1_840_000, marketCap:34_000_000_000, peRatio:0, eps:-11.84, beta:1.18, dayLow:176.00, dayHigh:180.20, yearLow:137.24, yearHigh:196.98, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── STREAMING & SOCIAL MEDIA ──────────────────────────────────────────────
  SPOT: { symbol:'SPOT', name:'Spotify Technology SA', sector:'Communication Services', industry:'Music Streaming', price:468.40, previousClose:460.20, change:8.20, changePercent:1.78, volume:1_640_000, marketCap:95_000_000_000, peRatio:94.8, eps:4.94, beta:1.44, dayLow:461.40, dayHigh:471.20, yearLow:214.14, yearHigh:534.42, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  PINS: { symbol:'PINS', name:'Pinterest Inc.', sector:'Communication Services', industry:'Social Media', price:28.40, previousClose:27.80, change:0.60, changePercent:2.16, volume:12_840_000, marketCap:19_000_000_000, peRatio:24.8, eps:1.15, beta:1.24, dayLow:27.80, dayHigh:28.80, yearLow:21.97, yearHigh:36.34, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  SNAP: { symbol:'SNAP', name:'Snap Inc.', sector:'Communication Services', industry:'Social Media', price:9.80, previousClose:9.40, change:0.40, changePercent:4.26, volume:28_840_000, marketCap:16_000_000_000, peRatio:0, eps:-0.43, beta:1.88, dayLow:9.40, dayHigh:10.00, yearLow:7.77, yearHigh:16.41, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  ROKU: { symbol:'ROKU', name:'Roku Inc.', sector:'Communication Services', industry:'Streaming Hardware & Platform', price:68.40, previousClose:66.80, change:1.60, changePercent:2.40, volume:6_840_000, marketCap:9_700_000_000, peRatio:0, eps:-0.56, beta:2.02, dayLow:67.00, dayHigh:69.60, yearLow:42.45, yearHigh:90.50, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  TTD:  { symbol:'TTD',  name:'The Trade Desk Inc.', sector:'Technology', industry:'Programmatic Advertising', price:68.40, previousClose:66.80, change:1.60, changePercent:2.40, volume:7_840_000, marketCap:34_000_000_000, peRatio:68.4, eps:1.00, beta:1.58, dayLow:67.00, dayHigh:69.60, yearLow:52.62, yearHigh:131.40, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── GIG ECONOMY ───────────────────────────────────────────────────────────
  ABNB: { symbol:'ABNB', name:'Airbnb Inc.', sector:'Consumer Discretionary', industry:'Vacation Rental Platform', price:138.40, previousClose:136.00, change:2.40, changePercent:1.76, volume:5_840_000, marketCap:88_000_000_000, peRatio:18.4, eps:7.52, beta:1.24, dayLow:136.40, dayHigh:140.00, yearLow:107.42, yearHigh:170.10, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  DASH: { symbol:'DASH', name:'DoorDash Inc.', sector:'Consumer Discretionary', industry:'Food Delivery', price:178.40, previousClose:174.80, change:3.60, changePercent:2.06, volume:4_840_000, marketCap:75_000_000_000, peRatio:0, eps:-1.64, beta:1.48, dayLow:175.20, dayHigh:180.20, yearLow:97.38, yearHigh:214.49, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  LYFT: { symbol:'LYFT', name:'Lyft Inc.', sector:'Consumer Discretionary', industry:'Ridesharing', price:14.40, previousClose:14.00, change:0.40, changePercent:2.86, volume:18_840_000, marketCap:6_400_000_000, peRatio:0, eps:-1.84, beta:1.94, dayLow:14.00, dayHigh:14.80, yearLow:8.73, yearHigh:21.38, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── ENTERPRISE SAAS ───────────────────────────────────────────────────────
  NOW:  { symbol:'NOW',  name:'ServiceNow Inc.', sector:'Technology', industry:'Enterprise Workflow', price:898.40, previousClose:888.20, change:10.20, changePercent:1.15, volume:840_000, marketCap:184_000_000_000, peRatio:78.4, eps:11.46, beta:1.04, dayLow:889.40, dayHigh:902.40, yearLow:667.17, yearHigh:1089.57, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  DDOG: { symbol:'DDOG', name:'Datadog Inc.', sector:'Technology', industry:'Cloud Monitoring', price:118.40, previousClose:116.20, change:2.20, changePercent:1.89, volume:3_840_000, marketCap:38_000_000_000, peRatio:264.8, eps:0.45, beta:1.42, dayLow:116.60, dayHigh:120.00, yearLow:83.74, yearHigh:155.23, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  ZM:   { symbol:'ZM',   name:'Zoom Video Communications', sector:'Technology', industry:'Video Conferencing', price:68.40, previousClose:67.00, change:1.40, changePercent:2.09, volume:4_840_000, marketCap:20_000_000_000, peRatio:24.8, dividendYield:0, eps:2.76, beta:0.94, dayLow:67.20, dayHigh:69.40, yearLow:55.82, yearHigh:96.97, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  DOCU: { symbol:'DOCU', name:'DocuSign Inc.', sector:'Technology', industry:'e-Signature Software', price:58.40, previousClose:57.20, change:1.20, changePercent:2.10, volume:5_840_000, marketCap:11_700_000_000, peRatio:34.8, eps:1.68, beta:1.04, dayLow:57.40, dayHigh:59.40, yearLow:43.99, yearHigh:82.35, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── INTERNATIONAL ─────────────────────────────────────────────────────────
  BABA: { symbol:'BABA', name:'Alibaba Group Holding', sector:'Consumer Discretionary', industry:'Chinese E-commerce', price:88.40, previousClose:86.80, change:1.60, changePercent:1.84, volume:18_840_000, marketCap:215_000_000_000, peRatio:12.4, dividendYield:1.62, eps:7.13, beta:0.68, dayLow:87.00, dayHigh:89.60, yearLow:68.63, yearHigh:117.82, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  MELI: { symbol:'MELI', name:'MercadoLibre Inc.', sector:'Consumer Discretionary', industry:'Latin American E-commerce', price:1_884.40, previousClose:1_860.20, change:24.20, changePercent:1.30, volume:340_000, marketCap:95_000_000_000, peRatio:68.4, eps:27.56, beta:1.44, dayLow:1_862.40, dayHigh:1_892.00, yearLow:1_452.80, yearHigh:2_126.47, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  NVO:  { symbol:'NVO',  name:'Novo Nordisk A/S', sector:'Healthcare', industry:'Obesity & Diabetes Drugs', price:74.80, previousClose:73.60, change:1.20, changePercent:1.63, volume:8_840_000, marketCap:348_000_000_000, peRatio:28.4, dividendYield:1.42, eps:2.63, beta:0.42, dayLow:73.80, dayHigh:75.60, yearLow:65.34, yearHigh:148.50, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── CRYPTO-ADJACENT ───────────────────────────────────────────────────────
  MSTR: { symbol:'MSTR', name:'MicroStrategy Inc.', sector:'Technology', industry:'Business Intelligence & Bitcoin', price:338.40, previousClose:324.80, change:13.60, changePercent:4.19, volume:7_840_000, marketCap:46_000_000_000, peRatio:0, eps:-44.10, beta:3.24, dayLow:325.60, dayHigh:342.40, yearLow:107.44, yearHigh:543.00, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  IBIT: { symbol:'IBIT', name:'iShares Bitcoin Trust ETF', sector:'ETF', industry:'Bitcoin Spot ETF', price:48.40, previousClose:46.80, change:1.60, changePercent:3.42, volume:38_840_000, marketCap:0, dividendYield:0, beta:3.48, dayLow:47.00, dayHigh:49.20, yearLow:23.51, yearHigh:58.79, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── EV & FUTURE MOBILITY ─────────────────────────────────────────────────
  RIVN: { symbol:'RIVN', name:'Rivian Automotive Inc.', sector:'Consumer Discretionary', industry:'Electric Trucks & Vans', price:14.40, previousClose:13.80, change:0.60, changePercent:4.35, volume:38_840_000, marketCap:14_000_000_000, peRatio:0, eps:-4.38, beta:2.34, dayLow:13.80, dayHigh:14.80, yearLow:8.26, yearHigh:24.87, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
  LCID: { symbol:'LCID', name:'Lucid Group Inc.', sector:'Consumer Discretionary', industry:'Luxury Electric Vehicles', price:2.84, previousClose:2.72, change:0.12, changePercent:4.41, volume:48_840_000, marketCap:7_500_000_000, peRatio:0, eps:-1.48, beta:2.18, dayLow:2.72, dayHigh:2.94, yearLow:2.08, yearHigh:4.43, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },

  // ── CONSUMER HEALTH & WELLNESS ────────────────────────────────────────────
  HIMS: { symbol:'HIMS', name:'Hims & Hers Health Inc.', sector:'Healthcare', industry:'Telehealth & Wellness', price:28.40, previousClose:27.20, change:1.20, changePercent:4.41, volume:12_840_000, marketCap:6_900_000_000, peRatio:68.4, eps:0.42, beta:1.84, dayLow:27.40, dayHigh:29.00, yearLow:9.58, yearHigh:37.83, exchange:'NYSE', lastUpdated:STATIC_SNAPSHOT_DATE },
  DKNG: { symbol:'DKNG', name:'DraftKings Inc.', sector:'Consumer Discretionary', industry:'Sports Betting', price:38.40, previousClose:37.20, change:1.20, changePercent:3.23, volume:8_840_000, marketCap:18_000_000_000, peRatio:0, eps:-0.74, beta:1.94, dayLow:37.40, dayHigh:39.20, yearLow:28.00, yearHigh:49.57, exchange:'NASDAQ', lastUpdated:STATIC_SNAPSHOT_DATE },
};

// ============================================================================
// LIVE PRICES (from the price robot)
// Holds the last real price per symbol. No fabricated movement: a symbol
// shows its static snapshot price until the robot delivers a real one.
// ============================================================================

/**
 * Old tickers that may still be in saved portfolios. Block Inc. changed
 * SQ → XYZ in January 2025; getStock('SQ') answers with XYZ's data under the
 * SQ symbol, so a saved SQ position keeps its price.
 */
export const SYMBOL_ALIASES: Readonly<Record<string, string>> = { SQ: 'XYZ' };

function canonical(symbol: string): string {
  const upper = symbol.toUpperCase();
  return SYMBOL_ALIASES[upper] ?? upper;
}

/**
 * How long a price fetched from the robot counts as confirmed. Past this
 * without a successful refresh it's shown as "saved", and isLiveQuote() stops
 * accepting it for trades and position marks.
 */
export const CONFIRMED_FOR_MS = 5 * 60 * 1000;

export interface LiveQuoteInput {
  p: number;              // last trade price
  pc: number | null;      // previous close
  t: string;              // ISO trade time
  src: 'alpaca' | 'finnhub';
  hi?: number;
  lo?: number;
}

interface LiveEntry extends LiveQuoteInput {
  origin: 'live' | 'saved';
  fetchedAt: number;
}

const _live: Record<string, LiveEntry> = {};

/**
 * Stores prices from the robot. `origin` says where they came from: 'live'
 * (fetched from the robot just now) or 'saved' (read back from the device).
 * A saved price never replaces a live one, and an older trade never replaces
 * a newer one.
 */
export function applyLiveQuotes(
  quotes: Record<string, LiveQuoteInput>,
  origin: 'live' | 'saved',
  fetchedAt: number = Date.now(),
): number {
  let applied = 0;
  for (const [rawSymbol, q] of Object.entries(quotes)) {
    const sym = canonical(rawSymbol);
    if (!stockDatabase[sym]) continue;
    if (!q || !(q.p > 0) || !Number.isFinite(Date.parse(q.t))) continue;
    const prev = _live[sym];
    if (prev) {
      if (origin === 'saved' && prev.origin === 'live') continue;
      if (Date.parse(q.t) < Date.parse(prev.t)) continue;
    }
    _live[sym] = { ...q, origin, fetchedAt };
    applied++;
  }
  return applied;
}

/** Test helper: forget every live price. */
export function resetLivePrices(): void {
  for (const k of Object.keys(_live)) delete _live[k];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export function getStock(symbol: string): Stock | null {
  const requested = symbol.toUpperCase();
  const sym = canonical(requested);
  const base = stockDatabase[sym];
  if (!base) return null;

  const live = _live[sym];
  const currentPrice = live?.p ?? base.price;
  const previousClose = live?.pc ?? base.previousClose;
  const change = currentPrice - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  const stock: Stock = {
    ...base,
    // An alias (SQ) keeps the symbol it was asked for, so a saved position
    // under the old ticker still matches its price.
    symbol: requested,
    price: Math.round(currentPrice * 100) / 100,
    previousClose,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    // The real trade time when the robot has delivered a price; otherwise
    // the honest static snapshot date — never Date.now(), which would claim
    // a snapshot price just came in live.
    lastUpdated: live?.t ?? base.lastUpdated,
    // The fundamentals spread in from `base` above (marketCap, peRatio, eps,
    // dividendYield, beta, yearLow/High) are ALWAYS from the static snapshot.
    // Stamp that vintage explicitly so callers can tell a live price from
    // stale fundamentals on the same object.
    fundamentalsAsOf: base.fundamentalsAsOf ?? STATIC_SNAPSHOT_DATE,
  };
  if (live) {
    stock.priceSource = live.src;
    stock.priceOrigin = live.origin === 'live' && Date.now() - live.fetchedAt <= CONFIRMED_FOR_MS ? 'live' : 'saved';
    if (live.hi !== undefined) stock.dayHigh = live.hi;
    if (live.lo !== undefined) stock.dayLow = live.lo;
  }
  return stock;
}

export function getAllStocks(): Stock[] {
  return Object.keys(stockDatabase).map(sym => getStock(sym)!);
}

// Aliases used by older code
export const getAllTier1Stocks = (): Stock[] => getAllStocks();
export const getStocks = (symbols?: string[]): Stock[] => {
  if (!symbols || symbols.length === 0) return getAllStocks();
  return symbols
    .map(s => getStock(s))
    .filter((s): s is Stock => s !== null);
};

export function getAllSectors(): string[] {
  const set = new Set<string>();
  getAllStocks().forEach(s => set.add(s.sector));
  return Array.from(set);
}

export function searchStocks(query: string): Stock[] {
  const q = query.toLowerCase();
  return getAllStocks().filter(
    (s) => 
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  );
}

export function getStocksBySector(sector: string): Stock[] {
  return getAllStocks().filter(
    (s) => s.sector.toLowerCase() === sector.toLowerCase()
  );
}

// Previously this file also exported a LivePriceSimulator class — a second,
// unused implementation of the same random-walk-on-lastUpdated pattern
// removed above. It was never instantiated anywhere (no `.start()` caller
// existed), so deleted outright rather than left as a dead landmine.
