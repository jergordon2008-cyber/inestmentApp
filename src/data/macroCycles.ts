export type CyclePhase = 'early_expansion' | 'late_expansion' | 'contraction' | 'recession';

export interface SectorWeight {
  sector: string;
  etf: string;
  stance: 'overweight' | 'neutral' | 'underweight';
  reasoning: string;
}

export interface HistoricalCycle {
  name: string;
  startDate: string;
  endDate: string;
  phase: CyclePhase;
  keyEvents: string[];
  sectorPerformance: Record<string, string>;
  whatHappenedNext: string;
}

export interface MacroSignal {
  name: string;
  value: string;
  trend: 'up' | 'stable' | 'down';
  interpretation: string;
  bullishThreshold: string;
  bearishThreshold: string;
}

export interface CycleData {
  phase: CyclePhase;
  phaseName: string;
  phaseEmoji: string;
  phaseColor: string;
  description: string;
  duration: string;
  signals: MacroSignal[];
  sectorRotation: SectorWeight[];
  historicalCycles: HistoricalCycle[];
  macroTrades: { title: string; rationale: string; vehicle: string; tier: 1 | 2 | 3 }[];
  nextPhase: CyclePhase;
  nextPhaseWarning: string;
}

export const PHASE_COLORS: Record<CyclePhase, string> = {
  early_expansion: '#10B981',
  late_expansion: '#F59E0B',
  contraction: '#F97316',
  recession: '#EF4444',
};

export const PHASE_NAMES: Record<CyclePhase, string> = {
  early_expansion: 'Early Expansion',
  late_expansion: 'Late Expansion',
  contraction: 'Contraction',
  recession: 'Recession / Trough',
};

export const PHASE_EMOJIS: Record<CyclePhase, string> = {
  early_expansion: '🌱',
  late_expansion: '🌳',
  contraction: '🍂',
  recession: '❄️',
};

// Current cycle data — in production this would come from a live API
// For now we use a well-researched mid-2025 snapshot
export const currentCycleData: CycleData = {
  phase: 'late_expansion',
  phaseName: 'Late Expansion',
  phaseEmoji: '🌳',
  phaseColor: '#F59E0B',
  description: 'The economy is growing but showing signs of maturing. Employment is near full capacity, inflation remains elevated, and the Fed has kept rates higher for longer. Corporate earnings are still positive but growth is decelerating. This phase historically precedes either a soft landing or contraction.',
  duration: 'Approximately 18-24 months into this phase',

  signals: [
    {
      name: 'GDP Growth',
      value: '+2.1% annualized',
      trend: 'stable',
      interpretation: 'Positive but slowing from 3.2% peak',
      bullishThreshold: 'Above 2.5%',
      bearishThreshold: 'Below 1.0% or negative',
    },
    {
      name: 'Inflation (CPI)',
      value: '3.2% YoY',
      trend: 'down',
      interpretation: 'Declining from 9.1% peak but still above Fed 2% target',
      bullishThreshold: 'Below 2.5%',
      bearishThreshold: 'Re-acceleration above 4%',
    },
    {
      name: 'Unemployment',
      value: '4.0%',
      trend: 'up',
      interpretation: 'Ticking up from 3.4% historic low — softening labor market',
      bullishThreshold: 'Below 4.0% and stable',
      bearishThreshold: 'Above 5.0%',
    },
    {
      name: 'Fed Funds Rate',
      value: '5.25-5.50%',
      trend: 'stable',
      interpretation: 'Held at 23-year high. Market pricing first cut in coming months.',
      bullishThreshold: 'Rate cuts beginning',
      bearishThreshold: 'Additional hikes',
    },
    {
      name: 'Yield Curve',
      value: '-0.4% (2yr vs 10yr)',
      trend: 'up',
      interpretation: 'Inverted — historically precedes recession by 6-18 months',
      bullishThreshold: 'Positive slope (10yr > 2yr)',
      bearishThreshold: 'Further inversion below -1%',
    },
    {
      name: 'Consumer Confidence',
      value: '102 (Conference Board)',
      trend: 'stable',
      interpretation: 'Slightly below long-term average of 106 — cautious consumers',
      bullishThreshold: 'Above 110',
      bearishThreshold: 'Below 80',
    },
  ],

  sectorRotation: [
    { sector: 'Healthcare', etf: 'XLV', stance: 'overweight', reasoning: 'Defensive — people need medicine in all conditions. Benefits from aging demographics.' },
    { sector: 'Consumer Staples', etf: 'XLP', stance: 'overweight', reasoning: 'Recession-resistant. Companies like P&G and Walmart maintain earnings through downturns.' },
    { sector: 'Utilities', etf: 'XLU', stance: 'overweight', reasoning: 'High dividends + defensive earnings. Benefits when rates begin to fall.' },
    { sector: 'Financials', etf: 'XLF', stance: 'neutral', reasoning: 'High rates help margins but credit risk rising. Mixed signals.' },
    { sector: 'Industrials', etf: 'XLI', stance: 'neutral', reasoning: 'Reshoring tailwind offset by slowing growth. Selective opportunities.' },
    { sector: 'Energy', etf: 'XLE', stance: 'neutral', reasoning: 'Geopolitical premium but demand concerns as growth slows.' },
    { sector: 'Technology', etf: 'XLK', stance: 'underweight', reasoning: 'High valuations vulnerable to rate sensitivity and earnings deceleration.' },
    { sector: 'Consumer Discretionary', etf: 'XLY', stance: 'underweight', reasoning: 'Consumer spending pressured by high rates and depleted pandemic savings.' },
    { sector: 'Real Estate', etf: 'XLRE', stance: 'underweight', reasoning: 'Interest-rate sensitive sector — high rates compress valuations.' },
  ],

  historicalCycles: [
    {
      name: '2006-2007 Late Expansion',
      startDate: '2006-01-01',
      endDate: '2007-12-01',
      phase: 'late_expansion',
      keyEvents: [
        'Fed held rates at 5.25% for 15 months',
        'Housing market showing first cracks (subprime)',
        'S&P 500 still hitting new highs in October 2007',
        'Yield curve inverted throughout 2006',
      ],
      sectorPerformance: {
        'Energy': '+36% (best)',
        'Materials': '+22%',
        'Technology': '+17%',
        'Financials': '-9% (worst — early crisis)',
        'Healthcare': '+8%',
      },
      whatHappenedNext: 'Financial crisis erupted in 2008. S&P 500 fell 56% peak to trough. Healthcare and Consumer Staples fell least. Energy initially surged then collapsed.',
    },
    {
      name: '1997-1999 Late Expansion',
      startDate: '1997-01-01',
      endDate: '1999-12-01',
      phase: 'late_expansion',
      keyEvents: [
        'Fed cut rates 3x in 1998 (LTCM crisis)',
        'Dot-com bubble inflating — tech P/Es astronomical',
        'Asia and Russia financial crises created volatility',
        'Unemployment at historic lows (4.0%)',
      ],
      sectorPerformance: {
        'Technology': '+84% (extreme outlier)',
        'Consumer Discretionary': '+30%',
        'Healthcare': '+15%',
        'Utilities': '-5%',
        'Energy': '-12%',
      },
      whatHappenedNext: 'Dot-com bubble burst in 2000. Nasdaq fell 78% over 2.5 years. Tech stocks devastated. Value stocks outperformed significantly.',
    },
    {
      name: '2017-2018 Late Expansion',
      startDate: '2017-01-01',
      endDate: '2018-12-01',
      phase: 'late_expansion',
      keyEvents: [
        'Tax cuts added fiscal stimulus to already-strong economy',
        'Fed raised rates 9x (2015-2018)',
        'Unemployment hit 3.7% — 50-year low',
        'Trade war with China created uncertainty',
      ],
      sectorPerformance: {
        'Technology': '+30%',
        'Healthcare': '+22%',
        'Consumer Discretionary': '+18%',
        'Utilities': '-4%',
        'Energy': '-18%',
      },
      whatHappenedNext: 'Q4 2018 saw S&P 500 fall 20% (near bear market). Fed paused hikes. 2019 was strong recovery year as Fed cut rates.',
    },
  ],

  macroTrades: [
    {
      title: 'Rotate to Defensive Sectors',
      rationale: 'Late expansion historically favors Healthcare, Staples, Utilities as growth slows. These sectors offer earnings stability when the cycle turns.',
      vehicle: 'XLV (Healthcare ETF), XLP (Staples ETF), XLU (Utilities ETF)',
      tier: 2,
    },
    {
      title: 'Reduce Technology Overweight',
      rationale: 'Tech PE ratios are historically elevated going into a potential contraction. Rate sensitivity + earnings deceleration create double headwind.',
      vehicle: 'Trim XLK or individual tech positions above 30% portfolio weight',
      tier: 2,
    },
    {
      title: 'Add Treasury Bonds (Duration)',
      rationale: 'If recession materializes, Fed will cut rates aggressively. Long duration Treasuries rally strongly as rates fall.',
      vehicle: 'TLT (20+ Year Treasury ETF) — significant upside if recession hits',
      tier: 3,
    },
    {
      title: 'Dividend Quality Screen',
      rationale: 'In late cycle, dividend sustainability matters more than yield. Focus on companies with 10+ year dividend growth streaks.',
      vehicle: 'VIG (Vanguard Dividend Growth ETF) or individual Dividend Aristocrats',
      tier: 1,
    },
  ],

  nextPhase: 'contraction',
  nextPhaseWarning: 'Key signals to watch: If unemployment rises above 4.5%, GDP prints negative, or Fed starts emergency cuts — contraction is likely beginning. Increase defensive allocation.',
};

export function getPhaseDescription(phase: CyclePhase): string {
  const descriptions: Record<CyclePhase, string> = {
    early_expansion: 'Economy recovering from trough. Unemployment falling, rates low, credit expanding. Best time to buy cyclicals, materials, and growth stocks.',
    late_expansion: 'Economy near peak. Strong growth but inflation rising, rates higher, valuations stretched. Rotate toward defensives and quality.',
    contraction: 'Growth slowing materially. Earnings warnings, layoffs beginning. Defensives outperform. Reduce risk, add bonds.',
    recession: 'Economy contracting. Unemployment high, corporate stress. Cash and Treasuries king. Prepare shopping list for recovery.',
  };
  return descriptions[phase];
}
