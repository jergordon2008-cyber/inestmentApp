/**
 * Retired tickers (RETIRED_SYMBOLS, today just EA): left out of every list a
 * student can buy from, refused on buy, and still sellable by a holder at the
 * position's last mark. Runs in simulation mode (no robot URL); the live-mode
 * side is in priceRobotAdapter.test.ts.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { usePortfolioStore } from '../portfolioStore';
import {
  RETIRED_SYMBOLS, stockDatabase, getAllStocks, getAllTier1Stocks, getStocks, searchStocks,
  getStocksBySector, getAllSectors, getStock, isRetiredSymbol, retiredSellPrice, retiredPriceLabel,
} from '../stockDataService';
import { buildPositionPriceMap, fetchBrowsableStocks, searchStocks as facadeSearch } from '../marketDataFacade';
import type { Position, Stock } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const PREDICTION = {
  buyReason: 'Their next game launch brings back players who left last year',
  exitPlan: 'If monthly active players fall for two quarters I am wrong',
};
const current = () => usePortfolioStore.getState().portfolio!;

function eaPosition(shares: number, averageCost: number, lastMark: number): Position {
  return {
    id: 'pos_ea', portfolioId: 'p', symbol: 'EA', shares, averageCost,
    totalCost: shares * averageCost, currentPrice: lastMark, currentValue: shares * lastMark,
    unrealizedGain: shares * (lastMark - averageCost),
    unrealizedGainPercent: ((lastMark - averageCost) / averageCost) * 100,
    firstPurchasedAt: '2026-01-02T00:00:00.000Z', lastUpdatedAt: '2026-10-01T00:00:00.000Z',
  };
}

/** A portfolio holding 10 EA (bought at $120, last marked at $150) and $50,000 cash. */
function holdEA() {
  usePortfolioStore.setState({ portfolio: null });
  usePortfolioStore.getState().initializePortfolio('u1');
  const p = current();
  usePortfolioStore.getState().setPortfolio({ ...p, currentCash: 50_000, positions: [eaPosition(10, 120, 150)] });
}

describe('RETIRED_SYMBOLS', () => {
  it('EA is retired but keeps its database row, so saved positions still resolve', () => {
    expect(isRetiredSymbol('EA')).toBe(true);
    expect(isRetiredSymbol('ea')).toBe(true);
    expect(isRetiredSymbol('AAPL')).toBe(false);
    expect(RETIRED_SYMBOLS.EA).toBeTruthy();
    expect(stockDatabase.EA).toBeDefined();
    expect(getStock('EA')?.name).toBe('Electronic Arts Inc.');
    expect(retiredPriceLabel('EA')).toBe('Last known price · EA is no longer traded here');
  });
});

describe('lists a student can buy from', () => {
  const hasEA = (list: Stock[]) => list.some(s => s.symbol === 'EA');

  it('leave EA out of browse, search, sectors and the tier lists', async () => {
    expect(hasEA(getAllStocks())).toBe(false);
    expect(hasEA(getAllTier1Stocks())).toBe(false);
    expect(hasEA(getStocks())).toBe(false);
    expect(hasEA(getStocks(['EA', 'AAPL']))).toBe(false);
    expect(hasEA(searchStocks('EA'))).toBe(false);
    expect(hasEA(searchStocks('Electronic Arts'))).toBe(false);
    expect(hasEA(await facadeSearch('electronic'))).toBe(false);
    for (const sector of getAllSectors()) expect(hasEA(getStocksBySector(sector))).toBe(false);
    expect(hasEA(await fetchBrowsableStocks(1))).toBe(false);
    expect(hasEA(await fetchBrowsableStocks(2))).toBe(false);
  });

  it('still list every other ticker', () => {
    const tradable = Object.keys(stockDatabase).filter(s => !(s in RETIRED_SYMBOLS));
    expect(getAllStocks().map(s => s.symbol).sort()).toEqual(tradable.sort());
    expect(getAllStocks()).toHaveLength(Object.keys(stockDatabase).length - Object.keys(RETIRED_SYMBOLS).length);
    expect(searchStocks('Apple').some(s => s.symbol === 'AAPL')).toBe(true);
  });
});

describe('executeTrade with a retired ticker', () => {
  beforeEach(holdEA);

  it('refuses a buy, with a message, and leaves the portfolio alone', () => {
    const before = current();
    const r = usePortfolioStore.getState().executeTrade({
      symbol: 'EA', type: 'buy', shares: 1, pricePerShare: 138.4, stock: getStock('EA')!, userTier: 2, ...PREDICTION,
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/EA is no longer traded here/);
    expect(current()).toBe(before);
  });

  it('sells at the position\'s last mark, whatever price is passed, and keeps the totals right', () => {
    const r = usePortfolioStore.getState().executeTrade({
      symbol: 'EA', type: 'sell', shares: 4, pricePerShare: 138.4 /* the Jan snapshot */, stock: getStock('EA')!, userTier: 2,
    });
    expect(r.success).toBe(true);
    expect(r.trade).toMatchObject({ symbol: 'EA', type: 'sell', shares: 4, pricePerShare: 150, totalAmount: 600 });
    const p = current();
    expect(p.currentCash).toBe(50_600);
    expect(p.positions[0]).toMatchObject({ symbol: 'EA', shares: 6, currentPrice: 150, currentValue: 900, totalCost: 720 });
    expect(p.totalValue).toBe(50_600 + 900);
  });

  it('a full sell closes the position; value is unchanged by the sale', () => {
    const valueBefore = current().totalValue;
    expect(valueBefore).toBe(50_000 + 1500);
    const r = usePortfolioStore.getState().executeTrade({
      symbol: 'EA', type: 'sell', shares: 10, pricePerShare: 1, stock: getStock('EA')!, userTier: 2,
    });
    expect(r.success).toBe(true);
    expect(current().positions).toHaveLength(0);
    expect(current().currentCash).toBe(51_500);
    expect(current().totalValue).toBe(valueBefore);
  });

  it('a Tier 1 holder can still sell (EA is on no allowlist)', () => {
    const r = usePortfolioStore.getState().executeTrade({
      symbol: 'EA', type: 'sell', shares: 1, pricePerShare: 150, stock: getStock('EA')!, userTier: 1,
    });
    expect(r.success).toBe(true);
  });

  it('refuses a sell without a usable last mark rather than using the snapshot', () => {
    const p = current();
    usePortfolioStore.getState().setPortfolio({ ...p, positions: [{ ...eaPosition(10, 120, 150), currentPrice: 0 }] });
    const before = current();
    const r = usePortfolioStore.getState().executeTrade({
      symbol: 'EA', type: 'sell', shares: 1, pricePerShare: 138.4, stock: getStock('EA')!, userTier: 2,
    });
    expect(r.success).toBe(false);
    expect(current()).toBe(before);
  });

  it('price refreshes never rewrite the EA mark (not even to the snapshot)', () => {
    const before = current();
    // Simulation mode passes snapshot prices through for everything else.
    const map = buildPositionPriceMap([getStock('EA')!, getStock('AAPL')!]);
    expect(map.EA).toBeUndefined();
    expect(map.AAPL).toBeGreaterThan(0);
    usePortfolioStore.getState().updatePositionPrices({ EA: 138.4 });
    expect(current()).toBe(before);
    expect(current().positions[0].currentPrice).toBe(150);
  });
});

describe('every other ticker', () => {
  it('has no saved-price exception: retiredSellPrice is only for retired tickers', () => {
    const aapl = { ...eaPosition(10, 100, 200), symbol: 'AAPL' };
    expect(retiredSellPrice('AAPL', aapl)).toBeNull();
    expect(retiredSellPrice('EA', eaPosition(10, 100, 200))).toBe(200);
  });

  it('fills at the price the caller confirmed, as before', () => {
    usePortfolioStore.setState({ portfolio: null });
    usePortfolioStore.getState().initializePortfolio('u1');
    const stock = getStock('AAPL')!;
    expect(usePortfolioStore.getState().executeTrade({ symbol: 'AAPL', type: 'buy', shares: 2, pricePerShare: 300, stock, userTier: 2, ...PREDICTION }).success).toBe(true);
    const r = usePortfolioStore.getState().executeTrade({ symbol: 'AAPL', type: 'sell', shares: 1, pricePerShare: 310, stock, userTier: 2 });
    expect(r.trade?.pricePerShare).toBe(310);
  });
});
