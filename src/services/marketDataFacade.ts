/**
 * Market Data Facade
 * 
 * The single import point for all stock data in the app.
 * Automatically uses Finnhub (real data) when EXPO_PUBLIC_FINNHUB_KEY is set,
 * and falls back to mock data from stockDataService.ts otherwise.
 * 
 * Usage:
 *   import { fetchStock, fetchStocks, fetchAllTier1 } from '../services/marketDataFacade';
 * 
 * When to switch screens to use this:
 * - When a Finnhub key is available
 * - When we need prices more recent than the mock simulation
 * - For portfolio value updates on pull-to-refresh
 * 
 * Note: All functions are async (even mock ones) to keep callers consistent.
 */

import { Stock } from '../types';
import { LIVE_DATA_ENABLED, getLiveStock, getLiveStocks } from './finnhubAdapter';
import { 
  getStock as getMockStock, 
  getAllTier1Stocks as getMockTier1,
  searchStocks as mockSearch,
  getAllSectors,
  getStocksBySector,
  isLiveQuote,
  formatAsOfDate,
  STATIC_SNAPSHOT_DATE,
} from './stockDataService';

export { getAllSectors, getStocksBySector };
export { LIVE_DATA_ENABLED, isLiveQuote };

/**
 * Fetch a single stock. Returns null if symbol unknown.
 */
export async function fetchStock(symbol: string): Promise<Stock | null> {
  if (LIVE_DATA_ENABLED) {
    return getLiveStock(symbol);
  }
  return getMockStock(symbol);
}

/**
 * Fetch multiple stocks by symbol list.
 */
export async function fetchStocks(symbols: string[]): Promise<Stock[]> {
  if (LIVE_DATA_ENABLED) {
    return getLiveStocks(symbols);
  }
  return symbols.map(s => getMockStock(s)).filter((s): s is Stock => s !== null);
}

/**
 * Fetch all Tier 1 approved stocks.
 */
export async function fetchAllTier1(): Promise<Stock[]> {
  if (LIVE_DATA_ENABLED) {
    const tier1 = getMockTier1(); // Get the list of symbols
    return getLiveStocks(tier1.map(s => s.symbol));
  }
  return getMockTier1();
}

/**
 * Search stocks by query string.
 */
export async function searchStocks(query: string): Promise<Stock[]> {
  // Search always uses mock list (Finnhub search is a different endpoint)
  // We only use Finnhub for price data, not the stock list itself
  return mockSearch(query);
}

/**
 * Synchronous version for when you need an immediate value.
 *
 * Always reads from the mock store (getMockStock/stockDataService), which is
 * NOT stale even in live mode: initializeLivePrices() (called once at app
 * boot) patches this store's simulated prices with real Finnhub quotes on a
 * background interval. Previously this returned null whenever
 * LIVE_DATA_ENABLED was true, which meant every screen calling this
 * synchronously (TradeScreen, HomeScreen's watchlist, journal price lookups)
 * silently got no stock and rendered blank — this was the root cause of
 * "trading doesn't work on web."
 */
export function getStockSync(symbol: string): Stock | null {
  return getMockStock(symbol);
}

/**
 * Builds the symbol→price map that updatePositionPrices() writes into saved
 * positions, dropping any symbol whose quote did not actually come back live.
 *
 * Why this filter has to exist at all: getLiveStock() answers a rate limit or
 * a bad quote by returning the static January snapshot with no error and no
 * marker, so fetchStocks() hands back a well-formed array silently mixing
 * real and snapshot prices. Writing those marked AAPL at its January $211.45
 * against a live $336.13 — a fabricated 37% loss on a winning position,
 * stamped with a fresh lastUpdatedAt and synced to Firestore.
 *
 * A position's currentPrice/currentValue/unrealizedGain are only a cache of
 * derived display state; shares/averageCost/totalCost are the real record and
 * are never touched here. So the correct response to a failed fetch is to
 * leave the previous mark standing — updatePositionPrices() already skips any
 * symbol missing from the map. Omission is the whole mechanism.
 *
 * The filter applies ONLY when live data is expected. With no Finnhub key the
 * app is a deliberate simulation and snapshot prices are the intended marks,
 * so everything passes through.
 *
 * Note this is not merely cosmetic: totalValue feeds the Tier 1 20% position
 * limit in executeTrade(), and is published to public_stats, which backs the
 * leaderboard and classroom roster. A bad mark escapes the device.
 */
export function buildPositionPriceMap(stocks: Stock[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const stock of stocks) {
    if (!stock || !(stock.price > 0)) continue;
    if (LIVE_DATA_ENABLED && !isLiveQuote(stock)) continue;
    map[stock.symbol] = stock.price;
  }
  return map;
}

/**
 * Data-source label for the price a screen is actually showing.
 *
 * Pass the Stock being rendered. The label is derived from that stock's own
 * lastUpdated, so a symbol that fell back to the static snapshot is labelled
 * as such even while other symbols on the same device are live. Called with
 * no stock it reports loading rather than guessing.
 */
export function getDataSourceLabel(stock?: Stock | null): string {
  if (!LIVE_DATA_ENABLED) return 'Simulated prices';
  if (!stock) return 'Loading price…';

  // A key being configured says nothing about THIS symbol. When a quote
  // didn't land (rate limit, network error, empty ticker) the stock carries
  // the January static snapshot, and the label has to say so — the old
  // version printed "Delayed up to 15 min · Finnhub" over snapshot prices.
  if (!isLiveQuote(stock)) return `Not live · static snapshot, ${formatSnapshotDate()}`;

  return `Finnhub quote · ${formatQuoteAge(stock.lastUpdated)}`;
}

function formatSnapshotDate(): string {
  // Shared with the signal engine's "as of" copy so the two can't drift.
  // formatAsOfDate forces UTC; local formatting rendered the UTC-midnight
  // constant as "Jan 14" for a Jan 15 snapshot.
  return formatAsOfDate(STATIC_SNAPSHOT_DATE);
}

/**
 * Age of the quote itself, from Finnhub's own timestamp — not the time we
 * fetched it. Quotes are cached per device for up to 15 minutes and the
 * exchange timestamp stops advancing when the market closes, so over a
 * weekend this correctly reads "2 d ago" instead of implying freshness.
 */
function formatQuoteAge(lastUpdated: string): string {
  const ms = Date.now() - new Date(lastUpdated).getTime();
  if (!Number.isFinite(ms)) return 'time unknown';
  if (ms < 60_000) return 'moments ago';

  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min ago`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  // Past a week, an absolute date is more useful than a growing day count.
  if (days > 7) {
    return new Date(lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return `${days} d ago`;
}
