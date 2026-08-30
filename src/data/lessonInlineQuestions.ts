/**
 * Inline quiz & scenario questions — appear DURING lesson reading, between sections.
 * These are separate from the final quiz in curriculum.ts.
 *
 * Two types:
 *   'quiz'     — standard knowledge check (default)
 *   'scenario' — real-world situation with a "context" field describing the setup
 *
 * Book source: Michele Cagan, "Investing 101" (Adams Media / Simon & Schuster)
 * Pro quotes: Buffett, Graham, Lynch, Bogle — sourced from Chapter 10.
 */

import { QuizQuestion } from '../types';

export const inlineQuestions: Record<string, QuizQuestion[]> = {

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L01 — What is the stock market?
  // ─────────────────────────────────────────────────────────────────────────────
  T1L01: [
    {
      id: 'T1L01_i1',
      type: 'quiz',
      question: 'When you buy a share of Apple stock, you become:',
      options: [
        'A lender to Apple',
        'A part-owner of Apple Inc.',
        'An Apple employee',
        'A customer with special discounts',
      ],
      correctIndex: 1,
      explanation: 'Owning stock = owning a piece of the business. One share of Apple makes you a fractional owner — entitled to a cut of profits via dividends and a vote at shareholder meetings.',
    },
    {
      id: 'T1L01_i2',
      type: 'scenario',
      context: 'Apple announces a new iPhone. Initial reviews are mixed — the camera is great but the battery disappointed critics. The stock drops 4% the next morning.',
      question: 'You own 10 shares bought at $180 each. They\'re now worth $172.80. What\'s the rational response?',
      options: [
        'Sell immediately — a 4% drop signals more pain ahead',
        'Buy more — one negative review rarely changes a company\'s long-term trajectory',
        'Do nothing for now, but research whether your original thesis has changed',
        'Wait for the stock to bounce back to $180, then sell',
      ],
      correctIndex: 2,
      explanation: 'One product cycle rarely changes Apple\'s business. Research first: Is the iPhone business structurally weakening, or did the market overreact to mixed reviews? If your thesis holds, the 4% drop is noise — not a signal to sell.',
    },
    {
      id: 'T1L01_i3',
      type: 'quiz',
      question: 'The S&P 500 "is up today." What does that actually mean?',
      options: [
        'All 500 companies in the index made money today',
        'The weighted average price of the 500 largest US companies rose',
        'The US government declared profits',
        'Interest rates went up',
      ],
      correctIndex: 1,
      explanation: 'The S&P 500 is a price-weighted basket of 500 large US companies. When it\'s "up," it means that basket\'s average value increased — not that every single company went up.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L02 — Stocks vs Bonds vs ETFs
  // ─────────────────────────────────────────────────────────────────────────────
  T1L02: [
    {
      id: 'T1L02_i1',
      type: 'quiz',
      question: 'Jack Bogle, founder of Vanguard, said most investors should do what?',
      options: [
        'Pick individual stocks using technical analysis',
        'Buy a low-cost index fund and hold it for decades',
        'Actively trade to beat the market',
        'Keep money in high-yield savings accounts',
      ],
      correctIndex: 1,
      explanation: 'Bogle created the first index mutual fund and spent his career proving that low-cost, passive investing beats most active managers over time. His advice: own the whole market cheaply and patiently.',
    },
    {
      id: 'T1L02_i2',
      type: 'quiz',
      question: 'You invest $500/month into VOO (an S&P 500 ETF). The market drops 25%. What happens to your next $500 purchase?',
      options: [
        'It buys fewer shares because the market dropped',
        'It buys more shares because prices are lower',
        'Your purchase is cancelled until the market recovers',
        'The ETF automatically adjusts your contribution',
      ],
      correctIndex: 1,
      explanation: 'This is DCA in action. A 25% market drop means your $500 buys ~33% more shares than before. Bear markets are essentially sales on stocks. DCA investors benefit from downturns — if they keep buying.',
    },
    {
      id: 'T1L02_i3',
      type: 'scenario',
      context: 'Your 22-year-old cousin just got her first job and has $200/month to invest. She\'s asking whether to put it in a savings account (1.5% APY) or a low-cost S&P 500 ETF (historical ~10% average return). She won\'t need this money until retirement in 43 years.',
      question: 'What does the math say she should do?',
      options: [
        'Savings account — it\'s safer and guaranteed',
        'S&P 500 ETF — the long time horizon makes temporary volatility irrelevant',
        'Split 50/50 — balance is always best',
        'Wait until the market hits a new low first',
      ],
      correctIndex: 1,
      explanation: '$200/month for 43 years: at 1.5%, ends at ~$130K. At 10%, ends at ~$1.5M. The difference is $1.37 million — from the same $200/month. Time horizon is everything. At 22, short-term volatility is essentially irrelevant.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L03 — How to read a stock quote
  // ─────────────────────────────────────────────────────────────────────────────
  T1L03: [
    {
      id: 'T1L03_i1',
      type: 'quiz',
      question: 'Stock A has a P/E of 10. Stock B has a P/E of 45. Both are in the same industry. What\'s the most accurate statement?',
      options: [
        'Stock A is always the better buy',
        'Stock B is definitely overvalued',
        'Stock A may be a value opportunity OR a troubled business — you need to dig deeper',
        'P/E doesn\'t matter for comparing same-industry stocks',
      ],
      correctIndex: 2,
      explanation: 'A low P/E can signal an undervalued gem OR a struggling company investors are fleeing. As Warren Buffett wrote, the goal is finding "wonderful companies at fair prices" — low P/E alone doesn\'t tell you if the company is wonderful.',
    },
    {
      id: 'T1L03_i2',
      type: 'scenario',
      context: 'You\'re looking at two companies: Company A (fast-growing tech, P/E of 55, no dividend, reinvests all profits), Company B (mature consumer brand, P/E of 18, 3% dividend yield, 20-year history of steady growth).',
      question: 'Which is more appropriate for a Tier 1 beginner investor building their first portfolio?',
      options: [
        'Company A — higher growth means higher returns',
        'Company B — lower P/E, dividends, and a track record make it more predictable',
        'Neither — only ETFs are appropriate for beginners',
        'Both equally — diversify between them',
      ],
      correctIndex: 1,
      explanation: 'Beginners benefit from predictability. Company B\'s 20-year track record, dividend income, and reasonable valuation give you more to hang your thesis on. Company A might be a great investment — but requires deeper analysis of growth projections that goes beyond Tier 1.',
    },
    {
      id: 'T1L03_i3',
      type: 'quiz',
      question: 'How do you calculate a stock\'s total return over one year?',
      options: [
        '(Ending price − Starting price) ÷ Starting price',
        '(Price change + Dividends received) ÷ Starting price',
        'Dividends received ÷ Ending price',
        'Market cap change ÷ Shares outstanding',
      ],
      correctIndex: 1,
      explanation: 'Total return includes BOTH price appreciation AND dividends. Ignoring dividends dramatically understates your real return. Many blue-chips with "slow" stock growth have excellent total returns when dividends are included.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L04 — Understanding risk
  // ─────────────────────────────────────────────────────────────────────────────
  T1L04: [
    {
      id: 'T1L04_i1',
      type: 'quiz',
      question: 'Your friend puts $10,000 entirely in one pharmaceutical stock. The FDA rejects their main drug. The stock drops 70%. What kind of risk hit them?',
      options: [
        'Market risk — inevitable for all investors',
        'Company-specific risk — avoidable with diversification',
        'Inflation risk',
        'Interest rate risk',
      ],
      correctIndex: 1,
      explanation: 'An FDA rejection affects only that company, not the market. If they had spread $10K across 15-20 stocks, one company\'s collapse costs them ~$700 instead of $7,000. This is exactly what diversification solves.',
    },
    {
      id: 'T1L04_i2',
      type: 'scenario',
      context: 'You have $5,000 to invest. You love Tesla. Your roommate says "Just put it all in TSLA — it\'ll 10x." You\'ve been reading about how risky concentration is.',
      question: 'What\'s the most rational approach?',
      options: [
        'Put 100% in TSLA — conviction pays off',
        'Put 100% in a diversified ETF — avoid individual stocks entirely',
        'Allocate a manageable slice (10-20%) to TSLA, rest diversified — conviction with risk management',
        'Ask your roommate for more stock tips',
      ],
      correctIndex: 2,
      explanation: 'Conviction is good. Concentration is dangerous. A 10-20% position in TSLA means you participate in its upside without betting everything. If TSLA drops 60% (which it has done), you lose $300-600, not $3,000-5,000. Risk management lets you stay in the game.',
    },
    {
      id: 'T1L04_i3',
      type: 'quiz',
      question: 'Benjamin Graham\'s "margin of safety" principle says:',
      options: [
        'Buy stocks only when they\'re rising',
        'Only invest money you can afford to lose entirely',
        'Buy at a significant discount to intrinsic value so mistakes don\'t destroy you',
        'Keep 50% of your portfolio in cash at all times',
      ],
      correctIndex: 2,
      explanation: 'Graham\'s core insight: if you estimate a company is worth $100 and buy at $70, you have a $30 margin of safety. Even if you\'re wrong by 15%, you break even. The margin of safety is your buffer against being wrong — and investors are always sometimes wrong.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L05 — Your first investment decision
  // ─────────────────────────────────────────────────────────────────────────────
  T1L05: [
    {
      id: 'T1L05_i1',
      type: 'quiz',
      question: 'Which time horizon makes stocks most appropriate?',
      options: [
        '6 months — enough time to recover from a dip',
        '1–2 years — you can ride out one bad earnings season',
        '5+ years — long enough that volatility is manageable',
        'Any time — stocks always go up eventually',
      ],
      correctIndex: 2,
      explanation: 'Stocks can drop 30-50% and take years to recover. "Any time" is dangerously wrong — the 2008 crash took 4 years to recover. With 5+ years, you have the time to outlast typical bear markets.',
    },
    {
      id: 'T1L05_i2',
      type: 'scenario',
      context: 'It\'s March 2020. COVID-19 triggers the fastest bear market in history. The S&P 500 drops 34% in 23 days. Your $15,000 portfolio is now worth $9,900. Every news headline says "this could get much worse." You\'re 27 years old with a 35-year investment horizon.',
      question: 'What does a rational long-term investor do?',
      options: [
        'Sell everything and move to cash until the crisis passes',
        'Hold — and if possible, keep investing regular monthly amounts',
        'Move entirely to gold and bonds',
        'Stop checking the portfolio until things calm down',
      ],
      correctIndex: 1,
      explanation: 'The COVID crash recovered 100% of its losses in just 5 months — the fastest recovery in history. Investors who sold in March 2020 locked in a 34% loss and then missed the entire recovery. Selling panic sells are almost always a mistake for long-horizon investors. D and B are both correct instincts; B is optimal.',
    },
    {
      id: 'T1L05_i3',
      type: 'quiz',
      question: 'You\'re saving for a house down payment in 18 months. Where should this money live?',
      options: [
        'S&P 500 index fund — best long-term return',
        'A single high-conviction stock like NVDA',
        'High-yield savings account or short-term Treasury bonds',
        'Real estate investment trusts (REITs)',
      ],
      correctIndex: 2,
      explanation: 'Money with a specific near-term purpose cannot withstand market volatility. Stocks can drop 30%+ and stay down for years. A $50K down payment fund in the stock market in 2022 would have dropped to $37K — not what you want 18 months before buying a home.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L06 — Blue-chip stocks explained
  // ─────────────────────────────────────────────────────────────────────────────
  T1L06: [
    {
      id: 'T1L06_i1',
      type: 'quiz',
      question: 'Warren Buffett said: "If you gave me $100 billion and said take away the soft drink leadership of Coca-Cola in the world, I\'d give it back to you." What investing concept does this illustrate?',
      options: [
        'Growth investing — looking for the fastest-growing companies',
        'A moat — a competitive advantage impossible to replicate with money alone',
        'Dividend investing — Coke pays reliable dividends',
        'Technical analysis — Coke\'s stock chart trends up',
      ],
      correctIndex: 1,
      explanation: 'Buffett is describing Coke\'s moat: 130+ years of brand trust, global distribution, and consumer habit that $100 billion in competitor spending literally cannot buy. The moat protects against competitors — that\'s what makes it durable.',
    },
    {
      id: 'T1L06_i2',
      type: 'scenario',
      context: 'You\'re comparing two stocks for your first portfolio. Stock A: 45-year-old consumer staples company, P/E 19, dividends for 30 consecutive years, global brand, boring business (makes cleaning products). Stock B: 4-year-old disruptive tech company, P/E 180, no dividends, loses money but growing revenue 40%/year.',
      question: 'For a Tier 1 investor building their foundation portfolio, which is the stronger choice?',
      options: [
        'Stock B — 40% revenue growth is where the money is',
        'Stock A — predictability, income, and established moat suit a foundation portfolio',
        'Both equally — growth and value both belong in a starter portfolio',
        'Neither — start only with index ETFs',
      ],
      correctIndex: 1,
      explanation: 'Stock A is the Tier 1 choice. P&G, Colgate, Clorox — these boring companies have made investors rich precisely because their businesses are predictable. Stock B may be a great Tier 2/3 investment but requires valuation skills beyond the foundation tier. Build your foundation with companies you can understand and sleep holding.',
    },
    {
      id: 'T1L06_i3',
      type: 'quiz',
      question: 'GE (General Electric) was a blue-chip for 100 years — then its stock fell over 70% from peak. What\'s the lesson?',
      options: [
        'Blue-chip means risk-free, so GE must have been an exception',
        'Past reliability doesn\'t guarantee future performance — moats can erode',
        'GE is proof that all stocks eventually go to zero',
        'You should never own industrial stocks',
      ],
      correctIndex: 1,
      explanation: 'Even century-old blue chips can fail when their competitive moat erodes. GE over-diversified, took on too much financial risk, and lost its edge. "Buy and hold" only works for companies that still deserve holding. Monitor your thesis, not just the price.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L07 — Dividends and passive income
  // ─────────────────────────────────────────────────────────────────────────────
  T1L07: [
    {
      id: 'T1L07_i1',
      type: 'quiz',
      question: 'A stock costs $80 and pays $3.20 per year in dividends. What is the dividend yield?',
      options: ['1%', '2%', '4%', '8%'],
      correctIndex: 2,
      explanation: '$3.20 ÷ $80 = 4%. For every $100 you invest, you receive $4 in cash annually — regardless of what the stock price does. That\'s real passive income hitting your account every quarter.',
    },
    {
      id: 'T1L07_i2',
      type: 'scenario',
      context: 'Your uncle excitedly tells you about a pipeline company yielding 14%. "Free money!" he says. The industry is under regulatory pressure and the company\'s dividend has been cut once already in the past 3 years.',
      question: 'How should you think about this "opportunity"?',
      options: [
        'Buy it — 14% yield is too good to pass up',
        'This is a yield trap — investigate why the yield is so high before touching it',
        'Avoid all high-yield stocks forever',
        'Split your investment 50/50 between this and a safer stock',
      ],
      correctIndex: 1,
      explanation: 'A 14% yield is a red flag, not a gift. High yields often mean the stock price has crashed because investors doubt the dividend is sustainable. A dividend cut after a price crash = you lose twice. Always ask: "Why is this yield so high?"',
    },
    {
      id: 'T1L07_i3',
      type: 'quiz',
      question: 'Procter & Gamble has raised its dividend every year for 67 consecutive years. What does this make P&G?',
      options: [
        'A Dividend Aristocrat (25+ years of increases)',
        'A Dividend King (50+ years of increases)',
        'An income stock only',
        'A growth stock in disguise',
      ],
      correctIndex: 1,
      explanation: 'Dividend Kings have 50+ consecutive years of increases — a truly extraordinary commitment. P&G, Coca-Cola, Johnson & Johnson, and a handful of others qualify. These companies have maintained and grown dividends through recessions, wars, and pandemics.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L08 — Market cycles: Boom and Bust
  // ─────────────────────────────────────────────────────────────────────────────
  T1L08: [
    {
      id: 'T1L08_i1',
      type: 'quiz',
      question: 'Benjamin Graham described the market as "Mr. Market" — a moody business partner who offers to buy or sell his share daily at wildly different prices. What\'s Graham\'s lesson?',
      options: [
        'Always accept Mr. Market\'s offer — the market is always right',
        'Mr. Market\'s moods are irrelevant; only the business\'s real value matters',
        'Trade every time Mr. Market changes his price',
        'Mr. Market proves markets are efficient',
      ],
      correctIndex: 1,
      explanation: 'Graham\'s metaphor: Mr. Market is emotionally unstable — sometimes euphoric (overpricing), sometimes depressed (underpricing). A rational investor ignores Mr. Market\'s mood swings and focuses on the actual business value. Panic and euphoria are Mr. Market\'s problems, not yours.',
    },
    {
      id: 'T1L08_i2',
      type: 'scenario',
      context: 'March 2009. The S&P 500 has dropped 57% from its 2007 peak. Lehman Brothers collapsed 6 months ago. Unemployment is rising. Every newspaper predicts a decade-long depression. Warren Buffett writes in the New York Times: "Buy America, I Am." Your $10,000 portfolio is worth $4,300.',
      question: 'History shows what actually happened next. Based on market cycle principles, what was the rational move?',
      options: [
        'Sell everything — it could go to zero',
        'Hold and keep adding money — this was the Accumulation phase before the next bull market',
        'Wait until the economy clearly improved before buying',
        'Move to gold until the crisis passed',
      ],
      correctIndex: 1,
      explanation: 'March 2009 was the exact market bottom. Investors who held and kept buying earned 400%+ returns over the next decade. Those who sold locked in a 57% loss. "Accumulation" — buying during maximum pessimism — is historically where the most wealth is created. Buffett was right.',
    },
    {
      id: 'T1L08_i3',
      type: 'quiz',
      question: 'In the "Distribution" phase of a market cycle, who is typically selling?',
      options: [
        'Beginners who just discovered investing',
        'Informed institutional investors reducing risk near market peaks',
        'Everyone — it\'s a crash',
        'Central banks',
      ],
      correctIndex: 1,
      explanation: 'Smart money sells during Distribution — when public optimism is highest and valuations are stretched. They\'re selling TO the enthusiastic newcomers flooding into the market. Recognizing this phase is how sophisticated investors avoid buying at the top.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L09 — Your first paper trade walkthrough
  // ─────────────────────────────────────────────────────────────────────────────
  T1L09: [
    {
      id: 'T1L09_i1',
      type: 'quiz',
      question: 'Peter Lynch\'s famous "invest in what you know" principle means:',
      options: [
        'Only buy stocks in your hometown',
        'Use your everyday consumer experience as a starting point for investment ideas',
        'Avoid any company you don\'t personally use',
        'Only invest in your own employer\'s stock',
      ],
      correctIndex: 1,
      explanation: 'Lynch discovered many great investments by noticing what products and companies resonated with everyday consumers before Wall Street caught on. Noticing that Dunkin\' Donuts is always packed, or that your family loves a specific product, is a valid starting point — then you do the financial research to confirm it.',
    },
    {
      id: 'T1L09_i2',
      type: 'scenario',
      context: 'You buy Walmart stock because your friend did. Two weeks later, it\'s down 9%. Your friend texts: "I\'m holding, don\'t panic." You don\'t really know WHY you own it beyond "my friend does."',
      question: 'What\'s the core problem with how you bought, and what should you do now?',
      options: [
        'The core problem is your friend\'s bad advice — find a new friend',
        'The core problem is you have no thesis — research now, then decide based on fundamentals',
        'The core problem is the 9% drop — sell immediately before it gets worse',
        'The core problem is you didn\'t diversify — buy 4 more friend-recommended stocks',
      ],
      correctIndex: 1,
      explanation: '"My friend owns it" is not an investment thesis. Without knowing WHY Walmart is worth owning — its moat (low prices + scale + loyalty), its dividend history, its recession resistance — you can\'t rationally decide what to do when it drops. Research first, always.',
    },
    {
      id: 'T1L09_i3',
      type: 'quiz',
      question: 'Warren Buffett: "The dumbest reason in the world to buy a stock is because it\'s going up." What\'s he warning against?',
      options: [
        'Buying growth stocks',
        'Momentum investing without understanding the underlying business',
        'Using charts and technical analysis',
        'Investing in rising markets',
      ],
      correctIndex: 1,
      explanation: 'Price movement alone is not a thesis. A stock going up tells you other people are buying it — nothing about whether the business justifies the price. Buying because it\'s going up is the behavior that creates bubbles and destroys wealth when momentum reverses.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L10 — Building a simple portfolio
  // ─────────────────────────────────────────────────────────────────────────────
  T1L10: [
    {
      id: 'T1L10_i1',
      type: 'scenario',
      context: 'Your current portfolio: 35% Apple, 25% Microsoft, 20% Google, 20% NVIDIA. You\'re proud — four different companies!',
      question: 'What\'s the critical problem with this "diversified" portfolio?',
      options: [
        'Four stocks is too few — you need at least 20',
        'All four are mega-cap tech — they\'ll crash together when tech crashes',
        'Google and Microsoft are too similar in size',
        'You\'re missing international exposure',
      ],
      correctIndex: 1,
      explanation: 'This is sector concentration disguised as diversification. When the 2022 tech selloff hit, AAPL, MSFT, GOOGL, and NVDA all dropped 30-65%. True diversification spans different sectors — tech, healthcare, consumer staples, financials — so one sector\'s crash doesn\'t wipe out everything.',
    },
    {
      id: 'T1L10_i2',
      type: 'quiz',
      question: 'You rebalance your portfolio once a year. In practice, what does this force you to do?',
      options: [
        'Buy more of your winning stocks',
        'Sell high (trim winners that grew too large) and buy low (add to underweighted positions)',
        'Start fresh with new stocks every year',
        'Match exactly the market\'s current sector weights',
      ],
      correctIndex: 1,
      explanation: 'Rebalancing is a mechanical way to "sell high, buy low" without market timing. Your winners grew big → trim them. Your laggards are now underweighted and cheaper → add to them. Consistently doing this annually removes emotion from the buy/sell decision.',
    },
    {
      id: 'T1L10_i3',
      type: 'quiz',
      question: 'According to research, what is the approximate minimum number of stocks needed to capture most diversification benefits?',
      options: ['3–5', '15–25', '50–100', '500+'],
      correctIndex: 1,
      explanation: 'Beyond 15–25 well-chosen stocks across different sectors, diversification benefit becomes marginal. More stocks means more to track and more likelihood you just accidentally recreate an expensive index fund. Quality and sector spread matter more than raw count.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L11 — Reading financial news without panic
  // ─────────────────────────────────────────────────────────────────────────────
  T1L11: [
    {
      id: 'T1L11_i1',
      type: 'quiz',
      question: 'Financial media\'s business model is built on:',
      options: [
        'Maximizing your portfolio returns',
        'Providing unbiased analysis to help investors',
        'Capturing your attention, which requires dramatic and alarming headlines',
        'Reporting every SEC filing accurately',
      ],
      correctIndex: 2,
      explanation: '"Market PLUNGES" gets clicks. "Market continues normal range of volatility" doesn\'t. Media\'s incentive is your eyeballs, not your wealth. Knowing this lets you read with healthy skepticism and react only to actual substance.',
    },
    {
      id: 'T1L11_i2',
      type: 'scenario',
      context: 'Breaking news: "Fed raises rates 0.25%! Stock market tumbles 2%!" CNBC shows red arrows everywhere. Your long-term portfolio holds Coca-Cola, Johnson & Johnson, and a broad S&P 500 ETF. You\'ve been holding for 3 years.',
      question: 'What\'s the signal-vs-noise framework for this situation?',
      options: [
        'Noise — a 0.25% rate hike rarely changes the long-term value of Coke or J&J',
        'Signal — rate hikes always crush stock markets so you should reduce exposure',
        'Signal — sell everything and wait for the Fed to stop hiking',
        'Noise for tech, signal for consumer staples',
      ],
      correctIndex: 0,
      explanation: 'Coca-Cola sold drinks through 17 Fed rate hike cycles. J&J sold healthcare through all of them too. A 0.25% hike doesn\'t change whether either company is durable and valuable. The 2% single-day market move is Mr. Market being Mr. Market — not a change in your thesis.',
    },
    {
      id: 'T1L11_i3',
      type: 'quiz',
      question: 'A company beats earnings expectations by 12% but its stock falls 8% the same day. Why?',
      options: [
        'Beating earnings always causes stock prices to fall',
        'The market expected even more — "whisper numbers" or guidance disappointed',
        'Institutional investors are selling on false information',
        'The SEC halted trading',
      ],
      correctIndex: 1,
      explanation: 'Stocks price in expectations, not just reality. If the market secretly expected a 20% beat, a 12% beat IS a disappointment. Sell-the-news reactions happen when reality meets or barely beats stratospheric expectations. One quarter\'s reaction rarely changes a great company\'s trajectory.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // T1L12 — Graduation project: Your first research
  // ─────────────────────────────────────────────────────────────────────────────
  T1L12: [
    {
      id: 'T1L12_i1',
      type: 'quiz',
      question: 'Buffett\'s most famous investing principle is: "It\'s far better to buy a wonderful company at a fair price than ____"',
      options: [
        '"…a terrible company at any price"',
        '"…a fair company at a wonderful price"',
        '"…a growing company at any price"',
        '"…a dividend company at an expensive price"',
      ],
      correctIndex: 1,
      explanation: 'This is the heart of quality investing. Paying a fair price for a genuinely wonderful business (strong moat, honest management, consistent profits) beats hunting for "cheap" stocks in mediocre businesses. The business quality matters more than the discount.',
    },
    {
      id: 'T1L12_i2',
      type: 'scenario',
      context: 'You\'re writing a thesis for Costco (COST). Here\'s your draft: "Costco is cheap right now and everyone shops there." Your friend writes: "Costco\'s $130/year membership fee creates sticky recurring revenue (93% renewal rate). Their scale lets them negotiate lower prices than any competitor. Bear case: e-commerce erosion. I\'d sell if renewal rates fall below 90% for two consecutive quarters."',
      question: 'Whose thesis is stronger, and why?',
      options: [
        'Yours — short and simple is better',
        'Your friend\'s — it identifies the moat, income model, bear case, and exit trigger',
        'Both are equally valid starting points',
        'Neither — a thesis should include a price target',
      ],
      correctIndex: 1,
      explanation: 'Your friend\'s thesis gives you a framework to evaluate future news. When Costco reports earnings, you know exactly what to check: renewal rates. Your thesis ("it\'s cheap and popular") gives you nothing actionable when the stock moves. A thesis is a decision tool, not a fan letter.',
    },
    {
      id: 'T1L12_i3',
      type: 'quiz',
      question: 'You can\'t explain in plain English why a stock is worth owning. What should you do?',
      options: [
        'Buy it anyway — you\'ll understand it better as a holder',
        'Ask your broker to explain it and buy based on their answer',
        'Keep researching until you can explain it simply, or skip the stock',
        'Buy a small position to learn through experience',
      ],
      correctIndex: 2,
      explanation: '"If you can\'t explain it simply, you don\'t understand it well enough." This applies perfectly to investing. If you can\'t articulate the business, the moat, the risk, and your exit — you\'re not investing, you\'re gambling. Either learn it properly or move on to something you can understand.',
    },
  ],

  // ── TIER 2 INLINE QUESTIONS ───────────────────────────────────────────────

  T2L01: [
    {
      id: 'T2L01_i1', type: 'quiz',
      question: 'A $1,000 bond with a 4% coupon. How much do you receive in annual interest?',
      options: ['$4', '$40', '$400', '$1,040'],
      correctIndex: 1,
      explanation: '4% of $1,000 = $40 per year (typically paid as $20 every 6 months). The coupon rate applies to the face value, not the purchase price.',
    },
    {
      id: 'T2L01_i2', type: 'quiz',
      question: 'Interest rates rise from 2% to 5%. What happens to the price of an existing 2% bond?',
      options: ['It rises because rates are higher', 'It falls because your bond looks less attractive', 'Nothing — bonds aren\'t affected by rates', 'It doubles to match the new rate'],
      correctIndex: 1,
      explanation: 'When new bonds pay 5%, nobody wants your 2% bond unless it\'s discounted. This inverse relationship — rates up, bond prices down — is the most important bond concept to internalize.',
    },
    {
      id: 'T2L01_i3', type: 'quiz',
      question: 'Why do bonds typically move opposite to stocks in a portfolio?',
      options: ['Bonds are always profitable', 'When stocks crash, investors flee to bond safety, pushing bond prices up', 'Government regulations force this', 'Bond prices are fixed by law'],
      correctIndex: 1,
      explanation: 'In a crisis, the "flight to safety" effect means money pours into government bonds. This negative correlation is why a 70/30 stock/bond portfolio can deliver nearly all-stock returns with much lower volatility.',
    },
  ],

  T2L02: [
    {
      id: 'T2L02_i1', type: 'quiz',
      question: 'Which bond type is considered the safest investment in the world?',
      options: ['Corporate junk bonds', 'US Treasury bonds', 'Municipal bonds', 'Emerging market bonds'],
      correctIndex: 1,
      explanation: 'US Treasuries are backed by the "full faith and credit" of the US government — the largest economy in the world. They\'ve never defaulted. That\'s why they\'re called the "risk-free" benchmark.',
    },
    {
      id: 'T2L02_i2', type: 'quiz',
      question: 'A bond is rated "BB" by S&P. What does this mean?',
      options: ['AAA-quality investment grade', 'Below investment grade — higher risk and yield', 'Government-backed safe bond', 'Triple-A equivalent'],
      correctIndex: 1,
      explanation: 'BB is below investment grade (often called "junk" or "high yield"). These bonds pay more because investors demand compensation for higher default risk. Investment grade starts at BBB- and above.',
    },
    {
      id: 'T2L02_i3', type: 'quiz',
      question: 'Municipal bonds are attractive to investors in high tax brackets because:',
      options: ['They pay more interest than Treasuries', 'Interest is often exempt from federal (and sometimes state) income tax', 'They never lose value', 'They\'re backed by the US Treasury'],
      correctIndex: 1,
      explanation: 'For someone in the 37% tax bracket, a 3% muni bond earning tax-free can be worth more than a 4.5% taxable bond. Always compare after-tax yields.',
    },
  ],

  T2L03: [
    {
      id: 'T2L03_i1', type: 'quiz',
      question: 'What is an ETF\'s biggest structural advantage over a mutual fund?',
      options: ['Higher guaranteed returns', 'It trades on exchanges all day like a stock — no end-of-day pricing delay', 'No fees ever', 'Access to private companies'],
      correctIndex: 1,
      explanation: 'ETFs trade continuously throughout market hours. Mutual funds price once, at market close. This means you can buy or sell an ETF at exactly the price you see, with a market order.',
    },
    {
      id: 'T2L03_i2', type: 'quiz',
      question: 'The S&P 500 index beats ~85% of actively managed large-cap funds over 15 years. Why?',
      options: ['Index funds get special government returns', 'Lower fees compound over time; active managers can\'t consistently beat the market after costs', 'Index funds cherry-pick the best stocks', 'Active managers are legally restricted'],
      correctIndex: 1,
      explanation: 'A 1% expense ratio sounds tiny but costs you ~26% of your wealth over 30 years versus a 0.03% index fund. Most managers don\'t beat their benchmark — and fees make it even harder.',
    },
    {
      id: 'T2L03_i3', type: 'quiz',
      question: 'VOO has an expense ratio of 0.03%. What does this mean for a $10,000 investment?',
      options: ['You pay $300 per year', 'You pay $3 per year in fees', 'You pay nothing — ETFs are always free', 'You pay $30 per trade'],
      correctIndex: 1,
      explanation: '0.03% of $10,000 = $3 annually. Compare this to an actively managed fund charging 1% = $100/year. Over 30 years at 8% returns, that difference compounds to roughly $97,000 in your pocket.',
    },
  ],

  T2L04: [
    {
      id: 'T2L04_i1', type: 'quiz',
      question: 'What is an expense ratio and why does it matter?',
      options: ['The P/E ratio of a fund', 'Annual management fees as a % of assets — reduces your returns every year', 'One-time purchase commission', 'The fund\'s profit margin'],
      correctIndex: 1,
      explanation: 'If a fund earns 8% and charges a 1% expense ratio, you keep 7%. Over 30 years, that 1% gap costs you ~30% of your final wealth. Always check expense ratios before investing in any fund.',
    },
    {
      id: 'T2L04_i2', type: 'quiz',
      question: 'Dollar-cost averaging into a mutual fund means:',
      options: ['Buying only when prices are at their lowest', 'Investing a fixed amount at regular intervals regardless of price', 'Averaging the dollar value of all your holdings', 'Trading only in dollar-denominated assets'],
      correctIndex: 1,
      explanation: 'DCA removes the impossibility of timing the market. When prices are low you buy more shares; when high, fewer. Over time, this averages out your cost basis — and removes the emotional pressure of picking entry points.',
    },
    {
      id: 'T2L04_i3', type: 'quiz',
      question: 'A "load" on a mutual fund is:',
      options: ['The fund\'s debt level', 'A sales commission paid when you buy (front-load) or sell (back-load)', 'The number of stocks it holds', 'A leverage multiplier'],
      correctIndex: 1,
      explanation: 'A 5% front-load means if you invest $10,000, only $9,500 actually gets invested — $500 goes to the broker immediately. No-load funds invest 100% of your money. Always prefer no-load when available.',
    },
  ],

  T2L05: [
    {
      id: 'T2L05_i1', type: 'quiz',
      question: 'Warren Buffett\'s core idea is to buy companies trading at:',
      options: ['The highest P/E ratios in the market', 'A significant discount to their intrinsic value', 'Whatever price the market sets today', 'Stocks that went up last year'],
      correctIndex: 1,
      explanation: 'Buffett learned from Ben Graham: the stock market is a voting machine in the short run and a weighing machine in the long run. Buy when Mr. Market is pessimistic and pricing a great business at a discount.',
    },
    {
      id: 'T2L05_i2', type: 'quiz',
      question: 'What is a company\'s "economic moat"?',
      options: ['The physical security of its headquarters', 'A durable competitive advantage that protects profits from competitors', 'Its cash reserves', 'The size of its debt'],
      correctIndex: 1,
      explanation: 'A wide moat means competitors can\'t easily erode a company\'s profits. Examples: Visa\'s network effects, Apple\'s brand loyalty, Costco\'s cost advantage. Wide-moat companies compound wealth over decades.',
    },
    {
      id: 'T2L05_i3', type: 'quiz',
      question: 'A stock trades at P/E 8. The sector average is P/E 18. This could mean:',
      options: ['The stock is definitely overvalued', 'The stock may be undervalued — or there\'s a real problem the market knows about', 'It\'s a growth stock about to rocket', 'The P/E of 8 is always correct'],
      correctIndex: 1,
      explanation: 'Low P/E can signal a bargain (value opportunity) or a "value trap" — a company with real problems. Value investing requires you to distinguish between cheap-for-a-reason and cheap-but-misunderstood. Always research why.',
    },
  ],

  T2L06: [
    {
      id: 'T2L06_i1', type: 'quiz',
      question: 'A growth company\'s revenue is expanding 40% per year. Why might it still lose money?',
      options: ['Growth companies always lose money', 'It\'s investing aggressively in R&D and sales to capture market share faster than competitors', 'Tax reasons', 'Accounting errors'],
      correctIndex: 1,
      explanation: 'Many growth companies deliberately operate at a loss to expand fast. Amazon lost money for over a decade while building dominance. The question is whether today\'s losses are buying tomorrow\'s profits.',
    },
    {
      id: 'T2L06_i2', type: 'quiz',
      question: 'Total Addressable Market (TAM) matters to growth investors because:',
      options: ['A larger TAM means the stock always goes up', 'It shows the ceiling of a company\'s potential revenue if it captured the whole market', 'TAM equals current revenue', 'It measures total assets'],
      correctIndex: 1,
      explanation: 'A company with $1B revenue attacking a $5B TAM has limited upside vs one attacking a $500B TAM. Growth investors pay premium prices for companies that can 10x revenue by capturing a fraction of a huge market.',
    },
    {
      id: 'T2L06_i3', type: 'quiz',
      question: 'What is Net Revenue Retention (NRR) and why do SaaS investors obsess over it?',
      options: ['Total revenue minus net returns', 'Revenue from existing customers after expansions, contractions, and churn — above 100% means customers spend more over time', 'Net profit as a % of revenue', 'The number of renewing customers'],
      correctIndex: 1,
      explanation: 'NRR >100% is the holy grail. It means even without new customers, the business would grow — existing customers expand their usage and spend more. This is the compounding machine beneath the best SaaS businesses.',
    },
  ],

  T2L07: [
    {
      id: 'T2L07_i1', type: 'quiz',
      question: 'A candlestick chart shows you:',
      options: ['Only closing prices', 'Open, high, low, and close for each time period in one visual', 'Future price predictions', 'Company earnings data'],
      correctIndex: 1,
      explanation: 'The body shows open-to-close range. The wicks (shadows) show the high and low extremes reached. A green body means price rose (close > open); red means it fell. Candlestick patterns encode price action psychology.',
    },
    {
      id: 'T2L07_i2', type: 'quiz',
      question: 'A stock bounces off the same price level three times without breaking below it. This is called:',
      options: ['Resistance', 'Support', 'A dead cat bounce', 'Distribution'],
      correctIndex: 1,
      explanation: 'Support is a price level where buyers consistently step in and prevent the stock from falling further. The more times a level "holds," the stronger the support. A break below support is often a bearish signal.',
    },
    {
      id: 'T2L07_i3', type: 'quiz',
      question: 'Volume spikes on an up day tell a technical analyst:',
      options: ['Nothing — volume is irrelevant', 'Strong conviction behind the move — institutions likely participating', 'The stock is about to reverse', 'A dividend was just paid'],
      correctIndex: 1,
      explanation: 'Price moves on high volume have conviction. A stock rallying 5% on 10× average volume suggests institutional buyers are involved. The same 5% rally on thin volume may be less reliable.',
    },
  ],

  T2L08: [
    {
      id: 'T2L08_i1', type: 'quiz',
      question: 'The Fed raises the federal funds rate. What typically happens to stock valuations?',
      options: ['They always go up because the economy is strong', 'They tend to fall because future earnings are discounted at a higher rate', 'Nothing — the Fed and stocks are unrelated', 'Only bank stocks fall'],
      correctIndex: 1,
      explanation: 'Higher rates increase the "discount rate" used to value future earnings. A stock worth $100 based on discounting future cash flows at 3% might only be worth $75 at a 5% discount rate. The math is real.',
    },
    {
      id: 'T2L08_i2', type: 'quiz',
      question: 'An inverted yield curve (short rates > long rates) historically signals:',
      options: ['An imminent stock market rally', 'Potential recession within 6–18 months', 'Higher inflation ahead', 'A currency crisis'],
      correctIndex: 1,
      explanation: 'Every US recession since the 1950s was preceded by a yield curve inversion. When 2-year rates exceed 10-year rates, it means the bond market expects the economy to weaken — and the Fed to cut rates in the future.',
    },
    {
      id: 'T2L08_i3', type: 'quiz',
      question: 'What does "quantitative easing" (QE) mean?',
      options: ['The Fed printing money and lending it to banks at 0%', 'The Fed buying bonds to inject money into the economy and push down long-term rates', 'Banks lending freely with no reserve requirements', 'Eliminating taxes on capital gains'],
      correctIndex: 1,
      explanation: 'In QE, the Fed creates money to buy Treasury bonds and mortgage-backed securities. This pushes up bond prices (down yields) and forces investors into riskier assets like stocks — a key driver of bull markets post-2008 and 2020.',
    },
  ],

  T2L09: [
    {
      id: 'T2L09_i1', type: 'quiz',
      question: 'During economic expansion, which sectors typically outperform?',
      options: ['Utilities and consumer staples', 'Financials, industrials, and consumer discretionary', 'Healthcare only', 'All sectors equally'],
      correctIndex: 1,
      explanation: 'In expansion, consumers spend more (discretionary stocks) and companies borrow and invest (financials, industrials). These cyclical sectors lead. Defensive sectors (utilities, staples) lag but hold up during downturns.',
    },
    {
      id: 'T2L09_i2', type: 'quiz',
      question: 'Which sector tends to outperform during a recession?',
      options: ['Technology and consumer discretionary', 'Utilities, consumer staples, and healthcare', 'Energy and materials', 'Financials and real estate'],
      correctIndex: 1,
      explanation: 'People still pay electric bills, buy food, and take medicine regardless of the economy. These "defensive" sectors have stable demand and earnings that don\'t collapse when GDP falls.',
    },
    {
      id: 'T2L09_i3', type: 'quiz',
      question: 'Sector rotation means:',
      options: ['Diversifying equally across all 11 GICS sectors', 'Deliberately moving capital into sectors expected to outperform based on the economic cycle phase', 'Trading stocks daily based on news', 'Averaging into ETFs over time'],
      correctIndex: 1,
      explanation: 'Rotation is a macro strategy: if you believe the economy is heading from expansion to contraction, you shift from cyclicals (industrials, discretionary) to defensives (utilities, healthcare). Getting the cycle phase right is harder than it sounds.',
    },
  ],

  T2L10: [
    {
      id: 'T2L10_i1', type: 'quiz',
      question: 'Which financial statement shows how much cash a company actually generated this period?',
      options: ['Income statement', 'Cash flow statement', 'Balance sheet', 'Earnings release'],
      correctIndex: 1,
      explanation: 'The cash flow statement is the most manipulation-resistant statement. Revenue can be booked before cash arrives; earnings can be inflated by accounting choices. But cash is cash — it either came in or it didn\'t.',
    },
    {
      id: 'T2L10_i2', type: 'quiz',
      question: 'A company has high net income but negative free cash flow. This is:',
      options: ['Impossible — income = cash flow', 'A yellow flag — it may be burning cash while reporting accounting profits', 'Always a sign of imminent bankruptcy', 'Normal for all companies'],
      correctIndex: 1,
      explanation: 'Accounting profits can diverge from cash for many reasons: capital expenditures, working capital changes, non-cash revenue. Always check FCF. Enron had great earnings and terrible cash flow — a warning sign before its collapse.',
    },
    {
      id: 'T2L10_i3', type: 'quiz',
      question: 'Gross margin = (Revenue − Cost of Goods Sold) / Revenue. A company with 70% gross margin means:',
      options: ['It earns 70% return on equity', 'For every $1 of revenue, $0.70 is left after production costs — very profitable product', 'It has $0.30 in debt per $1 of assets', '70% of sales are recurring'],
      correctIndex: 1,
      explanation: 'High gross margins (like software at 70–80%) mean the core product is extremely profitable before overhead costs. Low gross margins (like grocery stores at 25%) mean thin efficiency. Margin expansion over time is a bullish signal.',
    },
  ],

  T2L11: [
    {
      id: 'T2L11_i1', type: 'quiz',
      question: 'A dividend aristocrat is a company that:',
      options: ['Pays the highest dividend in the S&P 500', 'Has increased its dividend every year for at least 25 consecutive years', 'Was founded before 1900', 'Is in the aristocratic consumer staples sector'],
      correctIndex: 1,
      explanation: '25+ consecutive years of dividend increases means the company has grown through multiple recessions, market crashes, and economic cycles while still raising the payout. This consistency signals extraordinary financial strength.',
    },
    {
      id: 'T2L11_i2', type: 'quiz',
      question: 'Dividend yield = Annual dividend / Stock price. If a $100 stock pays $4 in dividends and falls to $50, the yield:',
      options: ['Falls to 2%', 'Rises to 8%', 'Stays at 4%', 'Becomes irrelevant'],
      correctIndex: 1,
      explanation: '$4 / $50 = 8%. This is why a spiking dividend yield can be a warning — sometimes it signals the market expects the dividend to be cut, not that you\'re getting a bargain. Always check the payout ratio.',
    },
    {
      id: 'T2L11_i3', type: 'quiz',
      question: 'The payout ratio for a company earning $5/share that pays a $4 dividend is:',
      options: ['20%', '80%', '125%', '45%'],
      correctIndex: 1,
      explanation: '$4 / $5 = 80% payout ratio. Above 80%, a company is paying out most of its earnings — leaving little to reinvest in growth. Above 100%, it\'s borrowing to pay dividends, which is unsustainable. Safe dividends typically have payout ratios below 60–70%.',
    },
  ],

  T2L12: [
    {
      id: 'T2L12_i1', type: 'quiz',
      question: 'A REIT (Real Estate Investment Trust) is required by law to distribute:',
      options: ['All profits to the government', 'At least 90% of taxable income as dividends to shareholders', 'Exactly 50% of profits', 'Nothing — REITs keep all earnings'],
      correctIndex: 1,
      explanation: 'In exchange for special tax treatment (no corporate tax), REITs must distribute ≥90% of taxable income as dividends. This is why REIT dividend yields are typically much higher than regular stocks — sometimes 4–8%.',
    },
    {
      id: 'T2L12_i2', type: 'quiz',
      question: 'Real estate is considered an inflation hedge because:',
      options: ['Buildings never lose value', 'Rents and property values typically rise with inflation, preserving purchasing power', 'The government backs real estate prices', 'REITs are government bonds in disguise'],
      correctIndex: 1,
      explanation: 'As inflation rises, landlords can raise rents (especially on short-term leases). Property replacement costs also rise. This is why real estate returns tend to keep pace with inflation over long periods, unlike cash or bonds.',
    },
    {
      id: 'T2L12_i3', type: 'quiz',
      question: 'What metric replaces P/E for evaluating REITs?',
      options: ['Price-to-Book', 'Funds From Operations (FFO) yield', 'EV/EBITDA only', 'Revenue multiple'],
      correctIndex: 1,
      explanation: 'REITs depreciate buildings on paper (reducing GAAP earnings) but buildings often appreciate in real life. FFO adds back depreciation, giving a truer picture of cash generation. Price/FFO is the standard REIT valuation metric.',
    },
  ],

  T2L13: [
    {
      id: 'T2L13_i1', type: 'quiz',
      question: 'Intrinsic value in investing means:',
      options: ['The current market price', 'The estimated "true" value of a business based on its future cash flows', 'The book value on the balance sheet', 'The stock\'s 52-week average'],
      correctIndex: 1,
      explanation: 'Intrinsic value is what a business is actually worth — independent of what Mr. Market says today. You estimate it by projecting future cash flows and discounting them back to today. When market price < intrinsic value, you have a margin of safety.',
    },
    {
      id: 'T2L13_i2', type: 'quiz',
      question: 'Margin of safety means:',
      options: ['Buying only defensive stocks', 'Only investing when the price is significantly below your estimated intrinsic value — protection against being wrong', 'Using a stop-loss on every trade', 'Diversifying across 50+ stocks'],
      correctIndex: 1,
      explanation: 'Benjamin Graham\'s most important concept. If you think a stock is worth $100 but buy at $65 (35% margin of safety), you can be significantly wrong in your estimate and still not lose money. The margin compensates for uncertainty.',
    },
    {
      id: 'T2L13_i3', type: 'quiz',
      question: 'You discount future cash flows at 10%. What does the discount rate represent?',
      options: ['The company\'s profit margin', 'Your required rate of return — the minimum return you\'ll accept for the risk taken', 'The current dividend yield', 'Inflation rate only'],
      correctIndex: 1,
      explanation: 'The discount rate is what you demand as compensation for tying up your capital in this particular business. A riskier company requires a higher discount rate (say 15%), which results in a lower intrinsic value for the same cash flows.',
    },
  ],

  T2L14: [
    {
      id: 'T2L14_i1', type: 'quiz',
      question: 'The Kelly Criterion helps determine:',
      options: ['Which stocks to sell first for tax purposes', 'The mathematically optimal position size based on your edge and odds', 'Your total portfolio allocation to stocks vs bonds', 'The maximum number of positions to hold'],
      correctIndex: 1,
      explanation: 'Kelly: bet (expected return) / (return if you win) fraction of your bankroll. It maximizes long-term growth while preventing ruin. In practice, investors use "half Kelly" because the formula is sensitive to estimation errors.',
    },
    {
      id: 'T2L14_i2', type: 'quiz',
      question: 'Maximum drawdown measures:',
      options: ['Average annual losses', 'The peak-to-trough decline in portfolio value — how much you\'d have lost buying at the worst time', 'Annual volatility of returns', 'The deepest single-day loss'],
      correctIndex: 1,
      explanation: 'If your portfolio hit $150K then fell to $90K before recovering, your max drawdown was 40%. Understanding your own tolerance for drawdown is critical — many investors panic-sell during a 30-40% drawdown and lock in permanent losses.',
    },
    {
      id: 'T2L14_i3', type: 'quiz',
      question: 'Concentration risk in a portfolio means:',
      options: ['Owning too many bonds', 'Too much exposure to one stock, sector, or correlated risk factor', 'Holding positions for too long', 'Investing in one country only'],
      correctIndex: 1,
      explanation: 'If 40% of your portfolio is in one tech stock, and that stock drops 50%, your total portfolio drops 20%. True diversification means assets that don\'t all fall together. Check sector concentration, not just number of holdings.',
    },
  ],

  T2L15: [
    {
      id: 'T2L15_i1', type: 'quiz',
      question: 'Loss aversion in behavioral finance means:',
      options: ['Avoiding all risky investments', 'Feeling the pain of losses roughly 2× more intensely than equivalent gains — leading to irrational decisions', 'Only investing in loss-proof assets', 'Selling winners too early'],
      correctIndex: 1,
      explanation: 'Losing $1,000 hurts about twice as much as gaining $1,000 feels good (Kahneman & Tversky). This drives investors to hold losers too long (to avoid "locking in" the loss) and sell winners too soon. Understanding this bias is half the battle.',
    },
    {
      id: 'T2L15_i2', type: 'quiz',
      question: 'Recency bias causes investors to:',
      options: ['Invest in the oldest, most established companies', 'Over-weight recent performance when predicting the future — buying after rallies, selling after crashes', 'Ignore recent news entirely', 'Focus only on 10-year returns'],
      correctIndex: 1,
      explanation: 'After 3 years of bull market, investors assume it will continue forever. After a crash, they assume the world is ending. Recency bias drives investors to buy at peaks and sell at bottoms — the opposite of what wealth-building requires.',
    },
    {
      id: 'T2L15_i3', type: 'quiz',
      question: 'The best defense against your own behavioral biases is:',
      options: ['Watching more financial news', 'Pre-committing to a written investment plan and following systematic rules rather than feelings', 'Trading more frequently to stay engaged', 'Consulting friends before each trade'],
      correctIndex: 1,
      explanation: 'An investment policy statement (IPS) — written when you\'re calm — acts as a contract with yourself for when emotions run high. Rules like "rebalance annually" and "don\'t check the portfolio daily" prevent gut-feel decisions that destroy returns.',
    },
  ],

  T2L16: [
    {
      id: 'T2L16_i1', type: 'quiz',
      question: 'What is the S-curve in technology adoption?',
      options: ['A stock price pattern shaped like an S', 'The pattern where adoption starts slow, then goes exponential, then saturates as the market matures', 'A debt repayment schedule', 'A government regulation curve'],
      correctIndex: 1,
      explanation: 'Every transformative technology — electricity, internet, smartphones — follows this pattern. Growth investors try to identify companies in the steep part of the S-curve (fast expansion phase) before the mainstream catches on.',
    },
    {
      id: 'T2L16_i2', type: 'quiz',
      question: 'Winner-takes-all markets (like search engines or social networks) are valuable to investors because:',
      options: ['They always have the lowest P/E ratios', 'Network effects create near-unassailable competitive positions — the leader keeps leading', 'Winners must share profits with all competitors', 'Government regulations prevent competition'],
      correctIndex: 1,
      explanation: 'Facebook is valuable because all your friends are there. Google dominates because its data advantage improves its algorithm. These network effects create moats that compound: the bigger you are, the better your product, the harder to displace.',
    },
    {
      id: 'T2L16_i3', type: 'quiz',
      question: 'The "rule of 40" for SaaS companies states that:',
      options: ['A company must have 40% gross margins', 'Revenue growth rate + profit margin should exceed 40 — balancing growth with profitability', 'A stock P/E above 40 is overvalued', 'Companies should hold 40% cash reserves'],
      correctIndex: 1,
      explanation: 'If a SaaS company grows at 50% and loses 20%, the rule of 40 = 30 (below 40 — questionable). If it grows 30% and earns 20% margins, it = 50 (solid). It balances the growth vs profitability trade-off common in SaaS.',
    },
  ],

  T2L17: [
    {
      id: 'T2L17_i1', type: 'quiz',
      question: 'Tax-loss harvesting means:',
      options: ['Paying taxes on all your gains each year', 'Deliberately selling losing positions to realize losses that offset taxable gains', 'Holding stocks for 30 years to defer taxes', 'Donating stocks to charity'],
      correctIndex: 1,
      explanation: 'If you have $10K in realized gains and sell a stock with a $10K loss, your net taxable gain is $0 — you\'ve "harvested" the loss to save real tax dollars. You can then immediately buy a similar (but not identical) fund to maintain market exposure.',
    },
    {
      id: 'T2L17_i2', type: 'quiz',
      question: 'Long-term capital gains (held >1 year) are taxed at:',
      options: ['Your ordinary income rate (up to 37%)', 'A preferential rate of 0%, 15%, or 20% depending on income', 'A flat 10% always', 'No tax — gains are tax-free after 1 year'],
      correctIndex: 1,
      explanation: 'Long-term gains are taxed at 0% (if your taxable income is below ~$47K), 15% (most taxpayers), or 20% (high earners). Compare this to short-term gains taxed as ordinary income — the benefit of holding for just one day past a year can be enormous.',
    },
    {
      id: 'T2L17_i3', type: 'quiz',
      question: 'A Roth IRA\'s main advantage over a Traditional IRA is:',
      options: ['Contributions are tax-deductible today', 'Withdrawals in retirement are completely tax-free — you pay tax on contributions but never on growth', 'Higher contribution limits', 'No required minimum distributions at 25'],
      correctIndex: 1,
      explanation: 'If you invest $6,500 in a Roth IRA and it grows to $65,000 over 30 years, you pay $0 tax on the $58,500 gain. With a Traditional IRA, you\'d owe income tax on the full $65,000 withdrawal. For long time horizons, Roth wins almost every time.',
    },
  ],

  T2L18: [
    {
      id: 'T2L18_i1', type: 'quiz',
      question: 'A limit order means:',
      options: ['Buy or sell immediately at any price', 'Execute only at your specified price or better — no guarantee of execution', 'Place a trade that expires in 24 hours', 'Limit the number of shares you can buy'],
      correctIndex: 1,
      explanation: 'A limit buy at $50 will only execute at $50 or lower. A limit sell at $100 only executes at $100 or higher. You control your price but risk the trade never executing if the stock doesn\'t reach your level.',
    },
    {
      id: 'T2L18_i2', type: 'quiz',
      question: 'A stop-loss order at $45 on a stock you bought at $60 means:',
      options: ['You must sell if the stock reaches $45', 'If the stock falls to $45, it triggers a sell order — limiting your loss to $15/share', 'The broker calls you when it hits $45', 'You can only sell above $45'],
      correctIndex: 1,
      explanation: 'Stop-losses automate your risk management. Instead of watching every tick, you pre-define your exit. Note: in fast-moving markets, a stop-loss can trigger at a worse price (stop becomes a market order) — this is called "slippage."',
    },
    {
      id: 'T2L18_i3', type: 'quiz',
      question: 'The bid-ask spread on a stock is the difference between:',
      options: ['The stock\'s 52-week high and low', 'The highest price a buyer will pay and the lowest price a seller will accept — the market maker\'s profit', 'Opening and closing price', 'Morning and afternoon trading prices'],
      correctIndex: 1,
      explanation: 'If the bid is $49.95 and the ask is $50.05, the spread is $0.10. Every time you trade, you lose the spread. On liquid large-caps like Apple, spreads are just cents. On small-cap stocks, spreads can be $0.50–$2, a hidden trading cost.',
    },
  ],

  T2L19: [
    {
      id: 'T2L19_i1', type: 'quiz',
      question: 'A Sharpe ratio of 1.5 vs 0.8 for two funds with the same return means:',
      options: ['The 1.5 fund is more volatile', 'The 1.5 fund earns more return per unit of risk — better risk-adjusted performance', 'The 0.8 fund is safer for all investors', 'Sharpe ratio doesn\'t compare funds'],
      correctIndex: 1,
      explanation: 'Sharpe = (Return − Risk-free rate) / Standard deviation. Two funds can have identical returns but very different Sharpe ratios if their volatility differs. Higher Sharpe = smoother ride to the same destination.',
    },
    {
      id: 'T2L19_i2', type: 'quiz',
      question: 'Correlation between two assets ranges from -1 to +1. A correlation of -0.7 between stocks and bonds means:',
      options: ['They always move in the same direction', 'They tend to move in opposite directions 70% of the time — good for diversification', 'One has 70% higher returns', 'They are completely uncorrelated'],
      correctIndex: 1,
      explanation: 'Negative correlation is the holy grail of portfolio construction. When stocks crash, bonds often rally — buffering your losses. This is why a stock/bond mix lowers volatility without proportionally lowering returns.',
    },
    {
      id: 'T2L19_i3', type: 'quiz',
      question: 'Alpha in investing means:',
      options: ['The first and highest-quality stock in the market', 'Returns above what the market or benchmark delivered — the "excess return" from skill or strategy', 'The proportion of tech stocks in a portfolio', 'A stock\'s risk level'],
      correctIndex: 1,
      explanation: 'If the S&P 500 returns 10% and your portfolio returns 14%, you generated 4% alpha. Generating consistent positive alpha is rare — most fund managers produce negative alpha after fees. Finding genuine alpha is what separates investors from traders.',
    },
  ],

  T2L20: [
    {
      id: 'T2L20_i1', type: 'quiz',
      question: 'A trailing stop-loss follows the stock price up but locks in at the stop level. If you set a 15% trailing stop on a stock at $100 that rises to $150, your stop triggers at:',
      options: ['$85 (15% below original price)', '$127.50 (15% below the $150 peak)', '$100 (original buy price)', '$75 (25% below $100)'],
      correctIndex: 1,
      explanation: '$150 × 0.85 = $127.50. The trailing stop follows the price up — as the stock rises, your floor rises too. This locks in profits automatically. If the stock falls from $150 back to $127.50, you exit with a $27.50/share gain.',
    },
    {
      id: 'T2L20_i2', type: 'quiz',
      question: 'Scaling into a position means:',
      options: ['Buying 100% of your target position at once', 'Building a position in stages over time — reducing timing risk and averaging your cost basis', 'Increasing leverage as the position rises', 'Only buying round lots of 100 shares'],
      correctIndex: 1,
      explanation: 'Instead of buying $10,000 of AAPL at once, you buy $2,500 every month for 4 months. If the price dips mid-way, your average cost is lower than the initial price. If it rises, you still participated. Scaling reduces the risk of buying at a single bad moment.',
    },
    {
      id: 'T2L20_i3', type: 'quiz',
      question: 'Why is it important to define your exit criteria BEFORE you buy a stock?',
      options: ['Brokers require it', 'Pre-defined exits remove emotion from the decision — you act on logic, not fear or greed in the moment', 'It guarantees profits', 'It\'s required by the SEC'],
      correctIndex: 1,
      explanation: 'When a stock is falling 20%, your brain is flooded with loss aversion and fear. Pre-written criteria ("I sell if thesis is broken OR price falls 20%") let you act on what-you-thought-when-calm, not what-you-feel-right-now.',
    },
  ],

  T2L21: [
    {
      id: 'T2L21_i1', type: 'quiz',
      question: 'A small-cap stock (market cap <$2B) vs a large-cap differs mainly in:',
      options: ['Dividend yield', 'Growth potential and risk — small-caps can grow faster but are less stable and less liquid', 'Dividend tax treatment', 'Regulatory requirements for investors'],
      correctIndex: 1,
      explanation: 'A $500M company can realistically 10x to $5B. A $2T company like Apple cannot. Small-caps have more volatility and less analyst coverage (creating mispricing opportunities), but they can also fail entirely. Position sizing matters much more.',
    },
    {
      id: 'T2L21_i2', type: 'quiz',
      question: 'PEG ratio = P/E ÷ Earnings growth rate. A PEG of 0.8 vs 2.5 suggests:',
      options: ['0.8 is overvalued; 2.5 is cheap', '0.8 may be undervalued relative to growth; 2.5 may be pricing in overly optimistic growth', 'Both are equally valued', 'Growth rate determines everything'],
      correctIndex: 1,
      explanation: 'Peter Lynch said a fair-valued stock has a PEG of 1. Below 1 = potentially cheap relative to its growth rate. Above 2 = you\'re paying a big premium for expected growth. If the growth doesn\'t materialize, the stock falls hard.',
    },
    {
      id: 'T2L21_i3', type: 'quiz',
      question: 'Growth at a Reasonable Price (GARP) investing combines:',
      options: ['Technical and fundamental analysis', 'Value investing discipline (buying cheap) with growth investing focus (future earnings momentum)', 'Growth stocks and government bonds', 'Active and passive management'],
      correctIndex: 1,
      explanation: 'Peter Lynch popularized GARP. You want growth — but you refuse to overpay for it. A company growing 25% with a P/E of 20 is GARP. The same growth at a P/E of 100 is pure speculative growth investing. GARP is the middle ground with better risk/reward.',
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3 — Mastery
  // ─────────────────────────────────────────────────────────────────────────────
  T3L01: [
    {
      id: 'T3L01_i1', type: 'quiz',
      question: 'One options contract typically controls how many shares?',
      options: ['1', '10', '100', '1,000'],
      correctIndex: 2,
      explanation: 'Standard equity options cover 100 shares. A "$3 premium" therefore costs $300 per contract — a common and expensive beginner surprise.',
    },
    {
      id: 'T3L01_i2', type: 'scenario',
      context: 'TSLA trades at $250. You buy a two-week $270 call for $2.50. Ten days later TSLA is at $262 — up 5% — but your option is only worth $1.10.',
      question: 'The stock rose, yet your call lost 56%. Why?',
      options: ['The broker mispriced it', 'Theta decay: time value melted faster than the move added intrinsic value', 'Calls lose value when stocks rise', 'Dividends reduced the price'],
      correctIndex: 1,
      explanation: 'You needed the stock ABOVE $270, fast. It moved up, but not enough to outrun daily time decay near expiration. Buyers must be right about direction, size, AND speed.',
    },
    {
      id: 'T3L01_i3', type: 'quiz',
      question: 'A 0.30-delta call roughly implies…',
      options: ['A 30% dividend', 'The option gains ~$0.30 per $1 stock move (and ~30% odds of expiring in the money)', 'The stock will rise 30%', '30 days to expiration'],
      correctIndex: 1,
      explanation: 'Delta measures sensitivity to the stock and doubles as a rough probability of finishing in the money.',
    },
  ],
  T3L02: [
    {
      id: 'T3L02_i1', type: 'scenario',
      context: 'You own 100 shares of MSFT at $400 and sell a one-month $420 call for $6. At expiration MSFT sits at $455.',
      question: 'What happened to your position?',
      options: ['You keep the shares and the $600', 'Shares were called away at $420 — you made $2,000 + $600 premium but missed $3,500 of further upside', 'You lost money', 'The option rolled automatically'],
      correctIndex: 1,
      explanation: 'The covered call capped you at $420. You still profited ($2,600 total) — the cost was the rally you gave away. That is exactly the covered-call trade-off.',
    },
    {
      id: 'T3L02_i2', type: 'quiz',
      question: 'A cash-secured put seller is fundamentally saying…',
      options: ['"I never want these shares"', '"Pay me now for my standing offer to buy this stock at a price I already like"', '"I expect the stock to crash"', '"I want maximum leverage"'],
      correctIndex: 1,
      explanation: 'Sold correctly, assignment is a win: you acquire a stock you wanted at your chosen price, with the premium as a discount.',
    },
    {
      id: 'T3L02_i3', type: 'quiz',
      question: 'Why avoid selling options through earnings announcements (unless deliberate)?',
      options: ['It\'s prohibited', 'Earnings gaps can blow through strikes, turning small income into large losses', 'Premiums are lowest then', 'Brokers charge double commission'],
      correctIndex: 1,
      explanation: 'Sellers earn small premiums but bear gap risk. An earnings surprise can move a stock 15% overnight — through any nearby strike.',
    },
  ],
  T3L03: [
    {
      id: 'T3L03_i1', type: 'quiz',
      question: 'Hedging every position all the time usually results in…',
      options: ['Guaranteed outperformance', 'Returns resembling cash after years of premium costs', 'Doubling your returns', 'Tax-free gains'],
      correctIndex: 1,
      explanation: 'Perpetual insurance premiums compound against you. Hedge specific, dated, unaffordable risks — not everything, forever.',
    },
    {
      id: 'T3L03_i2', type: 'scenario',
      context: 'You hold $300k of employer stock, fully vested, and your house down-payment in 6 months depends on at least $250k of it.',
      question: 'What is the textbook use of options here?',
      options: ['Sell everything today regardless of tax', 'Buy 6-month puts near $250k coverage (or collar the position) — insuring the specific, dated, unaffordable risk', 'Buy more shares on margin', 'Do nothing; markets usually rise'],
      correctIndex: 1,
      explanation: 'This is the exact scenario hedging exists for: a defined amount, a defined date, and consequences you cannot absorb.',
    },
    {
      id: 'T3L03_i3', type: 'quiz',
      question: 'The cheapest "hedge" available to every investor is…',
      options: ['Weekly put options', 'Position sizing and diversification', 'Inverse ETFs', 'Stop-loss orders'],
      correctIndex: 1,
      explanation: 'A structurally sane portfolio — sensible position sizes, diversification, cash runway — removes most of the need for paid protection.',
    },
  ],
  T3L04: [
    {
      id: 'T3L04_i1', type: 'quiz',
      question: 'Short a stock at $50. It rises to $130. Your loss is…',
      options: ['80% of your position', '160% of the original position value — more than you ever put up', 'Capped at $50/share', 'Zero until you cover'],
      correctIndex: 1,
      explanation: 'You owe shares now worth $130 that you sold for $50. Short losses can exceed 100% — impossible when simply buying stock.',
    },
    {
      id: 'T3L04_i2', type: 'scenario',
      context: 'A stock you own reports fine earnings, yet short interest has climbed from 3% to 24% of float over two months.',
      question: 'The mastery-level response is…',
      options: ['Ignore it — shorts are always wrong', 'Actively investigate the short thesis: sophisticated capital is betting against you, and knowing why is free due diligence', 'Sell immediately', 'Double your position to fight the shorts'],
      correctIndex: 1,
      explanation: 'High short interest is neither a sell signal nor noise — it\'s a strong prompt to stress-test your own thesis against the bear case.',
    },
    {
      id: 'T3L04_i3', type: 'quiz',
      question: 'What mechanically drives a short squeeze?',
      options: ['Dividend announcements', 'Shorts forced to buy back shares as prices rise, adding fuel to the rally', 'Stock splits', 'Index rebalancing'],
      correctIndex: 1,
      explanation: 'Rising prices force covering; covering is buying; buying raises prices. The loop feeds itself until shorts are flushed out.',
    },
  ],
  T3L05: [
    {
      id: 'T3L05_i1', type: 'quiz',
      question: 'The lethal feature of margin is that it…',
      options: ['Charges interest', 'Can force liquidation at market bottoms, making temporary losses permanent', 'Requires paperwork', 'Limits diversification'],
      correctIndex: 1,
      explanation: 'Unleveraged investors can wait out any crash. Margin calls remove that option at exactly the worst moment.',
    },
    {
      id: 'T3L05_i2', type: 'scenario',
      context: 'A friend holds a 3x leveraged S&P ETF "for the long run." Over six choppy months the index finishes exactly flat.',
      question: 'The 3x fund most likely…',
      options: ['Also finished flat', 'Lost money — daily resetting causes decay in volatile sideways markets', 'Tripled', 'Gained 3x the dividend'],
      correctIndex: 1,
      explanation: 'Volatility drag: down days require outsized recoveries when tripled daily. Leveraged ETFs are day-trading tools, not holdings.',
    },
    {
      id: 'T3L05_i3', type: 'quiz',
      question: 'The pre-leverage question that matters most is…',
      options: ['"What\'s the interest rate?"', '"If this halves and stays down 3 years, am I forced to sell?"', '"What\'s my broker\'s margin limit?"', '"What did it return last year?"'],
      correctIndex: 1,
      explanation: 'If a drawdown can force you out, the leverage is unacceptable regardless of the expected return. Forced selling is how volatility becomes ruin.',
    },
  ],
  T3L06: [
    {
      id: 'T3L06_i1', type: 'quiz',
      question: 'Buffett\'s "interest rates are gravity" means…',
      options: ['Rates always fall', 'Higher risk-free yields pull down the present value of all other assets', 'Bonds beat stocks', 'The Fed controls stock picks'],
      correctIndex: 1,
      explanation: 'Every asset competes with the risk-free rate. When Treasuries pay more, future cash flows everywhere are worth less today.',
    },
    {
      id: 'T3L06_i2', type: 'scenario',
      context: 'The 2-year Treasury yields 5.1%; the 10-year yields 4.2%. Financial media calls it a "deep inversion."',
      question: 'Historically, this configuration has signaled…',
      options: ['An imminent crash within days', 'Elevated recession odds within roughly 6-24 months — a regime warning, not a timer', 'Guaranteed stock gains', 'Currency collapse'],
      correctIndex: 1,
      explanation: 'Inversions preceded every modern US recession with long, variable lags. The right response is tightening quality standards, not panic selling.',
    },
    {
      id: 'T3L06_i3', type: 'quiz',
      question: 'In a rising-inflation regime, the classic losers are…',
      options: ['Energy and commodities', 'Long-duration bonds and unprofitable growth stocks', 'Pricing-power businesses', 'Short-term Treasuries'],
      correctIndex: 1,
      explanation: 'Inflation raises discount rates and erodes fixed coupons — hitting assets whose value lives furthest in the future the hardest.',
    },
  ],
  T3L07: [
    {
      id: 'T3L07_i1', type: 'quiz',
      question: 'The structural difference between a stock and a commodity is…',
      options: ['Liquidity', 'A business compounds internally; a commodity only changes price', 'Tax rates', 'Trading hours'],
      correctIndex: 1,
      explanation: 'Companies reinvest earnings and grow. A bar of gold or barrel of oil never becomes more of itself — returns depend entirely on the next buyer.',
    },
    {
      id: 'T3L07_i2', type: 'quiz',
      question: 'Research supports gold\'s portfolio role as…',
      options: ['The core growth engine', 'A 5-10% crisis shock-absorber that cuts drawdowns with minimal return drag', 'A monthly income source', 'A replacement for bonds entirely'],
      correctIndex: 1,
      explanation: 'Small allocations exploit gold\'s low correlation and crisis behavior. Oversized allocations trade compounding for comfort.',
    },
    {
      id: 'T3L07_i3', type: 'scenario',
      context: 'A friend puts 40% of their net worth into crypto after a 300% rally, with no written plan. "It\'s going much higher," they say.',
      question: 'The mastery-level critique is…',
      options: ['Crypto is always a scam', 'The sizing makes ruin possible and there\'s no pre-committed exit — it\'s hope, not a position', 'They should use leverage too', '40% is too small'],
      correctIndex: 1,
      explanation: 'Speculative assets demand venture sizing (a loss changes nothing) and written sell conditions BEFORE entry. Neither is present here.',
    },
  ],
  T3L08: [
    {
      id: 'T3L08_i1', type: 'quiz',
      question: 'Fund A: 10% return, ±8% swings. Fund B: 10% return, ±25% swings. Sharpe thinking says…',
      options: ['They\'re identical', 'A is superior — same return for far less risk (and you could actually hold it)', 'B is better — volatility is opportunity', 'Neither beats cash'],
      correctIndex: 1,
      explanation: 'Risk-adjusted return is the professional lens. Smoother paths also protect you from your own worst behavioral instincts.',
    },
    {
      id: 'T3L08_i2', type: 'quiz',
      question: 'Diversification genuinely works when holdings are…',
      options: ['Numerous', 'Imperfectly correlated — they zag when others zig', 'All in different tech stocks', 'Equally weighted'],
      correctIndex: 1,
      explanation: 'Owning 50 assets that fall together is concentration in disguise. Correlation, not count, is what cancels risk.',
    },
    {
      id: 'T3L08_i3', type: 'scenario',
      context: 'You tilted toward value stocks in 2015. By 2020, value has trailed growth for five straight years and a friend says "value investing is dead."',
      question: 'Factor research suggests…',
      options: ['Value is permanently broken', 'Painful multi-year droughts are exactly WHY factor premiums persist — abandoning tilts after droughts sells the premium at its cheapest', 'Switch fully to growth', 'Factors were never real'],
      correctIndex: 1,
      explanation: 'Value\'s 2010s drought was followed by strong reversal in 2021-2022. Premiums pay those who can endure the wait — that endurance IS the edge.',
    },
  ],
  T3L09: [
    {
      id: 'T3L09_i1', type: 'quiz',
      question: 'The intellectual core of a DCF is…',
      options: ['Charting price momentum', 'A business is worth its future cash to owners, discounted for time and risk', 'Matching competitors\' P/E ratios', 'Book value accounting'],
      correctIndex: 1,
      explanation: 'Every other valuation shortcut approximates this. The DCF just states the assumptions out loud.',
    },
    {
      id: 'T3L09_i2', type: 'scenario',
      context: 'An analyst\'s DCF says a startup is worth $80/share. You notice 92% of that value comes from the terminal value beyond year 10.',
      question: 'The right conclusion is…',
      options: ['The model is precise — buy', 'Nearly all the "value" rests on unknowable distant guesses — this is a story wearing a spreadsheet', 'Terminal values are always wrong', 'Shorten the model to 3 years'],
      correctIndex: 1,
      explanation: 'Terminal-value-dominated models are maximally sensitive to their softest assumptions. Treat the output as narrative, not evidence.',
    },
    {
      id: 'T3L09_i3', type: 'quiz',
      question: 'Margin of safety exists because…',
      options: ['Math errors are common', 'Your inputs are guesses — buying well below conservative value makes being wrong survivable', 'Regulators require it', 'It boosts leverage capacity'],
      correctIndex: 1,
      explanation: 'Graham\'s central idea: the discount to intrinsic value is your protection against your own inevitable estimation errors.',
    },
  ],
  T3L10: [
    {
      id: 'T3L10_i1', type: 'quiz',
      question: 'An Investment Policy Statement matters most during…',
      options: ['Bull markets', 'Crashes and manias — when the improvising brain overrides the analytical one', 'Tax season', 'Earnings calls'],
      correctIndex: 1,
      explanation: 'The IPS is calm-you making decisions for stressed-you. Stress is precisely when unwritten plans dissolve.',
    },
    {
      id: 'T3L10_i2', type: 'scenario',
      context: 'March 2020: your portfolio is down 30% in a month. Your written policy says "rebalance to targets quarterly, buying whatever is below target."',
      question: 'Following the policy means…',
      options: ['Selling stocks to stop the pain', 'Mechanically buying more stocks — which felt terrible and was, historically, exactly right', 'Suspending the policy until things calm down', 'Going to 100% cash'],
      correctIndex: 1,
      explanation: 'Rebalancing into the 2020 crash was rewarded within months. The policy\'s whole purpose is executing what feels wrong but is right.',
    },
    {
      id: 'T3L10_i3', type: 'quiz',
      question: 'The durable individual-investor edge, per three tiers of this curriculum, is…',
      options: ['Information speed', 'Superior forecasting', 'Behavioral discipline — holding a sound system when others abandon theirs', 'Exclusive market access'],
      correctIndex: 2,
      explanation: 'Information and analytical edges get competed away. The willingness to be patient and systematic when it hurts does not.',
    },
  ],
};

export function getInlineQuestions(lessonId: string): QuizQuestion[] {
  return inlineQuestions[lessonId] ?? [];
}

/**
 * Spaced retrieval practice — pulls questions from lessons the student has
 * ALREADY completed, so answering them is retrieval of past material rather
 * than new content. Retrieval practice (Roediger & Karpicke 2006) produces
 * far more durable learning than passive re-reading, which is what the daily
 * micro-lesson was previously: pure reading with no recall step at all.
 *
 * Falls back to a random sample across the whole bank if the student hasn't
 * completed anything yet (new account), so the daily habit still has a quick
 * check attached to it from day one.
 */
export function getRetrievalQuestions(completedLessonIds: string[], count = 2): QuizQuestion[] {
  const pools = completedLessonIds.length > 0
    ? completedLessonIds.map(id => inlineQuestions[id] ?? []).filter(p => p.length > 0)
    : Object.values(inlineQuestions);

  const all = pools.flat();
  if (all.length === 0) return [];

  // Fisher-Yates shuffle, then take `count`
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
