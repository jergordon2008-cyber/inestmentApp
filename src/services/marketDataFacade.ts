/**
 * Market Data Facade
 *
 * The single import point for all stock data in the app. With
 * EXPO_PUBLIC_PRICE_API_URL set, prices come from the price robot (our
 * Cloudflare Worker; see priceRobotAdapter.ts). Without it, the app runs on
 * the static January snapshot as a deliberate simulation (local dev).
 *
 * Every function answers quickly: they read the in-memory store, after at
 * most one robot request with a 5-second timeout. A failed request leaves
 * the last known price in place, labelled for what it is.
 *
 * Usage:
 *   import { fetchStock, fetchStocks, fetchAllTier1 } from '../services/marketDataFacade';
 */

import { Stock } from '../types';
import { LIVE_DATA_ENABLED, ensureFresh, getStockPriceLabel, refreshQuote } from './priceRobotAdapter';
import { TIER_1_APPROVED_SYMBOLS } from './portfolioStore';
import {
  getStock,
  getAllTier1Stocks as getAllStocksFromStore,
  searchStocks as storeSearch,
  getAllSectors,
  getStocksBySector,
  isLiveQuote,
} from './stockDataService';

export { getAllSectors, getStocksBySector };
export { LIVE_DATA_ENABLED, isLiveQuote };

/**
 * One stock, asking the robot for that ticker first. The robot refetches it
 * from Alpaca if its price is more than 4 minutes old, so a stock a student
 * opens jumps the queue. Returns null only for an unknown symbol.
 */
export async function fetchStock(symbol: string): Promise<Stock | null> {
  if (LIVE_DATA_ENABLED) await refreshQuote(symbol);
  return getStock(symbol);
}

/**
 * Several stocks by symbol, from the store. Refreshes all prices first if the
 * last robot answer is more than 2 minutes old (one request for every ticker).
 */
export async function fetchStocks(symbols: string[]): Promise<Stock[]> {
  await ensureFresh();
  return symbols.map(s => getStock(s)).filter((s): s is Stock => s !== null);
}

/**
 * Every stock in the app's list.
 */
export async function fetchAllTier1(): Promise<Stock[]> {
  await ensureFresh();
  return getAllStocksFromStore();
}

/**
 * Stocks the browse screen should show — and therefore fetch quotes for.
 *
 * Tier 1 is capped to the approved blue-chip list that executeTrade actually
 * enforces, rather than the full list (110): a Tier 1 student browsing all
 * 110 could pick a stock and only find out it was blocked at the buy screen.
 * Tier 2+ isn't gated in executeTrade, so those students see everything.
 */
export async function fetchBrowsableStocks(userTier: number): Promise<Stock[]> {
  if (userTier > 1) return fetchAllTier1();
  const symbols = getAllStocksFromStore()
    .map(s => s.symbol)
    .filter(sym => TIER_1_APPROVED_SYMBOLS.includes(sym));
  return fetchStocks(symbols);
}

/**
 * Search stocks by query string.
 */
export async function searchStocks(query: string): Promise<Stock[]> {
  // Search runs over the app's own list; the robot only supplies prices.
  return storeSearch(query);
}

/**
 * Synchronous version for when you need an immediate value: the best price
 * already on the device (live, saved, or the January snapshot). Never null
 * for a known symbol, so screens never render blank.
 */
export function getStockSync(symbol: string): Stock | null {
  return getStock(symbol);
}

/**
 * Builds the symbol→price map that updatePositionPrices() writes into saved
 * positions, dropping any symbol whose quote did not actually come back live.
 *
 * Why this filter has to exist at all: fetchStocks() always returns a
 * well-formed array, silently mixing confirmed live prices with saved ones and
 * the static January snapshot (whatever is on the device). Writing a snapshot
 * price would mark AAPL at its January $211.45 against a live $336.13 — a
 * fabricated 37% loss on a winning position, stamped with a fresh
 * lastUpdatedAt and synced to Firestore.
 *
 * A position's currentPrice/currentValue/unrealizedGain are only a cache of
 * derived display state; shares/averageCost/totalCost are the real record and
 * are never touched here. So the correct response to a failed fetch is to
 * leave the previous mark standing — updatePositionPrices() already skips any
 * symbol missing from the map. Omission is the whole mechanism.
 *
 * The filter applies ONLY when live data is expected. With no robot URL the
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
 * Data-source label for the price a screen is actually showing, derived from
 * that stock's own trade time and source: "Price as of 3:58 PM · Alpaca",
 * "Closing price · Oct 2 · Finnhub", "Saved price from …", or the snapshot
 * notice. See also PriceCredit for the shared "Prices from Alpaca/Finnhub".
 */
export function getDataSourceLabel(stock?: Stock | null): string {
  return getStockPriceLabel(stock ?? null);
}
