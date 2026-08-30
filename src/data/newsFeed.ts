/**
 * News Feed
 * 
 * Real-world market news, framed differently for each tier:
 * - Tier 1: Simple "what happened" language
 * - Tier 2: Adds "why it matters" + technical context
 * - Tier 3: Adds "what's the trade" + nuance + skepticism
 * 
 * Same event, three different framings. This is unique to your app —
 * nobody else does tier-aware news.
 * 
 * For MVP: mock data. Production: feed from news API + Claude API for framing.
 */

import { NewsItem } from '../types';

export const mockNewsFeed: NewsItem[] = [
  {
    id: 'news_001',
    headline: 'NVIDIA reports record earnings, beats expectations',
    summary: 'Q4 revenue $35.1B vs $33B estimate; AI chip demand remains strong.',
    source: 'Reuters',
    url: 'https://example.com/nvidia-earnings',
    tier1Framing: 'NVIDIA — the company that makes AI computer chips — made more money than experts expected. Their products are still in huge demand for artificial intelligence. The stock jumped 5% after the news.',
    tier2Framing: 'NVIDIA beat consensus EPS by 8% and revenue by 6%, driven by 78% growth in Data Center segment. Forward guidance suggests AI demand isn\'t peaking yet. Margins expanded 200bps to 75% gross margin — exceptional for hardware. Stock +5% after-hours; watch how peers (AMD, AVGO) trade tomorrow.',
    tier3Framing: 'NVDA print: 8% EPS beat, 6% revenue beat, GM expansion 200bps to 75%. Hopper transitioning to Blackwell smoothly. Key concerns: customer concentration (top 4 = 40% revenue), Chinese H20 chip uncertainty, and supply being absorbed faster than competitive responses can emerge (AMD MI300X, Broadcom custom ASICs). At 65x forward, priced for perfection — any AI capex slowdown is the asymmetric risk. Watch ASML capex commentary as leading indicator.',
    relatedSymbols: ['NVDA', 'AMD', 'AVGO'],
    relatedSignals: ['earnings_beat'],
    sentiment: 'positive',
    importance: 5,
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  
  {
    id: 'news_002',
    headline: 'Fed signals rate cuts could come in 2026',
    summary: 'Powell suggests dovish pivot if inflation continues cooling.',
    source: 'Bloomberg',
    url: 'https://example.com/fed-rates',
    tier1Framing: 'The Federal Reserve — the people who control interest rates in the US — hinted they might lower rates next year. Lower rates usually help the stock market because it\'s cheaper for companies to borrow money.',
    tier2Framing: 'Fed Chair Powell signaled potential rate cuts in 2026 if inflation continues toward 2% target. Market implied probability of June cut moved from 35% to 62%. Rate-sensitive sectors (homebuilders, REITs, tech) rallied; banks dropped on net interest margin concerns.',
    tier3Framing: 'Powell\'s presser tonally more dovish than expected. Fed funds futures repriced — June cut probability 35% → 62%, year-end terminal 4.0% from 4.5%. Curve steepened: 2s-10s +12bps. Sector implications: KRE (regional banks) -2%, XHB (homebuilders) +3%, XBI (biotech) +2.5%. Watch CPI print next Tuesday — Cleveland Fed nowcast at 2.7% would confirm trajectory. Risk: market pricing in 4 cuts vs Fed dots showing 2. Asymmetry favors hedge against hawkish surprise.',
    relatedSymbols: ['SPY', 'TLT', 'XLF', 'XHB'],
    relatedSignals: ['macro_pivot'],
    sentiment: 'positive',
    importance: 5,
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  
  {
    id: 'news_003',
    headline: 'Apple beats earnings, Services revenue hits new high',
    summary: 'Q1 iPhone sales softer but Services grew 14% YoY to $26B.',
    source: 'CNBC',
    url: 'https://example.com/apple-q1',
    tier1Framing: 'Apple sold fewer iPhones than expected, BUT made a lot more money from its services (App Store, iCloud, Apple Music, etc.). Services are growing fast and they\'re very profitable. Stock barely moved.',
    tier2Framing: 'Apple Q1: iPhone -1% YoY but Services +14% to record $26B. Services gross margin 74% vs 39% for products — mix shift is positive for overall profitability. China weakness (-13% YoY) remains concern. Stock flat as Services strength offset hardware miss. Watch installed base monetization thesis playing out.',
    tier3Framing: 'AAPL: Headline miss on iPhone (-1% YoY), beat on Services (+14% to $26B record). Implications: (1) Hardware → Services transition continues — Services now 25% of revenue, 38% of GP. (2) China weakness deepening (-13% YoY) likely structural, not cyclical. (3) Buyback machine: $90B authorized, supports EPS even with flat revenue. (4) Vision Pro virtually no contribution but optionality remains. Valuation: 28x forward seems reasonable for stable 8-10% EPS growth via Services + buybacks, but limited multiple expansion case. Long thesis intact; short thesis (China + saturation) also legitimate.',
    relatedSymbols: ['AAPL'],
    relatedSignals: ['margin_expansion'],
    sentiment: 'neutral',
    importance: 4,
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  
  {
    id: 'news_004',
    headline: 'CPI inflation comes in at 2.7%, below expectations',
    summary: 'Consumer prices rose slower than 2.9% economist forecast.',
    source: 'Wall Street Journal',
    url: 'https://example.com/cpi-march',
    tier1Framing: 'Inflation — how fast prices are rising — was lower than expected last month. This is good for the stock market because it means the Fed might cut interest rates sooner.',
    tier2Framing: 'CPI 2.7% YoY vs 2.9% consensus, 3.1% prior. Core CPI 3.2% vs 3.3% expected — encouraging trajectory toward 2% target. Stocks rallied: SPY +1.2%, bonds (TLT) +0.8%. The disinflation narrative regaining traction after hot prints last quarter.',
    tier3Framing: 'CPI 2.7% vs 2.9c, Core 3.2% vs 3.3c. Composition matters: shelter still sticky at 5.4% YoY but trending lower (Zillow rent index suggests fall to 3.5% by Q3). Services ex-shelter (Powell\'s preferred measure) decelerated to 3.8% from 4.4%. Implications: Fed cut probabilities June +12%, year-end terminal 25bps lower. Curve: 2s-10s steepened 8bps. Cross-asset: real yields -8bps (gold +1.5%), DXY -0.7%, EM FX +0.5%. Watch supercore in PCE next week — if confirms, June cut becomes consensus base case.',
    relatedSymbols: ['SPY', 'TLT', 'GLD'],
    relatedSignals: ['macro_pivot'],
    sentiment: 'positive',
    importance: 4,
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  
  {
    id: 'news_005',
    headline: 'Tesla recalls 2 million vehicles over Autopilot concerns',
    summary: 'NHTSA pressure forces over-the-air software update to address safety.',
    source: 'New York Times',
    url: 'https://example.com/tesla-recall',
    tier1Framing: 'Tesla has to fix a safety issue in 2 million cars. The good news is they can do it through a software update — no need for owners to bring cars in. Stock dropped 3% on the news.',
    tier2Framing: 'Tesla recalls 2M vehicles for Autopilot fix following NHTSA investigation. OTA update means no physical recall costs but reputational impact possible. Stock -3%. Watch for: (1) regulatory escalation risk on FSD, (2) impact on EV sales narrative, (3) implications for autonomous vehicle competition with Waymo.',
    tier3Framing: 'TSLA recall: 2M vehicles, OTA fix means minimal recall cost (~$100M est vs $1B+ traditional). But reputational + regulatory implications meaningful: (1) Erodes "safety lead" marketing claim, (2) NHTSA investigation widening creates ongoing overhang, (3) Robotaxi narrative gets harder if Autopilot can\'t be trusted. Stock -3%, P/E now 62x — still demanding for a company facing margin compression (-500bps YoY auto GM), competition (BYD, Rivian), and execution risk on Robotaxi 2026 launch. Bear case: $150. Bull case (Robotaxi success): $350. Wide range = high optionality bet, not value play.',
    relatedSymbols: ['TSLA'],
    relatedSignals: [],
    sentiment: 'negative',
    importance: 3,
    publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Returns news items relevant to the user's current tier with appropriate framing.
 */
export function getTierFilteredNews(tier: 1 | 2 | 3, limit: number = 10): NewsItem[] {
  return mockNewsFeed
    .filter((item) => {
      // Tier 1 users only see medium-high importance news (less noise)
      if (tier === 1 && item.importance < 3) return false;
      return true;
    })
    .slice(0, limit);
}

/**
 * Get the tier-appropriate framing for a news item.
 */
export function getFramingForTier(item: NewsItem, tier: 1 | 2 | 3): string {
  if (tier === 1) return item.tier1Framing || item.summary;
  if (tier === 2) return item.tier2Framing || item.summary;
  return item.tier3Framing || item.summary;
}
