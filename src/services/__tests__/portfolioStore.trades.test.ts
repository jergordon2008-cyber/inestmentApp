import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { usePortfolioStore } from '../portfolioStore';
import type { Portfolio, Stock } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const stock = { symbol: 'AAPL' } as Stock;
const PREDICTION = {
  buyReason: 'Services revenue keeps growing faster than hardware this year',
  exitPlan: 'If services growth drops below 5% for two quarters I am wrong',
};
const buy = (shares: number, price: number, symbol = 'AAPL') =>
  usePortfolioStore.getState().executeTrade({ symbol, type: 'buy', shares, pricePerShare: price, stock, userTier: 2, ...PREDICTION });
const sell = (shares: number, price: number, symbol = 'AAPL') =>
  usePortfolioStore.getState().executeTrade({ symbol, type: 'sell', shares, pricePerShare: price, stock, userTier: 2 });
const current = () => usePortfolioStore.getState().portfolio!;
/** Deep copy, to compare a previous state against what it held at the time. */
const snapshot = (p: Portfolio): Portfolio => JSON.parse(JSON.stringify(p));

beforeEach(() => {
  usePortfolioStore.setState({ portfolio: null });
  usePortfolioStore.getState().initializePortfolio('u1');
});

describe('executeTrade — buy', () => {
  it('opens a new position and takes the cash', () => {
    expect(buy(10, 100).success).toBe(true);
    const p = current();
    expect(p.currentCash).toBe(100_000 - 1000);
    expect(p.positions).toHaveLength(1);
    expect(p.positions[0]).toMatchObject({ symbol: 'AAPL', shares: 10, averageCost: 100, totalCost: 1000, currentValue: 1000 });
    expect(p.trades).toHaveLength(1);
    expect(p.totalValue).toBe(100_000);
  });

  it('adds to an existing position with a new average cost', () => {
    buy(10, 100);
    buy(10, 200);
    const pos = current().positions[0];
    expect(pos).toMatchObject({ shares: 20, totalCost: 3000, averageCost: 150, currentPrice: 200, currentValue: 4000, unrealizedGain: 1000 });
    expect(current().currentCash).toBe(100_000 - 3000);
  });

  it('does not mutate the previous state when adding to a position (B2)', () => {
    buy(10, 100);
    const before = current();
    const beforeCopy = snapshot(before);
    buy(10, 200);
    expect(before).toEqual(beforeCopy);            // old portfolio unchanged
    expect(current().positions).not.toBe(before.positions);
    expect(current().positions[0]).not.toBe(before.positions[0]);
  });

  it('refuses without a prediction, or without enough cash, and leaves state alone', () => {
    const before = current();
    expect(usePortfolioStore.getState().executeTrade({ symbol: 'AAPL', type: 'buy', shares: 1, pricePerShare: 100, stock, userTier: 2 }).success).toBe(false);
    expect(buy(10_000, 100).success).toBe(false);
    expect(current()).toBe(before);
  });
});

describe('executeTrade — sell', () => {
  it('partially sells: shares, cost basis and cash update', () => {
    buy(10, 100);
    expect(sell(4, 150).success).toBe(true);
    const p = current();
    expect(p.positions[0]).toMatchObject({ shares: 6, totalCost: 600, averageCost: 100, currentValue: 900, unrealizedGain: 300 });
    expect(p.currentCash).toBe(100_000 - 1000 + 600);
    expect(p.trades.map(t => t.type)).toEqual(['buy', 'sell']);
  });

  it('does not mutate the previous state on a partial sell (B2)', () => {
    buy(10, 100);
    const before = current();
    const beforeCopy = snapshot(before);
    sell(4, 150);
    expect(before).toEqual(beforeCopy);
    expect(before.positions[0].shares).toBe(10);
  });

  it('a full sell removes the position without touching the previous state', () => {
    buy(10, 100);
    const before = current();
    const beforeCopy = snapshot(before);
    expect(sell(10, 120).success).toBe(true);
    expect(current().positions).toHaveLength(0);
    expect(current().currentCash).toBe(100_000 + 200);
    expect(before).toEqual(beforeCopy);
  });

  it('refuses selling more than held or a symbol not held', () => {
    buy(10, 100);
    const before = current();
    expect(sell(11, 100).success).toBe(false);
    expect(sell(1, 100, 'MSFT').success).toBe(false);
    expect(current()).toBe(before);
  });

  it('other positions keep their identity across a trade', () => {
    buy(10, 100);
    buy(5, 300, 'MSFT');
    const msftBefore = current().positions.find(p => p.symbol === 'MSFT');
    sell(5, 100);
    expect(current().positions.find(p => p.symbol === 'MSFT')).toBe(msftBefore);
  });
});
