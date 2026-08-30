/**
 * Tier 3 Curriculum — Mastery
 *
 * 10 lessons for experienced investors. Delivers on the promise made at the
 * end of Tier 2: options, short selling, leverage, macro investing,
 * commodities and alternatives, modern portfolio theory, factor investing,
 * DCF valuation, and building a durable personal investing system.
 */

import { Lesson } from '../types';

export const tier3Lessons: Lesson[] = [

  // ============================================================================
  // T3L01 — Options fundamentals
  // ============================================================================
  {
    id: 'T3L01',
    tier: 3,
    order: 1,
    title: 'Options: calls and puts',
    subtitle: 'The building blocks of every options strategy',
    description: 'Options are contracts, not lottery tickets. Understand exactly what a call and a put give you, what they cost, and why most beginners lose money using them backwards.',
    videoDurationSeconds: 540,
    thumbnailUrl: 'https://example.com/thumbs/t3l01.jpg',
    estimatedMinutes: 14,
    difficulty: 4,
    topics: ['options', 'derivatives', 'calls', 'puts'],
    triggersSignals: [],
    xpReward: 150,
    sections: [
      {
        id: 'T3L01S1',
        type: 'text',
        title: 'What an option actually is',
        content: 'An option is a contract giving you the RIGHT — not the obligation — to buy or sell 100 shares of a stock at a fixed price (the strike) before a fixed date (expiration). A call is the right to BUY at the strike; a put is the right to SELL at the strike. You pay a price (the premium) for that right. That premium is the most you can lose as a buyer — and the most you can make as a seller.',
      },
      {
        id: 'T3L01S2',
        type: 'example',
        title: 'A call in action',
        content: 'AAPL trades at $200. You buy a one-month $210 call for $3 ($300 total, since one contract covers 100 shares). If AAPL rockets to $225, your right to buy at $210 is worth at least $15 — a $1,200 profit on $300 risked. If AAPL stays below $210 through expiration, the option expires worthless and you lose the full $300. Notice the asymmetry: limited loss, large potential gain — but a LOW probability of profit. Most out-of-the-money options expire worthless.',
      },
      {
        id: 'T3L01S3',
        type: 'text',
        title: 'Intrinsic value, time value, and theta decay',
        content: 'An option\'s premium has two parts. Intrinsic value is what it would be worth exercised today (a $210 call with the stock at $220 has $10 intrinsic). Time value is everything above that — payment for the possibility of further movement. Time value melts away as expiration approaches, fastest in the final 30 days. This decay is called theta. Buyers fight theta every day they hold; sellers collect it. That single fact explains why professionals are more often sellers than buyers of options.',
      },
      {
        id: 'T3L01S4',
        type: 'text',
        title: 'The greeks in one paragraph',
        content: 'Delta: how much the option price moves per $1 move in the stock (a 0.50-delta option gains ~$0.50 when the stock gains $1). Theta: daily time decay. Vega: sensitivity to implied volatility — options get more expensive when the market expects bigger moves. Gamma: how fast delta itself changes. You don\'t need to master the math; you need to know that when you buy an option you are long delta and vega and short theta — you win only if the stock moves far enough, fast enough.',
      },
    ],
    quiz: {
      id: 'T3L01Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L01Q1',
          question: 'You buy a call option. What is the maximum you can lose?',
          options: ['Unlimited', 'The premium you paid', 'The strike price', '100 × the stock price'],
          correctIndex: 1,
          explanation: 'Option buyers can only lose the premium. It\'s option SELLERS of uncovered calls who face unlimited risk.',
        },
        {
          id: 'T3L01Q2',
          question: 'Theta decay hurts whom?',
          options: ['Option sellers', 'Option buyers', 'Stockholders', 'Nobody — it\'s neutral'],
          correctIndex: 1,
          explanation: 'Time value melts daily, transferring value from buyers to sellers. Buyers need the stock to move enough to outrun the decay.',
        },
        {
          id: 'T3L01Q3',
          question: 'A put option gives you the right to…',
          options: ['Buy at the strike price', 'Sell at the strike price', 'Collect dividends', 'Convert to bonds'],
          correctIndex: 1,
          explanation: 'A put is the right to SELL at the strike — it gains value when the stock falls, which is why puts are used as insurance.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L02 — Income strategies: covered calls & cash-secured puts
  // ============================================================================
  {
    id: 'T3L02',
    tier: 3,
    order: 2,
    title: 'Covered calls & cash-secured puts',
    subtitle: 'The two options strategies that generate income instead of gambling',
    description: 'The only two options strategies most investors ever need: selling calls against stock you own, and selling puts against cash you\'re happy to deploy.',
    videoDurationSeconds: 520,
    thumbnailUrl: 'https://example.com/thumbs/t3l02.jpg',
    estimatedMinutes: 13,
    difficulty: 4,
    topics: ['options', 'income', 'covered-calls'],
    triggersSignals: [],
    xpReward: 150,
    sections: [
      {
        id: 'T3L02S1',
        type: 'text',
        title: 'The covered call',
        content: 'Own 100 shares. Sell one call against them, collect the premium immediately. If the stock stays below the strike, the option expires worthless, you keep the premium and your shares, and you can do it again next month. If the stock rises above the strike, your shares get called away at the strike price — you still profit, but your upside is capped. You\'re trading unlimited upside for immediate income. On stocks you\'d be content to sell anyway, that\'s often a good trade.',
      },
      {
        id: 'T3L02S2',
        type: 'text',
        title: 'The cash-secured put',
        content: 'Pick a stock you WANT to own, at a price lower than today\'s. Sell a put at that strike, holding enough cash to buy 100 shares if assigned. If the stock stays above the strike, you keep the premium — you got paid for waiting. If it falls below, you buy the stock at the strike, which is the price you already decided you liked, and the premium reduces your cost basis further. The strategy fails only when you sell puts on stocks you don\'t actually want at prices you didn\'t really mean.',
      },
      {
        id: 'T3L02S3',
        type: 'example',
        title: 'The wheel',
        content: 'Combine them and you get "the wheel": sell cash-secured puts until you\'re assigned shares, then sell covered calls on those shares until they\'re called away, then start again. Each turn collects premium. In flat and gently trending markets the wheel outperforms buy-and-hold; in strong bull markets it lags badly because your winners keep getting called away. It is an income strategy, not a growth strategy — know which one you\'re running.',
      },
      {
        id: 'T3L02S4',
        type: 'text',
        title: 'The rules that keep income strategies safe',
        content: 'One: only sell puts on companies you\'d proudly own for years. Two: only sell calls on shares you\'re willing to release at the strike. Three: keep position sizes small enough that assignment never forces other selling. Four: avoid earnings weeks unless you\'ve priced the gap risk. Sellers win small amounts often and lose big occasionally — the rules above exist to make the occasional loss survivable.',
      },
    ],
    quiz: {
      id: 'T3L02Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L02Q1',
          question: 'What does a covered call sacrifice in exchange for premium income?',
          options: ['Dividend rights', 'Upside above the strike', 'Voting rights', 'Downside protection below the strike'],
          correctIndex: 1,
          explanation: 'If the stock surges past the strike, your shares are called away at the strike — the premium is compensation for capping your upside.',
        },
        {
          id: 'T3L02Q2',
          question: 'The cardinal rule of cash-secured puts is…',
          options: ['Sell them on the most volatile stocks', 'Only sell on stocks you genuinely want to own at the strike', 'Always sell weekly expirations', 'Never accept assignment'],
          correctIndex: 1,
          explanation: 'Assignment isn\'t failure — it\'s buying a stock you wanted at a price you chose, with a discount from the premium.',
        },
        {
          id: 'T3L02Q3',
          question: 'In which market does "the wheel" underperform buy-and-hold most?',
          options: ['Flat markets', 'Gently rising markets', 'Strong bull markets', 'Bear markets'],
          correctIndex: 2,
          explanation: 'In powerful rallies, covered calls cap every winner. Income strategies shine in sideways markets, not vertical ones.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L03 — Hedging: protective puts and portfolio insurance
  // ============================================================================
  {
    id: 'T3L03',
    tier: 3,
    order: 3,
    title: 'Hedging your portfolio',
    subtitle: 'Protective puts, collars, and when insurance is worth the cost',
    description: 'Professionals don\'t predict crashes — they price protection. Learn how protective puts and collars work, what they cost, and why permanent hedging usually loses.',
    videoDurationSeconds: 500,
    thumbnailUrl: 'https://example.com/thumbs/t3l03.jpg',
    estimatedMinutes: 12,
    difficulty: 4,
    topics: ['hedging', 'options', 'risk-management'],
    triggersSignals: [],
    xpReward: 150,
    sections: [
      {
        id: 'T3L03S1',
        type: 'text',
        title: 'The protective put',
        content: 'Own 100 shares, buy one put below the current price. Now your maximum loss is locked: no matter how far the stock falls, you can sell at the strike. It is exactly like an insurance policy — the strike is your deductible, the premium is your insurance bill. The catch: insurance expires. Hedge a $200 stock with $190 puts every month and you might spend 15-20% a year on premiums. Permanent full hedging almost always costs more than the crashes it prevents.',
      },
      {
        id: 'T3L03S2',
        type: 'text',
        title: 'The collar: free-ish insurance',
        content: 'A collar finances the protective put by selling a covered call at the same time. Own stock at $200, buy the $185 put, sell the $215 call — often for close to zero net cost. Your outcome is now locked in a band: you can\'t lose more than ~7.5%, and you can\'t make more than ~7.5%. Executives with concentrated stock, and retirees protecting a nest egg they\'ll spend soon, use collars constantly. Growth investors mostly shouldn\'t — the cap costs too much compounding.',
      },
      {
        id: 'T3L03S3',
        type: 'example',
        title: 'When hedging actually makes sense',
        content: 'Hedging is rational when a specific, dated risk threatens money you cannot afford to lose: you hold concentrated employer stock through an earnings report, you\'re four months from a house down-payment funded by your portfolio, or a position has grown so large that a 40% drop changes your life. Hedging is irrational as a permanent mood — the investor who is always fully hedged has converted equities back into cash, minus fees.',
      },
      {
        id: 'T3L03S4',
        type: 'text',
        title: 'The cheapest hedge is position sizing',
        content: 'Before paying for puts, check the free alternatives: trim the position, diversify, hold more cash, or extend your time horizon. A 25-stock portfolio with 5% max positions and two years of spending in cash needs almost no derivative hedging — the structure itself is the hedge. Options-based protection is a scalpel for specific, dated risks, not a substitute for a sane portfolio.',
      },
    ],
    quiz: {
      id: 'T3L03Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L03Q1',
          question: 'A protective put is best compared to…',
          options: ['A lottery ticket', 'An insurance policy with a deductible', 'A savings account', 'A margin loan'],
          correctIndex: 1,
          explanation: 'You pay a premium; below the strike you\'re covered. The gap between stock price and strike is effectively your deductible.',
        },
        {
          id: 'T3L03Q2',
          question: 'How does a collar reduce the cost of protection?',
          options: ['By using shorter expirations', 'By selling upside via a covered call to pay for the put', 'By hedging only half the shares', 'By using index options'],
          correctIndex: 1,
          explanation: 'The call premium collected offsets the put premium paid — in exchange, your upside is capped at the call strike.',
        },
        {
          id: 'T3L03Q3',
          question: 'Why does permanent full hedging usually fail?',
          options: ['Brokers forbid it', 'Cumulative premiums typically exceed the losses avoided', 'Puts can\'t be renewed', 'It\'s illegal in retirement accounts'],
          correctIndex: 1,
          explanation: 'Paying 10-20% a year forever to avoid occasional 30% drawdowns is a losing trade over time. Hedge specific, dated risks instead.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L04 — Short selling
  // ============================================================================
  {
    id: 'T3L04',
    tier: 3,
    order: 4,
    title: 'Short selling',
    subtitle: 'Profiting from declines — and why the risk profile is inverted',
    description: 'Selling what you don\'t own: the mechanics of borrowing shares, the inverted risk math, short squeezes, and what short interest data tells every investor.',
    videoDurationSeconds: 510,
    thumbnailUrl: 'https://example.com/thumbs/t3l04.jpg',
    estimatedMinutes: 13,
    difficulty: 5,
    topics: ['short-selling', 'risk', 'market-mechanics'],
    triggersSignals: [],
    xpReward: 175,
    sections: [
      {
        id: 'T3L04S1',
        type: 'text',
        title: 'The mechanics',
        content: 'To short a stock you borrow shares from your broker, sell them at today\'s price, and hope to buy them back cheaper later. Short at $100, cover at $60, and you keep the $40 difference. While short you pay borrow fees (from under 1% a year on liquid names to over 100% on crowded ones) and you owe any dividends the stock pays. The trade has a clock on it that long positions never have.',
      },
      {
        id: 'T3L04S2',
        type: 'text',
        title: 'The inverted risk math',
        content: 'Buy a stock and your worst case is −100%; your best case is unbounded. Short a stock and it flips: your best case is +100% (the stock goes to zero), your worst case is unlimited, because there is no ceiling on a stock price. A stock that doubles against a short position loses more than the entire original stake. This asymmetry — capped gains, uncapped losses — is why shorting demands strict position sizing and pre-committed exit points in a way buying never does.',
      },
      {
        id: 'T3L04S3',
        type: 'example',
        title: 'Short squeezes',
        content: 'When a heavily shorted stock rises, shorts face growing losses and margin calls, forcing them to buy back shares — which pushes the price higher, forcing more covering. GameStop in January 2021 had short interest above 100% of its float; the squeeze drove it from $20 to $483 in three weeks and destroyed several funds. Lesson for everyone, short or long: always check short interest before entering. Above ~20% of float, price action stops reflecting fundamentals.',
      },
      {
        id: 'T3L04S4',
        type: 'text',
        title: 'What short sellers do for you',
        content: 'Even if you never short, short sellers matter to you. They are the market\'s paid skeptics — the first to publish evidence of fraud (Enron, Wirecard, Luckin Coffee were all exposed by shorts). High and rising short interest on a stock you own is a signal to re-examine your thesis: sophisticated investors are betting real money that you\'re wrong. Sometimes they are wrong. But finding out WHY they\'re short is free due diligence.',
      },
    ],
    quiz: {
      id: 'T3L04Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L04Q1',
          question: 'What is the maximum theoretical loss on a short position?',
          options: ['100% of the position', 'The borrow fee', 'Unlimited', 'The dividend yield'],
          correctIndex: 2,
          explanation: 'A stock has no maximum price, so losses on a short have no ceiling — the exact inverse of buying.',
        },
        {
          id: 'T3L04Q2',
          question: 'A short squeeze happens when…',
          options: ['Shorts profit and take gains', 'A rising price forces shorts to buy back shares, pushing it higher still', 'Brokers stop lending shares', 'A company suspends its dividend'],
          correctIndex: 1,
          explanation: 'Forced covering creates buying pressure that feeds on itself — the mechanism behind GameStop\'s 2021 move.',
        },
        {
          id: 'T3L04Q3',
          question: 'High short interest on a stock you own is best treated as…',
          options: ['A guaranteed sell signal', 'Meaningless noise', 'A prompt to re-examine your thesis', 'A reason to double your position'],
          correctIndex: 2,
          explanation: 'Shorts are often wrong, but they\'re rarely lazy. Understanding their case is free due diligence on your own holding.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L05 — Margin and leverage
  // ============================================================================
  {
    id: 'T3L05',
    tier: 3,
    order: 5,
    title: 'Margin & leverage',
    subtitle: 'Borrowed money amplifies everything — including ruin',
    description: 'How margin loans work, the mathematics of margin calls, leveraged ETF decay, and the one question that decides whether leverage is ever acceptable.',
    videoDurationSeconds: 490,
    thumbnailUrl: 'https://example.com/thumbs/t3l05.jpg',
    estimatedMinutes: 12,
    difficulty: 5,
    topics: ['margin', 'leverage', 'risk'],
    triggersSignals: [],
    xpReward: 175,
    sections: [
      {
        id: 'T3L05S1',
        type: 'text',
        title: 'How margin works',
        content: 'A margin account lets you borrow against your holdings — typically up to 50% of a purchase (Regulation T). Put up $10,000, borrow $10,000, control $20,000 of stock. If the position gains 20%, your equity gains 40% (minus interest). If it loses 20%, you\'re down 40%. Leverage is symmetric amplification with an asymmetric consequence: gains compound your account, but large-enough losses END it, because you can be forced out at the bottom.',
      },
      {
        id: 'T3L05S2',
        type: 'text',
        title: 'The margin call',
        content: 'Brokers require your equity to stay above a maintenance level, usually 25-30% of position value. Fall below and you get a margin call: deposit cash immediately or the broker liquidates your positions — at whatever the current price is, without asking which ones. This is the fatal mechanism: margin calls cluster at market bottoms, converting temporary drawdowns into permanent, locked-in losses. The market recovered from every crash in history; margined investors who were forced out did not.',
      },
      {
        id: 'T3L05S3',
        type: 'example',
        title: 'Leveraged ETF decay',
        content: '3x leveraged ETFs promise triple the DAILY return — and daily resetting creates decay in choppy markets. Index goes 100 → 90 → 99.9 (down 10%, up 11%): the 3x fund goes 100 → 70 → 93.1. The index is back to roughly even; the leveraged fund is down 7%. Volatility itself eats leveraged funds, which is why they can lose money over a period when the index finishes flat. They are day-trading instruments; holding them for months is a slow leak.',
      },
      {
        id: 'T3L05S4',
        type: 'text',
        title: 'The only question that matters',
        content: 'Before using any leverage, ask: "If this position drops 50% and stays there for three years, am I forced to sell?" If the answer is yes, the leverage is unacceptable — not risky, unacceptable — because forced selling converts volatility into ruin. Buffett\'s summary is the final word: "If you\'re smart, you don\'t need leverage. If you\'re dumb, you shouldn\'t be using it."',
      },
    ],
    quiz: {
      id: 'T3L05Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L05Q1',
          question: 'With 2:1 margin, a 30% drop in your position means your equity falls…',
          options: ['15%', '30%', '60%', '45%'],
          correctIndex: 2,
          explanation: 'Leverage doubles the move: 30% × 2 = 60% of your equity, before interest costs.',
        },
        {
          id: 'T3L05Q2',
          question: 'Why are margin calls especially destructive?',
          options: ['They incur tax penalties', 'They force selling at market bottoms, locking in losses', 'They freeze the account for 90 days', 'They raise borrow rates'],
          correctIndex: 1,
          explanation: 'Calls cluster exactly when prices are lowest, converting recoverable drawdowns into permanent losses.',
        },
        {
          id: 'T3L05Q3',
          question: 'Why do 3x leveraged ETFs decay in volatile, sideways markets?',
          options: ['High dividends', 'Daily resetting compounds losses asymmetrically', 'They hold junk bonds', 'Management fraud'],
          correctIndex: 1,
          explanation: 'Tripling each day\'s return means big down days require outsized recoveries — chop grinds the fund down even when the index ends flat.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L06 — Macro investing
  // ============================================================================
  {
    id: 'T3L06',
    tier: 3,
    order: 6,
    title: 'Macro: rates, dollars & cycles',
    subtitle: 'Reading the forces that move every asset at once',
    description: 'Interest rates, the dollar, inflation regimes, and the yield curve — the four macro dials that set the backdrop for every stock you own.',
    videoDurationSeconds: 560,
    thumbnailUrl: 'https://example.com/thumbs/t3l06.jpg',
    estimatedMinutes: 15,
    difficulty: 4,
    topics: ['macro', 'interest-rates', 'inflation', 'currency'],
    triggersSignals: [],
    xpReward: 150,
    sections: [
      {
        id: 'T3L06S1',
        type: 'text',
        title: 'Rates are gravity',
        content: 'Buffett calls interest rates "gravity" for asset prices. The risk-free Treasury yield is the hurdle every investment must clear. When rates rise, future cash flows are discounted more heavily — and the further away the cash flows, the harder they fall. That\'s why high-growth stocks (whose profits live far in the future) swing violently with rates while utilities barely move. When you watch the Fed, you\'re not watching politics; you\'re watching the discount rate on everything you own.',
      },
      {
        id: 'T3L06S2',
        type: 'text',
        title: 'The yield curve',
        content: 'Plot Treasury yields from 3 months to 30 years and you get the yield curve. Normally it slopes up — lenders demand more for longer commitments. When short rates EXCEED long rates (an inversion), the bond market is saying it expects the Fed to cut rates because a slowdown is coming. Inversions have preceded every US recession since the 1960s, with a lag of 6-24 months. It\'s not a trading timer; it\'s a regime warning: late cycle, tighten your quality standards.',
      },
      {
        id: 'T3L06S3',
        type: 'example',
        title: 'The dollar\'s hidden hand',
        content: 'Roughly 40% of S&P 500 revenue is earned abroad. A strong dollar shrinks those foreign earnings when translated back, hurting exporters and multinationals (Apple, Microsoft, Coca-Cola) while sparing domestic-only businesses. It also squeezes emerging markets that borrowed in dollars. In 2022 the dollar index rose ~16%; Microsoft alone attributed billions of lost revenue to currency translation. When a multinational misses earnings, check the dollar before blaming the business.',
      },
      {
        id: 'T3L06S4',
        type: 'text',
        title: 'Inflation regimes decide what works',
        content: 'Different regimes reward different assets. Low, stable inflation (1-3%): growth stocks and long bonds shine. Rising inflation above 4%: real assets, energy, commodities, and pricing-power businesses lead while long bonds and unprofitable growth get crushed. Deflation: cash and Treasuries win. You can\'t predict the regime, but you can recognize the current one and avoid fighting it — owning 30-year bonds and story stocks into accelerating inflation is the classic unforced error.',
      },
    ],
    quiz: {
      id: 'T3L06Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L06Q1',
          question: 'Why do rising rates hit high-growth stocks hardest?',
          options: ['Growth companies carry more debt', 'Their profits lie far in the future, so heavier discounting shrinks their value most', 'They pay high dividends', 'Index funds must sell them'],
          correctIndex: 1,
          explanation: 'Distant cash flows are the most sensitive to the discount rate — rate moves are amplified in long-duration assets.',
        },
        {
          id: 'T3L06Q2',
          question: 'An inverted yield curve historically signals…',
          options: ['Immediate market crash', 'A recession within roughly 6-24 months', 'A currency crisis', 'Rising commodity prices'],
          correctIndex: 1,
          explanation: 'Every US recession since the 1960s was preceded by inversion — a regime warning, not a precise timer.',
        },
        {
          id: 'T3L06Q3',
          question: 'A strengthening dollar most directly hurts…',
          options: ['Domestic-only retailers', 'US multinationals with large foreign revenue', 'Treasury bondholders', 'Local utilities'],
          correctIndex: 1,
          explanation: 'Foreign earnings translate into fewer dollars — a direct headline-revenue headwind for global companies.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L07 — Commodities, gold & alternatives
  // ============================================================================
  {
    id: 'T3L07',
    tier: 3,
    order: 7,
    title: 'Commodities & alternatives',
    subtitle: 'Gold, oil, crypto and real assets — diversifiers or distractions?',
    description: 'What actually belongs in the alternatives sleeve of a portfolio: how commodities behave, what gold is really for, and how to size speculative assets honestly.',
    videoDurationSeconds: 500,
    thumbnailUrl: 'https://example.com/thumbs/t3l07.jpg',
    estimatedMinutes: 12,
    difficulty: 4,
    topics: ['commodities', 'gold', 'crypto', 'alternatives'],
    triggersSignals: [],
    xpReward: 150,
    sections: [
      {
        id: 'T3L07S1',
        type: 'text',
        title: 'Commodities are not investments — they\'re positions',
        content: 'A share of a business compounds: it earns profits, reinvests, and grows. A barrel of oil is the same barrel forever — it pays nothing and costs money to store. Commodity returns come only from price changes driven by supply and demand cycles. That makes them trading positions, not compounding investments. Their portfolio role is narrow but real: they historically perform best exactly when stocks and bonds both suffer — inflation shocks.',
      },
      {
        id: 'T3L07S2',
        type: 'text',
        title: 'What gold actually does',
        content: 'Gold generates nothing, yet it has held purchasing power across centuries and every failed currency. Its practical role: it is uncorrelated to stocks and tends to rally in crises and when REAL yields (rates minus inflation) fall. A 5-10% allocation historically reduced portfolio drawdowns meaningfully while barely denting long-run returns. More than that and the drag dominates. Gold is a shock absorber, not an engine — sized accordingly, it earns its place; oversized, it embalms a portfolio.',
      },
      {
        id: 'T3L07S3',
        type: 'example',
        title: 'Crypto: sizing an unknowable asset',
        content: 'Bitcoin\'s history: five drawdowns beyond 70%, each followed by new highs — so far. Treat crypto as venture-style speculation: a small allocation (0-5%) sized so a total loss changes nothing about your life, and a 10x changes something. The honest test: write down what would make you sell — a price, a date, or a thesis break — BEFORE buying. If you can\'t articulate a sell condition, you don\'t have a position; you have a hope.',
      },
      {
        id: 'T3L07S4',
        type: 'text',
        title: 'The alternatives checklist',
        content: 'Before adding any alternative asset, demand a yes to three questions. One: does it zig when my core portfolio zags (genuine low correlation)? Two: do I understand what drives its price? Three: can I hold it through a 50% drawdown without breaking my plan? REITs, gold, commodities, and crypto each pass for some investors and fail for others. The alternatives sleeve should be 0-20% of a portfolio — beyond that, the "diversifier" has become the portfolio.',
      },
    ],
    quiz: {
      id: 'T3L07Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L07Q1',
          question: 'Why can\'t commodities compound like stocks?',
          options: ['They\'re taxed higher', 'They produce no earnings to reinvest — returns come only from price changes', 'They\'re illiquid', 'Regulators cap their returns'],
          correctIndex: 1,
          explanation: 'A business grows its own value; a barrel of oil just sits there. Commodity gains require someone paying more later.',
        },
        {
          id: 'T3L07Q2',
          question: 'Gold\'s primary portfolio role is…',
          options: ['Maximizing long-run returns', 'A crisis shock-absorber with low correlation to stocks', 'Generating income', 'Beating inflation every single year'],
          correctIndex: 1,
          explanation: 'Small allocations reduce drawdowns in crises. It\'s insurance-like ballast, not an engine of growth.',
        },
        {
          id: 'T3L07Q3',
          question: 'The honest test before buying a speculative asset like crypto is…',
          options: ['Checking social media sentiment', 'Writing down your sell conditions before you buy', 'Waiting for a dip', 'Buying only round numbers'],
          correctIndex: 1,
          explanation: 'A position without pre-committed exit conditions is a hope, not a strategy — you\'ll improvise at the worst moment.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L08 — Modern portfolio theory & factor investing
  // ============================================================================
  {
    id: 'T3L08',
    tier: 3,
    order: 8,
    title: 'Portfolio theory & factors',
    subtitle: 'Sharpe ratios, efficient frontiers, and the five factors that drive returns',
    description: 'The academic core of investing made practical: risk-adjusted returns, correlation as the only free lunch, and the factor premiums that persist across a century of data.',
    videoDurationSeconds: 570,
    thumbnailUrl: 'https://example.com/thumbs/t3l08.jpg',
    estimatedMinutes: 15,
    difficulty: 5,
    topics: ['portfolio-theory', 'factors', 'sharpe-ratio', 'diversification'],
    triggersSignals: [],
    xpReward: 175,
    sections: [
      {
        id: 'T3L08S1',
        type: 'text',
        title: 'Return per unit of risk',
        content: 'Two funds both return 10%. Fund A swings ±8% along the way; Fund B swings ±25%. They are not equal — A delivered the same destination with a far smoother ride, meaning you could actually hold it. The Sharpe ratio formalizes this: (return minus risk-free rate) ÷ volatility. Above 1.0 is good; the S&P 500\'s long-run Sharpe is roughly 0.4-0.5. Mastery means judging every strategy by return PER UNIT OF RISK, never raw return.',
      },
      {
        id: 'T3L08S2',
        type: 'text',
        title: 'Correlation is the only free lunch',
        content: 'Markowitz\'s Nobel-winning insight: a portfolio\'s risk is not the average of its parts. Combine two volatile assets that move at different times and the portfolio is calmer than either alone — return is preserved while risk cancels. This is the mathematical basis of diversification and the reason adding a volatile but uncorrelated asset (like gold or managed futures) can REDUCE total portfolio risk. Diversification isn\'t owning many things; it\'s owning things that disagree with each other.',
      },
      {
        id: 'T3L08S3',
        type: 'text',
        title: 'The factor zoo — five that survived',
        content: 'A century of data across dozens of countries reveals a handful of return premiums that persist: Value (cheap beats expensive), Size (small beats large, weakly), Momentum (recent winners keep winning for 6-12 months), Quality (high profitability and low debt outperform), and Low Volatility (boring stocks earn more per unit of risk than they should). Each factor suffers brutal multi-year losing streaks — value trailed growth for the entire 2010s — which is precisely WHY the premiums persist: most investors can\'t endure the wait.',
      },
      {
        id: 'T3L08S4',
        type: 'example',
        title: 'Putting factors to work',
        content: 'Practical implementation, in order of effort: (1) a total-market index fund already holds every factor at market weight — a fine default. (2) Tilt via low-cost factor ETFs — e.g., 70% total market, 15% value, 15% quality — accepting tracking error in exchange for expected premium. (3) Direct stock selection through a factor lens: quality metrics for the businesses you buy, momentum for entry timing, value discipline for the price you pay. The mistake at every level is abandoning the tilt right after its losing streak — selling the premium exactly when it\'s cheapest.',
      },
    ],
    quiz: {
      id: 'T3L08Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L08Q1',
          question: 'The Sharpe ratio measures…',
          options: ['Total return', 'Return earned per unit of volatility taken', 'Dividend consistency', 'Correlation with the S&P 500'],
          correctIndex: 1,
          explanation: 'Excess return ÷ volatility. It rewards smooth compounding over white-knuckle rides to the same destination.',
        },
        {
          id: 'T3L08Q2',
          question: 'Adding a volatile but uncorrelated asset to a portfolio can…',
          options: ['Only increase total risk', 'Reduce total portfolio risk', 'Never change the risk', 'Eliminate returns'],
          correctIndex: 1,
          explanation: 'Markowitz\'s insight: when assets move at different times, their swings partially cancel — risk falls while return is preserved.',
        },
        {
          id: 'T3L08Q3',
          question: 'Why do factor premiums like value persist despite being public knowledge?',
          options: ['Regulators protect them', 'Multi-year losing streaks shake out investors who can\'t endure the wait', 'They\'re secret', 'Index funds are banned from them'],
          correctIndex: 1,
          explanation: 'The premium is compensation for enduring long stretches of underperformance — an arbitrage most investors abandon.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L09 — Advanced valuation: DCF from scratch
  // ============================================================================
  {
    id: 'T3L09',
    tier: 3,
    order: 9,
    title: 'Valuation mastery: the DCF',
    subtitle: 'Building a discounted cash flow model — and knowing its limits',
    description: 'The valuation method behind every serious buy decision: projecting free cash flow, choosing a discount rate, terminal values, and why margin of safety beats precision.',
    videoDurationSeconds: 580,
    thumbnailUrl: 'https://example.com/thumbs/t3l09.jpg',
    estimatedMinutes: 16,
    difficulty: 5,
    topics: ['valuation', 'dcf', 'free-cash-flow', 'intrinsic-value'],
    triggersSignals: [],
    xpReward: 175,
    sections: [
      {
        id: 'T3L09S1',
        type: 'text',
        title: 'The idea in one sentence',
        content: 'A business is worth the cash it will hand its owners over its lifetime, discounted back to today. Everything else — P/E ratios, price targets, chart patterns — is shorthand for this. The DCF makes it explicit in three steps: project free cash flow (usually 5-10 years), discount each year back at a rate reflecting risk, and add a "terminal value" for everything beyond the projection window. The output isn\'t truth; it\'s your assumptions made honest.',
      },
      {
        id: 'T3L09S2',
        type: 'example',
        title: 'A worked example',
        content: 'A company generates $100M of free cash flow, growing 10% a year for 10 years, then 3% forever. Discount rate: 9%. Years 1-10 of discounted cash flows sum to ≈ $1.11B. Terminal value: year-10 FCF of $259M × 1.03 ÷ (9% − 3%) ≈ $4.45B, worth ≈ $1.88B in today\'s dollars. Total ≈ $3.0B. Now the sobering part: nudge growth to 8% and the discount rate to 10%, and the value drops by roughly a third. Small assumption changes swing valuations violently.',
      },
      {
        id: 'T3L09S3',
        type: 'text',
        title: 'The discount rate and the terminal trap',
        content: 'The discount rate is your demanded return: the 10-year Treasury yield plus an equity risk premium (historically 4-6%), adjusted up for shakier businesses. Predictable staples might warrant 8%; a speculative growth story, 12-15%. And watch the terminal value: in most DCFs it contributes 60-80% of the total — meaning most of your "valuation" is a guess about the world beyond year ten. A DCF where terminal value is 90% of the answer isn\'t a valuation; it\'s a story with a spreadsheet attached.',
      },
      {
        id: 'T3L09S4',
        type: 'text',
        title: 'Margin of safety: the professional\'s answer to uncertainty',
        content: 'Since the inputs are guesses, professionals don\'t compute one number — they compute a range (bear, base, bull cases) and then demand the market price sit WELL BELOW the low end. Buying at a 30-50% discount to conservative intrinsic value means your assumptions can be substantially wrong and you still do fine. That gap is the margin of safety, and it — not modeling precision — is what separates valuation as practiced by Graham and Buffett from valuation as performed in pitch decks.',
      },
    ],
    quiz: {
      id: 'T3L09Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L09Q1',
          question: 'A DCF values a business as…',
          options: ['Its book value plus goodwill', 'The sum of its future free cash flows discounted to today', 'Its highest historical price', '20× next year\'s earnings'],
          correctIndex: 1,
          explanation: 'All value flows from cash the business will generate — discounting simply prices the waiting and the risk.',
        },
        {
          id: 'T3L09Q2',
          question: 'Why is a huge terminal value share (say 90%) a red flag?',
          options: ['It breaks the spreadsheet', 'Nearly all the value rests on guesses beyond the forecast window', 'Terminal values are illegal', 'It means negative cash flow'],
          correctIndex: 1,
          explanation: 'The further out the cash, the less knowable it is. A valuation dominated by the distant future is a story, not an estimate.',
        },
        {
          id: 'T3L09Q3',
          question: 'Margin of safety means…',
          options: ['Using more decimal places', 'Buying well below conservative intrinsic value so errors don\'t ruin you', 'Diversifying across 100 stocks', 'Only buying profitable companies'],
          correctIndex: 1,
          explanation: 'Graham\'s core idea: demand a discount big enough that being wrong about the details still leaves you whole.',
        },
      ],
    },
  },

  // ============================================================================
  // T3L10 — The complete investor: your permanent system
  // ============================================================================
  {
    id: 'T3L10',
    tier: 3,
    order: 10,
    title: 'Mastery: your permanent system',
    subtitle: 'Synthesizing three tiers into a written system that survives every market',
    description: 'The capstone: converting everything you\'ve learned into a one-page written investment policy — allocation, buy criteria, sell rules, and behavior protocols for manias and crashes.',
    videoDurationSeconds: 540,
    thumbnailUrl: 'https://example.com/thumbs/t3l10.jpg',
    estimatedMinutes: 14,
    difficulty: 5,
    topics: ['strategy', 'investment-policy', 'discipline', 'mastery'],
    triggersSignals: [],
    xpReward: 200,
    sections: [
      {
        id: 'T3L10S1',
        type: 'text',
        title: 'Why written beats brilliant',
        content: 'Every skill in three tiers of lessons fails at the same point: the moment of stress. In a 35% crash or a euphoric mania, the analytical brain goes offline and the improvising brain takes over — and it improvises badly. The fix used by every institution is an Investment Policy Statement: decisions written down IN ADVANCE, when you\'re calm, that you merely execute when you\'re not. One page. If it doesn\'t fit on a page, it won\'t be followed.',
      },
      {
        id: 'T3L10S2',
        type: 'text',
        title: 'The four sections of your policy',
        content: 'ALLOCATION: target percentages for core index holdings, individual stocks, bonds, alternatives, cash — with rebalancing bands (e.g., rebalance when 5% off target). BUY CRITERIA: what qualifies a stock (e.g., ROE > 15%, debt/equity < 1, price below your conservative DCF, and you can explain the business in two sentences). SELL RULES: thesis broken, position exceeds 10% of portfolio, or a clearly better use of capital — never "it went down." BEHAVIOR: what you do in a crash (rebalance INTO it on schedule), in a mania (trim on schedule), and always (24-hour rule on every unplanned trade).',
      },
      {
        id: 'T3L10S3',
        type: 'example',
        title: 'Stress-testing the system',
        content: 'Run your policy through history before trusting it with your future. 2008: stocks −55% over 17 months — does your allocation let you sleep AND rebalance into the decline? 2020: −34% in 23 days, recovered in 5 months — does your system avoid panic-selling a v-shaped bottom? 1999: your neighbor doubles his money on stocks you refused to buy — do your buy criteria hold against envy, the most corrosive emotion in markets? A system that survives all three on paper has a chance of surviving one in reality.',
      },
      {
        id: 'T3L10S4',
        type: 'text',
        title: 'The last lesson',
        content: 'You now hold the complete toolkit: business analysis, valuation, portfolio construction, derivatives, macro context, and behavioral defense. The final truth of mastery is that the toolkit is the easy part. Markets transfer money from the impatient to the patient, from the improvising to the systematic — in every era, through every technology, forever. Your edge was never going to be information or intelligence. It is holding a sound system through the moments when everyone around you abandons theirs. Review your policy yearly. Change it slowly. Follow it exactly.',
      },
    ],
    quiz: {
      id: 'T3L10Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'T3L10Q1',
          question: 'Why must an investment policy be written before a crisis?',
          options: ['Brokers require it', 'Under stress, the improvising brain replaces the analytical one — pre-made decisions survive, fresh ones don\'t', 'For tax records', 'To share on social media'],
          correctIndex: 1,
          explanation: 'The whole point of a system is that it was designed by calm-you and merely executed by stressed-you.',
        },
        {
          id: 'T3L10Q2',
          question: 'Which is a valid sell rule in a sound system?',
          options: ['"The stock dropped 20%"', '"The thesis I bought it for is broken"', '"A TV analyst downgraded it"', '"It hasn\'t moved in a month"'],
          correctIndex: 1,
          explanation: 'Price movement alone is noise. Selling is justified by thesis breaks, oversized positions, or clearly better opportunities.',
        },
        {
          id: 'T3L10Q3',
          question: 'The durable edge available to individual investors is…',
          options: ['Faster information', 'Superior intelligence', 'Holding a sound system through moments when others abandon theirs', 'Access to IPOs'],
          correctIndex: 2,
          explanation: 'Markets pay patience and discipline. Information and IQ edges are competed away; behavioral edges are not.',
        },
      ],
    },
  },
];
