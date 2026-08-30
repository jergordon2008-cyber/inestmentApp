/**
 * AI Explain Service
 * 
 * Users can tap "Explain like I'm new" on any term, chart, or concept.
 * Uses Claude API for tier-aware explanations:
 * - Tier 1 user: simple, no jargon, lots of analogies
 * - Tier 2 user: moderate depth, some technical terms with definitions  
 * - Tier 3 user: full technical detail, nuanced discussion
 * 
 * This solves the #1 weakness of Personal Finance Lab: text-heavy content
 * with no contextual help when users get stuck.
 * 
 * For MVP we use a local cache of pre-generated explanations to reduce
 * API costs. Real-time API calls happen for unknown terms.
 */

import { Tier } from '../types';

// ============================================================================
// CACHED EXPLANATIONS (no API call needed)
// ============================================================================

interface CachedExplanation {
  term: string;
  tier1: string;
  tier2: string;
  tier3: string;
  examples?: string[];
}

const explanationCache: CachedExplanation[] = [
  {
    term: 'P/E ratio',
    tier1: `Think of P/E like this: if a lemonade stand makes $1 in profit per year, and someone wants to buy it for $20, the P/E is 20.

You're paying $20 today for $1 of annual earnings. It would take 20 years of earnings to "pay back" your price.

A lower P/E (like 10) often means you're getting more bang for your buck. A higher P/E (like 30) means the market expects fast growth.`,
    tier2: `Price-to-Earnings (P/E) ratio = Stock Price / Earnings Per Share (EPS).

It tells you how much you're paying for each dollar of annual profit. Key uses:

• **Comparing within a sector**: Apple at 25x vs Microsoft at 30x tells you the market values MSFT growth more
• **vs. historical**: AAPL has averaged 20x over 10 years — 30x today might be expensive
• **Forward vs trailing**: Forward P/E uses next year's expected earnings, trailing uses last year

**Limitations**: P/E breaks down for unprofitable companies or those with one-time gains/losses.`,
    tier3: `P/E ratio = P / EPS. Both trailing twelve months (TTM) and forward (NTM consensus) variants matter for different reasons.

**Sophisticated uses:**
- PEG ratio (P/E / earnings growth) normalizes for growth differentials
- Cyclically-adjusted P/E (CAPE, Shiller P/E) smooths over 10-year earnings cycle
- EV/EBIT can be superior for cross-capital-structure comparison

**Critical adjustments:**
- Strip out one-time items: tax benefits, M&A costs, impairments
- Adjust for stock-based compensation if comparing tech to non-tech
- Industry context matters: 30x for a regulated utility is wildly different from 30x for SaaS

**Market regime considerations:** P/E multiples mean different things in low-rate vs high-rate environments. Risk-free rate of 5% → equity risk premium expectations shift entire industry P/Es.`,
    examples: ['AAPL', 'MSFT', 'AMZN'],
  },
  
  {
    term: 'dividend',
    tier1: `A dividend is when a company pays cash to people who own its stock.

Imagine you own 100 shares of Coca-Cola. Every 3 months, Coca-Cola says "thanks for being a shareholder" and sends you a check.

The amount per share is called the dividend rate. So if Coca-Cola pays $0.46 per share quarterly, you'd get $46 every 3 months (100 shares × $0.46).

It's like the company sharing its profits with its owners — which is what shareholders are!`,
    tier2: `Dividends are cash distributions to shareholders, paid from a company's profits or cash reserves.

**Key metrics:**
• **Dividend yield**: Annual dividend / current price (e.g. 3.2%)
• **Payout ratio**: Dividends paid / earnings (sustainable < 60%)
• **Dividend growth rate**: Year-over-year increases

**Why they matter:**
- Reliable cash flow to investors
- Signal of company financial health
- Compound when reinvested via DRIPs

**Tax treatment**: Qualified dividends are taxed at lower long-term capital gains rates (vs ordinary income for short-term).`,
    tier3: `Dividend strategy spans multiple dimensions:

**Dividend coverage analysis:**
- FCF coverage ratio (FCF / Dividends) is more reliable than EPS-based payout ratios
- Watch for dividend trap stocks where high yield masks deteriorating fundamentals
- Real estate (REITs) must distribute 90%+ of taxable income — different calculus

**Tax optimization:**
- Qualified vs non-qualified dividend treatment (61-day holding requirement)
- Foreign tax credits on international dividends
- Master Limited Partnerships (MLPs) have unique K-1 issues

**Total return decomposition:**
- Historically, dividends + dividend reinvestment have driven 30-40% of S&P 500 total returns
- Dividend Growth ETFs (like SCHD) outperform high-yield approaches over time
- "Dividend aristocrats" (25+ year consecutive raises) typically have lower beta`,
    examples: ['KO', 'PG', 'JNJ'],
  },
  
  {
    term: 'market cap',
    tier1: `Market cap is just the total value of a company according to the stock market.

If a company has 1 million shares of stock, and each share is worth $50, the company is "worth" $50 million (1M × $50).

The bigger the market cap, the bigger the company:
- Small cap: less than $2 billion (small companies)
- Mid cap: $2B - $10B (medium companies)  
- Large cap: $10B - $200B (big companies)
- Mega cap: $200B+ (Apple, Microsoft, etc.)`,
    tier2: `Market capitalization = Current Stock Price × Shares Outstanding.

It represents the total value the market currently assigns to a company's equity.

**Why it matters:**
• Determines index inclusion (e.g., S&P 500 requires $14.5B+ minimum)
• Affects ETF weighting (most ETFs are cap-weighted)
• Liquidity tends to correlate with market cap
• Risk profile shifts: small caps more volatile, large caps more stable

**Important distinction**: Market cap ≠ Enterprise Value. EV = Market Cap + Debt - Cash, more relevant for acquisition pricing.`,
    tier3: `Market cap has nuances often overlooked:

**Free float adjustments:**
- Index providers (MSCI, S&P) use float-adjusted market cap, excluding closely-held shares
- This can dramatically change weights for companies with founder/insider ownership

**Dilution dynamics:**
- Reported market cap uses basic shares; diluted market cap includes options/RSUs/converts
- Tech companies with heavy SBC have material differences (often 5-10%+)

**Implementation considerations:**
- Index funds rebalance to cap-weights, creating predictable buying/selling at thresholds
- "Cap weighting" creates concentration risk — top 10 names dominate S&P 500
- Equal-weighted indices (RSP) have historically outperformed cap-weighted over very long periods, with higher volatility

**Cross-listed shares**: Pay attention to ADR conversion ratios; market cap calculations get tricky.`,
  },
  
  {
    term: 'diversification',
    tier1: `Diversification means "don't put all your eggs in one basket."

If you put 100% of your money in one stock, you have a problem if that company has trouble.

If you spread it across 20 different companies in different industries (tech, healthcare, energy, retail...), one bad company barely hurts your overall money.

It's the closest thing to a "free lunch" in investing — same expected return, less risk.`,
    tier2: `Diversification reduces portfolio volatility by combining assets that don't move perfectly together (low correlation).

**Levels of diversification:**
1. **Asset class**: Stocks + bonds + cash
2. **Sector**: Tech + healthcare + utilities + consumer
3. **Geography**: US + international developed + emerging
4. **Size**: Small + mid + large cap
5. **Style**: Growth + value

**Modern Portfolio Theory** (Markowitz): the "efficient frontier" shows the optimal risk/return combinations.

**Sweet spot**: 20-30 stocks captures 90%+ of diversification benefit; beyond that, diminishing returns.`,
    tier3: `Diversification is more nuanced than commonly understood:

**Correlation regime changes:**
- "All correlations go to 1 in a crisis" (2008 phenomenon)
- Tail risk hedging requires negative correlation assets (long vol, gold, certain alts)
- Recent decade saw stock-bond correlation invert from negative to positive

**Factor diversification beyond surface:**
- Two stocks in different sectors might have same factor exposures (size, value, momentum, quality, low-vol)
- Risk parity approaches weight by risk contribution, not capital
- Style factor crowding is real risk (e.g., low-vol crash 2018)

**Practical implementation:**
- "Closet indexers" — active funds with R² >95% to benchmark
- True active share matters more than holdings count
- International diversification benefits eroded as markets globalized

**Limits of diversification:**
- Cannot eliminate systematic (market) risk, only idiosyncratic
- Beta of 1.0 portfolio still has full market exposure regardless of diversification`,
  },
];

// ============================================================================
// API INTERFACE
// ============================================================================

/**
 * Get an explanation for a term at the user's tier level.
 * 
 * For MVP, check cache first. If not found, fall back to API.
 * In production: cache hits are >95% with a good prompt cache.
 */
export async function explainTerm(term: string, tier: Tier): Promise<ExplanationResult> {
  // Check cache first
  const cached = explanationCache.find(
    e => e.term.toLowerCase() === term.toLowerCase()
  );
  
  if (cached) {
    return {
      source: 'cache',
      explanation: tier === 1 ? cached.tier1 : tier === 2 ? cached.tier2 : cached.tier3,
      examples: cached.examples,
    };
  }
  
  // Fall back to API
  return await fetchExplanationFromAPI(term, tier);
}

export interface ExplanationResult {
  source: 'cache' | 'api';
  explanation: string;
  examples?: string[];
}

/**
 * Real Claude API call via our backend proxy.
 * 
 * Now wired to the claudeAPI service. When the backend is configured
 * (EXPO_PUBLIC_CLAUDE_PROXY_URL set), this hits the real Cloud Function
 * which calls Anthropic. Otherwise, returns a placeholder explanation.
 */
async function fetchExplanationFromAPI(term: string, tier: Tier): Promise<ExplanationResult> {
  const { callClaudeForExplanation } = require('./claudeAPI');

  const response = await callClaudeForExplanation(term, tier);
  
  return {
    source: 'api',
    explanation: response.explanation,
  };
}
