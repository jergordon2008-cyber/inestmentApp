/**
 * Investment Playbooks
 * Pre-built strategy templates. Users pick one, app guides them step-by-step.
 */

export type PlaybookDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  actionItems: string[];
  relatedLessonIds: string[];
}

export interface PlaybookMetric {
  name: string;
  description: string;
  target: string;
}

export interface Playbook {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  difficulty: PlaybookDifficulty;
  tier: 1 | 2 | 3;
  timeCommitment: string;
  bestFor: string;
  steps: PlaybookStep[];
  metrics: PlaybookMetric[];
  successCriteria: string;
}

export const playbooks: Playbook[] = [
  {
    id: 'dividend_income',
    emoji: '💰',
    name: 'The Dividend Income Machine',
    tagline: 'Build a portfolio that pays YOU every month',
    description: 'Construct a diversified dividend portfolio that generates predictable monthly income. Focus on quality companies with sustainable payouts and a track record of dividend growth.',
    difficulty: 'Beginner',
    tier: 1,
    timeCommitment: '2-4 hours/month',
    bestFor: 'Investors seeking passive income; near or in retirement; cash flow priority',
    steps: [
      {
        id: 'step1',
        title: 'Set your income target',
        description: 'Decide how much monthly income you want this portfolio to generate. This determines portfolio size.',
        actionItems: [
          'Calculate target: $500/month = $6,000/year',
          'At a 4% yield, that requires a $150,000 portfolio',
          'Write your target down in your journal',
        ],
        relatedLessonIds: ['T2L01', 'T2L11'],
      },
      {
        id: 'step2',
        title: 'Screen for quality dividend stocks',
        description: 'Find 10-15 companies with consistent dividend history, safe payout ratios, and growing earnings.',
        actionItems: [
          'Yield between 3-5% (avoid yields above 7% — usually unsustainable)',
          'Payout ratio under 60% of earnings',
          'Dividend growth streak of 5+ years',
          'Diversify across at least 5 sectors',
        ],
        relatedLessonIds: ['T2L01', 'T2L09'],
      },
      {
        id: 'step3',
        title: 'Equal-weight your positions',
        description: 'Buy roughly equal dollar amounts of each stock. This protects you from concentration risk.',
        actionItems: [
          'No single position over 10% of portfolio',
          'Start with smaller positions (~5%) and build over time',
          'Use limit orders to control entry prices',
        ],
        relatedLessonIds: ['T2L14', 'T2L18'],
      },
      {
        id: 'step4',
        title: 'Enable dividend reinvestment (DRIP)',
        description: 'Until you need the income, reinvest all dividends to compound returns.',
        actionItems: [
          'Most brokers offer automatic DRIP for free',
          'Reinvesting doubles your effective return over 20 years',
          'Switch off DRIP only when you start spending the income',
        ],
        relatedLessonIds: ['T2L04'],
      },
      {
        id: 'step5',
        title: 'Quarterly review',
        description: 'Every 3 months, check each holding for dividend cuts, payout ratio changes, or business deterioration.',
        actionItems: [
          'Check most recent earnings reports',
          'Replace any company that cut its dividend',
          'Add to positions where yield rose due to price drop (if business is sound)',
          'Avoid trading more than 1-2 positions per quarter',
        ],
        relatedLessonIds: ['T2L10', 'T2L13'],
      },
    ],
    metrics: [
      { name: 'Annual Income', description: 'Sum of dividends across all positions', target: 'Hit your set target' },
      { name: 'Yield on Cost', description: 'Annual dividends / total invested', target: 'Grows above starting yield over time' },
      { name: 'Sector Diversification', description: 'Holdings spread across sectors', target: '5+ sectors, no sector > 30%' },
    ],
    successCriteria: 'Generating reliable monthly income that grows year over year, with no single position dominating the portfolio',
  },
  {
    id: 'buffett_value',
    emoji: '🎯',
    name: 'The Buffett Value Hunter',
    tagline: 'Buy great companies at fair prices, hold forever',
    description: 'Apply Warren Buffett\'s framework: find wide-moat businesses trading below intrinsic value. This is a slow, patient strategy — but it has built more wealth than any other.',
    difficulty: 'Intermediate',
    tier: 2,
    timeCommitment: '5-10 hours/month',
    bestFor: 'Patient investors with 10+ year horizons; those willing to do deep research',
    steps: [
      {
        id: 'step1',
        title: 'Define your circle of competence',
        description: 'List industries you genuinely understand. Buffett famously avoided tech for years because he didn\'t understand it. Only invest in what you understand.',
        actionItems: [
          'List 3-5 industries you know well from work or life',
          'For each, identify 5-10 dominant companies',
          'Set this list as your hunting ground — ignore everything else',
        ],
        relatedLessonIds: ['T2L05', 'T2L13'],
      },
      {
        id: 'step2',
        title: 'Identify wide-moat businesses',
        description: 'A "moat" is a durable competitive advantage. Companies with strong moats earn high returns on capital for decades.',
        actionItems: [
          'Look for network effects (Visa, Meta)',
          'Brand power (Coca-Cola, Apple)',
          'Switching costs (Microsoft, Oracle)',
          'Cost advantages (Walmart, Costco)',
          'Regulatory barriers (utilities, defense)',
        ],
        relatedLessonIds: ['T2L05', 'T2L13'],
      },
      {
        id: 'step3',
        title: 'Calculate intrinsic value',
        description: 'Estimate what the business is worth based on future cash flows, not current stock price.',
        actionItems: [
          'Find 5-year average free cash flow',
          'Project conservative 5% annual growth for 10 years',
          'Apply a 10% discount rate to find present value',
          'Add to current cash, subtract debt',
          'Divide by shares outstanding = intrinsic value per share',
        ],
        relatedLessonIds: ['T2L05', 'T2L10'],
      },
      {
        id: 'step4',
        title: 'Wait for a margin of safety',
        description: 'Only buy when the stock trades at 70-80% of your intrinsic value estimate. This protects you from being wrong.',
        actionItems: [
          'Set price alerts at your target buy levels',
          'Be patient — great prices come during panics',
          'Never compromise on margin of safety just because you\'re bored',
        ],
        relatedLessonIds: ['T2L05', 'T2L15'],
      },
      {
        id: 'step5',
        title: 'Hold and ignore the noise',
        description: 'Once you own it, the goal is to never sell unless: (a) the moat eroded, (b) management failed, or (c) valuation became absurd.',
        actionItems: [
          'Check holdings annually, not daily',
          'Read each annual report (10-K) carefully',
          'Only sell if your original thesis is broken',
          'Ignore daily price movements — they\'re noise',
        ],
        relatedLessonIds: ['T2L17', 'T2L20'],
      },
    ],
    metrics: [
      { name: 'Margin of Safety', description: 'How far below intrinsic value you bought', target: 'Average 25%+ discount at purchase' },
      { name: 'Holding Period', description: 'Average time held', target: '5+ years per position' },
      { name: 'Annualized Return', description: 'Compounded return per year', target: 'Beat S&P 500 over 10-year periods' },
    ],
    successCriteria: 'Owning 8-15 wide-moat businesses bought at significant discounts to intrinsic value, held for many years with minimal trading',
  },
  {
    id: 'growth_momentum',
    emoji: '🚀',
    name: 'The Growth & Momentum Surfer',
    tagline: 'Ride fast-growing stocks with technical confirmation',
    description: 'Identify companies growing revenue 25%+ per year and buy only after price confirms the trend. Sell quickly if growth slows or trend breaks.',
    difficulty: 'Intermediate',
    tier: 2,
    timeCommitment: '5-15 hours/week',
    bestFor: 'Active investors comfortable with volatility; willing to follow strict sell rules',
    steps: [
      {
        id: 'step1',
        title: 'Screen for high-growth companies',
        description: 'Find companies in early-to-mid stage growth with strong fundamentals.',
        actionItems: [
          'Revenue growth 25%+ year over year',
          'Earnings growth positive and accelerating',
          'Gross margins 40%+ (signals pricing power)',
          'Market cap $1B - $50B (room to grow)',
          'Limited debt relative to cash flow',
        ],
        relatedLessonIds: ['T2L06', 'T2L10'],
      },
      {
        id: 'step2',
        title: 'Wait for technical confirmation',
        description: 'Don\'t buy until the chart confirms the uptrend. Price action validates fundamentals.',
        actionItems: [
          'Price above 50-day and 200-day moving averages',
          'Recent breakout above prior resistance on high volume',
          'Higher highs and higher lows on weekly chart',
          'Avoid stocks in clear downtrends, no matter how good fundamentally',
        ],
        relatedLessonIds: ['T2L07'],
      },
      {
        id: 'step3',
        title: 'Size positions with strict risk control',
        description: 'Growth stocks are volatile. Position sizing prevents one bad call from ruining you.',
        actionItems: [
          'Risk no more than 1% of portfolio per trade',
          'Set stop-loss 15% below entry',
          'Position size = (1% × Portfolio) / (Entry Price - Stop Price)',
          'Max position size 8% of portfolio',
        ],
        relatedLessonIds: ['T2L18'],
      },
      {
        id: 'step4',
        title: 'Sell rules — non-negotiable',
        description: 'Growth investing fails when investors hold past the breakdown. Stick to your rules.',
        actionItems: [
          'Sell immediately if stop-loss hits',
          'Sell if revenue growth drops below 20% for 2 consecutive quarters',
          'Sell if price closes below 50-day MA on weekly chart',
          'Sell half if stock doubles, ride the rest with trailing stop',
        ],
        relatedLessonIds: ['T2L07', 'T2L15'],
      },
      {
        id: 'step5',
        title: 'Track performance ruthlessly',
        description: 'This style requires honest measurement. Most retail momentum traders underperform — make sure you\'re an exception.',
        actionItems: [
          'Log every trade: entry, exit, P&L, reason',
          'Calculate win rate and average win/loss ratio',
          'Goal: 45%+ win rate, 1.5:1 win/loss ratio',
          'If underperforming S&P 500 after 2 years, switch strategy',
        ],
        relatedLessonIds: ['T2L13', 'T2L15'],
      },
    ],
    metrics: [
      { name: 'Win Rate', description: 'Percentage of profitable trades', target: '45%+' },
      { name: 'Avg Win / Avg Loss', description: 'Ratio of average winning trade to losing trade', target: '1.5:1+' },
      { name: 'Max Drawdown', description: 'Largest peak-to-trough decline', target: 'Under 20%' },
    ],
    successCriteria: 'Beating S&P 500 over 3+ years while following strict risk controls; honest about underperformance if it occurs',
  },
  {
    id: 'sector_rotation',
    emoji: '🔄',
    name: 'The Sector Rotation Trader',
    tagline: 'Surf the economic cycle by rotating between sectors',
    description: 'Different sectors perform best at different economic cycle phases. Use macro context to overweight leading sectors and avoid laggards.',
    difficulty: 'Intermediate',
    tier: 2,
    timeCommitment: '2-4 hours/month',
    bestFor: 'Investors who think macro; comfortable using ETFs; quarterly rebalancers',
    steps: [
      {
        id: 'step1',
        title: 'Identify current cycle phase',
        description: 'Use the Macro Dashboard to determine where the economy is: early expansion, late expansion, contraction, or recession.',
        actionItems: [
          'Check GDP growth trend',
          'Check Fed funds rate direction',
          'Check yield curve shape',
          'Check unemployment trend',
          'Open the Market Cycle dashboard in the app',
        ],
        relatedLessonIds: ['T2L08', 'T2L09'],
      },
      {
        id: 'step2',
        title: 'Match sectors to phase',
        description: 'Each cycle phase has historical leaders and laggards.',
        actionItems: [
          'EARLY EXPANSION: Overweight Tech (XLK), Consumer Discretionary (XLY), Industrials (XLI)',
          'LATE EXPANSION: Overweight Energy (XLE), Materials (XLB), Financials (XLF)',
          'CONTRACTION: Overweight Healthcare (XLV), Consumer Staples (XLP), Utilities (XLU)',
          'RECESSION: Overweight Treasuries (TLT), Defensives (XLU), Cash',
        ],
        relatedLessonIds: ['T2L09'],
      },
      {
        id: 'step3',
        title: 'Build base allocation with sector ETFs',
        description: 'Use sector ETFs for simplicity and instant diversification within each sector.',
        actionItems: [
          'Start with 70% in broad-market ETF (SPY or VTI)',
          'Allocate remaining 30% to 2-3 leading sectors for current phase',
          'Use sector SPDR ETFs (XLK, XLF, XLE, etc.) — low cost, liquid',
        ],
        relatedLessonIds: ['T2L03'],
      },
      {
        id: 'step4',
        title: 'Rebalance at phase transitions',
        description: 'When the cycle shifts, gradually rotate sector exposure.',
        actionItems: [
          'Don\'t panic-rotate on a single signal — wait for confirmation',
          'Reduce exposure to lagging sectors by 5% per quarter',
          'Build exposure to new leaders gradually',
          'Full rotations typically take 6-12 months',
        ],
        relatedLessonIds: ['T2L09', 'T2L14'],
      },
      {
        id: 'step5',
        title: 'Document your phase calls',
        description: 'Track your cycle calls and rotations to measure success and improve over time.',
        actionItems: [
          'Journal each phase change: date, evidence, your rotation',
          'Compare your sector picks to actual performance 6 months later',
          'Adjust your model based on what worked and what didn\'t',
        ],
        relatedLessonIds: ['T2L15'],
      },
    ],
    metrics: [
      { name: 'Sector Calls Accuracy', description: 'How often your leading sector picks beat S&P 500', target: '60%+ over 2 years' },
      { name: 'Tracking vs Benchmark', description: 'Your portfolio return vs S&P 500', target: 'Beat by 1-3% annualized' },
      { name: 'Rotation Frequency', description: 'Number of significant rebalances per year', target: '2-4 (more = overtrading)' },
    ],
    successCriteria: 'Beating the broad market through correct sector positioning across multiple cycle phases',
  },
  {
    id: 'retiree_safety',
    emoji: '🛡️',
    name: 'The Retiree Income & Safety',
    tagline: 'Generate steady income while preserving capital',
    description: 'For retirees or near-retirees: a conservative allocation designed to provide reliable income with minimal principal risk. Live off the cash flow, never touch the principal.',
    difficulty: 'Beginner',
    tier: 1,
    timeCommitment: '2-3 hours/month',
    bestFor: 'Retirees, near-retirees, or capital preservation priority',
    steps: [
      {
        id: 'step1',
        title: 'Calculate your income needs',
        description: 'Determine how much annual income this portfolio needs to provide.',
        actionItems: [
          'List monthly expenses',
          'Subtract Social Security and pension income',
          'The gap = what your portfolio must generate',
          'At 4% withdrawal rate, you need 25× the annual gap',
        ],
        relatedLessonIds: ['T2L11', 'T2L14'],
      },
      {
        id: 'step2',
        title: 'Build the core allocation',
        description: 'A retirement portfolio prioritizes stability and income over growth.',
        actionItems: [
          '40% in dividend-paying blue-chip stocks (low-volatility, large-cap)',
          '40% in investment-grade bonds (mix of Treasuries and corporates)',
          '15% in REITs (real estate exposure, high yield)',
          '5% in cash (for emergencies, no panic-selling needed)',
        ],
        relatedLessonIds: ['T2L02', 'T2L12'],
      },
      {
        id: 'step3',
        title: 'Use ladder strategy for bonds',
        description: 'Bond laddering ensures steady income and reduces interest-rate risk.',
        actionItems: [
          'Buy bonds with staggered maturities: 1, 3, 5, 7, 10 years',
          'As each bond matures, reinvest in new 10-year bond',
          'This locks in current rates while always having some cash coming due',
        ],
        relatedLessonIds: ['T2L02'],
      },
      {
        id: 'step4',
        title: 'Set up income withdrawal',
        description: 'Live off dividends and interest, never sell the principal.',
        actionItems: [
          'Disable DRIP — let dividends flow to cash',
          'Withdraw quarterly, not monthly (smoother)',
          'Goal: withdrawals ≤ generated income',
          'In high-income years, reinvest the excess',
        ],
        relatedLessonIds: ['T2L11'],
      },
      {
        id: 'step5',
        title: 'Annual rebalance and risk check',
        description: 'Once per year, rebalance back to targets and check for any concerning changes.',
        actionItems: [
          'Sell what\'s above target weight, buy what\'s below',
          'Check for dividend cuts or bond downgrades',
          'Replace deteriorating holdings with similar quality',
          'Never abandon the framework in a panic',
        ],
        relatedLessonIds: ['T2L14', 'T2L15'],
      },
    ],
    metrics: [
      { name: 'Annual Income', description: 'Cash thrown off by portfolio', target: 'Covers your spending gap' },
      { name: 'Principal Stability', description: 'Variation in portfolio value', target: 'Less than 15% drawdown in worst years' },
      { name: 'Withdrawal Rate', description: 'Annual withdrawals / portfolio value', target: 'Under 4% safe rate' },
    ],
    successCriteria: 'Generating reliable income for 20-30+ years with portfolio principal intact or growing',
  },
  {
    id: 'index_and_chill',
    emoji: '😌',
    name: 'Index & Chill',
    tagline: 'The strategy that beats most professionals',
    description: 'Buy broad index funds, contribute monthly, ignore the noise. This simple approach beats 70-80% of professional fund managers over time. Perfect for set-and-forget investors.',
    difficulty: 'Beginner',
    tier: 1,
    timeCommitment: '30 minutes/month',
    bestFor: 'Anyone who wants market returns without picking stocks; long-term investors',
    steps: [
      {
        id: 'step1',
        title: 'Open the right accounts',
        description: 'Tax-advantaged accounts come first. They protect your gains from taxes.',
        actionItems: [
          'Max out 401(k) match at work (free money)',
          'Open a Roth IRA if eligible ($7,000/year limit in 2024)',
          'Use taxable brokerage for any additional savings',
          'Vanguard, Fidelity, and Schwab are best — low fees, no commissions',
        ],
        relatedLessonIds: ['T2L11'],
      },
      {
        id: 'step2',
        title: 'Pick 3-4 broad index funds',
        description: 'Complete diversification with just a handful of funds.',
        actionItems: [
          '60-70% in total US stock market (VTI or VTSAX)',
          '15-25% in international stocks (VXUS)',
          '10-30% in bonds (BND) — % matches your age',
          'Optional: 5% in REITs (VNQ) for real estate exposure',
        ],
        relatedLessonIds: ['T2L03', 'T2L14'],
      },
      {
        id: 'step3',
        title: 'Automate everything',
        description: 'Remove emotion by automating contributions. The biggest predictor of wealth is consistent contribution.',
        actionItems: [
          'Set up auto-transfer to brokerage each payday',
          'Set up auto-buy of your index funds',
          'Enable dividend reinvestment (DRIP)',
          'You should never have to manually buy or sell',
        ],
        relatedLessonIds: ['T2L04'],
      },
      {
        id: 'step4',
        title: 'Rebalance annually',
        description: 'Once per year, restore your target allocation.',
        actionItems: [
          'Pick one day per year (your birthday, January 1st)',
          'Compare current allocation to targets',
          'Sell what\'s overweight, buy what\'s underweight',
          'Use new contributions to underweight assets first',
        ],
        relatedLessonIds: ['T2L14'],
      },
      {
        id: 'step5',
        title: 'Do nothing else',
        description: 'The hardest part: stay the course through every crash, every rally, every news cycle.',
        actionItems: [
          'Don\'t check your portfolio more than monthly',
          'Don\'t panic-sell during crashes (you\'re buying lower!)',
          'Don\'t add hot stocks "just to spice it up"',
          'Trust the math: low cost + diversification + time = wealth',
        ],
        relatedLessonIds: ['T2L15', 'T2L20'],
      },
    ],
    metrics: [
      { name: 'Monthly Contribution', description: 'Consistency of new money in', target: 'Same amount every month, no skips' },
      { name: 'Annual Return vs S&P', description: 'Your return vs S&P 500', target: 'Within 0.5% — you should match it' },
      { name: 'Total Cost', description: 'Expense ratios + fees', target: 'Under 0.15% blended' },
    ],
    successCriteria: 'Decades of automatic, consistent contributions to low-cost index funds — wealth built quietly',
  },
  {
    id: 'options_wheel',
    emoji: '⚙️',
    name: 'The Options Wheel',
    tagline: 'Generate consistent income by selling options premium',
    description: 'A systematic options strategy that sells cash-secured puts to get into positions cheaply, then sells covered calls to generate ongoing income. When executed on quality stocks, the "wheel" produces 1-3% monthly returns on capital deployed.',
    difficulty: 'Advanced',
    tier: 3,
    timeCommitment: '3-5 hours/week',
    bestFor: 'Experienced investors who understand options; want to enhance returns on stocks they\'d own anyway',
    steps: [
      {
        id: 'step1',
        title: 'Select your wheel candidates',
        description: 'The wheel only works well on stocks you\'d genuinely be happy owning long-term. Never wheel a stock you wouldn\'t hold.',
        actionItems: [
          'Stick to liquid, well-known stocks: AAPL, MSFT, NVDA, AMD, SPY',
          'Implied volatility (IV) above 25% — higher IV = more premium',
          'Avoid stocks with upcoming earnings (options pricing becomes unpredictable)',
          'Stock price ideally under $150 so each contract (100 shares) requires ≤$15,000',
        ],
        relatedLessonIds: ['T2L07', 'T2L10'],
      },
      {
        id: 'step2',
        title: 'Sell cash-secured puts',
        description: 'Start the wheel by selling a put option. You collect premium upfront and either keep it (if stock stays above strike) or buy the stock at a discount (if it falls).',
        actionItems: [
          'Sell puts 2-5% below current price (out-of-the-money)',
          'Choose 30-45 days to expiration (optimal theta decay)',
          'Target 0.30-0.40 delta (30-40% chance of assignment)',
          'Collect minimum $150-$200 premium per contract',
          'Keep full cash collateral ready ($Strike × 100)',
        ],
        relatedLessonIds: ['T2L18', 'T2L14'],
      },
      {
        id: 'step3',
        title: 'Manage the put position',
        description: 'You don\'t have to hold until expiration. Close early when you can lock in most of the gain safely.',
        actionItems: [
          'Close put at 50% profit (buy back for half what you sold it for)',
          'If stock drops 5-8% below strike, roll down and out: buy back the put, sell a new put lower strike + later expiration',
          'Never let a put expire in-the-money and get assigned on a stock you hate',
        ],
        relatedLessonIds: ['T2L18'],
      },
      {
        id: 'step4',
        title: 'Sell covered calls if assigned',
        description: 'If you get assigned (forced to buy 100 shares), immediately start selling covered calls on the position.',
        actionItems: [
          'Sell calls 2-5% above your cost basis',
          'Choose 30-45 DTE, target 0.30 delta',
          'Collect premium every month until called away',
          'If called away (stock rises above strike), you sell shares at a profit + keep all premium',
          'If not called, repeat next month',
        ],
        relatedLessonIds: ['T2L07', 'T2L14'],
      },
      {
        id: 'step5',
        title: 'Track returns on buying power',
        description: 'Measure your wheel in terms of annualized return on capital committed, not the underlying stock price.',
        actionItems: [
          'Log: premium collected, capital deployed, days held',
          'Annualized ROI = (Premium / Capital) × (365 / DaysHeld)',
          'Target 15-30% annualized — competitive with the best equity managers',
          'If IV drops below 20%, pause the wheel and wait for volatility to return',
        ],
        relatedLessonIds: ['T2L14', 'T2L17'],
      },
    ],
    metrics: [
      { name: 'Monthly Premium Collected', description: 'Total options premium received each month', target: '1-2% of capital deployed' },
      { name: 'Assignment Rate', description: 'How often puts are exercised and you buy stock', target: '25-35% — too low means strikes too far OTM' },
      { name: 'Annualized Wheel Return', description: 'Total return on capital annualized', target: '18-30% in normal market conditions' },
    ],
    successCriteria: 'Consistently generating 1-2% monthly premium income on deployed capital across multiple wheel cycles with disciplined roll management',
  },
  {
    id: 'quantitative_factor',
    emoji: '🧮',
    name: 'The Quantitative Factor Strategy',
    tagline: 'Invest like an institution using factor models',
    description: 'Systematic, rules-based investing using three proven factors: value (cheap companies outperform), momentum (recent winners keep winning), and quality (profitable companies with strong balance sheets outperform). No discretion — pure systematic execution.',
    difficulty: 'Advanced',
    tier: 3,
    timeCommitment: '4-6 hours/month',
    bestFor: 'Analytically-minded investors; those who want to remove emotion entirely; quant-curious individuals',
    steps: [
      {
        id: 'step1',
        title: 'Build your factor scoring model',
        description: 'Assign quantitative scores to each stock across three factors. The combined score determines position sizing.',
        actionItems: [
          'VALUE SCORE: Rank stocks by EV/EBITDA (lower = better), P/FCF, and P/B. Score 1-100.',
          'MOMENTUM SCORE: Rank by 12-month price return minus the most recent month. Score 1-100.',
          'QUALITY SCORE: Rank by gross margin, ROE, debt/equity, and earnings stability. Score 1-100.',
          'COMPOSITE = 0.35 × Value + 0.35 × Momentum + 0.30 × Quality',
          'Screen your universe: S&P 500 or Russell 1000 (avoid micro-caps)',
        ],
        relatedLessonIds: ['T2L05', 'T2L10', 'T2L13'],
      },
      {
        id: 'step2',
        title: 'Build a concentrated top-decile portfolio',
        description: 'Invest only in the top 20-30 stocks by composite factor score. Concentration in the best factors is what generates alpha.',
        actionItems: [
          'Select the top 25 stocks from your ranked universe',
          'Equal-weight each position (4% each for 25-stock portfolio)',
          'Diversify across a minimum of 6 sectors',
          'Exclude any stock with less than $1B market cap or under 500K average daily volume',
        ],
        relatedLessonIds: ['T2L14', 'T2L06'],
      },
      {
        id: 'step3',
        title: 'Implement strict rebalancing rules',
        description: 'Factor portfolios must be rebalanced systematically. Ad-hoc changes destroy the strategy\'s edge.',
        actionItems: [
          'Rebalance monthly: re-rank all stocks, sell those that drop out of top 30, buy new entrants',
          'Alternatively: rebalance quarterly to reduce transaction costs',
          'Never deviate based on news or intuition — the model is your only signal',
          'Rebalance on a fixed calendar date (e.g., first trading day of each month)',
        ],
        relatedLessonIds: ['T2L14', 'T2L20'],
      },
      {
        id: 'step4',
        title: 'Control for factor crowding and sector bias',
        description: 'Systematic strategies can create hidden concentration risk if many factors point to the same sectors.',
        actionItems: [
          'Cap any single sector at 30% of portfolio',
          'Monitor correlation: if 80%+ of positions move together, factor may be crowded',
          'During crowding events (many quants exit simultaneously), expect sharp drawdowns — hold the model',
          'Add small-cap tilt (Russell 1000 bottom half) if you want more factor premium exposure',
        ],
        relatedLessonIds: ['T2L09', 'T2L16'],
      },
      {
        id: 'step5',
        title: 'Measure and attribute performance',
        description: 'Systematic investing requires rigorous performance attribution to know what\'s working and where your returns come from.',
        actionItems: [
          'Benchmark against S&P 500 and a simple equal-weight S&P',
          'Decompose returns: how much came from value tilt? Momentum? Quality?',
          'Calculate Information Ratio = (Your Return - Benchmark) / Tracking Error',
          'Target IR > 0.5 over 3+ years — this is elite level',
          'If underperforming for 2+ years, check if factor definitions need updating',
        ],
        relatedLessonIds: ['T2L13', 'T2L15'],
      },
    ],
    metrics: [
      { name: 'Information Ratio', description: 'Excess return per unit of active risk', target: '> 0.5 over 3-year rolling periods' },
      { name: 'Factor Exposure', description: 'How much your returns explain from each factor', target: 'All three factors contributing positively' },
      { name: 'Turnover', description: 'Annual portfolio turnover rate', target: '80-120% — too low = stale, too high = expensive' },
    ],
    successCriteria: 'Systematically beating the S&P 500 by 2-4% annualized over a 5-year period through disciplined factor exposure, with performance attribution explaining the source of excess returns',
  },
];

export const getPlaybookById = (id: string): Playbook | undefined =>
  playbooks.find(p => p.id === id);

export const getPlaybooksByTier = (tier: 1 | 2 | 3): Playbook[] =>
  playbooks.filter(p => p.tier <= tier);
