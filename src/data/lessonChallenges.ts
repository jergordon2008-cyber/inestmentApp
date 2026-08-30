/**
 * Lesson Challenges — Learn → Practice → Apply
 *
 * After completing a lesson, the app surfaces a real paper-trading challenge
 * that directly applies what the user just learned. This bridges passive
 * reading with active skill-building — the biggest gap in the market.
 */

export interface LessonChallenge {
  lessonId:    string;
  title:       string;
  instruction: string;   // What the user should do
  hint:        string;   // Extra context / tip
  action:      'buy' | 'sell' | 'browse' | 'watchlist';
  suggestedSymbols: string[]; // Symbols that fit the challenge criteria
  criteria:    string;   // The filter / criteria to apply (displayed to user)
  xpBonus:     number;   // Extra XP for completing the challenge
}

export const LESSON_CHALLENGES: Record<string, LessonChallenge> = {

  // Tier 1 challenges ──────────────────────────────────────────────────────

  T1L01: {
    lessonId: 'T1L01',
    title: 'Buy a Company You Know',
    instruction: 'Find a company whose products you use every day and make your first paper trade.',
    hint: 'Apple, Starbucks, McDonald\'s, Nike — brands you trust are often great starting points.',
    action: 'buy',
    suggestedSymbols: ['AAPL', 'SBUX', 'MCD', 'NKE', 'COST'],
    criteria: 'A company whose products you personally use',
    xpBonus: 50,
  },

  T1L02: {
    lessonId: 'T1L02',
    title: 'Build a 3-Fund Portfolio',
    instruction: 'Paper trade a simple 3-fund portfolio: US stocks, international exposure, and bonds.',
    hint: 'VTI + VXUS + BND is Bogle\'s classic "lazy portfolio" that beats most active managers.',
    action: 'buy',
    suggestedSymbols: ['VTI', 'QQQ', 'BND', 'VOO', 'SPY'],
    criteria: 'Mix of broad equity ETF + bond ETF for balance',
    xpBonus: 60,
  },

  T1L03: {
    lessonId: 'T1L03',
    title: 'Find a Stock with P/E Under 20',
    instruction: 'Browse the stock list and find a stock with a P/E ratio below 20. Add it to your paper portfolio.',
    hint: 'Lower P/E doesn\'t always mean cheaper — compare against sector peers. Banks and energy companies often have low P/Es.',
    action: 'buy',
    suggestedSymbols: ['BAC', 'WFC', 'JPM', 'XOM', 'CVX', 'INTC'],
    criteria: 'P/E ratio below 20 — potentially undervalued',
    xpBonus: 75,
  },

  T1L04: {
    lessonId: 'T1L04',
    title: 'Build a Diversified 5-Sector Portfolio',
    instruction: 'Paper trade 5 stocks — one from each of these sectors: Technology, Healthcare, Consumer, Finance, Energy.',
    hint: 'True diversification means sectors that don\'t move together. When tech crashes, consumer staples often hold.',
    action: 'buy',
    suggestedSymbols: ['MSFT', 'JNJ', 'KO', 'JPM', 'XOM'],
    criteria: '5 different sectors — no two from the same industry',
    xpBonus: 100,
  },

  T1L05: {
    lessonId: 'T1L05',
    title: 'Invest a Fixed Amount Monthly',
    instruction: 'Simulate dollar-cost averaging: paper trade exactly $500 in VOO or SPY today.',
    hint: 'The key is consistency — same amount, every month, regardless of price. This removes the emotion from timing.',
    action: 'buy',
    suggestedSymbols: ['SPY', 'VOO', 'VTI', 'QQQ'],
    criteria: 'Broad index fund — the foundation of long-term wealth',
    xpBonus: 50,
  },

  T1L06: {
    lessonId: 'T1L06',
    title: 'Find a Stock with a Wide Moat',
    instruction: 'Identify a company with a durable competitive advantage (brand, network effect, or switching costs) and paper trade it.',
    hint: 'Buffett looks for moats that will last 20 years. Visa\'s network effect, Coca-Cola\'s brand, Microsoft\'s switching costs.',
    action: 'buy',
    suggestedSymbols: ['AAPL', 'MSFT', 'V', 'KO', 'COST', 'GOOGL'],
    criteria: 'Strong brand power, switching costs, or network effects',
    xpBonus: 75,
  },

  T1L08: {
    lessonId: 'T1L08',
    title: 'Play the Market Cycle',
    instruction: 'We\'re in a late-cycle expansion. Paper trade 2 defensive stocks that historically outperform in slowdowns.',
    hint: 'Healthcare, utilities, and consumer staples tend to hold up when the cycle turns. Investors rotate here before recessions.',
    action: 'buy',
    suggestedSymbols: ['JNJ', 'KO', 'PEP', 'WMT', 'PFE', 'MRK'],
    criteria: 'Defensive stocks: low beta, dividend yield > 2%, recession-resistant',
    xpBonus: 80,
  },

  T1L10: {
    lessonId: 'T1L10',
    title: 'Rebalance Your Portfolio',
    instruction: 'Check your portfolio allocation. If any position is more than 25% of your total, trim it back to 20%.',
    hint: 'Rebalancing forces you to sell high and buy low automatically. Most investors skip it and end up over-concentrated.',
    action: 'sell',
    suggestedSymbols: [],
    criteria: 'Trim any position above 25% of total portfolio value',
    xpBonus: 60,
  },

  // Tier 2 challenges ──────────────────────────────────────────────────────

  T2L05: {
    lessonId: 'T2L05',
    title: 'Hunt for Intrinsic Value',
    instruction: 'Find a stock trading at a significant discount to its peers. Paper trade $2,000 in it with a written thesis.',
    hint: 'Compare P/E, P/FCF, and EV/EBITDA to industry averages. If a stock is 20%+ below peers with no obvious reason, investigate.',
    action: 'buy',
    suggestedSymbols: ['BAC', 'INTC', 'PYPL', 'WFC', 'DIS', 'NKE'],
    criteria: 'P/E at least 20% below sector average — potential margin of safety',
    xpBonus: 100,
  },

  T2L06: {
    lessonId: 'T2L06',
    title: 'Bet on a Growth Story',
    instruction: 'Find a company growing revenue 20%+ year-over-year and paper trade $1,500 in it.',
    hint: 'Revenue growth is the engine. Check that gross margins are 40%+ — that\'s how you know pricing power exists.',
    action: 'buy',
    suggestedSymbols: ['NVDA', 'META', 'GOOGL', 'AMZN', 'PLTR', 'UBER'],
    criteria: 'Revenue growth 20%+ YoY, gross margin 40%+',
    xpBonus: 100,
  },

  T2L07: {
    lessonId: 'T2L07',
    title: 'Buy the Breakout',
    instruction: 'Find a stock near a 52-week high with rising volume. A breakout to new highs often signals continued momentum.',
    hint: 'Price at or near 52-week high + volume spike = institutional buying. This is what O\'Neil\'s CANSLIM is built on.',
    action: 'buy',
    suggestedSymbols: ['NVDA', 'META', 'AAPL', 'GS', 'LLY', 'COST'],
    criteria: 'Stock within 5% of 52-week high — momentum confirmation',
    xpBonus: 90,
  },

  T2L08: {
    lessonId: 'T2L08',
    title: 'Position for Rising Rates',
    instruction: 'The Fed is signaling higher rates. Paper trade 2 assets that historically benefit: banks and short-term bonds.',
    hint: 'Banks earn more on loans when rates rise. Short-duration bonds lose less than long-duration. Avoid REITs and utilities.',
    action: 'buy',
    suggestedSymbols: ['JPM', 'BAC', 'GS', 'WFC', 'BND'],
    criteria: 'Rate-sensitive beneficiaries: banks earn more, short bonds hold value',
    xpBonus: 90,
  },

  T2L09: {
    lessonId: 'T2L09',
    title: 'Rotate Into Early-Cycle Leaders',
    instruction: 'If the economy is entering early expansion, rotate into Technology and Consumer Discretionary. Paper trade $3,000 split across two sectors.',
    hint: 'The first sectors to lead out of a recession: Tech, Consumer Discretionary, Industrials. Defensives lag during this phase.',
    action: 'buy',
    suggestedSymbols: ['MSFT', 'NVDA', 'AMD', 'AMZN', 'HD', 'CAT'],
    criteria: 'Early-cycle leaders: Technology + Consumer Discretionary',
    xpBonus: 110,
  },

  T2L13: {
    lessonId: 'T2L13',
    title: 'Run a Quick DCF',
    instruction: 'Pick any stock you own or are watching. Estimate its intrinsic value using a simple DCF: FCF × (1 + growth)^10 discounted at 10%. Compare to current price.',
    hint: 'If intrinsic value > current price by 25%+, you have a margin of safety. That\'s your buy signal.',
    action: 'buy',
    suggestedSymbols: ['AAPL', 'MSFT', 'GOOGL', 'KO', 'JNJ', 'V'],
    criteria: 'Current price at least 20% below your estimated intrinsic value',
    xpBonus: 150,
  },

  T2L14: {
    lessonId: 'T2L14',
    title: 'Right-Size a Position',
    instruction: 'Pick your highest-conviction idea. Use the 1% rule: risk no more than 1% of portfolio on this trade. Calculate your position size.',
    hint: 'Position size = (1% × Portfolio Value) ÷ (Entry Price − Stop Loss). This keeps one bad trade from hurting you badly.',
    action: 'buy',
    suggestedSymbols: ['NVDA', 'MSFT', 'AAPL', 'GOOGL', 'META'],
    criteria: 'Max 1% portfolio risk per trade — discipline over conviction',
    xpBonus: 120,
  },

  T2L17: {
    lessonId: 'T2L17',
    title: 'Find a Tax-Efficient Winner',
    instruction: 'Paper trade an index ETF with expense ratio under 0.1%. Low cost + diversification = tax-efficient compounding.',
    hint: 'VOO charges 0.03%. SPY charges 0.09%. QQQ charges 0.20%. Every basis point in fees is a permanent drag on returns.',
    action: 'buy',
    suggestedSymbols: ['VOO', 'VTI', 'IWM', 'QQQ', 'SPY'],
    criteria: 'Expense ratio under 0.10% — the ultimate tax-efficient investment',
    xpBonus: 70,
  },
};

export const getChallengeForLesson = (lessonId: string): LessonChallenge | null =>
  LESSON_CHALLENGES[lessonId] ?? null;
