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
import {
  getAllTier1Stocks, getStocksBySector, getAllSectors, getStock,
  areFundamentalsStale, formatAsOfDate,
} from './stockDataService';
import { getEarningsSurprises } from './earningsData';

// ============================================================================
// SIGNAL GENERATORS
// ============================================================================

/**
 * Trailing " (fundamentals as of 15 Jan 2026)" for copy that quotes a
 * fundamental, or '' when the figures are current enough to state plainly.
 *
 * Every Stock from getStock() carries snapshot-dated fundamentals today
 * (the price robot refreshes price only), so this is non-empty in
 * practice. It empties itself once fundamentals are fetched for real.
 */
function asOfSuffix(stock: Stock): string {
  if (!areFundamentalsStale(stock) || !stock.fundamentalsAsOf) return '';
  return ` (fundamentals as of ${formatAsOfDate(stock.fundamentalsAsOf)})`;
}

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
    // The market-cap figure comes from the static snapshot and is dated
    // in the copy rather than suppressed: "blue chip" is a claim about
    // durable company size and quality, which doesn't turn over in a
    // quarter the way a dividend yield does. The date is part of the
    // lesson — fundamentals have a vintage — and disappears on its own
    // once fundamentals are fetched fresh.
    description: `${stock.name} is a proven leader with a $${(stock.marketCap / 1e9).toFixed(0)}B market cap and stable fundamentals${asOfSuffix(stock)}.`,
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
 * Earnings surprise signal for ONE symbol, from real reported
 * actual-vs-estimate EPS (see getEarningsSurprises; currently turned off, so
 * this returns null until earnings are served through the price robot).
 *
 * This replaces a generator that picked the day's three biggest tech/
 * healthcare gainers — a price move, not an earnings event — and then
 * INVENTED a beat: `5 + idx*3 + Math.random()*4`, re-rolled on every
 * render, so the same ticker showed a different "beat earnings by 11.3%"
 * each time the tab opened. That number was attached to a real company
 * name and reached the screen verbatim.
 *
 * Honesty rules this generator follows:
 *  - It reports what happened, including a MISS or in-line result. A signal
 *    that can only ever say "beat" is still a lie by omission (AAPL's latest
 *    quarter was -0.89%).
 *  - It fires only when the most recent quarter is genuinely recent
 *    (period end within RECENT_QUARTER_DAYS); a year-old print is not an
 *    "event" and is not surfaced as one.
 *  - No data (no API key, rate-limited, unknown ticker, bad payload) means
 *    no signal — never a substitute number.
 */
const RECENT_QUARTER_DAYS = 120;

async function generateEarningsSurpriseSignal(symbol: string): Promise<Signal | null> {
  const stock = getStock(symbol);
  if (!stock) return null;

  const raw = await getEarningsSurprises(symbol);
  // Finnhub answers a rate-limit/error with a JSON *object*, not an array,
  // and the adapter returns res.json() unvalidated.
  if (!Array.isArray(raw)) return null;

  const latest = raw
    .filter(q =>
      typeof q?.actual === 'number' &&
      typeof q?.estimate === 'number' &&
      typeof q?.surprisePercent === 'number' &&
      typeof q?.period === 'string'
    )
    .sort((a, b) => (a.period < b.period ? 1 : -1))[0];
  if (!latest) return null;

  const periodEnd = new Date(latest.period).getTime();
  if (!Number.isFinite(periodEnd)) return null;
  const ageDays = (Date.now() - periodEnd) / (24 * 60 * 60 * 1000);
  if (ageDays < 0 || ageDays > RECENT_QUARTER_DAYS) return null;

  const pct = latest.surprisePercent;
  const magnitude = Math.abs(pct);
  const outcome: 'beat' | 'miss' | 'inline' =
    magnitude < 0.05 ? 'inline' : pct > 0 ? 'beat' : 'miss';

  const pctText = `${magnitude.toFixed(1)}%`;
  const epsText = `EPS $${latest.actual.toFixed(2)} vs. $${latest.estimate.toFixed(2)} expected`;
  const title =
    outcome === 'beat' ? 'Beat earnings estimates'
    : outcome === 'miss' ? 'Missed earnings estimates'
    : 'Earnings in line with estimates';
  const description =
    outcome === 'inline'
      ? `${stock.name} reported ${epsText} for the quarter ending ${latest.period} — essentially in line.`
      : `${stock.name} ${outcome === 'beat' ? 'beat' : 'missed'} estimates by ${pctText} — ${epsText}, quarter ending ${latest.period}.`;

  return {
    id: `signal_earnings_${symbol}_${latest.period}`,
    type: 'earnings_beat' as SignalType,
    tier: 1 as Tier,
    category: 'event' as const,
    symbol,
    title,
    description,
    strength: magnitude >= 5 ? 'strong' : magnitude >= 1 ? 'moderate' : 'weak',
    relatedLessonId: 'T1L11', // Reading financial news
    educationalMessage:
      outcome === 'miss'
        ? `A miss is the market learning the company earned less than it expected. Prices often drop first and settle later — watch ${symbol} over the next few weeks and ask whether the reaction was proportionate to a ${pctText} shortfall.`
        : `When a company reports above (or right at) expectations, the price reprices on that new information. The size of the move relative to a ${pctText} surprise tells you what the market had already assumed. Watch whether ${symbol}'s reaction holds.`,
    data: {
      actualEps: latest.actual,
      estimateEps: latest.estimate,
      surprisePercent: pct,
      outcome,
      period: latest.period,
      source: 'finnhub:/stock/earnings',
    },
    createdAt: new Date().toISOString(),
    // The print stays a "recent event" until the recency window closes.
    expiresAt: new Date(periodEnd + RECENT_QUARTER_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Generate dividend consistency signals.
 *
 * Suppressed outright while the yield is stale, rather than dated like the
 * blue-chip signal. Three reasons this one can't carry a disclosure:
 *
 *  1. It states forward income in dollars — "$6.12 per $100 invested, every
 *     year". That is the kind of sentence a student acts on, and an "as of"
 *     note doesn't make a wrong number safe to act on.
 *  2. Yield moves inversely to price, and the price beside it IS live. A
 *     stale yield is therefore wrong in the direction that matters: it
 *     overstates income on everything that has since risen.
 *  3. The 1.5–7% filter exists to screen out yield traps. Run on stale
 *     inputs it does the opposite — a stock whose yield has since blown past
 *     7% (price collapsed) still reads as a "reliable dividend payer".
 *
 * Returning [] here is the whole mechanism. When fundamentals are fetched
 * for real, fundamentalsAsOf becomes current and these signals come back
 * with no further change.
 */
function generateDividendSignals(stocks: Stock[]): Signal[] {
  const fresh = stocks.filter(s => !areFundamentalsStale(s));
  if (fresh.length === 0) return [];

  const candidates = fresh.filter(s =>
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
  
  // Tier 1 signals (always shown). Earnings surprises are NOT generated here:
  // they need a per-symbol network call, so they're attached only in
  // getSignalsForStock() for the one ticker being viewed. The old
  // generateEarningsBeatSignals() that used to sit in this list fabricated
  // its beat percentage with Math.random() and has been removed.
  signals = signals.concat(
    generateBlueChipSignals(allStocks),
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
export async function getSignalsForStock(symbol: string): Promise<Signal[]> {
  const synchronous = generateSignalsForUser().filter(s => s.symbol === symbol);
  // One network call, for the one ticker on screen. Resolves to null when
  // there's no real, recent print — in which case nothing is shown.
  const earnings = await generateEarningsSurpriseSignal(symbol);
  return earnings ? [earnings, ...synchronous] : synchronous;
}

/**
 * Get a "today's pick" - the strongest signal right now
 * (used on home screen and notifications)
 */
export function getTodaysPick(): Signal | null {
  const signals = generateSignalsForUser();
  return signals[0] || null;
}
