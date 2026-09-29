/**
 * Core Data Types
 * 
 * These are the contracts that flow through the entire app.
 * Every component, service, and screen uses these.
 */

// ============================================================================
// USER
// ============================================================================

export type Tier = 1 | 2 | 3;

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

export interface User {
  id: string;
  email: string;
  displayName: string;
  // False for accounts created before the name field existed, or if their
  // displayName was auto-derived from their email prefix. Used to prompt a
  // one-time "What should we call you?" screen instead of leaving them with
  // an unreadable name like "jsmith2008" on the leaderboard forever.
  hasCustomDisplayName?: boolean;
  avatarUrl?: string;
  
  // Progress tracking
  currentTier: Tier;
  lessonsCompleted: string[];        // lesson IDs
  badgesEarned: string[];            // badge IDs
  
  // Onboarding answers
  riskTolerance: RiskTolerance;
  experienceLevel: 'none' | 'beginner' | 'some' | 'experienced';
  primaryGoal: 'retirement' | 'wealth_building' | 'education' | 'income';
  
  // Engagement
  streak: number;                    // consecutive days
  lastActiveDate: string;            // ISO date
  totalLessonsWatched: number;
  totalTradesExecuted: number;
  
  // Subscription — written only by the Stripe webhook (functions/src/index.ts),
  // never optimistically by the client.
  subscription: 'free' | 'pro' | 'premium';
  subscriptionExpiresAt?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  subscriptionPlan?: string | null;
  subscriptionRenewsAt?: string;
  subscriptionCancelAtPeriodEnd?: boolean;
  
  // Settings
  notificationsEnabled: boolean;
  themeMode: 'dark' | 'light' | 'system';
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CURRICULUM
// ============================================================================

export interface Lesson {
  id: string;
  tier: Tier;
  order: number;                     // 1, 2, 3... within tier
  title: string;
  subtitle: string;
  description: string;
  
  // Content
  videoUrl?: string;
  videoDurationSeconds: number;
  thumbnailUrl: string;
  
  // Structure
  sections: LessonSection[];
  quiz: Quiz;
  
  // Metadata
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  topics: string[];                  // ['valuation', 'fundamentals']
  xpReward?: number;                 // XP granted on lesson completion
  
  // Connection to signals (lessons trigger signals)
  triggersSignals: string[];         // signal IDs to surface after this lesson
}

export interface LessonSection {
  id: string;
  type: 'text' | 'video' | 'interactive' | 'example';
  title: string;
  content: string;
  imageUrl?: string;
  // For interactive sections: a key that maps to a component
  interactiveType?: 'compound_calculator' | 'pe_explorer' | 'risk_chart';
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
  passingScore: number;              // 0.0 to 1.0 (default 0.75)
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;               // Shown after answer
  type?: 'quiz' | 'scenario';       // 'scenario' gets distinct visual treatment
  context?: string;                  // Scenario setup text (the situation description)
}

export interface QuizAttempt {
  quizId: string;
  userId: string;
  score: number;                     // 0.0 to 1.0
  passed: boolean;
  answers: { questionId: string; selectedIndex: number; correct: boolean }[];
  completedAt: string;
}

// ============================================================================
// MARKET DATA
// ============================================================================

export interface Stock {
  symbol: string;                    // 'AAPL'
  name: string;                      // 'Apple Inc.'
  sector: string;                    // 'Technology'
  industry: string;                  // 'Consumer Electronics'
  
  // Current market data
  price: number;
  previousClose: number;
  change: number;                    // dollar change
  changePercent: number;             // percent change
  volume?: number;                   // not available from Finnhub's free /quote endpoint
  marketCap: number;

  // Fundamentals (for signal calculations)
  peRatio?: number;
  pegRatio?: number;
  dividendYield?: number;
  eps?: number;
  beta?: number;

  /**
   * When the fundamentals above were measured — deliberately separate from
   * lastUpdated, which is the PRICE timestamp.
   *
   * The two drift apart: initializeLivePrices() refreshes price and previous
   * close from Finnhub but never touches marketCap/peRatio/dividendYield/eps,
   * so a Stock routinely carries a live price beside months-old fundamentals.
   * Anything rendering or reasoning over a fundamental must consult this, not
   * lastUpdated. Undefined means no fundamentals are attached (the live
   * adapter leaves them out rather than backfilling from the snapshot).
   */
  fundamentalsAsOf?: string;

  // Range
  dayLow: number;
  dayHigh: number;
  yearLow?: number;                  // not available from Finnhub's free /quote endpoint
  yearHigh?: number;
  
  // Meta
  exchange: 'NYSE' | 'NASDAQ' | 'AMEX';
  logoUrl?: string;
  
  lastUpdated: string;
}

export interface PriceHistoryPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartTimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL';

// ============================================================================
// PORTFOLIO & TRADING
// ============================================================================

export interface Portfolio {
  id: string;
  userId: string;
  /**
   * Local ids this portfolio carried before the app used Firebase uids
   * (e.g. user_1786829049867_1pg2j1n). Recorded when reconciliation replaces
   * one with the uid, so another device still holding the old id is
   * recognised as the same owner (see isSameOwner).
   */
  formerUserIds?: string[];
  name: string;                      // 'Main Portfolio'
  type: 'paper' | 'live';            // Always 'paper' for MVP
  
  // Balances
  initialCash: number;               // $100,000 default
  currentCash: number;
  totalValue: number;                // cash + positions value
  
  // Performance
  totalReturn: number;               // dollar
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
  
  // Holdings
  positions: Position[];
  
  // History
  trades: Trade[];
  
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  portfolioId: string;
  symbol: string;
  shares: number;                    // Can be fractional
  averageCost: number;               // per share
  totalCost: number;                 // shares * avgCost
  currentPrice: number;
  currentValue: number;              // shares * currentPrice
  unrealizedGain: number;            // currentValue - totalCost
  unrealizedGainPercent: number;
  
  // Tracking
  firstPurchasedAt: string;
  lastUpdatedAt: string;
  
  // Metadata (from trade history)
  triggeredBySignal?: string;        // Which signal led to this purchase?
  triggeredByLesson?: string;        // Which lesson led to this purchase?
  thesis?: string;                   // User's written reasoning
}

export type TradeType = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';

export interface Trade {
  id: string;
  portfolioId: string;
  userId: string;
  
  symbol: string;
  type: TradeType;
  orderType: OrderType;
  
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  
  // For limit orders
  limitPrice?: number;
  
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  
  // Educational tracking
  triggeredBySignal?: string;        // Which signal motivated this trade?
  triggeredByLesson?: string;        // Which lesson preceded this trade?
  
  // Trade journal (the reflection layer)
  buyReason?: string;                // "Why am I buying?"
  exitPlan?: string;                 // "When will I sell?"
  
  // Tier 1 constraint enforcement
  expectedHoldUntil?: string;        // Tier 1: 2-week minimum hold
  
  createdAt: string;
  filledAt?: string;
}

// ============================================================================
// ALGORITHM SIGNALS
// ============================================================================

export type SignalCategory = 'quality' | 'value' | 'momentum' | 'event' | 'warning';

export interface Signal {
  id: string;
  type: SignalType;
  tier: Tier;                        // Minimum tier required to see this
  category: SignalCategory;
  
  // What stock is this about?
  symbol: string;
  
  // The signal itself
  title: string;                     // "Strong earnings beat"
  description: string;               // 1-2 sentence explanation
  strength: 'weak' | 'moderate' | 'strong';
  
  // Educational hooks
  relatedLessonId?: string;          // Lesson that explains this concept
  educationalMessage: string;        // "This teaches you about..."
  
  // Data supporting the signal
  data: Record<string, any>;         // Flexible: PE ratios, beat %, etc.
  
  // Tracking
  createdAt: string;
  expiresAt: string;                 // Signal becomes stale
}

export type SignalType =
  // Tier 1
  | 'blue_chip_quality'
  | 'earnings_beat'
  | 'dividend_consistency'
  | 'sector_momentum'
  // Tier 2
  | 'value_trap_alert'
  | 'growth_at_fair_price'
  | 'insider_buying'
  | 'analyst_upgrade_wave'
  | 'debt_deterioration'
  | 'margin_expansion'
  // Tier 3
  | 'macro_pivot'
  | 'options_vol_spike'
  | 'technical_breakout'
  | 'contrarian_setup'
  | 'hedge_opportunity'
  | 'catalyst_calendar';

// ============================================================================
// NEWS & EVENTS
// ============================================================================

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  
  // Tier-specific framing
  tier1Framing?: string;             // "Apple makes more money than expected"
  tier2Framing?: string;             // "Apple beats earnings by 8%, margins expand"
  tier3Framing?: string;             // "Apple Q4: gross margin contraction despite revenue beat"
  
  // Related
  relatedSymbols: string[];          // ['AAPL']
  relatedSignals: string[];          // signal IDs
  
  // Sentiment
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: 1 | 2 | 3 | 4 | 5;     // For sorting
  
  publishedAt: string;
}

// ============================================================================
// PROGRESS & ACHIEVEMENTS
// ============================================================================

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  tier?: Tier;
  unlockedAt?: string;               // null if not yet earned
  criteria: string;                  // Human-readable criteria
}

export interface DailyStreak {
  current: number;
  longest: number;
  lastActivityDate: string;          // ISO date
  freezesAvailable: number;          // Streak freeze powerups
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
