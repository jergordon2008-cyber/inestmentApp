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
import { getAllTier1Stocks, getStock as getMockStock } from './stockDataService';

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
    const [quoteRes, profileRes] = await Promise.all([
      fetch(`${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_KEY}`),
      fetch(`${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`),
    ]);
    
    if (!quoteRes.ok || !profileRes.ok) {
      throw new Error('API response not ok');
    }
    
    const [quote, profile] = await Promise.all([
      quoteRes.json() as Promise<FinnhubQuote>,
      profileRes.json() as Promise<FinnhubProfile>,
    ]);
    
    // Validate we got real data (Finnhub returns empty objects for unknown symbols)
    if (!quote.c || !profile.name) {
      // No real data in the response — show the last real quote we have
      // (with its real timestamp) rather than substituting a static price.
      if (cached) return cached.data;
      return getMockStock(symbol);
    }

    const stock = mapFinnhubToStock(symbol, quote, profile);
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
 * Get multiple stocks in parallel.
 * Rate-limited to 10 concurrent requests for Finnhub free tier.
 */
export async function getLiveStocks(symbols: string[]): Promise<Stock[]> {
  if (!LIVE_DATA_ENABLED) {
    return getAllTier1Stocks();
  }
  
  // Batch into groups of 10 to respect rate limits
  const batches: string[][] = [];
  for (let i = 0; i < symbols.length; i += 10) {
    batches.push(symbols.slice(i, i + 10));
  }
  
  const results: Stock[] = [];
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(symbol => getLiveStock(symbol))
    );
    results.push(...batchResults.filter((s): s is Stock => s !== null));
    
    // Small delay between batches to avoid rate limits
    if (batches.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
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
    const res = await fetch(
      `${FINNHUB_BASE}/company-news?symbol=${symbol}&from=${weekAgo}&to=${today}&token=${FINNHUB_KEY}`
    );
    const items: FinnhubNewsItem[] = await res.json();
    return items.slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * Get company earnings surprises (last 4 quarters).
 * Used to generate "earnings beat" signals.
 */
export async function getEarningsSurprises(symbol: string): Promise<EarningsSurprise[]> {
  if (!LIVE_DATA_ENABLED) return [];
  
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/stock/earnings?symbol=${symbol}&limit=4&token=${FINNHUB_KEY}`
    );
    return await res.json();
  } catch {
    return [];
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

interface FinnhubProfile {
  name: string;
  ticker: string;
  exchange: string;
  finnhubIndustry: string;
  marketCapitalization: number; // In millions
  shareOutstanding: number;
  logo: string;
  weburl: string;
  country: string;
  currency: string;
  ipo: string;
}

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
  quote: FinnhubQuote,
  profile: FinnhubProfile
): Stock {
  // Static fallback used ONLY for stable descriptive metadata (name/exchange/
  // sector) in the rare case Finnhub's profile response omits them — never
  // for price or fundamentals. Previously this also supplied peRatio, eps,
  // dividendYield, beta, volume, and yearLow/High from the static mock file,
  // silently attached to an object whose lastUpdated came from a real,
  // just-fetched Finnhub quote — presenting frozen numbers as if they'd just
  // been refreshed. Finnhub's free /quote endpoint doesn't provide those
  // fields at all, so we now leave them undefined rather than fabricate
  // them; screens render '—' when a field isn't available.
  const mock = getMockStock(symbol);

  return {
    symbol,
    name: profile.name || mock?.name || symbol,
    exchange: (profile.exchange || mock?.exchange || 'NASDAQ') as 'NYSE' | 'NASDAQ' | 'AMEX',
    sector: profile.finnhubIndustry || mock?.sector || 'Technology',
    industry: profile.finnhubIndustry || mock?.industry || '',

    // Real live data
    price: quote.c,
    change: quote.d,
    changePercent: quote.dp,
    previousClose: quote.pc,
    dayHigh: quote.h,
    dayLow: quote.l,
    lastUpdated: new Date(quote.t * 1000).toISOString(),

    // Market cap is in millions from Finnhub
    marketCap: profile.marketCapitalization * 1_000_000,

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
  };
}
