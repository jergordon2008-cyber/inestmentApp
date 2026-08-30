/**
 * Tier 2 Curriculum — Active Investor
 * 
 * 20 lessons moving students beyond Tier 1 blue-chip basics into the
 * full toolkit of an active investor. Content drawn from:
 * "Investing 101" by Michele Cagan, CPA (Adams 101 Series)
 * 
 * Covers: bonds, ETFs, mutual funds, value vs growth investing,
 * fundamental & technical analysis, sector rotation, economic
 * indicators, retirement accounts, and portfolio construction.
 */

import { Lesson } from '../types';

export const tier2Lessons: Lesson[] = [

  // ============================================================================
  // LESSON T2L01 — What are bonds?
  // ============================================================================
  {
    id: 'T2L01',
    tier: 2,
    order: 1,
    title: 'What are bonds?',
    subtitle: 'How lending money to governments and companies earns you interest',
    description: 'Stocks get all the headlines, but the bond market is actually larger. Learn what bonds are, why they exist, and why every serious portfolio includes them.',
    videoUrl: 'https://example.com/lessons/t2l01.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l01.jpg',
    estimatedMinutes: 12,
    difficulty: 2,
    topics: ['bonds', 'fixed-income', 'interest'],
    triggersSignals: ['dividend_consistency'],
    sections: [
      {
        id: 'T2L01S1',
        type: 'text',
        title: 'Stocks vs. bonds: the fundamental difference',
        content: 'When you buy stock, you own a piece of a company. When you buy a bond, you\'re lending money to a company or government — and they promise to pay you interest and return your money on a set date. That\'s it. Bonds are loans. The borrower pays you for the privilege of using your money, usually twice a year, then returns the original amount when the bond "matures."',
      },
      {
        id: 'T2L01S2',
        type: 'text',
        title: 'The key bond terms',
        content: 'Face value (or par value): the amount the bond is worth at maturity, usually $1,000. Coupon rate: the annual interest rate. A $1,000 bond with a 5% coupon pays you $50 per year ($25 every six months). Maturity date: when you get your $1,000 back. Short-term bonds mature in under 5 years, intermediate in 7-10 years, long-term up to 30 years. Longer bonds typically pay higher interest rates to compensate for the longer wait.',
      },
      {
        id: 'T2L01S3',
        type: 'example',
        title: 'Why bonds belong in every serious portfolio',
        content: 'Because bond prices often move in the OPPOSITE direction of stocks. When the stock market crashes and panicked investors flee to safety, bond prices typically rise. This "negative correlation" is what makes bonds such a powerful diversifier. A portfolio of 70% stocks and 30% bonds historically delivers nearly the same returns as an all-stock portfolio, but with dramatically less stomach-churning volatility along the way.',
      },
      {
        id: 'T2L01S4',
        type: 'text',
        title: 'The one big risk: interest rates',
        content: 'Here\'s the counterintuitive truth about bonds: when interest rates go UP, bond prices go DOWN. Why? If you hold a bond paying 3% and new bonds now pay 5%, your bond becomes less valuable — who wants 3% when they can get 5%? This only matters if you need to sell before maturity. If you hold to maturity, you get your full face value back regardless. Interest-rate risk is the main reason long-term bonds pay more — you\'re being compensated for taking on that uncertainty.',
      },
    ],
    quiz: {
      id: 'T2L01Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'When you buy a bond, what are you doing?',
          options: [
            'Buying ownership in a company',
            'Lending money in exchange for interest payments and return of principal',
            'Purchasing a share of profits',
            'Betting the company will grow',
          ],
          correctIndex: 1,
          explanation: 'Bonds are loans. You lend money, receive periodic interest payments (coupons), and get your principal back at maturity. You don\'t own anything in the company.',
        },
        {
          id: 'q2',
          question: 'Interest rates rise from 3% to 5%. What happens to the price of an existing 3% bond?',
          options: [
            'It goes up because rates are higher',
            'It stays the same',
            'It goes down because newer bonds pay more',
            'It doubles',
          ],
          correctIndex: 2,
          explanation: 'When new bonds offer 5%, nobody wants your 3% bond at full price. Its market price drops to make the effective yield competitive. Bond prices and interest rates always move in opposite directions.',
        },
        {
          id: 'q3',
          question: 'A bond has a face value of $1,000 and a 4% coupon rate. How much interest do you receive per year?',
          options: ['$4', '$40', '$400', '$4,000'],
          correctIndex: 1,
          explanation: '$1,000 × 4% = $40 per year, usually paid as $20 every six months. Your original $1,000 comes back when the bond matures.',
        },
        {
          id: 'q4',
          question: 'Why do longer-term bonds usually pay higher interest rates?',
          options: [
            'Governments force them to',
            'To compensate investors for tying up money longer with more uncertainty',
            'Because they\'re safer',
            'Tax reasons',
          ],
          correctIndex: 1,
          explanation: 'More time = more uncertainty about interest rates and the borrower\'s health. Investors demand higher rates for taking on that extra risk and illiquidity.',
        },
        {
          id: 'q5',
          question: 'Why are bonds useful in a portfolio alongside stocks?',
          options: [
            'They always return more than stocks',
            'Bond prices often move opposite to stocks, reducing overall portfolio swings',
            'They\'re tax-free',
            'They guarantee returns',
          ],
          correctIndex: 1,
          explanation: 'The negative correlation between stocks and bonds is one of the most powerful diversification tools in investing. When stocks crash, bonds often rise or hold steady, cushioning the blow.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L02 — Bond types: Treasuries, munis, and corporates
  // ============================================================================
  {
    id: 'T2L02',
    tier: 2,
    order: 2,
    title: 'Bond types: Treasuries, munis, and corporates',
    subtitle: 'How to choose the right bond for your situation',
    description: 'Not all bonds are the same. Government bonds are the safest. Municipal bonds offer tax advantages. Corporate bonds pay more but carry more risk. Here\'s how to choose.',
    videoUrl: 'https://example.com/lessons/t2l02.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t2l02.jpg',
    estimatedMinutes: 10,
    difficulty: 2,
    topics: ['bonds', 'treasuries', 'municipal', 'corporate'],
    triggersSignals: [],
    sections: [
      {
        id: 'T2L02S1',
        type: 'text',
        title: 'Treasury bonds: the safest bet',
        content: 'U.S. Treasury bonds are backed by the full faith and credit of the federal government — the closest thing to a risk-free investment that exists. They come in three flavors: T-bills (under 1 year), Treasury notes (2-10 years), and Treasury bonds (30 years). You don\'t pay state or local taxes on Treasury interest, though you do pay federal. They\'re highly liquid — the Treasury market trades $250 billion+ per day. Buy them directly at TreasuryDirect.gov for as little as $100.',
      },
      {
        id: 'T2L02S2',
        type: 'text',
        title: 'Municipal bonds: tax-free income',
        content: 'States, cities, and local governments issue "munis" to fund schools, roads, and infrastructure. The big appeal: municipal bond interest is usually exempt from federal income tax, and often state tax too. If you\'re in a high tax bracket, a 3.5% tax-free yield can be worth more than a 5% taxable yield after taxes. The downside: they typically pay lower rates than corporate bonds — but the tax advantage can make up for that, especially in high-tax states.',
      },
      {
        id: 'T2L02S3',
        type: 'text',
        title: 'Corporate bonds: more risk, more reward',
        content: 'Companies issue bonds to raise money for expansion, acquisitions, or operations. Corporate bonds pay higher rates than government bonds because companies can — and do — go bankrupt. Enron, Kmart, and Blockbuster were all large companies that defaulted on their bonds. The tradeoff: long-term corporate bonds have historically outperformed government bonds. Corporate bond income is taxed at both federal and state level.',
      },
      {
        id: 'T2L02S4',
        type: 'example',
        title: 'Bond ratings: your credit check for borrowers',
        content: 'Standard & Poor\'s and Moody\'s rate bonds like a credit score for companies. AAA is the safest (like lending to the most creditworthy borrower). Down to BBB is still "investment grade." Below BBB gets into "junk bond" territory — high risk, high potential return. Rule of thumb: only buy bonds rated BBB or above unless you really understand the risk. A bond rated CCC is telling you there\'s a real chance you won\'t get your money back.',
      },
    ],
    quiz: {
      id: 'T2L02Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What makes U.S. Treasury bonds essentially risk-free?',
          options: [
            'They pay the highest interest rates',
            'Backed by the full faith and credit of the U.S. government',
            'They\'re insured by the FDIC',
            'They never change in price',
          ],
          correctIndex: 1,
          explanation: 'The U.S. government can print money and collect taxes to meet its obligations. That\'s why Treasuries are considered essentially risk-free — the government has never defaulted.',
        },
        {
          id: 'q2',
          question: 'Why might a high-tax-bracket investor prefer a 3.5% municipal bond over a 5% corporate bond?',
          options: [
            'Municipal bonds are safer',
            'After taxes, the muni\'s tax-free 3.5% might be worth more than 5% taxable',
            'Corporate bonds are illegal for individuals',
            'Municipal bonds mature faster',
          ],
          correctIndex: 1,
          explanation: 'At a 35% tax rate, a 5% corporate bond nets you 3.25% after tax. The 3.5% tax-free muni beats that. Tax-equivalent yield comparisons are essential for high earners.',
        },
        {
          id: 'q3',
          question: 'A bond rated BB falls below BBB. What does that tell you?',
          options: [
            'It\'s a government bond',
            'It\'s investment grade and very safe',
            'It\'s "below investment grade" — higher risk of default',
            'It pays no interest',
          ],
          correctIndex: 2,
          explanation: 'BBB and above is "investment grade." Below BBB is sometimes called "junk" or "high yield." Higher yields compensate for the higher risk of the company failing to pay.',
        },
        {
          id: 'q4',
          question: 'Which bond type has historically paid the most over the long term?',
          options: [
            'Treasury bonds',
            'Municipal bonds',
            'Corporate bonds',
            'Savings bonds',
          ],
          correctIndex: 2,
          explanation: 'Long-term corporate bonds have historically outperformed government bonds because they carry more risk. Investors demand higher returns to compensate for potential defaults.',
        },
        {
          id: 'q5',
          question: 'What does "laddering" bonds mean?',
          options: [
            'Buying bonds from multiple companies',
            'Holding bonds with staggered maturity dates',
            'Reinvesting coupon payments',
            'Rating bonds by safety',
          ],
          correctIndex: 1,
          explanation: 'Laddering means buying bonds that mature at different times (1yr, 3yr, 5yr, 10yr). As each matures, you reinvest. This manages interest-rate risk without trying to time the market.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L03 — ETFs: the smarter index fund
  // ============================================================================
  {
    id: 'T2L03',
    tier: 2,
    order: 3,
    title: 'ETFs: the smarter index fund',
    subtitle: 'Why ETFs have taken over the investing world',
    description: 'ETFs (Exchange-Traded Funds) have revolutionized investing. They offer instant diversification, low costs, and the flexibility of stocks. Here\'s everything you need to know.',
    videoUrl: 'https://example.com/lessons/t2l03.mp4',
    videoDurationSeconds: 540,
    thumbnailUrl: 'https://example.com/thumbs/t2l03.jpg',
    estimatedMinutes: 13,
    difficulty: 2,
    topics: ['ETFs', 'index-funds', 'passive-investing'],
    triggersSignals: ['sector_momentum'],
    sections: [
      {
        id: 'T2L03S1',
        type: 'text',
        title: 'What an ETF actually is',
        content: 'An ETF (Exchange-Traded Fund) is a basket of securities that trades on a stock exchange like a single stock. The very first ETF tracked the S&P 500 and launched in 1993. Today you can buy a single ETF and instantly own pieces of 500 companies (SPY), or all 3,000+ U.S. stocks (VTI), or bonds from thousands of governments and companies (BND). One purchase, massive diversification.',
      },
      {
        id: 'T2L03S2',
        type: 'text',
        title: 'ETFs vs. mutual funds: the key differences',
        content: 'Both hold baskets of securities. The differences: ETFs trade on exchanges throughout the day like stocks — you buy and sell at market price anytime. Mutual funds only price once per day at close. ETFs typically have lower expense ratios (some as low as 0.03%). Mutual funds often have minimum investments ($1,000+); ETFs you can buy one share. ETFs are also more tax-efficient because of their unique structure — you rarely get hit with unexpected capital gains distributions.',
      },
      {
        id: 'T2L03S3',
        type: 'example',
        title: 'The famous ETF families',
        content: 'SPDRs (pronounced "spiders") by State Street were first — SPY tracks the S&P 500 and is the most traded security on Earth. Vanguard (VTI, VOO) pioneered low-cost investing. BlackRock\'s iShares family covers everything from S&P 500 to emerging markets to bonds. QQQ tracks the NASDAQ-100, heavy on tech. DIA (called "Diamonds") tracks the Dow. For most investors, just SPY + BND (a bond ETF) gets you a solid, diversified, low-cost portfolio in two purchases.',
      },
      {
        id: 'T2L03S4',
        type: 'text',
        title: 'The index advantage: beating most pros',
        content: 'Here\'s the uncomfortable truth for active fund managers: over long periods, most of them fail to beat their benchmark index after fees. From 1987-1997, the S&P 500 beat 81% of actively managed equity funds. During the 2008 bear market, the S&P 500 outperformed 54% of large-cap funds. Vanguard founder John Bogle\'s research found index funds beat roughly 70% of managed funds over time. The math is simple: lower costs mean higher returns all else equal.',
      },
    ],
    quiz: {
      id: 'T2L03Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is an ETF?',
          options: [
            'A type of bond',
            'A basket of securities that trades on an exchange like a stock',
            'An individual stock with extra features',
            'A government savings account',
          ],
          correctIndex: 1,
          explanation: 'An ETF bundles many securities (stocks, bonds, commodities) into one tradeable unit. Buying one share of SPY gives you fractional ownership of all 500 S&P 500 companies.',
        },
        {
          id: 'q2',
          question: 'What is the main cost advantage of ETFs over actively managed mutual funds?',
          options: [
            'ETFs are always free to trade',
            'ETFs have much lower expense ratios since they don\'t require active management',
            'ETFs never pay taxes',
            'ETFs are backed by the government',
          ],
          correctIndex: 1,
          explanation: 'Index ETFs just mirror an index — no analysts, no stock pickers. That means costs as low as 0.03% vs 1%+ for actively managed funds. Over 30 years, that difference is enormous.',
        },
        {
          id: 'q3',
          question: 'You want to invest in the U.S. stock market with one purchase. Which ETF makes most sense?',
          options: [
            'A corporate bond ETF',
            'A broad market ETF like SPY (S&P 500) or VTI (total market)',
            'A currency ETF',
            'A single-sector tech ETF',
          ],
          correctIndex: 1,
          explanation: 'Broad market ETFs like SPY (500 large companies) or VTI (3,000+ companies) give you instant diversification across the entire U.S. stock market in one trade.',
        },
        {
          id: 'q4',
          question: 'True or false: most actively managed funds beat the S&P 500 over long periods?',
          options: [
            'True, professionals always win',
            'False, most fail to beat the index after fees over long periods',
            'True, but only in bull markets',
            'It\'s exactly 50/50',
          ],
          correctIndex: 1,
          explanation: 'Studies consistently show 70-80% of actively managed funds fail to beat their benchmark index over 10+ years after fees. The lower costs of index funds compound into a significant advantage.',
        },
        {
          id: 'q5',
          question: 'How is an ETF different from a mutual fund in how you buy it?',
          options: [
            'They are exactly the same',
            'ETFs trade throughout the day on exchanges; mutual funds price once daily at close',
            'Mutual funds trade on exchanges; ETFs do not',
            'ETFs can only be bought through a broker, mutual funds cannot',
          ],
          correctIndex: 1,
          explanation: 'ETFs trade like stocks — you can buy or sell at any moment the market is open, at the current market price. Mutual fund orders only execute at the end of the day NAV.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L04 — Mutual funds demystified
  // ============================================================================
  {
    id: 'T2L04',
    tier: 2,
    order: 4,
    title: 'Mutual funds demystified',
    subtitle: 'How pooled investing works, and when it makes sense',
    description: 'Over $26 trillion is invested in mutual funds worldwide. Learn how they work, the important differences in fund types, how to read a fund prospectus, and when you\'d choose one over an ETF.',
    videoUrl: 'https://example.com/lessons/t2l04.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l04.jpg',
    estimatedMinutes: 11,
    difficulty: 2,
    topics: ['mutual-funds', 'diversification', 'fund-management'],
    triggersSignals: [],
    sections: [
      {
        id: 'T2L04S1',
        type: 'text',
        title: 'What a mutual fund actually is',
        content: 'A mutual fund pools money from thousands of investors and uses it to buy a diversified collection of stocks, bonds, or other securities. A professional fund manager makes the buy/sell decisions. You own shares of the fund, not shares of the underlying companies directly. The fund\'s value per share is called the NAV (Net Asset Value) and is calculated once daily after market close. With some funds, you can start with just $25-50.',
      },
      {
        id: 'T2L04S2',
        type: 'text',
        title: 'Types of mutual funds',
        content: 'Index funds passively track an index (S&P 500, Russell 2000) — low fees, no active management. Growth funds seek companies with rapidly expanding earnings. Income funds focus on dividend payers for steady cash flow. Value funds buy stocks trading below their fundamental worth. Balanced funds hold both stocks and bonds. Sector funds concentrate in one industry (tech, healthcare, energy). Each type has a different risk profile and goal — match the fund type to your objective.',
      },
      {
        id: 'T2L04S3',
        type: 'example',
        title: 'Loads, fees, and expense ratios — what to watch',
        content: 'A "loaded" fund charges a sales commission (typically 3-5%) when you buy or sell. A "no-load" fund doesn\'t — you keep more of your money. But even no-load funds have operating expenses, expressed as the expense ratio. A 1.5% expense ratio means $15 per year on every $1,000 invested. Over 30 years, that\'s a massive difference vs a 0.1% index fund. Rule: always check the expense ratio. Higher fees require the fund to dramatically outperform just to break even.',
      },
      {
        id: 'T2L04S4',
        type: 'text',
        title: 'Dollar-cost averaging: the set-it-and-forget-it strategy',
        content: 'Dollar-cost averaging means investing the same fixed amount regularly regardless of market conditions. If you invest $500/month into a fund, you automatically buy more shares when prices are low and fewer when prices are high. This removes the impossible task of "timing the market." 401(k) plans are built on this principle. It\'s emotionally hard to keep buying during crashes — but those are exactly the moments you\'re getting the most shares for your money.',
      },
    ],
    quiz: {
      id: 'T2L04Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is NAV in the context of mutual funds?',
          options: [
            'Net Annual Value — your total yearly return',
            'Net Asset Value — the per-share value of the fund, calculated daily after market close',
            'National Average Valuation',
            'New Account Value',
          ],
          correctIndex: 1,
          explanation: 'NAV is the fund\'s total assets minus liabilities divided by shares outstanding. When you buy or sell a mutual fund, you transact at that day\'s closing NAV.',
        },
        {
          id: 'q2',
          question: 'An actively managed fund has an expense ratio of 1.2%. An index fund has 0.05%. On $10,000, what\'s the annual cost difference?',
          options: ['$5', '$11.50', '$115', '$1,200'],
          correctIndex: 2,
          explanation: '$10,000 × 1.2% = $120/year. $10,000 × 0.05% = $5/year. Difference: $115/year. Over 30 years compounded, that gap becomes enormous.',
        },
        {
          id: 'q3',
          question: 'What is dollar-cost averaging?',
          options: [
            'Buying stocks only when prices are low',
            'Investing a fixed amount at regular intervals regardless of market price',
            'Averaging the cost of multiple brokers',
            'Buying round lots of 100 shares',
          ],
          correctIndex: 1,
          explanation: 'Dollar-cost averaging removes market timing from the equation. You automatically buy more shares when prices are low, fewer when high, lowering your average cost over time.',
        },
        {
          id: 'q4',
          question: 'A "load" fund charges you 5% when you buy. You invest $10,000. How much is actually invested?',
          options: ['$10,000', '$9,500', '$9,000', '$10,500'],
          correctIndex: 1,
          explanation: '$10,000 × 5% = $500 load fee. Only $9,500 goes to work for you. This is why no-load funds are generally preferred — 100% of your money gets invested.',
        },
        {
          id: 'q5',
          question: 'When choosing a fund manager, what\'s the most important factor to examine?',
          options: [
            'Their TV appearances',
            'Consistent performance across multiple years and market cycles',
            'The fund\'s name',
            'How many funds they manage',
          ],
          correctIndex: 1,
          explanation: 'One great year might be luck. A manager who has delivered consistent performance across bull and bear markets, including 2008, has demonstrated real skill.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L05 — Value investing
  // ============================================================================
  {
    id: 'T2L05',
    tier: 2,
    order: 5,
    title: 'Value investing: buying the dollar for 50 cents',
    subtitle: 'How Warren Buffett built the world\'s greatest fortune',
    description: 'Value investing is the philosophy of buying stocks trading below their true worth. It\'s the approach used by Benjamin Graham and Warren Buffett. Learn the principles and tools.',
    videoUrl: 'https://example.com/lessons/t2l05.mp4',
    videoDurationSeconds: 540,
    thumbnailUrl: 'https://example.com/thumbs/t2l05.jpg',
    estimatedMinutes: 13,
    difficulty: 3,
    topics: ['value-investing', 'fundamentals', 'Warren-Buffett'],
    triggersSignals: ['blue_chip_quality', 'earnings_beat'],
    sections: [
      {
        id: 'T2L05S1',
        type: 'text',
        title: 'What value investing really means',
        content: 'Value investing is finding companies worth $1.00 that you can buy for $0.50. The premise: markets are not perfectly efficient. Sometimes great companies get overlooked or punished by temporary bad news while their underlying business remains strong. The value investor\'s job is to calculate what a company is actually worth (intrinsic value) and only buy when the market is offering it at a significant discount. That discount is called the "margin of safety."',
      },
      {
        id: 'T2L05S2',
        type: 'text',
        title: 'Key valuation metrics',
        content: 'P/E ratio: share price ÷ earnings per share. Lower can mean cheaper — but not always. Compare to industry peers and historical average. P/B ratio (Price to Book): share price ÷ book value per share. A P/B under 1.0 means you\'re buying the company for less than its accounting value. Debt/Equity ratio: how much debt vs equity the company uses. Lower is usually safer. Free cash flow: the real cash the business generates after expenses — the most important number for Buffett.',
      },
      {
        id: 'T2L05S3',
        type: 'example',
        title: 'The Buffett checklist',
        content: 'Warren Buffett says he looks for five things: (1) A business he understands. (2) Good long-term economics — a durable moat. (3) Capable, honest management. (4) A sensible price. (5) Simplicity. He\'s famously avoided tech companies (Amazon, Google) because they were outside his "circle of competence." He\'d rather buy a great business at a fair price than a mediocre business at a great price.',
      },
      {
        id: 'T2L05S4',
        type: 'text',
        title: 'Why value investing is hard',
        content: 'If it were easy, everyone would do it. The challenge: value stocks often look bad. They\'re cheap because something went wrong — a scandal, a bad quarter, a market overreaction. You have to distinguish between "temporarily cheap" (opportunity) and "cheap for good reason" (value trap). It also requires patience — value stocks can stay cheap for years before the market recognizes their worth. The emotional discipline to buy when others are selling is rare.',
      },
    ],
    quiz: {
      id: 'T2L05Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is "intrinsic value" in value investing?',
          options: [
            'The current market price',
            'What the analyst thinks the stock is worth based on fundamentals',
            'The stock\'s book value',
            'The price/earnings ratio',
          ],
          correctIndex: 1,
          explanation: 'Intrinsic value is the investor\'s estimate of what the business is truly worth, based on its fundamentals. Value investing means only buying when market price is significantly below this estimate.',
        },
        {
          id: 'q2',
          question: 'What is a "margin of safety"?',
          options: [
            'Insurance on your investments',
            'The difference between intrinsic value and purchase price — your protection against error',
            'A government bond guarantee',
            'A stop-loss order',
          ],
          correctIndex: 1,
          explanation: 'If you think a company is worth $100 but buy at $60, you have a $40 margin of safety. Even if you\'re wrong by 20%, you still break even. The margin of safety protects against valuation errors.',
        },
        {
          id: 'q3',
          question: 'A stock has a P/B ratio of 0.7. What does this mean?',
          options: [
            'You\'re paying $1.30 for every $1 of book value',
            'You\'re buying the company for 70 cents on every dollar of book value',
            'The company has 70% debt',
            'The P/E ratio is 0.7',
          ],
          correctIndex: 1,
          explanation: 'A P/B under 1.0 means the market is valuing the company below its accounting book value. This can signal value, though sometimes it reflects real problems — always investigate why.',
        },
        {
          id: 'q4',
          question: 'Warren Buffett famously avoided investing in Amazon and Google despite their success. Why?',
          options: [
            'They were too expensive at any price',
            'They were outside his "circle of competence" — businesses he didn\'t fully understand',
            'He disliked technology companies',
            'They didn\'t pay dividends',
          ],
          correctIndex: 1,
          explanation: 'Buffett only invests in businesses he deeply understands. He freely admits tech giants were outside his expertise, so he chose not to invest even when their quality was obvious.',
        },
        {
          id: 'q5',
          question: 'A company\'s stock is cheap because it had one terrible quarter due to a one-time event. Is this a value opportunity?',
          options: [
            'No — cheap always means trouble',
            'Possibly — if the underlying business is sound, a temporary overreaction can be an opportunity',
            'Only if the dividend is raised',
            'No — you should wait for it to rise first',
          ],
          correctIndex: 1,
          explanation: 'Temporary bad news on a fundamentally strong business is the classic value opportunity. The key is determining whether the bad news is truly temporary. That requires real analysis.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L06 — Growth investing
  // ============================================================================
  {
    id: 'T2L06',
    tier: 2,
    order: 6,
    title: 'Growth investing: betting on the future',
    subtitle: 'How to find and evaluate companies with explosive potential',
    description: 'Growth investors don\'t focus on today\'s price — they focus on tomorrow\'s potential. This lesson covers how to identify growth stocks, what makes them worth their premium, and the risks.',
    videoUrl: 'https://example.com/lessons/t2l06.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l06.jpg',
    estimatedMinutes: 11,
    difficulty: 3,
    topics: ['growth-investing', 'high-PE', 'momentum'],
    triggersSignals: ['earnings_beat', 'sector_momentum'],
    sections: [
      {
        id: 'T2L06S1',
        type: 'text',
        title: 'What makes a growth stock',
        content: 'Growth companies have sales, earnings, and market share expanding faster than the overall economy. They typically have high P/E ratios — the market is paying a premium for future expectations. Many reinvest all profits back into the business rather than paying dividends. They\'re often in tech, biotech, or other fast-moving sectors. Examples over the decades: Walmart in the 1980s, Microsoft in the 1990s, Amazon in the 2000s. The question is always: which of today\'s growth companies will become tomorrow\'s giants?',
      },
      {
        id: 'T2L06S2',
        type: 'text',
        title: 'Five signs of a genuine growth company',
        content: '(1) Sound business model with a clear path to scaling. (2) Superior management — the CEO matters enormously in growth companies. (3) Significant and growing market share in a large or expanding market. (4) Competitive advantages that widen over time (network effects, data flywheel, switching costs). (5) Active R&D investment — companies that prioritize innovation tend to find the next big thing before competitors do.',
      },
      {
        id: 'T2L06S3',
        type: 'example',
        title: 'The Walmart case study',
        content: 'In January 1990, 100 shares of Walmart cost $533. By January 1995: worth $1,144 — a 115% gain in 5 years. By January 2014: worth $8,140 — more than 15 times the original investment. If you had recognized Walmart\'s growth potential in the early 1990s — the relentless store expansion, the sophisticated logistics, the pricing power — you had time to buy before the massive appreciation. The lesson: finding growth companies early requires genuine understanding of the business.',
      },
      {
        id: 'T2L06S4',
        type: 'text',
        title: 'The growth trap: when momentum becomes mania',
        content: 'Growth investing carries real danger: momentum traders can push growth stocks to irrational heights. When a stock\'s price grows faster than its underlying business could possibly justify, you\'re in bubble territory. This happened with dot-com stocks in 2000 — companies with no revenue were trading at billions in market cap. Warning signs: P/E ratios above 100, revenue declining while stock rises, stories replacing numbers in analyst reports. A growth company at an unreasonable price is just a bad investment.',
      },
    ],
    quiz: {
      id: 'T2L06Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Why do growth stocks typically have high P/E ratios?',
          options: [
            'They\'re overvalued',
            'The market is paying for expected future growth, not just current earnings',
            'They pay high dividends',
            'They have more shares outstanding',
          ],
          correctIndex: 1,
          explanation: 'A high P/E means investors expect earnings to grow substantially. Today\'s expensive price could look cheap relative to future earnings — if the growth materializes.',
        },
        {
          id: 'q2',
          question: 'Growth companies typically do what with their profits?',
          options: [
            'Pay large dividends',
            'Reinvest them back into the business to fuel more growth',
            'Buy back all shares',
            'Hold them as cash indefinitely',
          ],
          correctIndex: 1,
          explanation: 'Reinvesting profits accelerates growth. Amazon famously had near-zero profits for years while reinvesting every dollar into expansion. Investors who understood this were rewarded enormously.',
        },
        {
          id: 'q3',
          question: 'What is a "network effect"?',
          options: [
            'A stock market index',
            'A competitive advantage where more users make the product more valuable for all users',
            'The impact of news on stock prices',
            'A type of bond',
          ],
          correctIndex: 1,
          explanation: 'Facebook, Visa, and LinkedIn become more valuable as more people use them. This is a network effect — a powerful moat that makes it nearly impossible for competitors to catch up once established.',
        },
        {
          id: 'q4',
          question: 'Warning signs that a growth stock might be in bubble territory?',
          options: [
            'High profit margins and low debt',
            'P/E ratios above 100, declining revenues, stories replacing data in analysis',
            'Consistent earnings beats',
            'Multiple expanding product lines',
          ],
          correctIndex: 1,
          explanation: 'When valuations detach from any reasonable earnings forecast and "story" replaces substance, you\'re often near a top. The dot-com crash wiped out companies that matched this description.',
        },
        {
          id: 'q5',
          question: 'Growth stocks tend to perform best when?',
          options: [
            'During recessions',
            'During bull markets when economic expansion drives earnings growth',
            'When interest rates are rising',
            'When inflation is highest',
          ],
          correctIndex: 1,
          explanation: 'In bull markets, investors are optimistic about the future and willing to pay premiums for growth. In bear markets and recessions, investors typically rotate to safety (value and dividend stocks).',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L07 — Technical analysis basics
  // ============================================================================
  {
    id: 'T2L07',
    tier: 2,
    order: 7,
    title: 'Technical analysis basics',
    subtitle: 'Reading price charts to find patterns and trends',
    description: 'While fundamental analysis focuses on company value, technical analysis focuses on price patterns. Learn how to read charts, identify trends, and use the most powerful indicators.',
    videoUrl: 'https://example.com/lessons/t2l07.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t2l07.jpg',
    estimatedMinutes: 10,
    difficulty: 3,
    topics: ['technical-analysis', 'charts', 'trends'],
    triggersSignals: ['sector_momentum'],
    sections: [
      {
        id: 'T2L07S1',
        type: 'text',
        title: 'Technical vs fundamental: different lenses',
        content: 'Fundamental analysis asks: what is this company worth? Technical analysis asks: where is this stock\'s price headed? Technicians believe that all known information is already reflected in the price, and that studying price patterns and volume reveals future moves. Most professional investors use both: fundamentals tell you what to buy, technicals tell you when to buy and sell. Neither works perfectly alone.',
      },
      {
        id: 'T2L07S2',
        type: 'text',
        title: 'Trends: the most important concept',
        content: 'A stock is in an uptrend when it makes higher highs and higher lows over time. A downtrend makes lower highs and lower lows. "The trend is your friend" is the core principle — buying in an uptrend and avoiding (or shorting) downtrends. Moving averages smooth out price noise to reveal the trend. The 50-day and 200-day moving averages are widely watched. When a stock\'s price crosses above its 200-day average — called a "golden cross" — many traders see it as a buy signal.',
      },
      {
        id: 'T2L07S3',
        type: 'example',
        title: 'Support, resistance, and breakouts',
        content: 'Support is a price level where a stock has repeatedly bounced upward — buyers keep showing up there. Resistance is where the stock has repeatedly stalled — sellers dominate. When a stock breaks decisively through resistance on high volume, it often signals a continuation of the move. This is called a "breakout." For example, if a stock has hit $50 six times and bounced back, then finally pushes through $50 on strong volume, technical analysts view this as a bullish signal.',
      },
      {
        id: 'T2L07S4',
        type: 'text',
        title: 'Volume: confirming or warning',
        content: 'Volume is the number of shares traded in a period. It acts as a conviction signal: price moves on high volume are more meaningful than on low volume. A stock rallying on falling volume may be running out of momentum. A sell-off on enormous volume suggests serious distribution (institutional selling). Combining price and volume patterns gives a richer picture than either alone. The famous technician Jesse Livermore said "volume precedes price" — watch it closely.',
      },
    ],
    quiz: {
      id: 'T2L07Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What does technical analysis focus on?',
          options: [
            'Company financials and earnings',
            'Price patterns, volume, and chart trends to predict future price movements',
            'Economic indicators',
            'Management quality',
          ],
          correctIndex: 1,
          explanation: 'Technical analysts study price and volume history, believing it reflects all market knowledge and reveals patterns that recur.',
        },
        {
          id: 'q2',
          question: 'What is a stock in an "uptrend"?',
          options: [
            'A stock with a P/E above average',
            'A stock making higher highs and higher lows over time',
            'A stock paying increasing dividends',
            'A stock with rising revenue',
          ],
          correctIndex: 1,
          explanation: 'An uptrend is defined by higher highs and higher lows — each rally goes higher than the last, and each pullback stays above the previous low. This structure signals buying pressure.',
        },
        {
          id: 'q3',
          question: 'What is a "resistance level"?',
          options: [
            'A bond rating',
            'A price level where a stock repeatedly stalls because of heavy selling',
            'The minimum price a company will sell shares for',
            'The floor set by market makers',
          ],
          correctIndex: 1,
          explanation: 'Resistance is a price ceiling where sellers reliably show up. When a stock finally breaks through resistance on high volume, it often signals a significant move higher.',
        },
        {
          id: 'q4',
          question: 'A stock rallies strongly but on decreasing volume. What might this signal?',
          options: [
            'Strong confirmation of the rally',
            'The rally may lack conviction and could be losing momentum',
            'A guaranteed buy signal',
            'Volume doesn\'t matter to price',
          ],
          correctIndex: 1,
          explanation: 'Volume confirms conviction. A price rise on declining volume suggests fewer participants are driving the move — a warning sign that the rally could stall or reverse.',
        },
        {
          id: 'q5',
          question: 'The "golden cross" refers to what?',
          options: [
            'A type of bond',
            'When a short-term moving average crosses above a long-term moving average — often seen as bullish',
            'When a stock hits a new 52-week high',
            'A specific candlestick pattern',
          ],
          correctIndex: 1,
          explanation: 'The golden cross — often the 50-day MA crossing above the 200-day MA — is widely watched as a long-term bullish indicator. The opposite (death cross) is bearish.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L08 — Economic indicators
  // ============================================================================
  {
    id: 'T2L08',
    tier: 2,
    order: 8,
    title: 'Reading the economy like a pro',
    subtitle: 'GDP, CPI, unemployment, and the 8 signals that move markets',
    description: 'Savvy investors pay attention to the economy\'s vital signs. Eight key economic indicators give you advance warning of where markets are headed. Here\'s how to read them.',
    videoUrl: 'https://example.com/lessons/t2l08.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l08.jpg',
    estimatedMinutes: 12,
    difficulty: 3,
    topics: ['economics', 'macro', 'indicators'],
    triggersSignals: ['sector_momentum'],
    sections: [
      {
        id: 'T2L08S1',
        type: 'text',
        title: 'Why the economy matters to your portfolio',
        content: 'Profitable investing is about future growth. While most investors focus on the present, economically aware investors focus on what\'s coming. The economic cycle has four phases: expansion → peak → contraction → trough. Each phase favors different sectors and asset types. Understanding where we are in the cycle lets you position ahead of the crowd rather than react after the fact.',
      },
      {
        id: 'T2L08S2',
        type: 'text',
        title: 'The four most-watched indicators',
        content: 'GDP (Gross Domestic Product): the broadest measure of economic output. Growth above 2-3% is healthy; two consecutive quarters of decline is a recession. CPI (Consumer Price Index): tracks retail-level inflation. When CPI rises, the Fed often raises interest rates to cool things down. Employment report: second only to GDP in importance — job growth drives consumer spending. Housing starts: measures new construction, representing 5%+ of the economy and often leads changes in direction.',
      },
      {
        id: 'T2L08S3',
        type: 'example',
        title: 'Leading vs. lagging indicators',
        content: 'Leading indicators predict what\'s coming (housing starts, consumer confidence, stock prices themselves). Lagging indicators confirm what already happened (unemployment — the economy is already recovering by the time unemployment peaks). The LEI (Leading Economic Index) bundles 10 leading indicators. Three consecutive months in one direction signals a turning point. Smart investors watch leading indicators, not lagging ones — by the time a lagging indicator signals trouble, the market has often already moved.',
      },
      {
        id: 'T2L08S4',
        type: 'text',
        title: 'The Federal Reserve: the most powerful actor in markets',
        content: 'The Fed sets the federal funds rate — the interest rate banks charge each other. This rate ripples through every other rate in the economy. When the Fed raises rates, borrowing gets more expensive, consumer spending slows, and stock valuations compress (especially for growth stocks). When the Fed cuts rates, money becomes cheaper, spending increases, and stocks typically rise. No single event moves markets more reliably than an unexpected Fed rate announcement.',
      },
    ],
    quiz: {
      id: 'T2L08Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is a recession technically defined as?',
          options: [
            'Unemployment above 8%',
            'Two consecutive quarters of negative GDP growth',
            'Consumer confidence below 50',
            'The stock market falling more than 20%',
          ],
          correctIndex: 1,
          explanation: 'A recession is formally defined as two consecutive quarters of declining GDP. It means the economy is actually shrinking, not just slowing.',
        },
        {
          id: 'q2',
          question: 'Why does the Fed raise interest rates when inflation rises?',
          options: [
            'To make banks richer',
            'Higher rates make borrowing more expensive, slowing spending and cooling price increases',
            'To attract foreign investment',
            'To reduce the national debt',
          ],
          correctIndex: 1,
          explanation: 'Inflation = too much money chasing too few goods. Higher rates reduce borrowing and spending, reducing demand, which takes pressure off prices.',
        },
        {
          id: 'q3',
          question: 'What is a "leading indicator"?',
          options: [
            'An indicator that confirms past economic events',
            'A data point that tends to predict economic activity before it happens',
            'The largest sector in the economy',
            'Any indicator followed by major media',
          ],
          correctIndex: 1,
          explanation: 'Leading indicators change before the economy as a whole, giving advance warning. Examples: housing permits, stock prices, consumer confidence, and manufacturing orders.',
        },
        {
          id: 'q4',
          question: 'Rising interest rates generally do what to growth stocks?',
          options: [
            'Benefit them significantly',
            'Compress their valuations — future earnings are worth less when discounted at a higher rate',
            'Have no effect',
            'Make them pay higher dividends',
          ],
          correctIndex: 1,
          explanation: 'Growth stocks derive most of their value from distant future earnings. When interest rates rise, those future earnings get discounted more heavily, reducing present value. This is why growth stocks often fall hardest when the Fed hikes rates.',
        },
        {
          id: 'q5',
          question: 'Unemployment is classified as a what?',
          options: [
            'Leading indicator — it predicts the future',
            'Lagging indicator — it confirms what\'s already happened',
            'Coincident indicator — it moves exactly with the economy',
            'It\'s not an economic indicator',
          ],
          correctIndex: 1,
          explanation: 'Unemployment is a lagging indicator. By the time companies hire back workers, the recession is often already ending. The economy typically improves before employment does.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L09 — Sector rotation
  // ============================================================================
  {
    id: 'T2L09',
    tier: 2,
    order: 9,
    title: 'Sector rotation: following the economic cycle',
    subtitle: 'Why different sectors lead at different points in the cycle',
    description: 'Not all sectors perform well at the same time. Sector rotation is the movement of investor money through different industries as the economic cycle turns. Knowing this can sharpen your timing.',
    videoUrl: 'https://example.com/lessons/t2l09.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t2l09.jpg',
    estimatedMinutes: 10,
    difficulty: 3,
    topics: ['sector-rotation', 'cycles', 'macro'],
    triggersSignals: ['sector_momentum'],
    sections: [
      {
        id: 'T2L09S1',
        type: 'text',
        title: 'The basic premise',
        content: 'Different industries thrive at different phases of the economic cycle. The key insight: market-savvy investors rotate money between sectors ahead of the cycle — buying sectors expected to outperform before they do. This sounds simple but requires correctly anticipating economic transitions, which is genuinely hard. That said, understanding these patterns helps you avoid being in the wrong sectors at the wrong time.',
      },
      {
        id: 'T2L09S2',
        type: 'text',
        title: 'Which sectors lead each phase',
        content: 'Downturn/Recession entering: utilities and services outperform — people still need electricity and basic services. Deep recession: technology, industrials, and cyclicals start recovering before the economy does. Recovery: basic materials and energy surge as production ramps up. Full expansion/peak: consumer staples take off — people spending freely. Late cycle/topping: financials and real estate often peak last. Then utilities again as the cycle repeats.',
      },
      {
        id: 'T2L09S3',
        type: 'example',
        title: 'Defensive vs cyclical stocks',
        content: 'Defensive stocks resist economic downturns because they sell things people always need: food (General Mills), medicine (Johnson & Johnson), utilities. Even in a recession, people buy groceries and take medicine. Cyclical stocks move with the economy: airlines, cars, luxury goods, construction — all boom in good times and collapse in recessions. United Airlines is famously cyclical. When identifying sector rotation, defensive sectors hold up in downturns; cyclicals lead recoveries.',
      },
      {
        id: 'T2L09S4',
        type: 'text',
        title: 'How to use this without becoming a market timer',
        content: 'Attempting to perfectly time sector rotations leads to overtrading and losses. The smarter use: awareness. If the economy is clearly in full expansion (low unemployment, rising rates, strong GDP), start thinking about rotating some exposure from cyclicals to defensives as a hedge. Sector ETFs make this easy — XLU (utilities), XLV (healthcare), XLE (energy), XLK (tech) let you tilt your portfolio without picking individual stocks.',
      },
    ],
    quiz: {
      id: 'T2L09Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Which types of stocks are called "defensive" and why?',
          options: [
            'Military and defense contractors',
            'Companies that sell essential goods people buy regardless of economic conditions',
            'Stocks with the highest dividends',
            'Large-cap stocks only',
          ],
          correctIndex: 1,
          explanation: 'Defensive stocks (food, utilities, healthcare) sell necessities — demand stays relatively stable even in recessions. They decline less in downturns but also lag in full bull markets.',
        },
        {
          id: 'q2',
          question: 'When is the best time to buy cyclical stocks according to sector rotation theory?',
          options: [
            'During full economic expansion',
            'During or just after the bottom of a recession, before the recovery is confirmed',
            'When interest rates are highest',
            'Never — cyclicals are too risky',
          ],
          correctIndex: 1,
          explanation: 'Cyclicals lead recoveries. The smart move is buying them during deep recession while they\'re beaten down, before everyone can see the economy is improving.',
        },
        {
          id: 'q3',
          question: 'Which sector tends to outperform during the early stages of a recession?',
          options: [
            'Technology',
            'Airlines and luxury goods',
            'Utilities and consumer staples',
            'Energy and materials',
          ],
          correctIndex: 2,
          explanation: 'Utilities and consumer staples sell necessities. In a recession, people cut luxury spending but still pay electricity bills and buy groceries. These sectors hold value when cyclicals collapse.',
        },
        {
          id: 'q4',
          question: 'What is a sector ETF?',
          options: [
            'An ETF that invests in all sectors equally',
            'An ETF concentrated in one industry sector (e.g., XLK for technology)',
            'A bond ETF',
            'An international ETF',
          ],
          correctIndex: 1,
          explanation: 'Sector ETFs let you tilt toward specific industries without picking individual stocks. XLK = tech, XLV = healthcare, XLE = energy, XLU = utilities, XLF = financials.',
        },
        {
          id: 'q5',
          question: 'What\'s the main danger of trying to actively time sector rotations?',
          options: [
            'It\'s illegal',
            'Overtrading based on incorrect timing predictions leads to higher costs and worse returns',
            'Sectors don\'t actually rotate',
            'You\'ll miss dividend payments',
          ],
          correctIndex: 1,
          explanation: 'Perfect sector timing is almost impossible. Most investors who try it overtrade, incur transaction costs, miss the turns, and underperform simple buy-and-hold strategies.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L10 — Reading financial statements
  // ============================================================================
  {
    id: 'T2L10',
    tier: 2,
    order: 10,
    title: 'Reading financial statements',
    subtitle: 'The income statement, balance sheet, and cash flow — what actually matters',
    description: 'Behind every stock is a real business. Financial statements are the scorecards. Learn what each statement tells you, the numbers that matter most, and the red flags to avoid.',
    videoUrl: 'https://example.com/lessons/t2l10.mp4',
    videoDurationSeconds: 540,
    thumbnailUrl: 'https://example.com/thumbs/t2l10.jpg',
    estimatedMinutes: 13,
    difficulty: 3,
    topics: ['financial-statements', 'fundamentals', 'accounting'],
    triggersSignals: ['earnings_beat', 'blue_chip_quality'],
    sections: [
      {
        id: 'T2L10S1',
        type: 'text',
        title: 'The three financial statements',
        content: 'Every public company files three core statements quarterly and annually with the SEC. The income statement shows revenue, expenses, and profit over a period. The balance sheet shows assets, liabilities, and equity at a specific point in time. The cash flow statement shows actual cash coming in and going out. Each tells a different part of the story. A company can be profitable on paper (income statement) but actually be running out of cash (cash flow) — that\'s how Enron hid its problems.',
      },
      {
        id: 'T2L10S2',
        type: 'text',
        title: 'The income statement: is the business growing?',
        content: 'Revenue (top line): total sales. Growing revenue is essential. Gross profit: revenue minus direct costs. Gross margin (gross profit ÷ revenue) shows pricing power. Operating income: after subtracting overhead and employee costs. Net income (bottom line): after taxes and interest. EPS (earnings per share): net income ÷ shares outstanding — what you\'ll see on financial sites. Compare EPS year-over-year: is it growing consistently? Compare to analyst estimates: did the company beat or miss?',
      },
      {
        id: 'T2L10S3',
        type: 'example',
        title: 'The balance sheet: how healthy is the foundation?',
        content: 'Assets = Liabilities + Equity. Assets: what the company owns (cash, inventory, buildings, intellectual property). Liabilities: what it owes (loans, accounts payable). Equity (or "book value"): what shareholders would theoretically get if everything were liquidated. Key ratios: Debt/Equity — how leveraged is the company? Current ratio (current assets ÷ current liabilities) — can it pay near-term bills? A company with $2B in cash and $500M in debt is financially very different from one with $200M cash and $3B in debt.',
      },
      {
        id: 'T2L10S4',
        type: 'text',
        title: 'Free cash flow: the most honest number',
        content: 'Warren Buffett calls free cash flow the most important financial metric. It\'s simple: cash generated from operations minus capital expenditures. Unlike earnings (which can be manipulated through accounting choices), cash is cash. Companies can\'t fake it. A company with consistently growing free cash flow has real financial health. One trick: compare net income to free cash flow over time — if FCF consistently lags far behind reported earnings, ask why. It might be fine (growth investment) or it might be a warning.',
      },
    ],
    quiz: {
      id: 'T2L10Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Which financial statement shows a company\'s revenues and profits over a period of time?',
          options: [
            'Balance sheet',
            'Income statement',
            'Cash flow statement',
            'Shareholders\' equity report',
          ],
          correctIndex: 1,
          explanation: 'The income statement (also called P&L — profit and loss) covers a period (quarter or year) and shows revenue, costs, and the resulting profit or loss.',
        },
        {
          id: 'q2',
          question: 'What does EPS stand for and why does it matter?',
          options: [
            'Equity Per Share — total equity divided by shares',
            'Earnings Per Share — profit divided by shares outstanding, used to value and compare companies',
            'Expected Price Signal',
            'Earnings Paid in Shares',
          ],
          correctIndex: 1,
          explanation: 'EPS = net income ÷ shares outstanding. It\'s the per-share profit. P/E ratios are calculated using EPS. Consistently growing EPS is a core sign of a healthy business.',
        },
        {
          id: 'q3',
          question: 'A company reports record profits but its free cash flow is sharply negative. What should you do?',
          options: [
            'Buy immediately — profits are what matter',
            'Investigate why profits and cash flow diverge — it could signal accounting games or unsustainable operations',
            'Ignore it — free cash flow is irrelevant',
            'Sell everything',
          ],
          correctIndex: 1,
          explanation: 'Big divergence between earnings and free cash flow warrants investigation. Sometimes it\'s fine (heavy growth investment). Sometimes it reveals earnings manipulation — as with Enron.',
        },
        {
          id: 'q4',
          question: 'What does a high Debt/Equity ratio tell you?',
          options: [
            'The company is very profitable',
            'The company has taken on a lot of debt relative to shareholder equity — higher financial risk',
            'The company pays high dividends',
            'The stock is undervalued',
          ],
          correctIndex: 1,
          explanation: 'A high D/E ratio means the company is heavily leveraged — more of its capital structure is debt than equity. This amplifies both gains and losses, and in downturns, heavy debt can become fatal.',
        },
        {
          id: 'q5',
          question: 'Where do you find a public company\'s financial statements?',
          options: [
            'Only by calling the company',
            'SEC\'s EDGAR database at sec.gov — all public companies file here',
            'The stock exchange only',
            'You have to buy a research service',
          ],
          correctIndex: 1,
          explanation: 'All public companies must file annual (10-K) and quarterly (10-Q) reports with the SEC. EDGAR (Electronic Data Gathering, Analysis, and Retrieval) at sec.gov is free and comprehensive.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L11 — Retirement accounts: 401(k) and IRA
  // ============================================================================
  {
    id: 'T2L11',
    tier: 2,
    order: 11,
    title: 'Retirement accounts: 401(k) and IRA',
    subtitle: 'The most powerful tax advantages in investing',
    description: 'Before you invest a single dollar in a taxable account, understand tax-advantaged retirement accounts. The compound interest plus tax savings make them among the best investments available.',
    videoUrl: 'https://example.com/lessons/t2l11.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t2l11.jpg',
    estimatedMinutes: 10,
    difficulty: 2,
    topics: ['retirement', '401k', 'IRA', 'tax'],
    triggersSignals: ['dividend_consistency'],
    sections: [
      {
        id: 'T2L11S1',
        type: 'text',
        title: 'Why retirement accounts should come first',
        content: 'In a regular brokerage account, you pay taxes on dividends, interest, and capital gains every year. In a tax-advantaged retirement account, that money compounds untouched. The difference over 30 years is enormous. A $10,000 investment growing at 8% for 30 years: in a taxable account (assuming 25% tax on gains annually): ~$57,000. In a tax-deferred account: ~$100,000. Same investment, same return — $43,000 difference just from taxes. Always max out tax-advantaged accounts before taxable investing.',
      },
      {
        id: 'T2L11S2',
        type: 'text',
        title: '401(k): your employer\'s gift to your future',
        content: 'A 401(k) is an employer-sponsored retirement plan. Contributions come from your paycheck before taxes are taken — so you invest pre-tax dollars. Many employers match contributions (often 50% or 100% up to 3-6% of salary). That match is an immediate 50-100% return on your money before it\'s even invested. The 2024 contribution limit is $23,000 ($30,500 if over 50). You pay taxes when you withdraw in retirement. If your employer offers a match and you\'re not taking it, you\'re leaving free money on the table.',
      },
      {
        id: 'T2L11S3',
        type: 'example',
        title: 'Traditional IRA vs. Roth IRA',
        content: 'Traditional IRA: you contribute pre-tax, investments grow tax-deferred, pay taxes when you withdraw in retirement. Best if you\'re in a high tax bracket now and expect lower rates in retirement. Roth IRA: you contribute after-tax dollars, but all growth and withdrawals are completely tax-free. Best if you\'re young (more years of tax-free compounding) or expect to be in a higher tax bracket in retirement. 2024 limit: $7,000/year ($8,000 if 50+). For most young investors, the Roth IRA is the better choice.',
      },
      {
        id: 'T2L11S4',
        type: 'text',
        title: 'Asset allocation in retirement accounts',
        content: 'A common rule of thumb: your stock percentage should equal roughly 110 minus your age. At 25: 85% stocks, 15% bonds. At 45: 65% stocks, 35% bonds. At 65: 45% stocks, 55% bonds. The idea: stocks provide growth but volatility you can absorb when young; bonds provide stability as you get closer to needing the money. Target-date funds automate this — a "2050 Fund" automatically shifts from aggressive growth toward conservative preservation as 2050 approaches.',
      },
    ],
    quiz: {
      id: 'T2L11Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is the single most powerful advantage of a 401(k) with employer match?',
          options: [
            'You can invest in any stock',
            'The employer match is an immediate 50-100% return before any investment growth',
            'Withdrawals are always tax-free',
            'There are no investment limits',
          ],
          correctIndex: 1,
          explanation: 'A 50% employer match means every dollar you contribute is worth $1.50 immediately. That\'s an instant 50% return. No investment reliably beats that. Always take the full match.',
        },
        {
          id: 'q2',
          question: 'What is the key difference between a Traditional IRA and a Roth IRA?',
          options: [
            'Traditional IRA invests in stocks, Roth IRA only in bonds',
            'Traditional IRA uses pre-tax money (taxed at withdrawal); Roth IRA uses after-tax money (tax-free growth and withdrawal)',
            'They\'re the same with different names',
            'Roth IRA is only for high earners',
          ],
          correctIndex: 1,
          explanation: 'Traditional = tax break now, pay later. Roth = pay now, free forever. For young investors with decades of compounding ahead, the Roth\'s tax-free growth is usually more valuable.',
        },
        {
          id: 'q3',
          question: 'Using the "110 minus age" rule, how much of their retirement portfolio should a 30-year-old hold in stocks?',
          options: ['30%', '70%', '80%', '110%'],
          correctIndex: 2,
          explanation: '110 - 30 = 80% stocks, 20% bonds. At 30, you have 35+ years before retirement. That time horizon can absorb significant stock market volatility, making a heavier stock allocation appropriate.',
        },
        {
          id: 'q4',
          question: 'What is a target-date fund?',
          options: [
            'A fund that tries to time the market',
            'A fund that automatically shifts from aggressive to conservative allocation as a target retirement year approaches',
            'A bond fund with a maturity date',
            'A fund with a guaranteed return',
          ],
          correctIndex: 1,
          explanation: 'Target-date funds handle asset allocation automatically. A 2055 fund starts stock-heavy and gradually shifts to bonds as 2055 approaches — a simple all-in-one retirement solution.',
        },
        {
          id: 'q5',
          question: 'Why should you invest in tax-advantaged accounts before a regular brokerage account?',
          options: [
            'You have to — it\'s the law',
            'Taxes compound against you. Tax-free compounding produces dramatically more wealth over 30+ years',
            'Regular accounts have lower returns',
            'Brokerages don\'t allow you to invest without a retirement account first',
          ],
          correctIndex: 1,
          explanation: 'The $43,000 difference from the example shows: taxes are the single biggest drag on long-term compounding. Eliminating or deferring them in retirement accounts has an enormous effect.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L12 — Real estate investing fundamentals
  // ============================================================================
  {
    id: 'T2L12',
    tier: 2,
    order: 12,
    title: 'Real estate investing fundamentals',
    subtitle: 'REITs, rental properties, and what makes real estate different',
    description: 'Real estate is the second most common path to wealth after stock market investing. Learn the four main ways to invest in real estate, the concept of leverage, and how REITs let you invest without owning property.',
    videoUrl: 'https://example.com/lessons/t2l12.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l12.jpg',
    estimatedMinutes: 11,
    difficulty: 3,
    topics: ['real-estate', 'REITs', 'leverage'],
    triggersSignals: [],
    sections: [
      {
        id: 'T2L12S1',
        type: 'text',
        title: 'Why real estate builds wealth',
        content: 'Real estate benefits from leverage in a way most other investments don\'t. You can typically buy property with 20% down and borrow the rest. If you buy a $300,000 property with $60,000 down and it appreciates 5% to $315,000, you\'ve made $15,000 on a $60,000 investment — a 25% return on your capital, despite the property only increasing 5%. This leverage amplifies gains. The same leverage amplifies losses: if the property falls 5%, you\'ve lost 25% of your down payment.',
      },
      {
        id: 'T2L12S2',
        type: 'text',
        title: 'The four ways to invest in real estate',
        content: '(1) Your primary home: the most common first "investment," though it\'s also where you live. (2) Rental properties: buy a property, rent it out, collect monthly income minus expenses. (3) House flipping: buy undervalued properties, renovate, sell for profit. Requires capital, expertise, and tolerance for cost overruns. (4) REITs (Real Estate Investment Trusts): publicly traded companies that own real estate — lets you invest like a stock investor without being a landlord.',
      },
      {
        id: 'T2L12S3',
        type: 'example',
        title: 'REITs: real estate without the headaches',
        content: 'REITs own income-producing real estate — shopping centers, office buildings, apartments, hospitals, data centers. By law, they must distribute at least 90% of taxable income as dividends, making them among the highest-yielding stocks. You can buy REIT shares like any stock. Popular REITs: Prologis (industrial warehouses), American Tower (cell towers), Realty Income (retail). A REIT ETF like VNQ gives you instant diversification across hundreds of properties with one purchase.',
      },
      {
        id: 'T2L12S4',
        type: 'text',
        title: 'What makes real estate risky',
        content: 'Real estate is illiquid — you can\'t sell half a building at 2am like a stock. Leverage amplifies both gains and losses. Rental properties require time (dealing with tenants, maintenance) or paying a property manager to eat into returns. Location risk is extreme — a city\'s economy declining can destroy property values. The 2008 financial crisis showed what happens when real estate prices fall and overleveraged investors can\'t cover their mortgages. For most investors, REITs provide the asset class exposure without these complications.',
      },
    ],
    quiz: {
      id: 'T2L12Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'You buy a $200,000 property with $40,000 down (20%). It appreciates 10% to $220,000. What\'s your return on your $40,000 investment?',
          options: ['10%', '25%', '50%', '100%'],
          correctIndex: 2,
          explanation: '$220,000 - $200,000 = $20,000 gain on $40,000 invested = 50% return. That\'s leverage at work — a 10% property appreciation became a 50% return on invested capital.',
        },
        {
          id: 'q2',
          question: 'What is a REIT?',
          options: [
            'A type of mortgage',
            'A publicly traded company that owns real estate and must pay 90%+ of income as dividends',
            'A government housing program',
            'A real estate certificate that matures like a bond',
          ],
          correctIndex: 1,
          explanation: 'REITs own income-producing properties and are required to distribute most income to shareholders. This makes them high-yielding investments accessible to anyone with a brokerage account.',
        },
        {
          id: 'q3',
          question: 'What is the biggest disadvantage of direct real estate investing vs. REITs?',
          options: [
            'Lower returns',
            'Illiquidity, management burden, and concentration risk',
            'You can\'t get a mortgage',
            'No tax advantages',
          ],
          correctIndex: 1,
          explanation: 'Physical real estate is illiquid (can\'t sell quickly), often requires active management or PM fees, and is concentrated in specific locations. REITs solve all three: liquid, professionally managed, diversified.',
        },
        {
          id: 'q4',
          question: 'By law, REITs must distribute what percentage of taxable income as dividends?',
          options: ['50%', '75%', '90%', '100%'],
          correctIndex: 2,
          explanation: 'REITs must pay out at least 90% of taxable income to maintain their tax-advantaged status. This is why REIT dividends are typically high compared to most stocks.',
        },
        {
          id: 'q5',
          question: 'The 2008 housing crisis demonstrated what primary risk of leveraged real estate investment?',
          options: [
            'Rental income can decline',
            'Price declines amplified by leverage can create catastrophic losses and inability to service debt',
            'Interest rates never stay low',
            'REITs always outperform direct ownership',
          ],
          correctIndex: 1,
          explanation: 'Leverage amplifies losses just as it amplifies gains. In 2008, overleveraged real estate investors — from homeowners to banks — faced losses they couldn\'t absorb when prices fell 20-40%.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L13 — Fundamental analysis: reading a stock deeply
  // ============================================================================
  {
    id: 'T2L13',
    tier: 2,
    order: 13,
    title: 'Deep fundamental analysis',
    subtitle: 'How to research any company from scratch',
    description: 'Fundamental analysis goes beyond P/E ratios to understand the complete picture of a business. Learn the systematic process for researching any company before you buy.',
    videoUrl: 'https://example.com/lessons/t2l13.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l13.jpg',
    estimatedMinutes: 11,
    difficulty: 3,
    topics: ['fundamental-analysis', 'research', 'due-diligence'],
    triggersSignals: ['blue_chip_quality', 'earnings_beat'],
    sections: [
      {
        id: 'T2L13S1',
        type: 'text',
        title: 'Start with what you know',
        content: 'Peter Lynch, one of history\'s greatest fund managers, had a famous principle: invest in what you know. He found ten-baggers (stocks that went up 10x) by watching what his wife bought at the grocery store. The insight: as a consumer, you have real-world evidence about which companies make great products before Wall Street does. If you\'ve noticed a new restaurant chain packing every location, a new product that everyone uses, or a software tool that companies can\'t live without — that\'s a research starting point.',
      },
      {
        id: 'T2L13S2',
        type: 'text',
        title: 'The five characteristics of great companies',
        content: '(1) Sound business model: clear path to revenue, understandable mechanics, logical strategy. (2) Superior management: experienced, honest, proven track record. (3) Significant market share in a growing market — and a plan to grow it. (4) Competitive advantage: what prevents competitors from copying them? (5) Active innovation: R&D investment signals future products. A company checking all five boxes is worth researching deeply. One red flag in any of these should prompt more caution.',
      },
      {
        id: 'T2L13S3',
        type: 'example',
        title: 'How to read an annual report',
        content: 'Every public company files a 10-K (annual report) at SEC.gov. Where to focus: (1) The CPA opinion letter — any "going concern" language is a serious warning. (2) Management\'s Discussion section — how do they explain the year? Are they candid about problems? (3) Footnotes in financial statements — companies hide uncomfortable information in footnotes, not headlines. (4) Compare 5 years of revenue, net income, and free cash flow — the trend matters more than any single year.',
      },
      {
        id: 'T2L13S4',
        type: 'text',
        title: 'Avoid hot tips',
        content: 'Putting serious thought into your investments early on consistently outperforms acting on tips. The barber, the buddy, the TikTok stock "expert" — these sources occasionally get lucky, but the data is clear: most hot tips underperform the market. By the time information travels to you informally, it\'s usually already priced in. Worse: sometimes "hot tips" are pump-and-dump schemes where the person giving the tip already owns shares and benefits from your buying. Your own research, however imperfect, almost always beats acting on social media tips.',
      },
    ],
    quiz: {
      id: 'T2L13Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Peter Lynch\'s investing principle of "invest in what you know" means?',
          options: [
            'Only invest in your employer\'s stock',
            'Your consumer experience gives you early insight into companies before Wall Street catches on',
            'Avoid industries you\'re unfamiliar with entirely',
            'Only invest in companies in your city',
          ],
          correctIndex: 1,
          explanation: 'Lynch found that everyday observations — products becoming popular, stores always full — gave individual investors an edge over institutional analysts who just read reports.',
        },
        {
          id: 'q2',
          question: 'What is a 10-K filing?',
          options: [
            'A stock with a P/E of 10,000',
            'A company\'s annual report filed with the SEC, containing audited financials and management discussion',
            'A type of government bond',
            'A brokerage fee schedule',
          ],
          correctIndex: 1,
          explanation: '10-K is the annual comprehensive filing every public company must submit to the SEC. It contains everything: audited financials, risk factors, management analysis, legal proceedings.',
        },
        {
          id: 'q3',
          question: 'Where should you focus when reading a company\'s financial statement footnotes?',
          options: [
            'Nowhere — footnotes are unimportant',
            'Carefully — companies often disclose risks and accounting issues in footnotes that aren\'t in the headlines',
            'Only on footnotes about dividend policies',
            'Footnotes are only important for bonds',
          ],
          correctIndex: 1,
          explanation: 'Footnotes are where companies disclose uncomfortable truths they\'re legally required to reveal but prefer not to highlight. Analysts who read footnotes carefully often spot problems before they become public crises.',
        },
        {
          id: 'q4',
          question: 'Why are "hot tips" generally a poor basis for investment decisions?',
          options: [
            'Tips are always wrong',
            'By the time informal information reaches you, it\'s usually already priced in; worst case it\'s a manipulation scheme',
            'Tips are only reliable for large-cap stocks',
            'You can\'t verify tips',
          ],
          correctIndex: 1,
          explanation: 'Markets are competitive. Good information travels fast among professionals. The "hot tip" that reaches retail investors through informal channels is usually stale — or worse, designed to benefit the tipster.',
        },
        {
          id: 'q5',
          question: 'What does it mean if a CPA\'s opinion letter contains "going concern" language?',
          options: [
            'The company is very financially healthy',
            'The auditors are warning that the company may not survive as an ongoing business',
            'The company is about to be acquired',
            'It\'s standard boilerplate that means nothing',
          ],
          correctIndex: 1,
          explanation: '"Going concern" is auditor language for serious doubt about the company\'s ability to continue operating. It\'s a major red flag that should prompt immediate investigation before any investment.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L14 — Portfolio construction at scale
  // ============================================================================
  {
    id: 'T2L14',
    tier: 2,
    order: 14,
    title: 'Portfolio construction at scale',
    subtitle: 'Building a complete portfolio from scratch with a real plan',
    description: 'You\'ve learned the pieces. Now build the whole: a systematic approach to constructing a portfolio that matches your goals, timeline, and risk tolerance, and maintaining it over time.',
    videoUrl: 'https://example.com/lessons/t2l14.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l14.jpg',
    estimatedMinutes: 12,
    difficulty: 3,
    topics: ['portfolio', 'asset-allocation', 'planning'],
    triggersSignals: ['blue_chip_quality'],
    sections: [
      {
        id: 'T2L14S1',
        type: 'text',
        title: 'The investor profile: everything flows from this',
        content: 'Before picking a single stock or fund, define your investor profile: (1) Goals: retirement, house down payment, education, income? Each has a different time horizon. (2) Timeline: money needed in 3 years should be conservatively invested; money not needed for 20+ years can bear more volatility. (3) Risk tolerance: realistic, tested tolerance — not theoretical. Would a 30% portfolio drop change your life? Would it make you panic-sell? Honest answers here prevent costly emotional decisions later.',
      },
      {
        id: 'T2L14S2',
        type: 'text',
        title: 'Asset allocation: the most important decision',
        content: 'Research shows asset allocation (how you divide between stocks, bonds, real estate, and cash) determines 90%+ of portfolio performance variation over time. Stock/bond split examples: Aggressive (80/20): for 20-30 year horizons with high risk tolerance. Moderate (60/40): the classic balanced portfolio. Conservative (40/60): nearing retirement or low risk tolerance. Within stocks: domestic/international split, large/mid/small cap mix, growth/value balance. Within bonds: short/long duration, government/corporate mix.',
      },
      {
        id: 'T2L14S3',
        type: 'example',
        title: 'A sample complete portfolio',
        content: 'A 35-year-old moderate investor building for retirement at 65: 40% total U.S. stock market (VTI), 20% international stocks (VXUS), 30% bonds (BND), 5% real estate (VNQ), 5% cash/short-term bonds. Total: 5 positions covering the entire investable market. Annual rebalancing restores targets. Add $500/month via dollar-cost averaging. Simple, diversified, low-cost. Could outperform most active portfolios over 30 years.',
      },
      {
        id: 'T2L14S4',
        type: 'text',
        title: 'When and how to rebalance',
        content: 'Rebalancing means selling what has grown above its target weight and buying what has fallen below. If your stock position grows from 60% to 70% target, sell some stocks and buy bonds to restore 60/40. This forces systematic "sell high, buy low." Do it once or twice a year — more often creates unnecessary tax events. After major market moves (20%+ stock drop or rise). Use new contributions to buy underweighted assets first before selling anything. Never rebalance based on short-term market predictions.',
      },
    ],
    quiz: {
      id: 'T2L14Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Research shows that asset allocation accounts for what percentage of long-term portfolio performance variation?',
          options: ['20%', '50%', '75%', '90%+'],
          correctIndex: 3,
          explanation: 'The landmark Brinson, Hood & Beebower study found that asset allocation (not individual stock selection or timing) explains about 90% of portfolio performance variation over time. Your stock/bond split matters more than any individual security.',
        },
        {
          id: 'q2',
          question: 'For money you need in 3 years, how should it be invested?',
          options: [
            'All in growth stocks for maximum return',
            'Conservatively — bonds or short-term vehicles, because markets can drop 30%+ in any given year',
            'In index funds',
            'In commodities as an inflation hedge',
          ],
          correctIndex: 1,
          explanation: 'A 3-year timeline doesn\'t allow for market recovery from a potential 30-40% crash. Short-term money belongs in conservative vehicles. Time horizon is the primary driver of appropriate risk.',
        },
        {
          id: 'q3',
          question: 'What does rebalancing accomplish?',
          options: [
            'Picks the best-performing assets',
            'Systematically "sell high, buy low" by trimming overweighted assets and adding to underweighted ones',
            'Maximizes dividend income',
            'Reduces taxes through loss harvesting',
          ],
          correctIndex: 1,
          explanation: 'Rebalancing enforces discipline: when stocks rise far above target, you sell some. When they fall below target, you buy more. This removes emotion and systematizes the contrarian behavior that drives long-term returns.',
        },
        {
          id: 'q4',
          question: 'How often should most investors rebalance?',
          options: [
            'Daily',
            'Monthly',
            'Once or twice a year, or after major market moves',
            'Never — once set, always keep',
          ],
          correctIndex: 2,
          explanation: 'Annual or semi-annual rebalancing is optimal for most investors. More frequent rebalancing creates unnecessary transaction costs and tax events without improving returns.',
        },
        {
          id: 'q5',
          question: 'The "5-ETF complete portfolio" example covers which parts of the market?',
          options: [
            'Only U.S. large-cap stocks',
            'Total U.S. stocks, international stocks, bonds, real estate — essentially the entire investable world',
            'Only index funds from one company',
            'Only dividend-paying stocks',
          ],
          correctIndex: 1,
          explanation: 'VTI + VXUS + BND + VNQ covers US stocks (all sizes), international stocks, US bonds (all types), and real estate globally. Five positions, total market exposure, minimal cost.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L15 — Common investing mistakes and behavioral finance
  // ============================================================================
  {
    id: 'T2L15',
    tier: 2,
    order: 15,
    title: 'Why investors fail: behavioral finance',
    subtitle: 'The psychological biases that destroy otherwise sound strategies',
    description: 'Knowing what to do is easy. Doing it when markets are crashing and headlines are screaming is not. Behavioral finance reveals the psychological traps that cost investors billions.',
    videoUrl: 'https://example.com/lessons/t2l15.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t2l15.jpg',
    estimatedMinutes: 10,
    difficulty: 2,
    topics: ['behavioral-finance', 'psychology', 'mistakes'],
    triggersSignals: [],
    sections: [
      {
        id: 'T2L15S1',
        type: 'text',
        title: 'Loss aversion: your worst enemy',
        content: 'Psychologists Kahneman and Tversky discovered that the pain of losing $100 is approximately twice as powerful as the pleasure of gaining $100. This means investors feel compelled to sell during losses to "stop the pain" — exactly when they should hold or buy more. Loss aversion drives panic-selling at market bottoms, the single most value-destructive behavior in investing. The antidote: pre-commit to your strategy during calm markets, before the emotion arrives.',
      },
      {
        id: 'T2L15S2',
        type: 'text',
        title: 'Overconfidence and the illusion of control',
        content: 'Studies consistently show that most investors rate themselves "above average." This is mathematically impossible for a majority. Overconfidence leads to: trading too frequently (costs reduce returns), taking concentrated bets on individual stocks, underestimating tail risks, and ignoring evidence that contradicts your thesis. The antidote: track your decisions in writing (like your trade journal), review your thesis vs. outcomes honestly, and compare your performance against a simple index fund.',
      },
      {
        id: 'T2L15S3',
        type: 'example',
        title: 'Confirmation bias and the echo chamber',
        content: 'Confirmation bias: we naturally seek information that confirms what we already believe and dismiss contradictory evidence. An investor who bought Tesla at $400 will avidly read every bullish analyst note and dismiss every bear argument. The result: you can\'t see problems until they\'re unavoidable. Deliberate antidote: before any significant investment, actively research the strongest bear case. Force yourself to understand why someone smart would short the stock you\'re about to buy.',
      },
      {
        id: 'T2L15S4',
        type: 'text',
        title: 'The three rules that prevent most mistakes',
        content: 'Rule 1: Always have a written thesis before buying — it forces real thinking and creates accountability. Rule 2: Pre-define your exit conditions — when will you sell? Price target? Thesis broken? Time limit? Written in advance, not decided in the heat of market action. Rule 3: Never check your portfolio more than weekly — hourly or daily monitoring feeds anxiety and impulsive decisions based on noise. These three habits eliminate most of the behavioral damage that undermines good investment strategies.',
      },
    ],
    quiz: {
      id: 'T2L15Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is "loss aversion"?',
          options: [
            'Avoiding investments that could lose money',
            'The psychological finding that losing money hurts about twice as much as gaining the same amount feels good',
            'Selling before markets close',
            'A type of stop-loss order',
          ],
          correctIndex: 1,
          explanation: 'Loss aversion is one of the most robust findings in behavioral economics. It drives panic-selling at market bottoms because the emotional pain of watching losses grows becomes unbearable.',
        },
        {
          id: 'q2',
          question: 'Why does trading too frequently hurt returns?',
          options: [
            'Regulators limit trading frequency',
            'Each trade incurs transaction costs and potentially taxes; more trades mean more friction eroding returns',
            'Frequent trading confuses tax software',
            'Brokers deliberately slow down frequent traders',
          ],
          correctIndex: 1,
          explanation: 'Every unnecessary trade has costs: commissions, bid-ask spreads, and potential capital gains taxes. Studies show high-frequency retail traders consistently underperform buy-and-hold investors.',
        },
        {
          id: 'q3',
          question: 'What is confirmation bias in investing?',
          options: [
            'Confirming your broker\'s trades',
            'Seeking information that supports what you already believe and dismissing contradictory evidence',
            'Reviewing annual reports annually',
            'Confirming dividend payments',
          ],
          correctIndex: 1,
          explanation: 'Confirmation bias is universal and dangerous. You can\'t make good investment decisions if you only process information that agrees with your existing position.',
        },
        {
          id: 'q4',
          question: 'What is the purpose of writing your investment thesis before buying?',
          options: [
            'SEC requires it',
            'It forces real analysis, creates accountability, and gives you a framework for deciding when to sell',
            'It helps advisors understand your goals',
            'It reduces taxes',
          ],
          correctIndex: 1,
          explanation: 'The act of writing forces clarity. A written thesis also creates a decision record — you can compare your prediction to reality. This feedback loop is how analytical skills improve.',
        },
        {
          id: 'q5',
          question: 'How often should most long-term investors check their portfolio?',
          options: [
            'Multiple times per day',
            'Daily',
            'Weekly at most — hourly monitoring feeds anxiety and impulsive decisions',
            'Never after buying',
          ],
          correctIndex: 2,
          explanation: 'Daily market moves are noise for long-term investors. Research shows that the more frequently investors check their portfolios, the more anxious they become and the more likely they are to make impulsive, damaging decisions.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSONS T2L16-T2L20 — Advanced Tier 2 topics
  // ============================================================================
  {
    id: 'T2L16',
    tier: 2,
    order: 16,
    title: 'Understanding market indexes',
    subtitle: 'The Dow, S&P 500, NASDAQ, and Russell 2000 explained',
    description: 'You hear about "the market" going up or down every day. But which market? Learn the major indexes, what they measure, and why they matter as benchmarks for your portfolio.',
    videoUrl: 'https://example.com/lessons/t2l16.mp4',
    videoDurationSeconds: 360,
    thumbnailUrl: 'https://example.com/thumbs/t2l16.jpg',
    estimatedMinutes: 9,
    difficulty: 2,
    topics: ['indexes', 'benchmarks', 'market'],
    triggersSignals: ['sector_momentum'],
    sections: [
      {
        id: 'T2L16S1',
        type: 'text',
        title: 'What an index is',
        content: 'An index is a curated list of securities used as a benchmark to represent a slice of the market. The S&P 500 represents the 500 largest U.S. companies. The NASDAQ Composite represents all stocks on the NASDAQ exchange. The Dow tracks 30 large blue-chips. The Russell 2000 tracks 2,000 small-cap companies. When your portfolio "beats the S&P 500," it means you outperformed those 500 companies as a group — which most professionals fail to do.',
      },
      {
        id: 'T2L16S2',
        type: 'text',
        title: 'How the major indexes differ',
        content: 'Dow Jones: 30 stocks, price-weighted (higher-priced stocks influence it more). Created in 1896 — the oldest index but arguably least representative. S&P 500: 500 stocks, market-cap weighted (bigger companies have more influence). Best overall U.S. large-cap benchmark. NASDAQ Composite: ~3,000 stocks, heavily weighted toward tech. Russell 2000: 2,000 small-cap stocks — the gold standard for small-cap performance. A company can be in multiple indexes simultaneously.',
      },
      {
        id: 'T2L16S3',
        type: 'example',
        title: 'Why your benchmark matters',
        content: 'Comparing a small-cap growth fund to the S&P 500 is unfair — they\'re different markets. Comparing it to the Russell 2000 is appropriate. If you own a portfolio of mostly tech stocks, your benchmark is the NASDAQ, not the Dow. Using the right benchmark tells you whether your stock picking (or fund manager) actually added value. Many funds quietly choose easy benchmarks to make their performance look better.',
      },
      {
        id: 'T2L16S4',
        type: 'text',
        title: 'The S&P 500 as your default benchmark',
        content: 'For most individual investors with a general stock portfolio, the S&P 500 is the right benchmark. The uncomfortable truth: most years, you won\'t beat it. And that\'s fine — matching the S&P 500 beats the majority of professional active fund managers over long periods. One approach: use S&P 500 index funds as your core (50-70% of stocks), then add carefully selected individual positions around that core. This hybrid approach captures market returns while allowing some active bets.',
      },
    ],
    quiz: {
      id: 'T2L16Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What does the S&P 500 index represent?',
          options: [
            'The 500 oldest U.S. companies',
            'The 500 largest U.S. companies by market capitalization',
            '500 randomly selected stocks',
            'The 500 highest-priced stocks',
          ],
          correctIndex: 1,
          explanation: 'S&P 500 companies are selected by a committee at Standard & Poor\'s based primarily on market cap, liquidity, and other criteria. It represents about 80% of total U.S. market cap.',
        },
        {
          id: 'q2',
          question: 'The Dow Jones Industrial Average tracks how many stocks?',
          options: ['30', '100', '500', '2000'],
          correctIndex: 0,
          explanation: 'The Dow tracks just 30 large, established companies. Despite its fame as "the market," it\'s actually a narrow, price-weighted index — not the most representative measure of the broad market.',
        },
        {
          id: 'q3',
          question: 'Which index is the best benchmark for a small-cap fund\'s performance?',
          options: [
            'The Dow Jones',
            'The S&P 500',
            'The Russell 2000',
            'The NASDAQ Composite',
          ],
          correctIndex: 2,
          explanation: 'The Russell 2000 tracks small-cap stocks. Comparing a small-cap fund to the S&P 500 (large caps) would be an apples-to-oranges comparison.',
        },
        {
          id: 'q4',
          question: 'What does "market-cap weighted" mean?',
          options: [
            'Equal weighting for all companies',
            'Larger companies influence the index more than smaller ones',
            'Companies weighted by their P/E ratio',
            'Each company\'s stock price determines its weight',
          ],
          correctIndex: 1,
          explanation: 'In the S&P 500, Apple (with $3T+ market cap) has far more influence than a smaller S&P 500 company. When Apple moves, the index moves more than when a smaller member moves.',
        },
        {
          id: 'q5',
          question: 'If your aggressive tech stock portfolio is up 15% while the NASDAQ is up 22%, how did you actually perform?',
          options: [
            'Excellently — 15% is a great return',
            'Below your benchmark — you underperformed by 7 percentage points',
            'In line with the market',
            'Better than most investors',
          ],
          correctIndex: 1,
          explanation: 'Absolute returns mean little without context. Relative to your appropriate benchmark (NASDAQ for a tech portfolio), you underperformed by 7%. You would have done better owning a simple NASDAQ index fund.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L17 — Taxes and investing
  // ============================================================================
  {
    id: 'T2L17',
    tier: 2,
    order: 17,
    title: 'Taxes and investing: keep more of what you earn',
    subtitle: 'Capital gains, tax-loss harvesting, and how to minimize your tax bill',
    description: 'Every dollar you pay in unnecessary taxes is a dollar that can\'t compound. Learn the tax rules that apply to investors and the legal strategies to minimize your tax burden.',
    videoUrl: 'https://example.com/lessons/t2l17.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t2l17.jpg',
    estimatedMinutes: 10,
    difficulty: 3,
    topics: ['taxes', 'capital-gains', 'tax-loss-harvesting'],
    triggersSignals: [],
    sections: [
      {
        id: 'T2L17S1',
        type: 'text',
        title: 'Short-term vs. long-term capital gains',
        content: 'When you sell a stock for a profit, you owe capital gains tax. The rate depends on how long you held it. Short-term (held under 1 year): taxed as ordinary income — potentially up to 37%. Long-term (held over 1 year): taxed at preferential rates — 0%, 15%, or 20% depending on your income. This creates a powerful incentive: holding investments for over a year can cut your tax bill roughly in half. The 14-day minimum hold in Tier 1 starts training this habit.',
      },
      {
        id: 'T2L17S2',
        type: 'text',
        title: 'Tax-loss harvesting',
        content: 'Tax-loss harvesting means selling a losing position to realize a capital loss, which can offset gains (and up to $3,000/year of ordinary income). You then immediately reinvest in a similar but not identical security to maintain your exposure. Example: sell your losing position in Ford (loss realized) and buy GM (stays invested in auto sector). The IRS "wash-sale" rule prohibits buying back the same security within 30 days of the loss sale — you must buy something similar but different.',
      },
      {
        id: 'T2L17S3',
        type: 'example',
        title: 'Location matters: asset location strategy',
        content: 'Not all accounts are equal for tax purposes. Tax-efficient assets (broad index funds with low turnover and dividends) are fine in taxable accounts. Tax-inefficient assets (REITs with high dividends, bond funds with frequent interest, actively traded funds) should be in your IRA or 401(k) where growth is sheltered. This asset location strategy can meaningfully improve after-tax returns without changing what you own — just where you own it.',
      },
      {
        id: 'T2L17S4',
        type: 'text',
        title: 'The simplest rule: hold longer',
        content: 'The single most tax-efficient thing most investors can do is simply hold their investments longer. Unrealized gains owe no current tax. Every unnecessary sale triggers a taxable event. Buy-and-hold investors naturally minimize taxes by reducing the frequency of taxable events. Warren Buffett has famously held some positions (Coca-Cola, American Express) for decades, in part because selling would trigger massive capital gains taxes. "Our favorite holding period is forever."',
      },
    ],
    quiz: {
      id: 'T2L17Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'You sell a stock after holding it 8 months for a $5,000 profit. How is this taxed?',
          options: [
            'Long-term capital gains rate (0-20%)',
            'Short-term capital gains rate (ordinary income rate — could be 37%)',
            'Not taxed if under $10,000',
            'At a flat 15%',
          ],
          correctIndex: 1,
          explanation: 'Under 1 year = short-term gain = taxed as ordinary income. At the 32% bracket, you\'d owe $1,600. Held one more month and it becomes long-term, potentially saving hundreds.',
        },
        {
          id: 'q2',
          question: 'What is tax-loss harvesting?',
          options: [
            'Avoiding all taxes by using retirement accounts',
            'Selling losing positions to realize losses that offset gains, then reinvesting in similar assets',
            'Harvesting dividend income without paying taxes',
            'Donating stock to avoid capital gains',
          ],
          correctIndex: 1,
          explanation: 'Tax-loss harvesting turns paper losses into tax savings. The key is reinvesting immediately to maintain market exposure, while using the loss to offset other taxable gains.',
        },
        {
          id: 'q3',
          question: 'What is the wash-sale rule?',
          options: [
            'You must wash your investments monthly',
            'You can\'t buy back the same security within 30 days of selling it for a loss (the loss is disallowed)',
            'Losses can only be used to offset short-term gains',
            'A rule requiring disclosure of large trades',
          ],
          correctIndex: 1,
          explanation: 'The IRS prevents "harvesting" a loss while maintaining the exact same position. If you sell and immediately buy the identical security, the loss is disallowed. Buy something similar but different.',
        },
        {
          id: 'q4',
          question: 'Which type of asset should you prefer in a taxable brokerage account (vs. IRA)?',
          options: [
            'REITs with high dividend yields',
            'Actively traded funds with high turnover',
            'Low-cost, low-turnover broad index funds that rarely trigger taxable events',
            'High-yield bond funds',
          ],
          correctIndex: 2,
          explanation: 'Low-turnover index funds are tax-efficient — they rarely sell holdings, so they rarely distribute capital gains. Keep tax-inefficient assets (REITs, bond funds, active strategies) inside tax-sheltered accounts.',
        },
        {
          id: 'q5',
          question: 'Warren Buffett\'s comment "our favorite holding period is forever" reflects which tax advantage?',
          options: [
            'Unrealized gains are never taxed at all',
            'Long-term capital gains rates are lower than short-term rates',
            'Holding forever defers taxable events indefinitely — compounding grows untaxed until sale',
            'Buffett has special tax exemptions',
          ],
          correctIndex: 2,
          explanation: 'Every year you don\'t sell, those gains continue compounding tax-free. The deferral of taxes is itself a powerful wealth-building tool — effectively an interest-free loan from the government.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L18 — Stockbrokers and brokerage accounts
  // ============================================================================
  {
    id: 'T2L18',
    tier: 2,
    order: 18,
    title: 'Choosing a broker and order types',
    subtitle: 'How to execute trades professionally and avoid costly mistakes',
    description: 'Your broker is your gateway to the market. Learn the difference between brokers, how to evaluate them, the types of orders at your disposal, and the mistakes that cost beginners money.',
    videoUrl: 'https://example.com/lessons/t2l18.mp4',
    videoDurationSeconds: 360,
    thumbnailUrl: 'https://example.com/thumbs/t2l18.jpg',
    estimatedMinutes: 9,
    difficulty: 2,
    topics: ['brokers', 'order-types', 'execution'],
    triggersSignals: [],
    sections: [
      {
        id: 'T2L18S1',
        type: 'text',
        title: 'Types of brokers',
        content: 'Full-service brokers (like Merrill Lynch) provide advice, research, and hand-holding — at high fees. Discount brokers (like Fidelity, Schwab, Vanguard) execute trades at low or no commission but with less guidance. Robo-advisors (like Betterment) automatically invest based on your risk profile for a small annual fee. For most self-directed investors, a discount broker is the right choice. Commission-free trading is now standard. Evaluate based on research tools, investment options, account minimums, and interface quality.',
      },
      {
        id: 'T2L18S2',
        type: 'text',
        title: 'Market orders vs. limit orders',
        content: 'Market order: buy or sell immediately at whatever the current market price is. Fast, simple, but in fast-moving or illiquid stocks, you might pay significantly more than expected (called "slippage"). Limit order: buy or sell only at a specific price or better. You set the ceiling for buys or floor for sells. The order may not fill if price doesn\'t reach your limit. For large, liquid blue-chip stocks, market orders are fine. For smaller, less-traded stocks, always use limit orders to protect yourself.',
      },
      {
        id: 'T2L18S3',
        type: 'example',
        title: 'Stop-loss orders: disciplined risk management',
        content: 'A stop-loss is a standing order to sell if a stock drops to a specific price. Example: you buy a stock at $50 and set a stop-loss at $42 (16% below). If the stock drops to $42, it automatically sells. This prevents a bad situation from becoming catastrophic. The downside: stocks sometimes "trigger" your stop-loss in a brief dip and then recover — you\'ve sold low and locked in a loss. Use stop-losses on concentrated positions but be careful not to set them too close to the current price.',
      },
      {
        id: 'T2L18S4',
        type: 'text',
        title: 'What the SEC actually protects you from',
        content: 'The SEC (Securities and Exchange Commission) was created after the 1929 crash to restore confidence in markets. Its job: ensure publicly traded companies disclose accurate information, prevent insider trading, regulate brokers and investment advisors, and pursue fraud. EDGAR (sec.gov/edgar) contains every 10-K, 10-Q, and material filing from every public company since 1994 — entirely free. Before investing in any company, check EDGAR for the most recent filings. It\'s the most reliable source of primary financial information available.',
      },
    ],
    quiz: {
      id: 'T2L18Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is a limit order?',
          options: [
            'An order to buy or sell immediately at market price',
            'An order to buy or sell only at a specified price or better',
            'An order that limits the number of shares you can own',
            'A government-regulated order type',
          ],
          correctIndex: 1,
          explanation: 'A limit order sets a price boundary. A buy limit of $50 means you\'ll only pay $50 or less. A sell limit of $50 means you\'ll only sell at $50 or more. Protects you from unfavorable fills.',
        },
        {
          id: 'q2',
          question: 'For which situation should you use a limit order instead of a market order?',
          options: [
            'Large, highly liquid stocks like Apple or Microsoft',
            'Smaller, less-traded stocks where market orders could result in significant slippage',
            'When you want to execute immediately at any price',
            'For bonds only',
          ],
          correctIndex: 1,
          explanation: 'In illiquid stocks, a market order can execute at a dramatically different price than expected. A limit order ensures you never pay more than your specified price.',
        },
        {
          id: 'q3',
          question: 'What does a stop-loss order do?',
          options: [
            'Prevents you from losing money',
            'Automatically sells a position if the price drops to a specified level',
            'Locks in a profit at a price target',
            'Stops all trading in your account',
          ],
          correctIndex: 1,
          explanation: 'A stop-loss protects against catastrophic loss by triggering an automatic sell at your pre-determined exit price. It removes emotion from the exit decision — but can also trigger on temporary dips.',
        },
        {
          id: 'q4',
          question: 'What is insider trading?',
          options: [
            'Trading done by professional investors',
            'Buying or selling securities based on material, non-public information — illegal and prosecuted by the SEC',
            'Trading done within a company\'s own 401(k)',
            'Day trading on news events',
          ],
          correctIndex: 1,
          explanation: 'Insider trading means acting on material, non-public information — like a merger announcement before it\'s public. Martha Stewart, Raj Rajaratnam, and many others have been criminally convicted for it.',
        },
        {
          id: 'q5',
          question: 'What is EDGAR and what can you find there?',
          options: [
            'A broker that executes trades automatically',
            'The SEC\'s free database of every financial filing from all public companies since 1994',
            'An index of the largest 500 U.S. companies',
            'A mutual fund rating service',
          ],
          correctIndex: 1,
          explanation: 'EDGAR (sec.gov) is the authoritative, free source for 10-Ks, 10-Qs, proxy statements, and all other required filings. Every serious investor should know how to use it.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L19 — Socially responsible investing
  // ============================================================================
  {
    id: 'T2L19',
    tier: 2,
    order: 19,
    title: 'Socially responsible investing (ESG)',
    subtitle: 'Aligning your investments with your values without sacrificing returns',
    description: 'ESG (Environmental, Social, Governance) investing has grown to trillions in assets. Learn what it is, how it works, the evidence on performance, and how to implement it.',
    videoUrl: 'https://example.com/lessons/t2l19.mp4',
    videoDurationSeconds: 360,
    thumbnailUrl: 'https://example.com/thumbs/t2l19.jpg',
    estimatedMinutes: 9,
    difficulty: 2,
    topics: ['ESG', 'socially-responsible-investing', 'values'],
    triggersSignals: [],
    sections: [
      {
        id: 'T2L19S1',
        type: 'text',
        title: 'What ESG investing is',
        content: 'ESG investing screens companies based on Environmental factors (carbon footprint, pollution), Social factors (labor practices, community impact, diversity), and Governance factors (board independence, executive pay, transparency). Socially responsible investors choose investments that align with their personal values — avoiding tobacco, weapons, fossil fuels, gambling, or alcohol. Others use ESG to assess risk: poor governance often precedes financial scandal; poor environmental practices create regulatory and liability risk.',
      },
      {
        id: 'T2L19S2',
        type: 'text',
        title: 'The performance debate',
        content: 'Does ESG investing sacrifice returns? The evidence: mixed but increasingly favorable. Some studies show ESG portfolios perform comparably to or better than conventional portfolios over long periods, particularly because strong governance correlates with business quality. The logic: companies with good ESG practices often have better management, fewer legal/regulatory problems, and more sustainable business models. The counterargument: excluding profitable sectors (fossil fuels, weapons) might reduce returns in some periods. The honest answer: returns are comparable on long-term data.',
      },
      {
        id: 'T2L19S3',
        type: 'example',
        title: 'How to implement ESG',
        content: 'ESG ETFs (like ESGV from Vanguard or ESGU from BlackRock) screen out companies failing ESG criteria while tracking a broad market index. Sustainable bond funds finance green infrastructure and social programs. Thematic ETFs concentrate in specific solutions: clean energy (ICLN), water infrastructure, electric vehicles. You can also combine: hold a regular index as your core and add ESG-specific ETFs for the values-aligned portion.',
      },
      {
        id: 'T2L19S4',
        type: 'text',
        title: 'Greenwashing: caveat emptor',
        content: '"Greenwashing" is when companies or funds exaggerate their ESG credentials for marketing benefit. A fund labeled "sustainable" might still hold oil majors or defense contractors that pass minimal screens. Before investing in any ESG fund, look at the actual top holdings. Does the portfolio reflect your values? Read the methodology: what does the fund actually exclude? What criteria does it use for inclusion? Don\'t assume the label matches the content.',
      },
    ],
    quiz: {
      id: 'T2L19Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What does ESG stand for?',
          options: [
            'Earnings, Sales, Growth',
            'Environmental, Social, Governance',
            'Equity, Securities, Gains',
            'Estimated Stock Growth',
          ],
          correctIndex: 1,
          explanation: 'ESG = Environmental (climate, pollution), Social (labor, community), Governance (management quality, transparency). These three dimensions assess non-financial aspects of company behavior.',
        },
        {
          id: 'q2',
          question: 'Why might poor governance be a financial risk indicator, not just an ethical concern?',
          options: [
            'It isn\'t — governance doesn\'t affect financial performance',
            'Poor governance often precedes financial scandals, fraud, or management failures that destroy shareholder value',
            'SEC requires good governance to be listed',
            'Governance affects dividend payments directly',
          ],
          correctIndex: 1,
          explanation: 'Enron, WorldCom, and many other corporate disasters had poor governance warning signs before collapse. Companies with opaque reporting, board conflicts of interest, or unchecked executive power carry hidden financial risk.',
        },
        {
          id: 'q3',
          question: 'What is "greenwashing"?',
          options: [
            'Investing in renewable energy',
            'When companies or funds exaggerate or fabricate their ESG credentials for marketing benefit',
            'Washing your portfolio of poorly performing stocks',
            'A SEC enforcement action',
          ],
          correctIndex: 1,
          explanation: 'Greenwashing is pervasive. Many "ESG" funds hold the same companies as conventional funds with minimal real screening. Always look at actual holdings, not just the label.',
        },
        {
          id: 'q4',
          question: 'What does the evidence generally show about ESG fund performance vs. conventional funds?',
          options: [
            'ESG funds always outperform significantly',
            'ESG funds always significantly underperform',
            'Long-term performance is broadly comparable, with some ESG advantages in quality/governance',
            'ESG funds never pay dividends',
          ],
          correctIndex: 2,
          explanation: 'The research is nuanced: ESG funds tend to perform comparably over long periods. Strong governance screening can provide a quality edge, though excluding some profitable sectors creates tracking differences.',
        },
        {
          id: 'q5',
          question: 'You want to align investments with environmental values. What\'s a practical starting point?',
          options: [
            'Only individual company research',
            'A broad ESG ETF (like ESGV or ESGU) that screens for environmental criteria while maintaining diversification',
            'Investing in only startup companies',
            'Avoiding all equity investments',
          ],
          correctIndex: 1,
          explanation: 'Broad ESG index ETFs provide diversification while applying environmental screens. They\'re a practical entry point before building a more customized values-aligned portfolio.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L20 — Tier 2 graduation: building your complete investment framework
  // ============================================================================
  {
    id: 'T2L20',
    tier: 2,
    order: 20,
    title: 'Tier 2 graduation: your complete investment framework',
    subtitle: 'Putting everything together into a coherent investment philosophy',
    description: 'You\'ve completed the Active Investor tier. This lesson synthesizes all 19 prior lessons into a coherent framework and prepares you for Tier 3: advanced tactics.',
    videoUrl: 'https://example.com/lessons/t2l20.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l20.jpg',
    estimatedMinutes: 12,
    difficulty: 3,
    topics: ['synthesis', 'framework', 'graduation'],
    triggersSignals: ['blue_chip_quality', 'earnings_beat', 'dividend_consistency', 'sector_momentum'],
    sections: [
      {
        id: 'T2L20S1',
        type: 'text',
        title: 'The lessons from the masters',
        content: 'Four of history\'s greatest investors offer different but compatible frameworks: Benjamin Graham (Warren Buffett\'s mentor) taught margin of safety and intrinsic value. Warren Buffett refined this into seeking wide-moat businesses at fair prices held forever. Peter Lynch found 10-baggers by investing in everyday observations before Wall Street caught on. Jack Bogle (Vanguard\'s founder) concluded that most investors are best served by low-cost index funds — even he beat most managers over time by holding everything.',
      },
      {
        id: 'T2L20S2',
        type: 'text',
        title: 'Synthesizing your approach',
        content: 'Most serious investors combine elements of multiple philosophies. A proven hybrid: Core (60-70%) in low-cost index ETFs for broad market exposure. Satellite (20-30%) in individual stocks where you have genuine conviction and edge based on fundamental analysis. Opportunistic (0-10%) for special situations — value opportunities, sector plays, or carefully researched growth bets. This structure gives you market returns (from the core) plus the chance to add alpha (from the satellite), with discipline limiting concentration risk.',
      },
      {
        id: 'T2L20S3',
        type: 'example',
        title: 'Your investment checklist',
        content: 'Before every investment: (1) Do I understand the business well enough to explain it simply? (2) Does the company have a durable competitive advantage? (3) Is management capable and honest? (4) Is the price reasonable relative to intrinsic value? (5) What\'s my thesis — and what would prove it wrong? (6) What\'s my position size (never more than 10% of portfolio)? (7) What are my exit conditions? If you can\'t answer all seven clearly and concisely, you\'re not ready to buy.',
      },
      {
        id: 'T2L20S4',
        type: 'text',
        title: 'What comes next in Tier 3',
        content: 'Tier 3 opens up the advanced toolkit: options (how to use them for income and hedging, not speculation), short selling (how to profit when stocks fall), foreign exchange basics, commodities, macro investing, and advanced portfolio theory. These instruments add tremendous capability but also risk. The foundation you\'ve built in Tiers 1 and 2 — understanding businesses, valuing assets, managing behavior and risk — is what makes the advanced tools productive rather than destructive.',
      },
    ],
    quiz: {
      id: 'T2L20Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What was Benjamin Graham\'s core contribution to investing theory?',
          options: [
            'Index funds and passive investing',
            'Margin of safety and intrinsic value — buy securities at a significant discount to true worth',
            'Technical analysis and chart patterns',
            'International diversification',
          ],
          correctIndex: 1,
          explanation: 'Graham, the "father of value investing," taught that intelligent investors should only buy when there\'s a substantial margin of safety — price well below calculated intrinsic value.',
        },
        {
          id: 'q2',
          question: 'What is the "core/satellite" portfolio approach?',
          options: [
            'Using satellite images to track companies',
            'A core of index ETFs for market returns plus a satellite of individual stocks for potential outperformance',
            'A core of bonds plus satellite stocks',
            'Using one core stock and many satellites',
          ],
          correctIndex: 1,
          explanation: 'Core/satellite captures market returns through cheap index funds while allowing active management in a controlled satellite portion. It\'s one of the most practiced professional portfolio structures.',
        },
        {
          id: 'q3',
          question: 'Peter Lynch\'s investing edge came from?',
          options: [
            'Using complex financial models',
            'Everyday consumer observations identifying growing companies before institutional analysts did',
            'Strictly following macroeconomic indicators',
            'Never investing in consumer products',
          ],
          correctIndex: 1,
          explanation: 'Lynch managed the legendary Magellan Fund at Fidelity, generating ~29% annual returns. He found opportunities in malls, restaurants, and everyday products — before Wall Street caught on.',
        },
        {
          id: 'q4',
          question: 'Jack Bogle\'s conclusion after decades of investing research was?',
          options: [
            'Active management always beats the index over time',
            'Most investors are best served by low-cost index funds that match the market rather than trying to beat it',
            'Bonds are always safer than stocks',
            'Technology stocks will always outperform',
          ],
          correctIndex: 1,
          explanation: 'Bogle founded Vanguard and created the first retail index fund. After decades of data, he concluded that the costs of active management make it a losing game for most investors over time.',
        },
        {
          id: 'q5',
          question: 'Why is it important to know your exit conditions BEFORE buying?',
          options: [
            'SEC requires it for all retail investors',
            'Pre-committing to conditions ensures you sell rationally on data, not emotionally on price movements',
            'It\'s only important for short-term traders',
            'It reduces your tax bill',
          ],
          correctIndex: 1,
          explanation: 'Decisions made in advance (when calm) are better than decisions made under market pressure. Knowing exactly when you\'ll sell — thesis broken, time limit, price target — removes emotional interference from the exit.',
        },
      ],
    },
  },

  // ============================================================================
  // LESSON T2L21 — Small, mid, and large cap: size matters
  // ============================================================================
  {
    id: 'T2L21',
    tier: 2,
    order: 21,
    title: 'Small, mid, and large cap: why size matters',
    subtitle: 'The four market cap tiers — and which belongs in your portfolio',
    description: 'Not all stocks are the same size, and size has a huge effect on risk, return potential, and how you should think about a position. From mega-caps to micro-caps, this lesson covers the full spectrum.',
    videoUrl: 'https://example.com/lessons/t2l21.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t2l21.jpg',
    estimatedMinutes: 12,
    difficulty: 2,
    topics: ['market-cap', 'small-cap', 'mid-cap', 'large-cap'],
    triggersSignals: ['blue_chip_quality', 'sector_momentum'],
    sections: [
      {
        id: 'T2L21S1',
        type: 'text',
        title: 'The four cap tiers explained',
        content: 'Market capitalization (market cap) = share price × total shares outstanding. It\'s the market\'s total valuation of a company. The four tiers:\n\nMega-cap: over $200B. Apple, Microsoft, Nvidia, Alphabet. The most stable, most researched, most liquid stocks in the world.\n\nLarge-cap: $10B–$200B. Established industry leaders like Starbucks, Nike, or Target. The S&P 500 is almost entirely large-cap.\n\nMid-cap: $2B–$10B. Growing companies that have proven themselves but still have room to expand. Often under-followed by analysts — a potential edge for careful investors.\n\nSmall-cap: $300M–$2B. Younger, faster-growing companies with higher upside and higher risk.\n\nMicro-cap: under $300M. Very small, often early-stage companies. High speculation, limited information, low liquidity.',
      },
      {
        id: 'T2L21S2',
        type: 'text',
        title: 'The risk-return tradeoff across cap sizes',
        content: 'Historically, smaller companies have outperformed larger ones over very long periods — but with dramatically more volatility. A small-cap stock can double in a year or drop 60%. A mega-cap rarely does either. Why the small-cap premium? Smaller companies are less researched, so mispricings are more common. They also have more room to grow — it\'s easier to double from $500M to $1B than from $500B to $1T.\n\nThe tradeoff: large-caps are more predictable and liquid. You can buy and sell $1M of Apple without moving the price. A micro-cap stock might have $50,000 in daily volume — even a modest position is hard to exit cleanly.\n\nMost serious portfolios hold a blend: large-cap for stability, small/mid-cap for growth potential.',
      },
      {
        id: 'T2L21S3',
        type: 'example',
        title: 'Small-cap funds: more volatility, potential for bigger rewards',
        content: 'The Russell 2000 Index tracks 2,000 small-cap U.S. companies. Historically it has outperformed the S&P 500 over 20+ year periods — but it has also had years of severe underperformance. A small-cap fund like iShares Russell 2000 ETF (IWM) gives you instant diversification across 2,000 small companies, dramatically reducing the single-stock bankruptcy risk that kills individual small-cap bets.\n\nA caution unique to small-caps: today\'s hot small-cap often stays in the fund even as it grows into a mid-cap or large-cap. E*TRADE was a small-cap company that eventually grew into a large institution — funds held it the whole way and benefited from the entire run. This "growing out of the box" dynamic can work powerfully in your favor.',
      },
      {
        id: 'T2L21S4',
        type: 'text',
        title: 'Mid-cap: the overlooked sweet spot',
        content: 'Mid-cap stocks are often called the "sweet spot" of investing. They\'ve survived the early dangerous growth phase (unlike small-caps) but haven\'t yet attracted the intense analyst coverage and institutional ownership of large-caps. This creates a more level playing field for individual investors.\n\nMid-caps often provide a balance: more growth potential than large-caps, more stability than small-caps. The S&P MidCap 400 Index tracks this tier. ETFs like IJH (iShares Mid-Cap 400) provide broad exposure.\n\nIn practical portfolio construction: a blend of large/mid/small roughly mirrors the total U.S. market. Vanguard\'s VTI (Total Stock Market ETF) already does this automatically — it holds all three tiers weighted by market cap, making it one of the best single-fund solutions for U.S. equity exposure.',
      },
      {
        id: 'T2L21S5',
        type: 'text',
        title: 'Bonds also come in different "sizes" — corporate bond tiers',
        content: 'Just as stocks have cap tiers, corporate bonds vary by the size and quality of the issuing company — and this directly affects the bond\'s yield and risk.\n\nInvestment-grade large-cap bonds (AAA to BBB): Issued by major corporations like Apple, Microsoft, or Johnson & Johnson. These are the safest corporate bonds — low yield (typically 1–3% above Treasury rates) but very low default risk. Apple can issue bonds at near-Treasury rates because investors trust it completely.\n\nInvestment-grade mid-cap bonds (BBB range): Issued by established but smaller companies. Slightly higher yield to compensate for modestly more risk. These form the core of most corporate bond funds.\n\nHigh-yield / small-cap company bonds (BB and below): Issued by smaller, faster-growing, or financially stressed companies. Much higher yields (often 5–8%+ above Treasuries) — but real default risk. These are the "junk bonds" discussed in the bonds lesson. A high-yield bond fund diversifies across hundreds of these issuers, making the blended risk much more manageable than owning individual junk bonds.',
      },
    ],
    quiz: {
      id: 'T2L21Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'How is market capitalization calculated?',
          options: [
            'Annual revenue divided by shares outstanding',
            'Share price multiplied by total shares outstanding',
            'Total assets minus total liabilities',
            'Book value per share times annual earnings',
          ],
          correctIndex: 1,
          explanation: 'Market cap = share price × shares outstanding. It represents what the entire stock market collectively values the company at right now. A $100 stock with 1 billion shares = $100B market cap.',
        },
        {
          id: 'q2',
          question: 'Which market cap tier has historically offered the highest long-term returns — but with the most volatility?',
          options: [
            'Mega-cap',
            'Large-cap',
            'Small-cap',
            'All cap tiers return exactly the same over time',
          ],
          correctIndex: 2,
          explanation: 'Historical data shows small-caps have outperformed large-caps over very long periods (20+ years) but with much greater year-to-year volatility. The extra risk is the price of admission for the higher expected return.',
        },
        {
          id: 'q3',
          question: 'Why might a mid-cap stock offer an advantage over large-cap stocks for individual investors?',
          options: [
            'Mid-caps are always cheaper',
            'Less analyst coverage means more potential for mispricings and a more level playing field',
            'Mid-caps pay higher dividends',
            'Mid-caps are guaranteed to grow into large-caps',
          ],
          correctIndex: 1,
          explanation: 'Large-caps are covered by dozens of analysts and owned by major institutions — making it hard to find an edge. Mid-caps get less scrutiny, so careful individual research can genuinely uncover overlooked value.',
        },
        {
          id: 'q4',
          question: 'A small-cap company you invested in has grown into a large-cap. What typically happens in a small-cap index fund?',
          options: [
            'The fund is forced to sell it immediately at a loss',
            'The fund often holds it through the transition, benefiting from the full growth run',
            'The stock is returned to investors as a dividend',
            'Nothing — index funds never sell anything',
          ],
          correctIndex: 1,
          explanation: 'Index funds rebalance periodically but often hold growing companies through transitions. E*TRADE and many other small-caps were held by small-cap funds through their entire growth into larger companies.',
        },
        {
          id: 'q5',
          question: 'A large corporation like Apple issues a bond at a much lower yield than a small startup\'s bond. Why?',
          options: [
            'Large companies are legally required to offer lower rates',
            'Apple\'s creditworthiness is much higher — investors trust it to repay, so they accept lower compensation for lending to it',
            'Small companies are not allowed to issue bonds',
            'Apple\'s bonds are backed by the government',
          ],
          correctIndex: 1,
          explanation: 'Just like a person with excellent credit gets a lower mortgage rate, a company with a strong track record and massive financial resources pays less to borrow. Risk and yield always move together in the bond market.',
        },
        {
          id: 'q6',
          question: 'What is the primary risk of investing in individual micro-cap stocks?',
          options: [
            'They\'re too expensive for most investors',
            'Very low liquidity — hard to sell without moving the price, plus limited public information and high bankruptcy risk',
            'They don\'t qualify for retirement accounts',
            'They can\'t be held in ETFs',
          ],
          correctIndex: 1,
          explanation: 'Micro-caps often have minimal daily trading volume, sparse analyst coverage, and limited SEC filings. This creates real risks: you may not be able to exit at a fair price, and problems are harder to detect.',
        },
        {
          id: 'q7',
          question: 'The Russell 2000 Index tracks what?',
          options: [
            'The 2,000 largest U.S. companies',
            '2,000 small-cap U.S. companies — the gold standard small-cap benchmark',
            'The top 2,000 global stocks',
            'Bond funds with over $2,000 in assets',
          ],
          correctIndex: 1,
          explanation: 'The Russell 2000 is a subset of the Russell 3000 (all public U.S. companies), tracking the 2,000 smallest. It\'s the most widely used benchmark for U.S. small-cap stock performance.',
        },
        {
          id: 'q8',
          question: 'In the bond market, what\'s the equivalent of a "small-cap" company bond?',
          options: [
            'A Treasury bill',
            'A high-yield (junk) bond issued by a smaller or financially weaker company',
            'A zero-coupon bond',
            'A municipal bond',
          ],
          correctIndex: 1,
          explanation: 'Smaller or financially weaker companies issue high-yield bonds (rated BB and below) because investors demand higher compensation for the greater default risk — just as small-cap stocks require a risk premium.',
        },
        {
          id: 'q9',
          question: 'What single ETF already gives you exposure to large, mid, and small-cap U.S. stocks simultaneously?',
          options: [
            'SPY (S&P 500)',
            'QQQ (NASDAQ-100)',
            'VTI (Vanguard Total Stock Market)',
            'IWM (Russell 2000)',
          ],
          correctIndex: 2,
          explanation: 'VTI holds virtually every publicly traded U.S. company — large, mid, and small-cap — weighted by market cap. It\'s one of the most complete single-fund U.S. equity solutions available.',
        },
        {
          id: 'q10',
          question: 'You have a 25-year time horizon and want to maximize growth potential while accepting more volatility. Which allocation makes the most sense?',
          options: [
            '100% mega-cap stocks for maximum stability',
            'A blend of large, mid, and small-cap stocks — capturing the small-cap premium over a long enough time to ride out volatility',
            '100% bonds for safety',
            'Only micro-cap stocks for maximum upside',
          ],
          correctIndex: 1,
          explanation: 'A 25-year horizon is long enough to capture the historical small-cap premium while absorbing the volatility. A diversified blend across cap sizes is how most evidence-based long-term portfolios are constructed.',
        },
      ],
    },
  },
];
