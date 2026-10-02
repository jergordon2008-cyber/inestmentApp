import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { usePortfolioStore } from '../portfolioStore';
import type { Portfolio, Position } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const T0 = '2026-01-01T00:00:00.000Z';

function position(symbol: string, shares: number, cost: number, price: number): Position {
  return {
    id: `pos-${symbol}`, portfolioId: 'pf', symbol, shares,
    averageCost: cost, totalCost: shares * cost,
    currentPrice: price, currentValue: shares * price,
    unrealizedGain: shares * (price - cost), unrealizedGainPercent: ((price - cost) / cost) * 100,
    firstPurchasedAt: T0, lastUpdatedAt: T0,
  } as Position;
}

function seed(): Portfolio {
  usePortfolioStore.getState().setPortfolio({
    id: 'pf', userId: 'u1', name: 'Main Portfolio', type: 'paper',
    initialCash: 100_000, currentCash: 80_000, totalValue: 0, totalReturn: 0, totalReturnPercent: 0,
    dayChange: 0, dayChangePercent: 0,
    positions: [position('AAPL', 10, 100, 110), position('MSFT', 5, 200, 200)],
    trades: [], createdAt: T0, updatedAt: T0,
  });
  return usePortfolioStore.getState().portfolio!;
}

describe('updatePositionPrices', () => {
  let before: Portfolio;
  beforeEach(() => { before = seed(); });

  it('no change → no update: identical prices leave the store untouched', () => {
    const listener = jest.fn();
    const unsubscribe = usePortfolioStore.subscribe(listener);
    usePortfolioStore.getState().updatePositionPrices({ AAPL: 110, MSFT: 200 });
    unsubscribe();
    expect(listener).not.toHaveBeenCalled();
    expect(usePortfolioStore.getState().portfolio).toBe(before);
  });

  it('no change → no update: an empty price map (rate-limited fetch) does nothing', () => {
    usePortfolioStore.getState().updatePositionPrices({});
    expect(usePortfolioStore.getState().portfolio).toBe(before);
  });

  it('no change → no update: prices only for symbols not held do nothing', () => {
    usePortfolioStore.getState().updatePositionPrices({ TSLA: 300 });
    expect(usePortfolioStore.getState().portfolio).toBe(before);
  });

  it('a changed price updates that position and the totals, and keeps the others as-is', () => {
    usePortfolioStore.getState().updatePositionPrices({ AAPL: 120, MSFT: 200 });
    const after = usePortfolioStore.getState().portfolio!;
    expect(after).not.toBe(before);
    const aapl = after.positions.find(p => p.symbol === 'AAPL')!;
    expect(aapl.currentPrice).toBe(120);
    expect(aapl.currentValue).toBe(1200);
    expect(aapl.unrealizedGain).toBe(200);
    expect(after.positions.find(p => p.symbol === 'MSFT')).toBe(before.positions[1]);
    expect(after.totalValue).toBe(80_000 + 1200 + 1000);
    // previous state not mutated
    expect(before.positions[0].currentPrice).toBe(110);
  });

  it('the same price still repairs a position whose value is out of step with it', () => {
    const p = usePortfolioStore.getState().portfolio!;
    usePortfolioStore.setState({
      portfolio: { ...p, positions: [{ ...p.positions[0], currentValue: 999 }, p.positions[1]] },
    });
    usePortfolioStore.getState().updatePositionPrices({ AAPL: 110 });
    expect(usePortfolioStore.getState().portfolio!.positions[0].currentValue).toBe(1100);
  });
});
