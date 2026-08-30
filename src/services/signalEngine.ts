/**
 * Algorithm Signal Engine
 * 
 * THE COMPETITIVE MOAT.
 * 
 * This engine doesn't just pick stocks — it teaches pattern recognition.
 * Each signal:
 * 1. Detects a pattern in market data
 * 2. Ties it to a specific lesson the user has (or could) complete
 * 3. Shows real examples of concepts in action
 * 
 * For Tier 1, we implement 4 signals:
 * - Blue-chip quality
 * - Earnings beat
 * - Dividend consistency  
 * - Sector momentum
 * 
 * Each generates educational, contextual signals that adapt to user level.
 */

import { Signal, SignalType, Stock, Tier } from '../types';
import { getAllTier1Stocks, getStocksBySector, getAllSectors } from './stockDataService';

// ============================================================================
// SIGNAL GENERATORS
// ============================================================================

/**
 * Generate blue-chip quality signals
 * 
 * Logic: Find S&P 500-tier stocks with strong fundamentals.
 * Criteria: Market cap >$50B, P/E reasonable (5-50), positive earnings
 */
function generateBlueChipSignals(stocks: Stock[]): Signal[] {
  const candidates = stocks.filter(s => 
    s.marketCap >= 50_000_000_000 &&
    s.peRatio && s.peRatio > 5 && s.peRatio < 50 &&
    s.eps && s.eps > 0 &&
    s.sector !== 'ETF'
  );
  
  // Sort by a quality score: low P/E, large market cap
  const scored = candidates
    .map(s => ({
      stock: s,
      score: (s.marketCap / 1_000_000_000) - (s.peRatio || 50) * 5,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  return scored.map(({ stock }) => ({
    id: `signal_bluechip_${stock.symbol}_${Date.now()}`,
    type: 'blue_chip_quality' as SignalType,
    tier: 1 as Tier,
    category: 'quality' as const,
    symbol: stock.symbol,
    title: 'Blue-chip quality',
    description: `${stock.name} is a proven leader with $${(stock.marketCap / 1e9).toFixed(0)}B market cap and stable fundamentals.`,
    strength: stock.marketCap > 1_000_000_000_000 ? 'strong' as const : 'moderate' as const,
    relatedLessonId: 'T1L06', // Blue-chip stocks explained
    educationalMessage: `When you buy a blue-chip stock like ${stock.symbol}, you're owning a piece of a battle-tested company. They've survived recessions, wars, and disruption — and they're still here.`,
    data: {
      marketCap: stock.marketCap,
      peRatio: stock.peRatio,
      sector: stock.sector,
      yearLow: stock.yearLow,
      yearHigh: stock.yearHigh,
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  }));
}

/**
 * Generate earnings beat signals (simulated - in production, would use real earnings calendar)
 */
function generateEarningsBeatSignals(stocks: Stock[]): Signal[] {
  // Simulate: pick 3 random tech/healthcare stocks that "beat earnings"
  const candidates = stocks.filter(s => 
    (s.sector === 'Technology' || s.sector === 'Healthcare') &&
    s.changePercent > 0 // moving up today
  );
  
  // Take top 3 by today's gain (proxy for "just beat earnings")
  const top = candidates
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3);
  
  return top.map((stock, idx) => {
    const beatPercent = 5 + idx * 3 + Math.random() * 4; // 5-15% beat
    return {
      id: `signal_earnings_${stock.symbol}_${Date.now()}`,
      type: 'earnings_beat' as SignalType,
      tier: 1 as Tier,
      category: 'event' as const,
      symbol: stock.symbol,
      title: 'Strong earnings beat',
      description: `${stock.name} beat earnings estimates by ${beatPercent.toFixed(1)}% — markets typically reward this.`,
      strength: beatPercent > 10 ? 'strong' as const : 'moderate' as const,
      relatedLessonId: 'T1L11', // Reading financial news
      educationalMessage: `When companies beat expectations, stocks often jump. This is the market repricing for new information. Watch ${stock.symbol} over the next few weeks — does the gain hold?`,
      data: {
        beatPercent,
        todayChange: stock.changePercent,
        sector: stock.sector,
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
  });
}

/**
 * Generate dividend consistency signals
 */
function generateDividendSignals(stocks: Stock[]): Signal[] {
  const candidates = stocks.filter(s => 
    s.dividendYield && s.dividendYield > 1.5 && s.dividendYield < 7 // Avoid yield traps
  );
  
  // Sort by yield (highest first, but filtered for quality)
  const top = candidates
    .filter(s => s.marketCap > 100_000_000_000) // Large stable companies only
    .sort((a, b) => (b.dividendYield || 0) - (a.dividendYield || 0))
    .slice(0, 3);
  
  return top.map(stock => ({
    id: `signal_dividend_${stock.symbol}_${Date.now()}`,
    type: 'dividend_consistency' as SignalType,
    tier: 1 as Tier,
    category: 'quality' as const,
    symbol: stock.symbol,
    title: 'Reliable dividend payer',
    description: `${stock.name} pays ${stock.dividendYield?.toFixed(2)}% annual dividend — that's $${(stock.dividendYield! * 100 / 100).toFixed(2)} per $100 invested, every year.`,
    strength: 'moderate' as const,
    relatedLessonId: 'T1L07', // Dividends and passive income
    educationalMessage: `Dividends are the secret weapon of long-term wealth building. ${stock.symbol} pays you to hold it. Reinvest those dividends and compound returns over decades — that's how generational wealth gets built.`,
    data: {
      dividendYield: stock.dividendYield,
      annualIncomePer10k: (stock.dividendYield! * 100), // $ per $10k invested
      sector: stock.sector,
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }));
}

/**
 * Generate sector momentum signals
 */
function generateSectorMomentumSignals(): Signal[] {
  const sectors = getAllSectors().filter(s => s !== 'ETF');
  
  // Calculate "sector momentum" - average change of stocks in each sector
  const sectorScores = sectors.map(sector => {
    const stocks = getStocksBySector(sector);
    const avgChange = stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length;
    return { sector, avgChange, leadStock: stocks.sort((a,b) => b.changePercent - a.changePercent)[0] };
  });
  
  // Take top 2 sectors with positive momentum
  const topSectors = sectorScores
    .filter(s => s.avgChange > 0)
    .sort((a, b) => b.avgChange - a.avgChange)
    .slice(0, 2);
  
  return topSectors.map(({ sector, avgChange, leadStock }) => ({
    id: `signal_sector_${sector}_${Date.now()}`,
    type: 'sector_momentum' as SignalType,
    tier: 1 as Tier,
    category: 'momentum' as const,
    symbol: leadStock.symbol,
    title: `${sector} sector is moving`,
    description: `${sector} stocks are up an average of ${avgChange.toFixed(2)}% today. ${leadStock.name} is leading the rally.`,
    strength: avgChange > 2 ? 'strong' as const : 'moderate' as const,
    relatedLessonId: 'T1L08', // Market cycles
    educationalMessage: `Sectors often move together. When you see broad sector strength, it usually reflects underlying themes — interest rates, consumer trends, earnings cycles. Notice the pattern.`,
    data: {
      sector,
      avgChange,
      leadStockChange: leadStock.changePercent,
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate all relevant signals for a user at a given tier
 * 
 * Returns: All currently-active signals user can see.
 * Filtered by tier and personalized by user level.
 */
export function generateSignalsForUser(userTier: Tier = 1): Signal[] {
  const allStocks = getAllTier1Stocks();
  
  let signals: Signal[] = [];
  
  // Tier 1 signals (always shown)
  signals = signals.concat(
    generateBlueChipSignals(allStocks),
    generateEarningsBeatSignals(allStocks),
    generateDividendSignals(allStocks),
    generateSectorMomentumSignals(),
  );
  
  // Tier 2 signals (only for Tier 2+ users) - placeholder for now
  if (userTier >= 2) {
    // Future: value traps, growth at fair price, insider buying, etc.
  }
  
  // Tier 3 signals (only for Tier 3 users) - placeholder for now
  if (userTier >= 3) {
    // Future: macro pivots, options vol, technical breakouts
  }
  
  // Sort by strength + recency
  signals.sort((a, b) => {
    const strengthOrder = { strong: 3, moderate: 2, weak: 1 };
    const aScore = strengthOrder[a.strength];
    const bScore = strengthOrder[b.strength];
    if (aScore !== bScore) return bScore - aScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  return signals;
}

/**
 * Get signals related to a specific lesson 
 * (so when user finishes lesson, we can show real examples)
 */
export function getSignalsForLesson(lessonId: string): Signal[] {
  const allSignals = generateSignalsForUser();
  return allSignals.filter(s => s.relatedLessonId === lessonId);
}

/**
 * Get signals for a specific stock
 * (when user views a stock detail page, show all signals about it)
 */
export function getSignalsForStock(symbol: string): Signal[] {
  const allSignals = generateSignalsForUser();
  return allSignals.filter(s => s.symbol === symbol);
}

/**
 * Get a "today's pick" - the strongest signal right now
 * (used on home screen and notifications)
 */
export function getTodaysPick(): Signal | null {
  const signals = generateSignalsForUser();
  return signals[0] || null;
}
