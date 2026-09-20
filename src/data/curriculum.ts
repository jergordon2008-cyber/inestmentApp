/**
 * Tier 1 Curriculum: Foundational Investor
 * 
 * 12 lessons designed for absolute beginners.
 * Each lesson:
 * - Has approachable language, no jargon without explanation
 * - Includes a quick quiz (5 questions, must score 75%+ to pass)
 * - Triggers specific algorithm signals after completion
 * - Builds on previous lessons
 * 
 * Total estimated time: ~2 hours of video + ~1 hour reading/quizzes
 */

import { Lesson } from '../types';

export const tier1Lessons: Lesson[] = [
  {
    id: 'T1L01',
    tier: 1,
    order: 1,
    title: 'What is the stock market?',
    subtitle: 'Where pieces of companies are bought and sold',
    description: 'Before you invest a single dollar, understand what you\'re buying and where it comes from. By the end, you\'ll know exactly what a "stock" is and why prices move.',
    videoUrl: 'https://example.com/lessons/t1l01.mp4',
    videoDurationSeconds: 360,
    thumbnailUrl: 'https://example.com/thumbs/t1l01.jpg',
    estimatedMinutes: 8,
    difficulty: 1,
    topics: ['markets', 'stocks', 'fundamentals'],
    triggersSignals: ['blue_chip_quality'],
    sections: [
      {
        id: 'T1L01S1',
        type: 'text',
        title: 'You already own pieces of companies (probably)',
        content: 'When you have a 401(k) at work, money in an IRA, or even some mutual funds, you already own tiny pieces of real companies — companies like Apple, Coca-Cola, and Microsoft. A "stock" is literally a slice of ownership in a company. Buy 1 share of Apple, and you own a microscopic fraction of Apple — entitled to your share of its profits.',
      },
      {
        id: 'T1L01S2',
        type: 'text',
        title: 'How prices actually move',
        content: 'Stock prices move because of one simple thing: how many people want to buy versus sell at this moment. When more people want to buy (demand) than sell (supply), the price goes up. When more want to sell than buy, the price goes down. Everything else — earnings reports, news, the economy — affects the stock only through how it changes people\'s desire to buy or sell.',
      },
      {
        id: 'T1L01S3',
        type: 'example',
        title: 'Real example: Apple stock',
        content: 'On a typical day, about 50 million shares of Apple change hands. That\'s 50 million tiny ownership transactions happening every single trading day. The price you see (say, $180) is just whatever the most recent buyer agreed to pay the most recent seller. It updates every fraction of a second.',
      },
      {
        id: 'T1L01S4',
        type: 'text',
        title: 'The two main markets',
        content: 'In the US, stocks trade on two main exchanges: the NYSE (New York Stock Exchange) and NASDAQ. Apple, Microsoft, Google, Amazon — all trade on NASDAQ. Coca-Cola, IBM, Walmart — these are on NYSE. The exchange you trade on doesn\'t really matter for you as an investor; both are regulated, both are safe, and most apps trade on both seamlessly.',
      },
      {
        id: 'T1L01S5',
        type: 'text',
        title: 'Market hours and why they matter',
        content: 'The US stock market is open Monday through Friday, 9:30 AM to 4:00 PM Eastern Time. Outside those hours, some brokers offer "pre-market" (4–9:30 AM) and "after-hours" (4–8 PM) trading — but volumes are thin, spreads are wide, and prices can be erratic. For a beginner, stick to regular hours. Big price moves often happen right at the open (9:30–10:00 AM) and into the close (3:30–4:00 PM), when institutional volume peaks.',
      },
      {
        id: 'T1L01S6',
        type: 'example',
        title: 'What actually happens when you hit "Buy"',
        content: 'You open Robinhood, type "Buy 1 share of AAPL at market price." In milliseconds: your order routes to an electronic exchange, matches with someone selling 1 share, and you now legally own 0.000000006% of Apple Inc. You\'ll receive any dividends Apple pays. You can vote on shareholder resolutions (though 1 share = 1 nearly meaningless vote). And you can sell at any time for the current market price. The whole transaction takes about 50 milliseconds.',
      },
      {
        id: 'T1L01S7',
        type: 'text',
        title: 'Stocks vs. bonds vs. cash — the big three',
        content: 'Most investment portfolios combine three asset classes. Stocks: ownership slices of companies, highest long-term return potential (~10% per year historically for the S&P 500), but highest volatility. Bonds: loans you make to governments or companies, lower returns (~3–5%), lower risk. Cash: safe but loses purchasing power to inflation (~3% per year). Over 30 years, $10,000 in stocks historically becomes ~$175,000. In bonds: ~$43,000. In cash under the mattress: worth about $4,000 in today\'s dollars.',
      },
      {
        id: 'T1L01S8',
        type: 'text',
        title: 'The number that matters most: S&P 500',
        content: 'When news says "the market is up today," they mean the S&P 500 — a basket of the 500 largest US companies by market cap. It includes Apple, Microsoft, Amazon, Google, and 496 others. It\'s rebalanced quarterly. If you invested $1 in the S&P 500 in 1957 when it launched and never touched it, you\'d have over $2,000 today including dividends. This is why Warren Buffett\'s advice for most people is simply: "Buy a low-cost S&P 500 index fund and hold it forever."',
      },
      {
        id: 'T1L01S9',
        type: 'example',
        title: '"Mr. Market" — Benjamin Graham\'s most useful concept',
        content: 'Imagine the stock market as a business partner named "Mr. Market." Every day, he knocks on your door and offers to either buy your shares or sell you his — at a different price each time. Sometimes he\'s euphoric and offers you crazy-high prices. Sometimes he\'s depressed and practically gives them away. You\'re never obligated to trade with him.\n\nGraham\'s point: Mr. Market\'s daily moods are irrelevant. What matters is the actual value of the business you own. When Mr. Market panics and slashes prices, that\'s an opportunity — not a crisis. When he\'s giddy and offers you inflated prices, that\'s a good time to sell, not to buy more.\n\nThe investors who get hurt are those who let Mr. Market\'s emotions become their own.',
      },
    ],
    quiz: {
      id: 'T1L01Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What does owning a stock mean?',
          options: [
            'You loaned money to the company',
            'You own a small piece of the company',
            'You\'re the company\'s customer',
            'You work for the company',
          ],
          correctIndex: 1,
          explanation: 'A stock is literally a slice of ownership. Buy 1 share of Apple, you own a tiny piece of Apple itself.',
        },
        {
          id: 'q2',
          question: 'Why do stock prices change?',
          options: [
            'The government sets them daily',
            'The company decides what to charge',
            'Buyers and sellers agree on different prices throughout the day',
            'They\'re random',
          ],
          correctIndex: 2,
          explanation: 'Prices are just whatever the latest buyer and seller agreed on. More buyers than sellers = price up. More sellers than buyers = price down.',
        },
        {
          id: 'q3',
          question: 'Which is the larger stock exchange by trading volume?',
          options: [
            'NYSE',
            'NASDAQ',
            'They\'re roughly equal in importance',
            'The S&P 500',
          ],
          correctIndex: 2,
          explanation: 'Both NYSE and NASDAQ are huge and important. As an investor, the exchange doesn\'t really matter for your decisions.',
        },
        {
          id: 'q4',
          question: 'What does it mean when a stock "moves up 2%"?',
          options: [
            'It went up 2 cents',
            'The price increased by 2% of its previous value',
            'The company made 2% more money',
            'The market opened 2 hours early',
          ],
          correctIndex: 1,
          explanation: 'Stock movement is always shown as a percentage of the previous price. If a $100 stock moves up 2%, the new price is $102.',
        },
        {
          id: 'q5',
          question: 'About how often do stock prices change during market hours?',
          options: [
            'Once per day at market close',
            'Once per hour',
            'Every minute',
            'Every fraction of a second',
          ],
          correctIndex: 3,
          explanation: 'Stock prices update almost continuously when the market is open — every fraction of a second as new trades happen.',
        },
      ],
    },
  },
  
  {
    id: 'T1L02',
    tier: 1,
    order: 2,
    title: 'Stocks vs bonds vs ETFs',
    subtitle: 'The three main building blocks of any portfolio',
    description: 'Learn the differences between the three most important investment types — what they are, how risky they are, and which ones are right for which goals.',
    videoUrl: 'https://example.com/lessons/t1l02.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t1l02.jpg',
    estimatedMinutes: 10,
    difficulty: 1,
    topics: ['stocks', 'bonds', 'etfs', 'asset_classes'],
    triggersSignals: ['blue_chip_quality', 'dividend_consistency'],
    sections: [
      {
        id: 'T1L02S1',
        type: 'text',
        title: 'Stocks: ownership in companies',
        content: 'You already know this one. A stock is partial ownership in a company. Your return comes from two sources: the stock price going up over time (capital appreciation) and dividends the company pays to shareholders. Stocks are the highest-risk, highest-potential-return investment of the three.',
      },
      {
        id: 'T1L02S2',
        type: 'text',
        title: 'Bonds: loans to companies and governments',
        content: 'A bond is when you loan money to a company or government, and they promise to pay you back with interest. If you buy a 10-year US Treasury bond for $1,000, the government pays you a fixed interest rate (say, 4% per year) and gives you the $1,000 back after 10 years. Bonds are much safer than stocks but earn lower returns.',
      },
      {
        id: 'T1L02S3',
        type: 'text',
        title: 'ETFs: a basket of many investments',
        content: 'An ETF (Exchange-Traded Fund) is a single investment that holds many stocks or bonds inside it. Buy 1 share of an S&P 500 ETF like SPY, and you instantly own a tiny piece of all 500 of America\'s biggest companies. ETFs let you diversify instantly without picking individual stocks.',
      },
      {
        id: 'T1L02S4',
        type: 'example',
        title: 'Real risk comparison (last 30 years)',
        content: 'Average annual return:\n• Stocks (S&P 500): ~10%\n• Bonds (10-year Treasury): ~4%\n• ETFs: depends on what\'s inside (usually between stocks and bonds)\n\nWorst single-year loss:\n• Stocks: -37% (2008)\n• Bonds: -13% (2022)\n• ETFs: depends on holdings\n\nHigher potential return = higher risk. There\'s no free lunch.',
      },
      {
        id: 'T1L02S5',
        type: 'text',
        title: 'The Rule of 72 — the fastest mental math in investing',
        content: 'Divide 72 by your expected annual return rate to estimate how many years it takes to double your money. At 8% annual return: 72 ÷ 8 = 9 years to double. At 12%: 6 years. At 4%: 18 years. This simple rule has profound implications. A 25-year-old who earns 8% annually will double their money at 34, again at 43, again at 52, and again at 61 — four doublings in a career. Start at 35? Only three doublings. Every decade of delay costs you an entire doubling of wealth.',
      },
      {
        id: 'T1L02S6',
        type: 'text',
        title: 'Dollar-cost averaging: the only timing strategy that works',
        content: 'Nobody knows when the market will be highest or lowest. Dollar-cost averaging (DCA) sidesteps this problem entirely: invest a fixed dollar amount on a fixed schedule, regardless of price. Example: $500 every month into VOO, an S&P 500 ETF. When prices are high, you buy fewer shares. When prices crash (which WILL happen), you automatically buy more shares at the discount. You never have to guess whether now is the right time to buy — the schedule decides for you — and it requires no skill, no analysis, and about 10 minutes per year.',
      },
      {
        id: 'T1L02S7b',
        type: 'example',
        title: 'Jack Bogle\'s radical idea — and why it works',
        content: 'In 1975, Jack Bogle launched the first index fund. Wall Street laughed. Why would anyone settle for "just average" returns? His argument: most actively managed funds underperform the market after fees. And those fees — even 1% per year — compound into enormous losses over decades.\n\nBogle\'s math: on a $100K investment over 30 years at 7% growth, a 1% annual fee costs you $176,277 in total wealth compared to a 0.05% index fund fee. You don\'t lose 1%. You lose $176K.\n\nToday Vanguard manages over $8 trillion using Bogle\'s philosophy. His core rule: "Don\'t do something, just stand there." The enemy of long-term returns is not the market — it\'s fees and unnecessary trading.',
      },
      {
        id: 'T1L02S7',
        type: 'example',
        title: 'The $100/month thought experiment',
        content: 'If you invested $100/month starting at age 22 into an S&P 500 index fund earning 10%/year:\n\n• At 30: ~$11,000 invested, $14,000 value\n• At 40: ~$22,000 invested, $38,000 value\n• At 50: ~$34,000 invested, $97,000 value\n• At 65: ~$52,000 invested, $380,000 value\n\nYou contributed $52,000 of your own money. The market generated $328,000 on top of that — completely passively. Einstein (allegedly) called compound interest "the most powerful force in the universe." He may have been right.',
      },
    ],
    quiz: {
      id: 'T1L02Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'A bond is essentially:',
          options: [
            'A share of a company',
            'A loan you make to a company or government',
            'A type of cryptocurrency',
            'A guaranteed return on investment',
          ],
          correctIndex: 1,
          explanation: 'Bonds are loans. You give money to a borrower (company or government) and they pay you back with interest.',
        },
        {
          id: 'q2',
          question: 'What\'s an ETF?',
          options: [
            'A single stock',
            'A bond from the government',
            'A basket of many stocks or bonds in one investment',
            'A bank account',
          ],
          correctIndex: 2,
          explanation: 'ETFs hold many investments inside them. One share = exposure to dozens or hundreds of companies.',
        },
        {
          id: 'q3',
          question: 'Which has higher historical returns?',
          options: [
            'Stocks',
            'Bonds',
            'They\'re roughly the same',
            'Cash savings accounts',
          ],
          correctIndex: 0,
          explanation: 'Over decades, stocks have averaged ~10% annual returns vs bonds at ~4%. But stocks also have much bigger losses in bad years.',
        },
        {
          id: 'q4',
          question: 'Which is the safest in any single year?',
          options: [
            'Stocks',
            'Bonds',
            'Both equally',
            'It changes every year',
          ],
          correctIndex: 1,
          explanation: 'Bonds are generally safer year-to-year. Their worst recent year was -13% (2022) while stocks lost 37% in 2008.',
        },
        {
          id: 'q5',
          question: 'Why might someone buy an ETF instead of individual stocks?',
          options: [
            'ETFs guarantee profits',
            'ETFs provide instant diversification',
            'ETFs pay higher dividends',
            'ETFs have no fees',
          ],
          correctIndex: 1,
          explanation: 'The main benefit of ETFs is diversification — you spread risk across many companies in one purchase.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 3
  // ============================================================================
  {
    id: 'T1L03',
    tier: 1,
    order: 3,
    title: 'How to read a stock quote',
    subtitle: 'Price, P/E, market cap, volume — what each number means',
    description: 'Open any stock page and you\'ll see a wall of numbers. Learn what each one means, which ones matter, and which to ignore.',
    videoUrl: 'https://example.com/lessons/t1l03.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t1l03.jpg',
    estimatedMinutes: 12,
    difficulty: 2,
    topics: ['fundamentals', 'valuation'],
    triggersSignals: ['blue_chip_quality'],
    sections: [
      {
        id: 'T1L03S1',
        type: 'text',
        title: 'The four numbers that actually matter',
        content: 'Most stock pages drown you in data. For your first investments, only four numbers really matter: (1) Current price — what one share costs right now. (2) Market cap — total company value. (3) P/E ratio — how expensive the stock is relative to profits. (4) Dividend yield — what cash, if any, the company pays you each year. Master these four and you\'re ahead of 90% of casual investors.',
      },
      {
        id: 'T1L03S2',
        type: 'text',
        title: 'Market cap: company size',
        content: 'Market cap is share price × shares outstanding. If a company has 1 billion shares trading at $100, its market cap is $100 billion. Categories: mega-cap (>$200B, like Apple), large-cap ($10–$200B), mid-cap ($2–$10B), small-cap (<$2B). Larger usually = more stable. For Tier 1, we focus on large-cap and mega-cap companies because they\'re more predictable and less likely to disappear.',
      },
      {
        id: 'T1L03S3',
        type: 'example',
        title: 'P/E ratio: is it expensive?',
        content: 'P/E (price-to-earnings) tells you how many years of profits you\'re paying for. A P/E of 20 means you pay $20 for every $1 of yearly profit. Average S&P 500 P/E is around 22. P/E under 15 might be cheap (or troubled). P/E over 30 means high growth expectations baked in. Apple\'s P/E is typically 28–35. P/E only works for profitable companies — if a company loses money, P/E is meaningless.',
      },
      {
        id: 'T1L03S4',
        type: 'text',
        title: 'Volume and the 52-week range',
        content: 'Volume tells you how actively the stock trades. High volume = easy to buy and sell. The 52-week high and low show the trading range over the past year — useful context for whether today\'s price is at a high or low point. A stock at its 52-week low isn\'t automatically a bargain; sometimes it\'s falling for good reason. A stock at its 52-week high isn\'t automatically overvalued; momentum can continue. These numbers give context, not buy/sell signals.',
      },
    ],
    quiz: {
      id: 'T1L03Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What does P/E ratio tell you?',
          options: [
            'How fast a company is growing',
            'How many years of profit you\'re paying for at the current price',
            'How much dividend the company pays',
            'How risky the stock is',
          ],
          correctIndex: 1,
          explanation: 'P/E = price ÷ earnings per share. A P/E of 20 means you\'re paying $20 for every $1 of annual profit — roughly 20 years of profits at today\'s rate.',
        },
        {
          id: 'q2',
          question: 'A company has a market cap of $50 billion. What does that mean?',
          options: [
            'The company has $50 billion in the bank',
            'The total value of all shares is $50 billion',
            'The company makes $50 billion per year',
            'The stock costs $50 per share',
          ],
          correctIndex: 1,
          explanation: 'Market cap = share price × total shares. It represents what the market collectively thinks the entire company is worth.',
        },
        {
          id: 'q3',
          question: 'A stock\'s P/E ratio is 50, well above the market average of 22. What\'s the most likely interpretation?',
          options: [
            'It\'s overvalued and will definitely crash',
            'The market expects high future growth',
            'The company is losing money',
            'Market cap is too low',
          ],
          correctIndex: 1,
          explanation: 'High P/E usually reflects high growth expectations. The market is willing to pay more per dollar of current profit because it expects profits to grow rapidly. It can also mean overvaluation — that\'s why P/E alone isn\'t enough.',
        },
        {
          id: 'q4',
          question: 'Why does volume matter to an investor?',
          options: [
            'High volume guarantees the price will rise',
            'Higher volume means easier to buy and sell without affecting price',
            'Low volume stocks are always cheaper',
            'Volume tells you the company\'s revenue',
          ],
          correctIndex: 1,
          explanation: 'Volume = how many shares change hands. High volume = liquidity — you can buy or sell without much price impact. Low-volume stocks can be hard to exit.',
        },
        {
          id: 'q5',
          question: 'A stock is trading at its 52-week low. What should you do?',
          options: [
            'Buy immediately — it\'s a guaranteed bargain',
            'Sell — it\'s clearly failing',
            'Research why it\'s down, then decide',
            'Avoid — never buy at lows',
          ],
          correctIndex: 2,
          explanation: 'The 52-week low gives context but no answer. Sometimes prices drop for good reasons (declining business). Sometimes the market overreacts to temporary news. Research first.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 4
  // ============================================================================
  {
    id: 'T1L04',
    tier: 1,
    order: 4,
    title: 'Understanding risk',
    subtitle: 'Market risk, company risk, and why diversification matters',
    description: 'Risk isn\'t a bad word — it\'s the reason stocks return more than bonds. Learn the types of risk you face and how to manage them.',
    videoUrl: 'https://example.com/lessons/t1l04.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t1l04.jpg',
    estimatedMinutes: 10,
    difficulty: 2,
    topics: ['risk', 'diversification'],
    triggersSignals: ['blue_chip_quality'],
    sections: [
      {
        id: 'T1L04S1',
        type: 'text',
        title: 'Risk is not the enemy',
        content: 'Without risk, there\'s no return. Treasury bonds barely beat inflation precisely because they\'re nearly risk-free. Stocks return more — about 10% per year historically — because they\'re riskier. The goal isn\'t to eliminate risk. It\'s to take risks you\'re paid for, and avoid the ones you\'re not.',
      },
      {
        id: 'T1L04S1b',
        type: 'example',
        title: 'Graham\'s "Margin of Safety" — the most important three words in investing',
        content: 'Benjamin Graham, Warren Buffett\'s mentor, built his entire philosophy around a single idea: the margin of safety.\n\nIf you estimate a company is worth $100 per share, don\'t pay $100. Pay $60–$70. That gap — between what you pay and what it\'s worth — is your margin of safety. It protects you from three certainties: that your analysis might be wrong, that the company might face unexpected trouble, and that markets can be irrational longer than you expect.\n\nBuffett later refined this: he\'d rather pay a fair price for a wonderful company than a bargain price for a mediocre one. But both agree on the core: never overpay. The price you pay determines your return.',
      },
      {
        id: 'T1L04S2',
        type: 'text',
        title: 'The two kinds of risk',
        content: 'Company-specific risk: things that affect just one company (a CEO scandal, a product failure, a lawsuit). This is risk you can eliminate by diversifying — owning many companies. Market risk: things that affect everything (recessions, wars, pandemics, interest rate changes). You can\'t escape market risk by diversifying — only by holding less stock or hedging.',
      },
      {
        id: 'T1L04S3',
        type: 'example',
        title: 'Why one stock is dangerous',
        content: 'Imagine you put your entire $10,000 into one stock. That company has a fraud scandal. Stock drops 80%. You\'re left with $2,000. Now imagine you held 20 different stocks, $500 each. The same fraud happens to one of them. You lose $400 from that one stock. Your portfolio loses 4%, not 80%. Diversification is the only free lunch in investing.',
      },
      {
        id: 'T1L04S4',
        type: 'text',
        title: 'How much diversification is enough?',
        content: 'Academic research shows that owning 15-25 well-chosen stocks captures most of the diversification benefit. Beyond that, you get diminishing returns. Even simpler: own an S&P 500 ETF and you instantly own pieces of 500 companies. For your Tier 1 portfolio, aim for at least 5-10 different stocks across different sectors — and the 20% max position rule we built into your trades enforces this automatically.',
      },
    ],
    quiz: {
      id: 'T1L04Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Why do stocks return more than bonds over time?',
          options: [
            'Stocks are guaranteed by the government',
            'Stocks pay more dividends',
            'Stocks are riskier, so they must offer more reward',
            'Bonds are illegal in some countries',
          ],
          correctIndex: 2,
          explanation: 'Higher risk demands higher expected return. If stocks didn\'t pay more than bonds on average, nobody would take the extra risk.',
        },
        {
          id: 'q2',
          question: 'Which type of risk can be reduced through diversification?',
          options: [
            'Market risk (recessions, wars)',
            'Company-specific risk (scandals, product failures)',
            'Inflation risk',
            'Interest rate risk',
          ],
          correctIndex: 1,
          explanation: 'Company-specific risks affect just one company. Owning many companies spreads this risk away. Market risk affects everything and can\'t be diversified away.',
        },
        {
          id: 'q3',
          question: 'What\'s the danger of putting all your money in one stock?',
          options: [
            'You can\'t enjoy diversification benefits',
            'A single negative event can wipe out most of your money',
            'You miss out on dividends from other companies',
            'All of the above',
          ],
          correctIndex: 3,
          explanation: 'All three matter. A single bad outcome can devastate a one-stock portfolio. The 20% max position rule in Tier 1 protects you from this.',
        },
        {
          id: 'q4',
          question: 'Roughly how many stocks give most of the diversification benefit?',
          options: [
            '1-3',
            '15-25',
            '100+',
            '500+',
          ],
          correctIndex: 1,
          explanation: 'Owning 15-25 stocks captures most of the diversification benefit. Beyond that, you get diminishing returns. ETFs make this easy by owning hundreds of stocks in one share.',
        },
        {
          id: 'q5',
          question: 'Can diversification protect you from a market crash?',
          options: [
            'Yes, completely',
            'Yes, mostly',
            'No, market crashes affect everything',
            'Only if you own bonds too',
          ],
          correctIndex: 2,
          explanation: 'Diversification within stocks doesn\'t protect against market-wide events. To reduce market risk, you need to hold less stock or add uncorrelated assets like bonds.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 5
  // ============================================================================
  {
    id: 'T1L05',
    tier: 1,
    order: 5,
    title: 'Your first investment decision',
    subtitle: 'Risk tolerance, time horizon, and your goals',
    description: 'Before buying anything, answer three questions: How much risk can you handle? How long until you need the money? What are you trying to achieve?',
    videoUrl: 'https://example.com/lessons/t1l05.mp4',
    videoDurationSeconds: 360,
    thumbnailUrl: 'https://example.com/thumbs/t1l05.jpg',
    estimatedMinutes: 8,
    difficulty: 1,
    topics: ['planning', 'goals'],
    triggersSignals: [],
    sections: [
      {
        id: 'T1L05S1',
        type: 'text',
        title: 'Before any trade, three questions',
        content: 'Every smart investment starts with three questions you ask yourself, not the market: (1) When do I need this money? (2) How much loss can I stomach without panic-selling? (3) What am I actually trying to achieve? Skipping these questions is how people end up with high-risk stocks when they should have bonds, or boring savings accounts when they could be growing wealth.',
      },
      {
        id: 'T1L05S2',
        type: 'text',
        title: 'Time horizon changes everything',
        content: 'Money you need next year: don\'t put it in stocks. The market can drop 30% any given year. Money you need in 5+ years: stocks become reasonable. Money you need in 15+ years: stocks are almost always the right answer because time smooths out volatility. Historically, every 20-year period in US stocks has been positive — even ones that included the Great Depression.',
      },
      {
        id: 'T1L05S3',
        type: 'example',
        title: 'Risk tolerance: the honest test',
        content: 'Forget what you say. Look at what you\'d actually do. If your $10,000 portfolio dropped to $7,000 in 6 weeks, would you: (A) Sell everything immediately, (B) Worry but hold, (C) Buy more? If you\'d sell, you\'re less risk-tolerant than you think. The market drops 20-30% every few years. Pick a stock allocation you can stomach during those drops — not just during the good times.',
      },
      {
        id: 'T1L05S4',
        type: 'text',
        title: 'Goals dictate strategy',
        content: 'Saving for a house down payment in 3 years? Mostly cash and bonds, maybe a small stock allocation. Building retirement wealth over 30 years? Mostly stocks, especially when young. Generating income now? Dividend stocks or bonds. Your goal should shape your portfolio, not the other way around. Trying to "beat the market" without a clear goal is gambling, not investing.',
      },
    ],
    quiz: {
      id: 'T1L05Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'You\'re saving for a wedding next year. Where should the money go?',
          options: [
            'Aggressive tech stocks for maximum growth',
            'A mix of stocks and bonds',
            'Safe places like high-yield savings or short-term bonds',
            'Real estate',
          ],
          correctIndex: 2,
          explanation: 'Money needed within 1 year shouldn\'t be in stocks. A bear market could wipe out 30% of it right when you need it. Stick to cash or short-term bonds.',
        },
        {
          id: 'q2',
          question: 'You\'re 25 years old saving for retirement. What\'s the typical recommendation?',
          options: [
            'Mostly bonds for safety',
            'Mostly stocks for long-term growth',
            'All in cash to be safe',
            'Speculative options to grow fastest',
          ],
          correctIndex: 1,
          explanation: 'With 40+ years until you need the money, time smooths volatility. Stocks have historically outperformed bonds significantly over long periods.',
        },
        {
          id: 'q3',
          question: 'Your portfolio drops 30%. You panic-sell. What does that reveal?',
          options: [
            'You\'re a good market timer',
            'Your real risk tolerance is lower than you assumed',
            'Your goals are too aggressive',
            'B and C',
          ],
          correctIndex: 3,
          explanation: 'Panic-selling locks in losses and prevents you from participating in the recovery. It usually means you had too much in stocks for your true risk tolerance.',
        },
        {
          id: 'q4',
          question: 'Why does time horizon matter so much?',
          options: [
            'Older investors get tax breaks',
            'Time smooths out market volatility',
            'Younger people earn more interest',
            'Brokers charge less for long holds',
          ],
          correctIndex: 1,
          explanation: 'Stocks are volatile year-to-year but tend up over long periods. A long time horizon means you can ride out crashes and benefit from compounding.',
        },
        {
          id: 'q5',
          question: 'Your goal is monthly income from your investments. Which is most appropriate?',
          options: [
            'High-growth tech stocks',
            'Cryptocurrency',
            'Dividend-paying stocks or bonds',
            'Speculative biotech',
          ],
          correctIndex: 2,
          explanation: 'Income comes from dividends or bond coupons. Growth stocks reinvest profits instead of paying them out. Match the strategy to the goal.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 6
  // ============================================================================
  {
    id: 'T1L06',
    tier: 1,
    order: 6,
    title: 'Blue-chip stocks explained',
    subtitle: 'The proven companies that anchor most portfolios',
    description: 'Apple, Microsoft, Coca-Cola, Johnson & Johnson — these are blue-chip stocks. Learn why they\'re considered safer and how to spot a high-quality company.',
    videoUrl: 'https://example.com/lessons/t1l06.mp4',
    videoDurationSeconds: 540,
    thumbnailUrl: 'https://example.com/thumbs/t1l06.jpg',
    estimatedMinutes: 12,
    difficulty: 2,
    topics: ['stocks', 'quality', 'fundamentals'],
    triggersSignals: ['blue_chip_quality', 'dividend_consistency'],
    sections: [
      {
        id: 'T1L06S1',
        type: 'text',
        title: 'What makes a stock "blue-chip"?',
        content: 'The term comes from poker, where blue chips are the most valuable. In investing, blue-chip stocks share four traits: large market cap (usually $50B+), long operating history (decades), consistent profitability through multiple cycles, and a strong brand or market position that\'s hard to displace. Think Apple, Microsoft, J&J, Coca-Cola, Procter & Gamble. They\'re not glamorous, but they\'re built to last.',
      },
      {
        id: 'T1L06S2',
        type: 'text',
        title: 'Why blue-chips are Tier 1 territory',
        content: 'New investors should start with blue-chips because they\'re more predictable, more researched, and less likely to disappear. A penny stock can go to zero overnight. Apple, even in a bad year, doesn\'t go to zero — it survives, adapts, and usually recovers. That predictability lets you focus on learning rather than on existential risk to your money.',
      },
      {
        id: 'T1L06S3',
        type: 'example',
        title: 'The moat test — and Buffett\'s Coca-Cola bet',
        content: 'A "moat" is what protects a company from competition. Buffett famously said of Coca-Cola: "If you gave me $100 billion and said take away the soft drink leadership of Coca-Cola in the world, I\'d give it back to you and say it can\'t be done."\n\nCoca-Cola\'s moat: 130+ years of brand trust, 200+ countries of distribution, and consumer habits baked in from childhood. Competitors can spend billions — and have — without denting it.\n\nApple\'s moat: the iOS ecosystem traps hundreds of millions of users through apps, data, and habit. Switching costs are enormous.\n\nVisa\'s moat: a global payment network built over 60 years, accepted by 80 million merchants. No startup can replicate that overnight.\n\nTest: when you can\'t clearly answer "what stops a well-funded competitor from destroying this company in 5 years?" — the moat is weak. Don\'t own stocks without one.',
      },
      {
        id: 'T1L06S4',
        type: 'text',
        title: 'Blue-chip doesn\'t mean risk-free',
        content: 'GE was a blue-chip for 100 years. Then it stumbled — its stock fell over 70% from peak. IBM was the original blue-chip. It\'s underperformed the market for two decades. Blue-chip means lower risk, not no risk. You still need to monitor your holdings, understand the business, and recognize when a once-great company has lost its edge. "Buy and hold" only works for companies that still deserve holding.',
      },
    ],
    quiz: {
      id: 'T1L06Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Which is NOT typically a trait of a blue-chip stock?',
          options: [
            'Large market cap',
            'Decades of operating history',
            'Rapid price changes day-to-day',
            'Strong brand or market position',
          ],
          correctIndex: 2,
          explanation: 'Blue-chips are known for stability, not dramatic daily swings. Wild volatility usually signals smaller or speculative stocks.',
        },
        {
          id: 'q2',
          question: 'What is a "moat" in investing terms?',
          options: [
            'A reserve of cash',
            'Something that protects a company from competition',
            'A type of dividend',
            'Insurance for shareholders',
          ],
          correctIndex: 1,
          explanation: 'A moat is a durable competitive advantage — brand, network effect, scale, switching costs — that makes it hard for competitors to take market share.',
        },
        {
          id: 'q3',
          question: 'Why should beginners start with blue-chip stocks?',
          options: [
            'They always go up',
            'They\'re more predictable and less likely to fail catastrophically',
            'They pay the highest dividends',
            'They have the lowest prices',
          ],
          correctIndex: 1,
          explanation: 'Blue-chips remove the worst-case risk of total wipe-out, so beginners can focus on learning rather than survival.',
        },
        {
          id: 'q4',
          question: 'Is "blue-chip" the same as "safe"?',
          options: [
            'Yes, blue-chips can\'t lose money',
            'No, blue-chips can still decline significantly',
            'Only blue-chips that pay dividends are safe',
            'Yes, the SEC guarantees them',
          ],
          correctIndex: 1,
          explanation: 'Blue-chips are lower-risk, not no-risk. Even great companies can decline for years if their business deteriorates or expectations were too high.',
        },
        {
          id: 'q5',
          question: 'Which of these is a classic example of a strong moat?',
          options: [
            'A fast-growing startup with no profits',
            'Coca-Cola\'s century-old global brand',
            'A small-cap biotech with one drug',
            'A penny stock with celebrity endorsement',
          ],
          correctIndex: 1,
          explanation: 'Coca-Cola\'s brand recognition and global distribution can\'t be easily replicated even by well-funded competitors. That\'s a textbook durable moat.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 7
  // ============================================================================
  {
    id: 'T1L07',
    tier: 1,
    order: 7,
    title: 'Dividends and passive income',
    subtitle: 'How companies pay you to hold their stock',
    description: 'Many companies pay quarterly dividends — cash payments to shareholders. Learn how dividends work, why they matter, and how reinvesting them creates massive long-term wealth.',
    videoUrl: 'https://example.com/lessons/t1l07.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t1l07.jpg',
    estimatedMinutes: 10,
    difficulty: 2,
    topics: ['dividends', 'income', 'compounding'],
    triggersSignals: ['dividend_consistency'],
    sections: [
      {
        id: 'T1L07S1',
        type: 'text',
        title: 'Companies share profits with you',
        content: 'Mature, profitable companies often return cash to shareholders directly. This is a dividend. If you own 100 shares of a company paying $1.00 per share annually, you get $100 every year, usually split into four quarterly payments of $25. The cash shows up in your brokerage account automatically. You can spend it or reinvest it.',
      },
      {
        id: 'T1L07S2',
        type: 'text',
        title: 'Dividend yield: the per-dollar return',
        content: 'Yield = annual dividend ÷ stock price. If a stock costs $100 and pays $3 a year, the yield is 3%. The current S&P 500 average yield is around 1.5%. Solid dividend stocks often yield 2-4%. Yields above 6-7% can signal danger — either the dividend is unsustainable or the stock has crashed because something\'s wrong. Higher yield isn\'t automatically better.',
      },
      {
        id: 'T1L07S3',
        type: 'example',
        title: 'The reinvestment magic',
        content: 'Reinvested dividends are responsible for nearly half of the S&P 500\'s total return historically. Imagine $10,000 invested in 1990 with dividends reinvested. By 2025, that grew to roughly $260,000 with reinvestment versus only $135,000 without. The dividend payments bought more shares, which paid more dividends, which bought more shares. Pure compounding.',
      },
      {
        id: 'T1L07S4',
        type: 'text',
        title: 'Dividend Aristocrats and Kings',
        content: 'Some companies are obsessive about dividends. "Dividend Aristocrats" have raised their dividend every year for 25+ consecutive years. "Dividend Kings" have done it for 50+. Names like Procter & Gamble, Coca-Cola, and Johnson & Johnson are on both lists. Past performance doesn\'t guarantee future results, but these companies have proven they\'ll prioritize returning cash to shareholders even in tough years.',
      },
    ],
    quiz: {
      id: 'T1L07Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What is a dividend?',
          options: [
            'A loan from the company',
            'A cash payment from the company to shareholders',
            'A discount on future share purchases',
            'A tax on stock ownership',
          ],
          correctIndex: 1,
          explanation: 'Dividends are direct cash payments to shareholders, typically quarterly. They\'re one of two ways stocks deliver returns (the other being price appreciation).',
        },
        {
          id: 'q2',
          question: 'A stock pays $4 per year in dividends and trades at $100. What\'s the yield?',
          options: [
            '1%',
            '4%',
            '25%',
            '40%',
          ],
          correctIndex: 1,
          explanation: 'Yield = annual dividend ÷ price. $4 ÷ $100 = 0.04 = 4%. That means you earn $4 in dividends each year for every $100 invested.',
        },
        {
          id: 'q3',
          question: 'A stock yields 12%. Is this a great opportunity?',
          options: [
            'Yes, double the average return',
            'Probably not — extremely high yields often signal trouble',
            'Yes, if the company is large',
            'Only if it\'s a tech stock',
          ],
          correctIndex: 1,
          explanation: 'Unusually high yields often mean the dividend is at risk or the stock has crashed because the business is in trouble. This is called a "yield trap" — chase the yield, get crushed.',
        },
        {
          id: 'q4',
          question: 'What\'s the power of reinvesting dividends?',
          options: [
            'It avoids taxes',
            'It buys more shares, which pay more dividends, compounding over time',
            'It guarantees the stock goes up',
            'It locks in the dividend rate',
          ],
          correctIndex: 1,
          explanation: 'Reinvested dividends purchase more shares, which generate more dividends, which buy more shares. Over decades this compounding produces a huge portion of total returns.',
        },
        {
          id: 'q5',
          question: 'What\'s a Dividend Aristocrat?',
          options: [
            'A stock with the highest yield in the S&P 500',
            'A company that has raised its dividend every year for 25+ years',
            'A royal family\'s investment portfolio',
            'A high-fee dividend mutual fund',
          ],
          correctIndex: 1,
          explanation: 'Dividend Aristocrats are S&P 500 companies with 25+ consecutive years of dividend increases. They\'ve proven they prioritize dividend stability through good times and bad.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 8
  // ============================================================================
  {
    id: 'T1L08',
    tier: 1,
    order: 8,
    title: 'Market cycles: Boom and bust',
    subtitle: 'Why markets crash and why long-term investors win',
    description: 'Markets don\'t just go up. They cycle through booms and busts. Learn the historical patterns, why crashes happen, and the most important lesson: never sell during a panic.',
    videoUrl: 'https://example.com/lessons/t1l08.mp4',
    videoDurationSeconds: 600,
    thumbnailUrl: 'https://example.com/thumbs/t1l08.jpg',
    estimatedMinutes: 14,
    difficulty: 2,
    topics: ['cycles', 'psychology', 'history'],
    triggersSignals: ['sector_momentum'],
    sections: [
      {
        id: 'T1L08S1',
        type: 'text',
        title: 'Markets are cyclical, not linear',
        content: 'The long-term chart of the stock market goes up and to the right. But zoom in, and you see relentless cycles — bull markets where everything rises, then bear markets where everything falls 20-40%. This isn\'t a flaw. It\'s the nature of markets driven by human emotion: greed pushes prices too high, fear pushes them too low. Understanding cycles is what separates investors from gamblers.',
      },
      {
        id: 'T1L08S2',
        type: 'text',
        title: 'The four phases',
        content: 'Markets cycle through: (1) Accumulation — smart money buying after a crash, while most are scared. (2) Markup — uptrend visible to everyone, optimism grows. (3) Distribution — smart money selling to enthusiastic newcomers. (4) Markdown — the bear market everyone denies is happening. Recognizing which phase you\'re in helps you avoid buying at peaks and selling at bottoms.',
      },
      {
        id: 'T1L08S3',
        type: 'example',
        title: 'Every crash in history — and what happened next',
        content: 'Every single crash felt like "this time is different."\n\n• 1929 Crash: down 89%. Recovered fully in 25 years — but $1 invested then became $1,000+ by 2020.\n• 1973–74 Oil Crisis: down 48%. Recovered in 7 years. Buyers in 1974 made 10x in the next decade.\n• 2000 Dot-com Bust: down 49%. Recovered in 7 years. Index fund holders who kept buying built massive wealth.\n• 2008 Financial Crisis: down 57%. Recovered in just 4 years. Buffett wrote "Buy America, I Am" at the bottom.\n• 2020 COVID Crash: down 34% in 23 days. Recovered in 5 months — the fastest recovery ever.\n\nPattern: every crash is described as "unprecedented" and "catastrophic." Every one recovers. The investors who sold during the panic locked in permanent losses. Those who held — and especially those who bought at the bottom — were rewarded beyond what felt possible during the fear.',
      },
      {
        id: 'T1L08S3b',
        type: 'text',
        title: 'Value investing in down markets — Graham\'s contrarian principle',
        content: '"The intelligent investor is a realist who sells to optimists and buys from pessimists." — Benjamin Graham\n\nThis single sentence captures the cycle. During booms, optimism pushes prices beyond real value. During crashes, pessimism pushes them below. The value investor does the opposite of the crowd: cautious when everyone is greedy, opportunistic when everyone is fearful.\n\nThis isn\'t easy. It\'s psychologically painful to buy when headlines are screaming disaster. But academically and historically, the best returns come from accumulating quality companies during maximum pessimism — when prices are most disconnected from actual business value.',
      },
      {
        id: 'T1L08S4',
        type: 'text',
        title: 'The most important rule',
        content: 'Never sell during a panic. Your worst portfolio decisions will happen when emotions are highest. If you can\'t resist the urge to sell during a crash, your stock allocation is too high. Adjust it during calm times, not during chaos. The best protection isn\'t market timing — it\'s having a plan you can stick to when the headlines are screaming.',
      },
    ],
    quiz: {
      id: 'T1L08Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'How often do bear markets (20%+ declines) typically occur?',
          options: [
            'Once a century',
            'Every 30-50 years',
            'Every few years on average',
            'Only during wars',
          ],
          correctIndex: 2,
          explanation: 'Bear markets are normal. Historically they occur roughly every 5-7 years on average. Expecting them keeps you from panicking when they arrive.',
        },
        {
          id: 'q2',
          question: 'What\'s the typical worst mistake investors make during crashes?',
          options: [
            'Buying too much',
            'Selling near the bottom out of fear',
            'Reading too much news',
            'Diversifying too late',
          ],
          correctIndex: 1,
          explanation: 'Panic-selling locks in losses just before the recovery. Every historical crash has eventually been followed by recovery and new highs. Selling in panic is the most damaging behavior.',
        },
        {
          id: 'q3',
          question: 'In which market phase is the public most optimistic?',
          options: [
            'Accumulation (after a crash)',
            'Markup (during the uptrend)',
            'Distribution (near the top)',
            'Markdown (during the decline)',
          ],
          correctIndex: 2,
          explanation: 'By the distribution phase, prices have risen so much that even reluctant investors are convinced. This widespread optimism is often a warning that smart money is selling to them.',
        },
        {
          id: 'q4',
          question: 'After the 2008 crash, how long did it take for the market to recover its prior peak?',
          options: [
            '6 months',
            'Roughly 4 years',
            '25 years',
            'It never recovered',
          ],
          correctIndex: 1,
          explanation: 'The S&P 500 hit a low in March 2009 and recovered its 2007 peak around 2013 — about 4 years. The market then went on to roughly triple over the next decade.',
        },
        {
          id: 'q5',
          question: 'What\'s the best protection against panic-selling?',
          options: [
            'Constantly watching market news',
            'Setting strict stop-loss orders',
            'Having an allocation you can stick with during crashes',
            'Selling and rebuying frequently',
          ],
          correctIndex: 2,
          explanation: 'If a 30% drop would make you panic, you have too much in stocks. Set your allocation during calm times so you can stick to your plan when chaos hits.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 9
  // ============================================================================
  {
    id: 'T1L09',
    tier: 1,
    order: 9,
    title: 'Your first paper trade walkthrough',
    subtitle: 'Step-by-step: search, select, confirm, monitor',
    description: 'Time to actually do this. We\'ll walk through every step of placing your first trade in your paper account — no real money at risk.',
    videoUrl: 'https://example.com/lessons/t1l09.mp4',
    videoDurationSeconds: 360,
    thumbnailUrl: 'https://example.com/thumbs/t1l09.jpg',
    estimatedMinutes: 8,
    difficulty: 1,
    topics: ['trading', 'paper_trading'],
    triggersSignals: ['blue_chip_quality', 'earnings_beat'],
    sections: [
      {
        id: 'T1L09S1',
        type: 'text',
        title: 'Step 1: Invest in what you know — Peter Lynch\'s principle',
        content: 'Peter Lynch, who managed the Fidelity Magellan Fund to 29% annual returns for 13 years, had a simple starting point: invest in what you know.\n\nYou notice the Starbucks near your office is always packed. You try a new product and love it. Your family keeps buying from a specific brand. These are investment ideas hiding in plain sight — ones institutional investors who never set foot in a mall or grocery store might miss.\n\nThe catch: "knowing" a company doesn\'t mean just using their product. It means understanding how they make money, what makes them durable, and what could hurt them. Lynch\'s principle gets you to the right starting point — then the research has to back it up.\n\nDon\'t start with a stock someone mentioned on TikTok. Start with businesses you genuinely use and understand.',
      },
      {
        id: 'T1L09S2',
        type: 'text',
        title: 'Step 2: Check the basics',
        content: 'Tap the stock to see its detail page. Look at: Is it a blue-chip? (We only show Tier 1 stocks.) What\'s the price doing this year? What are the algorithm signals saying? Are there any quality flags like strong fundamentals or recent earnings beats? You don\'t need to be an expert — just confirm there\'s no obvious red flag.',
      },
      {
        id: 'T1L09S3',
        type: 'example',
        title: 'Step 3: Use the trade journal',
        content: 'When you tap Buy, you\'ll be required to write two short notes: why you\'re buying, and what your exit plan is. This is THE most important habit. Writing your thesis down forces you to actually think it through before you commit money — if you can\'t explain why in a sentence, you probably don\'t know why. Skip this and you\'re gambling. Write it down and you\'re investing.',
      },
      {
        id: 'T1L09S4',
        type: 'text',
        title: 'Step 4: Monitor without obsessing',
        content: 'After buying, check your position weekly — not hourly. Daily price movements are noise. What matters is whether your original thesis still holds. The company is still strong? Still profitable? Still has the moat you identified? Then keep holding. The thesis broke? Sell. The price went up or down? Irrelevant unless the underlying story changed.',
      },
    ],
    quiz: {
      id: 'T1L09Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What\'s the best way to pick your first stock?',
          options: [
            'Whichever has the highest 1-week return',
            'A business you actually understand',
            'The cheapest stock available',
            'Whatever TikTok recommends',
          ],
          correctIndex: 1,
          explanation: 'Familiarity gives you context to judge whether the business is doing well. It also makes researching the company easier and more meaningful.',
        },
        {
          id: 'q2',
          question: 'Why does the app require you to write a thesis before buying?',
          options: [
            'For tax reporting',
            'To force you to articulate why you\'re actually buying',
            'To share with other users',
            'Required by SEC rules',
          ],
          correctIndex: 1,
          explanation: 'Writing your thesis forces real thinking. It\'s the single biggest behavioral difference between consistent investors and gamblers.',
        },
        {
          id: 'q3',
          question: 'How often should you check your positions after buying?',
          options: [
            'Hourly, to spot trends',
            'Daily, to react quickly',
            'Weekly or less, focused on whether your thesis still holds',
            'Never, just buy and forget',
          ],
          correctIndex: 2,
          explanation: 'Daily price movement is noise. Weekly check-ins focused on the underlying business are enough. Constant monitoring leads to emotional trades.',
        },
        {
          id: 'q4',
          question: 'Your stock drops 8% in a week. The company\'s business is still healthy. What should you do?',
          options: [
            'Sell immediately to limit losses',
            'Sell half',
            'Hold — your thesis still holds, the price drop is noise',
            'Buy a different stock',
          ],
          correctIndex: 2,
          explanation: 'Short-term price moves don\'t change the business. If your reason for owning is still valid, holding is the right answer. Selling on noise locks in losses.',
        },
        {
          id: 'q5',
          question: 'When should you sell a stock?',
          options: [
            'When it drops below your purchase price',
            'When your original thesis no longer holds',
            'After exactly 1 year',
            'Whenever the news is bad',
          ],
          correctIndex: 1,
          explanation: 'Sell when the reason you bought is no longer valid — the business changed, the moat eroded, your goals changed. Price alone doesn\'t justify a sell.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 10
  // ============================================================================
  {
    id: 'T1L10',
    tier: 1,
    order: 10,
    title: 'Building a simple portfolio',
    subtitle: '3-5 stocks beats 50 stocks for beginners',
    description: 'You don\'t need to own everything. Learn how to construct a simple, diversified portfolio with just a handful of carefully chosen stocks.',
    videoUrl: 'https://example.com/lessons/t1l10.mp4',
    videoDurationSeconds: 480,
    thumbnailUrl: 'https://example.com/thumbs/t1l10.jpg',
    estimatedMinutes: 11,
    difficulty: 2,
    topics: ['portfolio', 'diversification'],
    triggersSignals: ['blue_chip_quality', 'sector_momentum'],
    sections: [
      {
        id: 'T1L10S1',
        type: 'text',
        title: 'More stocks aren\'t always better',
        content: 'Beginners often think owning 50+ stocks means they\'re really diversified. In reality, after 15-25 well-chosen stocks, you\'re just owning a worse version of the S&P 500 — and paying more attention than you need to. Quality over quantity. A focused portfolio of 5-10 stocks you actually understand will usually outperform a sprawling list you barely track.',
      },
      {
        id: 'T1L10S2',
        type: 'text',
        title: 'Diversify across sectors, not just stocks',
        content: 'Owning Apple, Microsoft, Google, Meta, and Amazon feels diversified — it\'s 5 stocks! But it\'s actually concentrated in big tech. If tech tanks, your entire portfolio tanks. Real diversification spans sectors: tech, healthcare, financials, consumer staples, energy, etc. A simple rule: try to have no more than 25% in any one sector when you\'re starting out.',
      },
      {
        id: 'T1L10S3',
        type: 'example',
        title: 'A starter portfolio template',
        content: 'A solid Tier 1 portfolio might look like: 30% S&P 500 ETF (broad exposure baseline), 15% Apple (tech), 15% Johnson & Johnson (healthcare), 15% JPMorgan (financials), 15% Procter & Gamble (consumer staples), 10% cash for opportunities. Five positions, five sectors, automatic diversification. Boring? Yes. Effective? Also yes. Boring is exactly what builds wealth.',
      },
      {
        id: 'T1L10S4',
        type: 'text',
        title: 'Rebalancing: the discipline',
        content: 'Over time, your winners grow and your losers shrink. After a year, your 15% Apple position might be 30% of your portfolio. That\'s concentration risk. Rebalancing means trimming winners and adding to underweighted positions — getting back to your target weights. Do this once or twice a year. It\'s how you systematically "sell high and buy low" without ever having to predict the market.',
      },
    ],
    quiz: {
      id: 'T1L10Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'How many stocks gives most of the diversification benefit?',
          options: [
            '3-5',
            '15-25',
            '50-100',
            '500+',
          ],
          correctIndex: 1,
          explanation: 'Academic research shows that 15-25 well-chosen stocks captures most diversification benefits. Beyond that, you get diminishing returns and more work.',
        },
        {
          id: 'q2',
          question: 'You own Apple, Microsoft, Google, Meta, and Amazon. Are you well-diversified?',
          options: [
            'Yes, five different stocks',
            'No, all five are big tech and will move together',
            'Yes, they\'re all blue-chips',
            'It depends on the dollar amounts',
          ],
          correctIndex: 1,
          explanation: 'Real diversification spans sectors. Five tech stocks all crash together when tech crashes. True diversification means owning across different industries.',
        },
        {
          id: 'q3',
          question: 'What is rebalancing?',
          options: [
            'Selling all losers, keeping all winners',
            'Trimming winners and adding to underweighted positions to maintain target weights',
            'Switching brokerages',
            'Changing your goals',
          ],
          correctIndex: 1,
          explanation: 'Rebalancing brings your portfolio back to its target allocation. It forces a "sell high, buy low" discipline because you trim outperformers and add to underperformers.',
        },
        {
          id: 'q4',
          question: 'A simple rule for sector concentration when starting out?',
          options: [
            'Put 100% in your favorite sector',
            'No more than 25% in any single sector',
            'Equal weight, exactly 20% per sector',
            'Avoid healthcare and energy',
          ],
          correctIndex: 1,
          explanation: 'Capping single-sector exposure at 25% prevents one bad sector from devastating your portfolio while still allowing for some concentration.',
        },
        {
          id: 'q5',
          question: 'How often should you rebalance a long-term portfolio?',
          options: [
            'Daily',
            'Weekly',
            'Once or twice a year',
            'Only after a market crash',
          ],
          correctIndex: 2,
          explanation: 'Once or twice a year is enough for most portfolios. Rebalancing too often increases transaction costs and tax events without improving returns.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 11
  // ============================================================================
  {
    id: 'T1L11',
    tier: 1,
    order: 11,
    title: 'Reading financial news without panic',
    subtitle: 'How to filter signal from noise',
    description: 'Every day, headlines scream about crashes, rallies, and disasters. Learn how to read financial news critically and avoid making emotional decisions.',
    videoUrl: 'https://example.com/lessons/t1l11.mp4',
    videoDurationSeconds: 420,
    thumbnailUrl: 'https://example.com/thumbs/t1l11.jpg',
    estimatedMinutes: 10,
    difficulty: 2,
    topics: ['psychology', 'news'],
    triggersSignals: ['earnings_beat'],
    sections: [
      {
        id: 'T1L11S1',
        type: 'text',
        title: 'Financial media\'s business model isn\'t investing',
        content: 'CNBC, Bloomberg, and Yahoo Finance make money by getting you to click and watch. That means headlines are designed to be alarming, urgent, or shocking. "Market plunges!" gets clicks. "Market continues normal range of activity" doesn\'t. Internalize this: financial media\'s incentive is your attention, not your portfolio performance. They\'re not lying — they\'re just amplifying.',
      },
      {
        id: 'T1L11S2',
        type: 'text',
        title: 'The signal vs noise filter',
        content: 'For each piece of news, ask: Does this change the long-term value of any company I own? Most news doesn\'t. A Fed comment about interest rates? Probably noise. A company\'s product recall costing them $50M? Material for that company but rarely a portfolio-mover. A war, a recession, or a fundamental shift in a company\'s business? Signal — pay attention. The goal is to ignore 95% of headlines and react only to the 5% that matter.',
      },
      {
        id: 'T1L11S3',
        type: 'example',
        title: 'Earnings season: separating real from theater',
        content: 'Four times a year, companies report quarterly earnings. The reaction is often theatrical. A company beats earnings by 1% but guidance disappoints? Stock drops 8%. Same company beats by 10% in the next quarter and stock jumps 12%. Underneath the volatility, the business changes slowly. Focus on trends across multiple quarters, not single-quarter reactions. The market gets one-quarter reactions wrong all the time.',
      },
      {
        id: 'T1L11S4',
        type: 'text',
        title: 'Build a slow-news diet',
        content: 'Instead of constant Bloomberg TV, try this: read one weekly investing summary (The Economist or a thoughtful newsletter), check earnings reports for stocks you own, ignore daily price commentary entirely. You\'ll be calmer, make better decisions, and outperform anxious traders who panic at every headline. The best investors read fewer, better sources — not more, worse ones.',
      },
    ],
    quiz: {
      id: 'T1L11Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'Why are financial news headlines often alarming?',
          options: [
            'Because the market is always crashing',
            'Because attention-grabbing headlines drive clicks and ad revenue',
            'Because SEC requires it',
            'Because journalists are pessimistic',
          ],
          correctIndex: 1,
          explanation: 'Media\'s business model is attention. Alarming headlines drive clicks. Boring accurate headlines don\'t. Recognizing this lets you read with appropriate skepticism.',
        },
        {
          id: 'q2',
          question: 'A news headline: "Apple stock plunges 4% on weak iPhone sales." You own Apple long-term. What\'s the right response?',
          options: [
            'Panic-sell immediately',
            'Read the actual report, check if your long-term thesis is broken',
            'Buy 10x more',
            'Ignore everything Apple-related',
          ],
          correctIndex: 1,
          explanation: 'Read the substance, not the headline. A single quarter rarely changes a long-term thesis. Check facts, then decide — don\'t react to the framing.',
        },
        {
          id: 'q3',
          question: 'How should you treat a Fed comment about interest rates?',
          options: [
            'Act on it immediately',
            'Usually noise for long-term holdings; rarely changes individual company fundamentals',
            'Sell everything and wait',
            'Buy bonds instantly',
          ],
          correctIndex: 1,
          explanation: 'Fed commentary moves markets short-term but rarely changes whether a great company is still great. Long-term investors mostly ignore Fed soundbites.',
        },
        {
          id: 'q4',
          question: 'A company beats earnings by 1% but stock drops 8%. Why?',
          options: [
            'The company actually lost money',
            'Market reaction often focuses on guidance or expectations, not the beat itself',
            'It\'s a market crash',
            'Beating earnings is bad',
          ],
          correctIndex: 1,
          explanation: 'Single-quarter reactions are often dominated by guidance or whisper numbers. A small "beat" with disappointing forward guidance is read as weakness. The business hasn\'t fundamentally changed.',
        },
        {
          id: 'q5',
          question: 'What\'s a healthier news diet for long-term investors?',
          options: [
            'Constant streaming financial TV',
            'Hourly stock price checks',
            'A handful of high-quality weekly sources plus the actual filings of stocks you own',
            'Twitter/X stock influencers',
          ],
          correctIndex: 2,
          explanation: 'Less, better. A weekly synthesis plus direct company filings gives you what matters without the constant manufactured urgency that drives bad decisions.',
        },
      ],
    },
  },
  
  // ============================================================================
  // Lesson 12 - Graduation
  // ============================================================================
  {
    id: 'T1L12',
    tier: 1,
    order: 12,
    title: 'Graduation project: Your first research',
    subtitle: 'Pick a blue-chip, write a thesis, execute',
    description: 'Your final Tier 1 project. Pick one blue-chip stock you understand, write a one-paragraph thesis on why you want to own it, and execute the trade. This is how real investors think.',
    videoUrl: 'https://example.com/lessons/t1l12.mp4',
    videoDurationSeconds: 540,
    thumbnailUrl: 'https://example.com/thumbs/t1l12.jpg',
    estimatedMinutes: 12,
    difficulty: 3,
    topics: ['research', 'thesis', 'application'],
    triggersSignals: ['blue_chip_quality', 'earnings_beat', 'dividend_consistency', 'sector_momentum'],
    sections: [
      {
        id: 'T1L12S1',
        type: 'text',
        title: 'The thesis framework — how every great investor thinks',
        content: 'Every good investment thesis answers four questions:\n\n1. What does this company do — in one sentence?\n2. Why is it durably valuable? What\'s its moat — what makes it hard to compete with?\n3. What could go wrong? (The bear case — be honest here)\n4. When would I sell? What specific data would tell me the thesis is broken?\n\nWrite your answers in a single paragraph. If you can\'t explain it in plain English, you don\'t understand it well enough to invest. This isn\'t a formality — it\'s the difference between investing and gambling.\n\nAs the book Investing 101 puts it: "Investing is an area in which you will benefit significantly from using your intelligence... a message from your gut is always worth listening to." But that gut message needs to be backed by understanding — or it\'s just a feeling.',
      },
      {
        id: 'T1L12S2',
        type: 'text',
        title: 'A sample thesis',
        content: '"Costco (COST) is a membership-based wholesale retailer with 70M+ members generating recurring fee income. Its moat is scale plus customer loyalty — competitors can\'t match prices because they don\'t have the volume to negotiate the same supplier terms. Bear case: e-commerce erosion or a recession hurting membership renewals. I\'d sell if renewal rates fall below 89% (currently ~93%) or if same-store sales turn negative for two consecutive quarters." That\'s 90 seconds of writing that could save you from a panic-sell in a future drawdown.',
      },
      {
        id: 'T1L12S3',
        type: 'example',
        title: 'Pick a real stock and try it',
        content: 'Right now, before moving on: pick one blue-chip stock from the browser. Open its detail page. Write your thesis in the trade journal when you go to buy. Aim for 3-4 sentences. Don\'t skip this. It feels uncomfortable because real thinking is uncomfortable. But this is the habit that separates investors with edge from everyone else.',
      },
      {
        id: 'T1L12S4',
        type: 'text',
        title: 'You\'ve completed Tier 1',
        content: 'You now know: how stocks work, how to read a quote, what risk really means, how to size positions, what dividends are, why diversification matters, how cycles work, how to think about news, and how to write a thesis. That\'s more than most retail investors ever learn. From here, Tier 2 expands your toolkit: earnings analysis, sector rotation, portfolio construction at scale, and the beginnings of technical analysis. But Tier 1 is the foundation. Master these basics and the rest is leverage.',
      },
    ],
    quiz: {
      id: 'T1L12Q',
      passingScore: 0.75,
      questions: [
        {
          id: 'q1',
          question: 'What does a good investment thesis answer?',
          options: [
            'Only why you\'re buying',
            'What the company does, what its moat is, what could go wrong, and when you\'d sell',
            'Only the target price',
            'Only the dividend yield',
          ],
          correctIndex: 1,
          explanation: 'A real thesis covers the business, the moat, the bear case, and the exit. Four questions, one paragraph. It\'s a decision-making tool, not a marketing pitch.',
        },
        {
          id: 'q2',
          question: 'Why include the bear case in your thesis?',
          options: [
            'It\'s required by law',
            'It forces honest thinking about risk and gives you a framework to evaluate news later',
            'To impress other investors',
            'To get tax benefits',
          ],
          correctIndex: 1,
          explanation: 'Listing what could go wrong forces honest analysis. Later, when news hits, you can compare it against your bear case to decide if the situation has actually changed.',
        },
        {
          id: 'q3',
          question: 'Why specify exit conditions when buying?',
          options: [
            'So your broker can sell automatically',
            'So you can sell rationally based on the business, not emotionally based on price',
            'It\'s a tax requirement',
            'You don\'t need to',
          ],
          correctIndex: 1,
          explanation: 'Pre-committing to specific exit triggers means you sell on data, not on emotion. Investors without exit plans often hold losers too long or sell winners too early.',
        },
        {
          id: 'q4',
          question: 'You can\'t explain why a stock is a good investment in plain English. What\'s the lesson?',
          options: [
            'Find a more technical investor to explain it',
            'You probably don\'t understand it well enough to invest yet',
            'Buy it anyway, you\'ll learn',
            'Just trust the algorithm',
          ],
          correctIndex: 1,
          explanation: 'If you can\'t explain it simply, you don\'t understand it. Investing in things you can\'t explain is gambling. Either learn until you can, or skip the stock.',
        },
        {
          id: 'q5',
          question: 'What\'s next after completing Tier 1?',
          options: [
            'Nothing — you\'re done learning',
            'Tier 2 expands into earnings analysis, sector rotation, and portfolio construction',
            'Cryptocurrency trading',
            'Options trading',
          ],
          correctIndex: 1,
          explanation: 'Tier 1 is the foundation. Tier 2 adds the toolkit for active investing — including reading earnings reports, understanding sector dynamics, and constructing portfolios at scale.',
        },
      ],
    },
  },
];

export const getLesson = (id: string): Lesson | undefined => {
  return tier1Lessons.find(l => l.id === id);
};

export const getLessonsByTier = (tier: 1 | 2 | 3): Lesson[] => {
  if (tier === 1) return tier1Lessons;
  if (tier === 2) {
    // Lazy import to avoid loading all Tier 2 content unless needed
    const { tier2Lessons } = require('./tier2curriculum');
    return tier2Lessons;
  }
  if (tier === 3) {
    const { tier3Lessons } = require('./tier3curriculum');
    return tier3Lessons;
  }
  return [];
};
