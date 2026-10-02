/**
 * Portfolio Store
 *
 * Manages the user's paper trading portfolio. Enforces Tier 1 constraints:
 * - Only blue-chip stocks allowed for Tier 1 users
 * - Maximum 20% position size
 * - Minimum 2-week hold period
 * - No margin, no short selling
 *
 * As users progress to Tier 2/3, constraints loosen.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Portfolio, Position, Trade, TradeType, Stock, Tier } from '../types';
import { stockDatabase } from './stockDataService';
import { isPredictionTextValid } from './tradeJournalStore';

interface PortfolioState {
  portfolio: Portfolio | null;

  // Actions
  initializePortfolio: (userId: string, initialCash?: number) => void;
  setPortfolio: (portfolio: Portfolio) => void;
  executeTrade: (params: ExecuteTradeParams) => TradeResult;
  updatePositionPrices: (priceMap: Record<string, number>) => void;
  resetPortfolio: () => void;
}

interface ExecuteTradeParams {
  symbol: string;
  type: TradeType;
  shares: number;
  pricePerShare: number;
  stock: Stock;
  userTier: Tier;
  triggeredBySignal?: string;
  triggeredByLesson?: string;
  buyReason?: string;
  exitPlan?: string;
}

interface TradeResult {
  success: boolean;
  trade?: Trade;
  error?: string;
}

const INITIAL_CASH = 100_000; // $100k paper money to start
const TIER_1_MAX_POSITION_PERCENT = 0.20; // 20% max position
const TIER_1_MIN_HOLD_DAYS = 14; // 2 weeks

// Approved blue-chip symbols for Tier 1 users
// Exported so the stock browser can show Tier 1 students exactly what they're
// allowed to trade, instead of all 110 symbols — browsing to a stock only to
// be refused at the buy screen, and 110 quote requests where 44 would do.
//
// Every symbol here MUST have a stockDataService.stockDatabase entry (see the
// assertStockDataConsistency() check below). BRK.B, PG, ABBV, AVGO, CSCO, IBM
// and F were removed 2026-09 — they were approved to trade but had no
// database row, so the stock browser couldn't show them (filtered out by the
// intersection in marketDataFacade.fetchBrowsableStocks) and TradeScreen
// rendered blank for any of them (getStockSync returns null, early-return).
// Re-add a symbol here only alongside a real stockDatabase entry for it —
// see the fabrication-audit standing rule against invented data.
export const TIER_1_APPROVED_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  'JNJ', 'V', 'WMT', 'JPM', 'MA', 'HD', 'CVX',
  'KO', 'PEP', 'MRK', 'PFE', 'TMO', 'COST',
  'NKE', 'MCD', 'DIS', 'ADBE', 'NFLX', 'INTC', 'CMCSA',
  'XOM', 'BAC', 'UNH', 'VZ', 'T', 'GE',
  'SPY', 'VOO', 'VTI', 'QQQ', // ETFs allowed too
];

/**
 * Fails fast, at import time, if the allowlist and the database ever drift
 * apart again. TIER_1_APPROVED_SYMBOLS controls what executeTrade() will
 * accept; stockDatabase controls what any screen can actually render or
 * quote. A symbol approved without a database row is invisible to Browse
 * (filtered out of the intersection) and renders a silent blank on
 * TradeScreen (getStockSync returns null) — exactly the bug this list of
 * seven was. Thrown rather than logged so it's caught in development/CI,
 * not discovered by a student tapping Buy on a stock nothing can render.
 */
function assertStockDataConsistency(): void {
  const missing = TIER_1_APPROVED_SYMBOLS.filter(sym => !stockDatabase[sym]);
  if (missing.length > 0) {
    throw new Error(
      `TIER_1_APPROVED_SYMBOLS contains symbols with no stockDatabase entry: ` +
      `${missing.join(', ')}. Add a real entry to stockDatabase (never a ` +
      `placeholder) before approving a symbol for trading, or remove it ` +
      `from the allowlist.`
    );
  }
}
assertStockDataConsistency();

/**
 * Derives totalValue/totalReturn/totalReturnPercent from currentCash and the
 * sum of each position's own currentValue — never from a stored totalValue
 * field. This is the one place those three numbers get computed; every path
 * that produces a Portfolio (a fresh one, one loaded from Firestore, one
 * after a trade, one after a price refresh) runs through it, so the
 * portfolio-level total can't independently drift from what it's actually
 * made of. Before this, initializePortfolio/executeTrade/updatePositionPrices
 * each hand-rolled the same formula separately, and setPortfolio() (the
 * Firestore-load path) didn't recompute at all — it trusted whatever
 * totalValue happened to be stored, even if it no longer matched cash +
 * positions (a partial write, a manual data fix, a bug in a past version).
 *
 * Does NOT touch position.currentValue itself — that's the live-price
 * concern (see marketDataFacade.buildPositionPriceMap) — only re-sums
 * whatever is already on each position, so the portfolio-level total always
 * agrees with its own positions even when neither has been refreshed yet.
 */
function withRecomputedTotals(portfolio: Portfolio): Portfolio {
  const positionsValue = portfolio.positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalValue = portfolio.currentCash + positionsValue;
  const totalReturn = totalValue - portfolio.initialCash;
  const totalReturnPercent = portfolio.initialCash > 0 ? (totalReturn / portfolio.initialCash) * 100 : 0;
  return { ...portfolio, totalValue, totalReturn, totalReturnPercent };
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      portfolio: null,

      initializePortfolio: (userId, initialCash = INITIAL_CASH) => {
        const now = new Date().toISOString();
        const newPortfolio: Portfolio = withRecomputedTotals({
          id: `portfolio_${Date.now()}`,
          userId,
          name: 'Main Portfolio',
          type: 'paper',
          initialCash,
          currentCash: initialCash,
          totalValue: initialCash,
          totalReturn: 0,
          totalReturnPercent: 0,
          dayChange: 0,
          dayChangePercent: 0,
          positions: [],
          trades: [],
          createdAt: now,
          updatedAt: now,
        });
        set({ portfolio: newPortfolio });
      },

      // Hydrates the store from a full Portfolio object — e.g. loaded from
      // Firestore on sign-in or session restore. Recomputes totals rather
      // than trusting whatever was stored; see withRecomputedTotals above.
      setPortfolio: (portfolio) => set({ portfolio: withRecomputedTotals(portfolio) }),

      executeTrade: (params): TradeResult => {
        const { portfolio } = get();
        if (!portfolio) {
          return { success: false, error: 'No portfolio initialized' };
        }

        const { symbol, type, shares, pricePerShare, userTier } = params;
        const totalAmount = shares * pricePerShare;

        // ============= VALIDATION =============

        // Thesis gate. A buy needs a written prediction: the claim travels in
        // buyReason and the way-to-be-wrong in exitPlan, and both land on the
        // Trade record below — so the prediction survives even if the journal
        // write that follows a trade fails. Enforced here, at the one function
        // every trade goes through, because the entry points already leaked
        // (a web URL reaches the Trade screen without the prompt). Sells are
        // exempt by design: blocking a sale until you write something would
        // trap the position.
        if (type === 'buy' && !isPredictionTextValid(params.buyReason, params.exitPlan)) {
          return {
            success: false,
            error: 'Write your prediction before buying — what you expect to happen, and how you would know you were wrong.',
          };
        }

        // Tier 1: Only approved blue-chips
        if (userTier === 1 && !TIER_1_APPROVED_SYMBOLS.includes(symbol)) {
          return {
            success: false,
            error: `${symbol} isn't available in Tier 1. Complete more lessons to unlock more stocks.`
          };
        }

        if (type === 'buy') {
          // Check sufficient cash
          if (totalAmount > portfolio.currentCash) {
            return {
              success: false,
              error: `Not enough cash. You have $${portfolio.currentCash.toFixed(2)}, need $${totalAmount.toFixed(2)}.`
            };
          }

          // Tier 1: Max 20% position size
          if (userTier === 1) {
            const portfolioTotalValue = portfolio.totalValue;
            const positionPercent = totalAmount / portfolioTotalValue;
            if (positionPercent > TIER_1_MAX_POSITION_PERCENT) {
              return {
                success: false,
                error: `Position too large. Tier 1 max is 20% of portfolio (${(TIER_1_MAX_POSITION_PERCENT * 100).toFixed(0)}%). Try fewer shares.`
              };
            }
          }
        }

        if (type === 'sell') {
          // Find the position
          const position = portfolio.positions.find(p => p.symbol === symbol);
          if (!position) {
            return { success: false, error: `You don't own any ${symbol}.` };
          }
          if (shares > position.shares) {
            return {
              success: false,
              error: `You only own ${position.shares} shares of ${symbol}, can't sell ${shares}.`
            };
          }

          // Tier 1: Check minimum hold period
          if (userTier === 1) {
            const holdDays = Math.floor(
              (Date.now() - new Date(position.firstPurchasedAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (holdDays < TIER_1_MIN_HOLD_DAYS) {
              const daysLeft = TIER_1_MIN_HOLD_DAYS - holdDays;
              return {
                success: false,
                error: `Tier 1 requires holding for at least 2 weeks. ${daysLeft} more day${daysLeft === 1 ? '' : 's'} until you can sell.`
              };
            }
          }
        }

        // ============= EXECUTE =============

        const now = new Date().toISOString();
        const tradeId = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const expectedHoldUntil = userTier === 1 && type === 'buy'
          ? new Date(Date.now() + TIER_1_MIN_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

        const trade: Trade = {
          id: tradeId,
          portfolioId: portfolio.id,
          userId: portfolio.userId,
          symbol,
          type,
          orderType: 'market',
          shares,
          pricePerShare,
          totalAmount,
          status: 'filled',
          triggeredBySignal: params.triggeredBySignal,
          triggeredByLesson: params.triggeredByLesson,
          buyReason: params.buyReason,
          exitPlan: params.exitPlan,
          expectedHoldUntil,
          createdAt: now,
          filledAt: now,
        };

        // Update portfolio state
        let newCash = portfolio.currentCash;
        const newPositions = [...portfolio.positions];

        if (type === 'buy') {
          newCash -= totalAmount;

          // Positions are replaced, never edited in place: newPositions is a
          // shallow copy, so its objects are shared with the previous state.
          const index = newPositions.findIndex(p => p.symbol === symbol);
          if (index >= 0) {
            // Add to existing position
            const existingPosition = newPositions[index];
            const newShares = existingPosition.shares + shares;
            const newTotalCost = existingPosition.totalCost + totalAmount;
            const currentValue = newShares * pricePerShare;
            const unrealizedGain = currentValue - newTotalCost;
            newPositions[index] = {
              ...existingPosition,
              shares: newShares,
              totalCost: newTotalCost,
              averageCost: newTotalCost / newShares,
              currentPrice: pricePerShare,
              currentValue,
              unrealizedGain,
              unrealizedGainPercent: (unrealizedGain / newTotalCost) * 100,
              lastUpdatedAt: now,
            };
          } else {
            // Create new position
            const newPosition: Position = {
              id: `pos_${Date.now()}`,
              portfolioId: portfolio.id,
              symbol,
              shares,
              averageCost: pricePerShare,
              totalCost: totalAmount,
              currentPrice: pricePerShare,
              currentValue: totalAmount,
              unrealizedGain: 0,
              unrealizedGainPercent: 0,
              firstPurchasedAt: now,
              lastUpdatedAt: now,
              triggeredBySignal: params.triggeredBySignal,
              triggeredByLesson: params.triggeredByLesson,
              thesis: params.buyReason,
            };
            newPositions.push(newPosition);
          }
        } else {
          // Sell
          newCash += totalAmount;
          const index = newPositions.findIndex(p => p.symbol === symbol);
          if (index >= 0) {
            const existingPosition = newPositions[index];
            const remainingShares = existingPosition.shares - shares;
            if (remainingShares <= 0) {
              // Fully sold
              newPositions.splice(index, 1);
            } else {
              const totalCost = remainingShares * existingPosition.averageCost;
              const currentValue = remainingShares * pricePerShare;
              const unrealizedGain = currentValue - totalCost;
              newPositions[index] = {
                ...existingPosition,
                shares: remainingShares,
                totalCost,
                currentValue,
                unrealizedGain,
                unrealizedGainPercent: totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0,
                lastUpdatedAt: now,
              };
            }
          }
        }

        const updatedPortfolio: Portfolio = withRecomputedTotals({
          ...portfolio,
          currentCash: newCash,
          positions: newPositions,
          trades: [...portfolio.trades, trade],
          updatedAt: now,
        });

        set({ portfolio: updatedPortfolio });
        return { success: true, trade };
      },

      updatePositionPrices: (priceMap) => {
        const { portfolio } = get();
        if (!portfolio) return;

        const now = new Date().toISOString();
        let changed = false;
        const updatedPositions = portfolio.positions.map(position => {
          const newPrice = priceMap[position.symbol];
          if (newPrice === undefined) return position;
          // Already marked at this price (value included — a sell can leave
          // currentValue out of step with currentPrice): nothing to do.
          if (newPrice === position.currentPrice && position.currentValue === position.shares * newPrice) return position;
          changed = true;

          const currentValue = position.shares * newPrice;
          const unrealizedGain = currentValue - position.totalCost;
          const unrealizedGainPercent = (unrealizedGain / position.totalCost) * 100;

          return {
            ...position,
            currentPrice: newPrice,
            currentValue,
            unrealizedGain,
            unrealizedGainPercent,
            lastUpdatedAt: now,
          };
        });
        // Nothing moved: keep the same object. A new one re-renders every
        // subscriber and re-persists to AsyncStorage, every refresh (60s).
        if (!changed) return;

        set({
          portfolio: withRecomputedTotals({
            ...portfolio,
            positions: updatedPositions,
            updatedAt: now,
          }),
        });
      },

      resetPortfolio: () => set({ portfolio: null }),
    }),
    {
      name: 'investapp-portfolio-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // The copy restored from device storage at launch is recomputed too.
      // setPortfolio already recomputes, but restoring from storage bypassed
      // it, so a stale stored totalValue (e.g. $83,362.50 against $100,000
      // cash and no positions) showed until reconciliation ran — and for the
      // whole session if the launch's cloud load failed and it never did.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PortfolioState>;
        const p = saved.portfolio;
        const usable = p && Array.isArray(p.positions) && typeof p.currentCash === 'number';
        return { ...current, ...saved, portfolio: usable ? withRecomputedTotals(p) : (p ?? null) };
      },
    }
  )
);
