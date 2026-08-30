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
} from './stockDataService';

export { getAllSectors, getStocksBySector };
export { LIVE_DATA_ENABLED };

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
 * Get a data source label for UI display. Prices can be cached up to 15
 * minutes per device (see finnhubAdapter's CACHE_TTL_MS), so this is
 * disclosed as delayed rather than real-time.
 */
export function getDataSourceLabel(): string {
  return LIVE_DATA_ENABLED ? 'Delayed up to 15 min · Finnhub' : 'Simulated prices';
}
