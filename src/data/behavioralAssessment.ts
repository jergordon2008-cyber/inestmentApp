/**
 * Behavioral Assessment
 * 
 * 12 questions identifying investor psychological biases.
 * Drawn from behavioral finance research (Kahneman, Tversky, Thaler).
 */

export type BiasCategory =
  | 'lossAversion'
  | 'recencyBias'
  | 'overconfidence'
  | 'confirmationBias'
  | 'fomoSusceptibility'
  | 'analysisParalysis'
  | 'anchoringBias'
  | 'herdingBias'
  | 'sunkCostFallacy'
  | 'timeHorizonMismatch'
  | 'concentrationBias'
  | 'regretAversion';

export interface BiasQuestion {
  id: string;
  category: BiasCategory;
  question: string;
  options: { text: string; score: number }[];
}

export interface BiasProfile {
  scores: Record<BiasCategory, number>;
  topBiases: BiasCategory[];
  assessmentDate: string;
  recommendedLessons: string[];
}

export const BIAS_LABELS: Record<BiasCategory, string> = {
  lossAversion: 'Loss Aversion',
  recencyBias: 'Recency Bias',
  overconfidence: 'Overconfidence',
  confirmationBias: 'Confirmation Bias',
  fomoSusceptibility: 'FOMO Susceptibility',
  analysisParalysis: 'Analysis Paralysis',
  anchoringBias: 'Anchoring Bias',
  herdingBias: 'Herding Bias',
  sunkCostFallacy: 'Sunk Cost Fallacy',
  timeHorizonMismatch: 'Time Horizon Mismatch',
  concentrationBias: 'Concentration Bias',
  regretAversion: 'Regret Aversion',
};

export const BIAS_DESCRIPTIONS: Record<BiasCategory, string> = {
  lossAversion: 'You feel losses about twice as strongly as equivalent gains. This drives panic-selling at exactly the wrong moments.',
  recencyBias: 'Recent events weigh too heavily in your decisions. After crashes you expect crashes; after rallies you expect rallies.',
  overconfidence: 'You overestimate your stock-picking ability. This leads to overtrading and under-diversification.',
  confirmationBias: 'You seek information confirming your existing views and dismiss contradictions. Problems become invisible until too late.',
  fomoSusceptibility: 'Fear of Missing Out drives you to chase momentum after it\'s already priced in. Classic buying-the-top behavior.',
  analysisParalysis: 'You over-research, never act. Opportunities pass while you wait for certainty that never arrives.',
  anchoringBias: 'You fixate on irrelevant reference prices. Stocks "feel cheap" relative to old highs even when fundamentals say otherwise.',
  herdingBias: 'You follow crowds. By the time something is popular enough for you to notice, the easy money is gone.',
  sunkCostFallacy: 'You hold losers hoping to break even. The price you paid is irrelevant — only the future matters.',
  timeHorizonMismatch: 'Your trading style doesn\'t match when you need the money. Short-term traders with 30-year horizons leave returns on the table.',
  concentrationBias: 'You over-concentrate in a few stocks. Big upside, but catastrophic when one position fails.',
  regretAversion: 'Fear of regret prevents action. You avoid decisions that might lead to clear blame, even when they\'re right.',
};

export const BIAS_FIXES: Record<BiasCategory, string> = {
  lossAversion: 'Pre-commit to a written strategy. When markets drop, follow the plan, not your feelings. Set rebalancing rules in advance.',
  recencyBias: 'Look at 10+ year charts before making decisions. Recent patterns rarely predict the future.',
  overconfidence: 'Track every prediction in writing. Compare your forecasts to actual outcomes. Most investors discover they\'re worse than they thought.',
  confirmationBias: 'Before any major buy, write the strongest bear case. If you can\'t argue against your own pick, you don\'t understand it yet.',
  fomoSusceptibility: 'Maintain a watchlist with target entry prices BEFORE rallies. If a stock blows through your target, let it go.',
  analysisParalysis: 'Set a research budget (e.g., 5 hours per decision). When it\'s up, decide. "Good enough" beats "never."',
  anchoringBias: 'Ignore old highs and lows. Value a stock based on future cash flows, not historical prices.',
  herdingBias: 'When everyone agrees, question it. The crowd is right at the trend but wrong at the turns.',
  sunkCostFallacy: 'Ask: "If I didn\'t already own this, would I buy it at today\'s price?" If no, sell.',
  timeHorizonMismatch: 'Match your strategy to when you need the money. Long horizons = more stocks. Short = more bonds.',
  concentrationBias: 'Cap any single position at 10% of portfolio. A 50% loss in 10% is recoverable. In 40% it\'s catastrophic.',
  regretAversion: 'Decisions are good or bad based on the process, not the outcome. Make defensible decisions; accept randomness.',
};

export const BIAS_TO_LESSON: Record<BiasCategory, string> = {
  lossAversion: 'T2L15',
  recencyBias: 'T2L15',
  overconfidence: 'T2L13',
  confirmationBias: 'T2L13',
  fomoSusceptibility: 'T2L06',
  analysisParalysis: 'T2L13',
  anchoringBias: 'T2L05',
  herdingBias: 'T2L15',
  sunkCostFallacy: 'T2L15',
  timeHorizonMismatch: 'T2L14',
  concentrationBias: 'T2L14',
  regretAversion: 'T2L15',
};

export const behavioralQuestions: BiasQuestion[] = [
  {
    id: 'q1',
    category: 'lossAversion',
    question: 'You bought a stock at $50. It\'s now $35 (down 30%). Nothing has changed about the business. What do you do?',
    options: [
      { text: 'Sell immediately to stop the pain', score: 10 },
      { text: 'Hold and hope it recovers', score: 6 },
      { text: 'Review my thesis — if it\'s intact, consider buying more', score: 2 },
    ],
  },
  {
    id: 'q2',
    category: 'recencyBias',
    question: 'The S&P 500 just fell 15% in two weeks. How do you feel about stocks for the next 6 months?',
    options: [
      { text: 'Worried — more drops likely, I should reduce exposure', score: 9 },
      { text: 'Cautiously neutral — wait and see', score: 5 },
      { text: 'Constructive — corrections create opportunities', score: 2 },
    ],
  },
  {
    id: 'q3',
    category: 'overconfidence',
    question: 'How would you rate your investing skill vs. the average individual investor?',
    options: [
      { text: 'Significantly above average', score: 10 },
      { text: 'Slightly above average', score: 7 },
      { text: 'About average — markets are humbling', score: 3 },
    ],
  },
  {
    id: 'q4',
    category: 'confirmationBias',
    question: 'You\'re about to buy a stock. How much time do you spend reading the bear case?',
    options: [
      { text: 'Almost none — I\'ve done my homework', score: 9 },
      { text: 'A little — I skim the negatives', score: 6 },
      { text: 'Equal time — I deliberately study what could go wrong', score: 2 },
    ],
  },
  {
    id: 'q5',
    category: 'fomoSusceptibility',
    question: 'A stock you watched at $50 is now $120 after hot earnings. Everyone\'s talking about it. What do you do?',
    options: [
      { text: 'Buy now before it goes higher', score: 10 },
      { text: 'Watch closely, buy on a pullback', score: 5 },
      { text: 'Skip it — the easy money is gone', score: 2 },
    ],
  },
  {
    id: 'q6',
    category: 'analysisParalysis',
    question: 'You\'ve identified a stock that fits your criteria. How much more research do you typically do?',
    options: [
      { text: 'Weeks of analysis, checking every detail', score: 9 },
      { text: 'A few days to confirm the basics', score: 5 },
      { text: 'A few hours — I trust my framework and act', score: 2 },
    ],
  },
  {
    id: 'q7',
    category: 'anchoringBias',
    question: 'A stock you like dropped from $200 to $50. The company had real problems. What\'s your reaction?',
    options: [
      { text: '"It\'s a steal — used to be $200!"', score: 10 },
      { text: 'Need to investigate why it fell', score: 4 },
      { text: 'Past price is irrelevant. Is $50 fair value now?', score: 2 },
    ],
  },
  {
    id: 'q8',
    category: 'herdingBias',
    question: 'All your friends and social media are buzzing about a hot new stock. Do you...',
    options: [
      { text: 'Buy in before missing out', score: 10 },
      { text: 'Research it but probably buy', score: 6 },
      { text: 'Become more skeptical — popular bets are usually overpriced', score: 2 },
    ],
  },
  {
    id: 'q9',
    category: 'sunkCostFallacy',
    question: 'You have a stock down 40%. Your original thesis is broken. What do you do?',
    options: [
      { text: 'Hold until break-even, then sell', score: 10 },
      { text: 'Sell some, hold some — average down', score: 6 },
      { text: 'Sell now — original price is irrelevant', score: 2 },
    ],
  },
  {
    id: 'q10',
    category: 'timeHorizonMismatch',
    question: 'You need this money for a house down payment in 2 years. How are you invested?',
    options: [
      { text: 'Mostly stocks — I want maximum growth', score: 10 },
      { text: 'Half stocks, half bonds', score: 6 },
      { text: 'Mostly bonds and cash — preservation is critical', score: 2 },
    ],
  },
  {
    id: 'q11',
    category: 'concentrationBias',
    question: 'Your highest-conviction stock idea. What\'s the maximum portfolio percentage you\'d allocate?',
    options: [
      { text: '40%+ — concentrate where you have conviction', score: 10 },
      { text: '20-30% — meaningful but not all-in', score: 6 },
      { text: '5-10% — even my best ideas can be wrong', score: 2 },
    ],
  },
  {
    id: 'q12',
    category: 'regretAversion',
    question: 'You\'re considering a strategy that could work but might look stupid if it fails. What do you do?',
    options: [
      { text: 'Avoid it — I couldn\'t handle the regret', score: 10 },
      { text: 'Do a smaller version to test', score: 5 },
      { text: 'If the logic is sound, do it', score: 2 },
    ],
  },
];

export function scoreAssessment(answers: Record<string, number>): BiasProfile {
  const scores: Record<BiasCategory, number> = {
    lossAversion: 0, recencyBias: 0, overconfidence: 0, confirmationBias: 0,
    fomoSusceptibility: 0, analysisParalysis: 0, anchoringBias: 0, herdingBias: 0,
    sunkCostFallacy: 0, timeHorizonMismatch: 0, concentrationBias: 0, regretAversion: 0,
  };

  for (const question of behavioralQuestions) {
    const answerIndex = answers[question.id];
    if (answerIndex !== undefined && question.options[answerIndex]) {
      scores[question.category] = question.options[answerIndex].score;
    }
  }

  const sorted = (Object.keys(scores) as BiasCategory[]).sort((a, b) => scores[b] - scores[a]);
  const topBiases = sorted.filter(b => scores[b] >= 6).slice(0, 3);
  const recommendedLessons = [...new Set(topBiases.map(b => BIAS_TO_LESSON[b]))];

  return {
    scores,
    topBiases,
    assessmentDate: new Date().toISOString(),
    recommendedLessons,
  };
}

// ── Missing exports that BehavioralAssessmentScreen needs ──────────────────

export const BIAS_EMOJIS: Record<BiasCategory, string> = {
  lossAversion: '😰',
  recencyBias: '📅',
  overconfidence: '😤',
  confirmationBias: '🎯',
  fomoSusceptibility: '🏃',
  analysisParalysis: '🔄',
  anchoringBias: '⚓',
  herdingBias: '🐑',
  sunkCostFallacy: '🕳️',
  timeHorizonMismatch: '⏰',
  concentrationBias: '🎰',
  regretAversion: '😬',
};

export function getBiasSeverityLabel(score: number): string {
  if (score >= 9) return 'Critical';
  if (score >= 7) return 'High';
  if (score >= 5) return 'Moderate';
  if (score >= 3) return 'Low';
  return 'Minimal';
}

export function getBiasSeverityColor(score: number): string {
  if (score >= 9) return '#F87171';
  if (score >= 7) return '#F59E0B';
  if (score >= 5) return '#F5A623';
  if (score >= 3) return '#34D399';
  return '#10B981';
}

// Alias so both BehavioralAssessmentScreen and behavioralStore can use it
export const calculateBiasProfile = scoreAssessment;
