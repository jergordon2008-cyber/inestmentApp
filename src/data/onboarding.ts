/**
 * Onboarding Questions
 * 
 * 5 questions asked during signup that personalize the entire experience:
 * - Risk tolerance: How much loss can they handle emotionally?
 * - Experience level: Have they invested before?
 * - Primary goal: Why are they here?
 * - Time horizon: When do they need the money?
 * - Time commitment: How often will they engage?
 * 
 * Industry research shows personalized onboarding increases 30-day retention
 * by 40%+ vs generic onboarding.
 */

import { RiskTolerance } from '../types';

export interface OnboardingQuestion {
  id: string;
  question: string;
  subtitle?: string;
  options: OnboardingOption[];
  /** Ionicons name — the app's icon set. */
  illustration?: string;  // Ionicons name — the app's icon set
}

export interface OnboardingOption {
  id: string;
  label: string;
  description?: string;
  value: string | number;
}

export interface OnboardingAnswers {
  experience: 'none' | 'beginner' | 'some' | 'experienced';
  goal: 'retirement' | 'wealth_building' | 'education' | 'income';
  riskTolerance: RiskTolerance;
  timeHorizon: 'short' | 'medium' | 'long';
  commitment: 'casual' | 'regular' | 'intensive';
}

export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: 'experience',
    question: 'How much do you know about investing?',
    subtitle: 'There\'s no wrong answer — we\'ll tailor lessons to your level',
    illustration: 'school-outline',
    options: [
      {
        id: 'none',
        label: 'Total beginner',
        description: 'I\'ve never invested in anything',
        value: 'none',
      },
      {
        id: 'beginner',
        label: 'I\'ve heard the basics',
        description: 'I know what stocks are, but not how to start',
        value: 'beginner',
      },
      {
        id: 'some',
        label: 'I have some experience',
        description: 'I\'ve made a few investments before',
        value: 'some',
      },
      {
        id: 'experienced',
        label: 'I\'m experienced',
        description: 'I want to sharpen advanced strategies',
        value: 'experienced',
      },
    ],
  },
  
  {
    id: 'goal',
    question: 'What\'s your main goal?',
    subtitle: 'This helps us prioritize what to teach you first',
    illustration: 'locate-outline',
    options: [
      {
        id: 'retirement',
        label: 'Save for retirement',
        description: 'Long-term wealth that compounds',
        value: 'retirement',
      },
      {
        id: 'wealth_building',
        label: 'Build wealth over time',
        description: 'Grow my money in 5-20 year horizon',
        value: 'wealth_building',
      },
      {
        id: 'income',
        label: 'Generate income',
        description: 'Make money from dividends or trades',
        value: 'income',
      },
      {
        id: 'education',
        label: 'Just learn',
        description: 'I want to understand how it all works',
        value: 'education',
      },
    ],
  },
  
  {
    id: 'riskTolerance',
    question: 'If your portfolio dropped 20%, how would you feel?',
    subtitle: 'Imagine you have $10,000 invested and it\'s suddenly worth $8,000',
    illustration: 'pulse-outline',
    options: [
      {
        id: 'conservative',
        label: 'I\'d panic and sell everything',
        description: 'I can\'t handle big swings',
        value: 'conservative',
      },
      {
        id: 'moderate',
        label: 'I\'d be uneasy but hold',
        description: 'I\'d trust the long-term plan',
        value: 'moderate',
      },
      {
        id: 'aggressive',
        label: 'I\'d see it as a buying opportunity',
        description: 'I welcome volatility for higher returns',
        value: 'aggressive',
      },
    ],
  },
  
  {
    id: 'timeHorizon',
    question: 'When do you need this money?',
    subtitle: 'Time changes everything — long horizons can handle more risk',
    illustration: '⏳',
    options: [
      {
        id: 'short',
        label: 'Within 2 years',
        description: 'Buying a house, emergency fund, etc.',
        value: 'short',
      },
      {
        id: 'medium',
        label: '3 to 10 years',
        description: 'Major purchase, kids\' education',
        value: 'medium',
      },
      {
        id: 'long',
        label: '10+ years',
        description: 'Retirement, generational wealth',
        value: 'long',
      },
    ],
  },
  
  {
    id: 'commitment',
    question: 'How often will you engage with the app?',
    subtitle: 'Be honest — we\'ll match the experience to your reality',
    illustration: 'phone-portrait-outline',
    options: [
      {
        id: 'casual',
        label: 'A few minutes a week',
        description: 'I\'ll check in occasionally',
        value: 'casual',
      },
      {
        id: 'regular',
        label: '10-15 minutes a day',
        description: 'I\'m committed to learning consistently',
        value: 'regular',
      },
      {
        id: 'intensive',
        label: 'I\'m all in',
        description: 'Multiple sessions per day',
        value: 'intensive',
      },
    ],
  },
];

/**
 * Calculate personalized recommendations based on answers.
 * 
 * Returns:
 * - Suggested starting portfolio allocation
 * - Recommended initial holdings
 * - Custom lesson order based on goals
 */
export function getPersonalizedPlan(answers: Partial<OnboardingAnswers>) {
  const { experience, goal, riskTolerance, timeHorizon } = answers;
  
  // Calculate portfolio allocation based on risk + time horizon
  let stockAllocation = 60;
  let bondAllocation = 30;
  let cashAllocation = 10;
  
  if (riskTolerance === 'conservative') {
    stockAllocation = 40;
    bondAllocation = 50;
    cashAllocation = 10;
  } else if (riskTolerance === 'aggressive') {
    stockAllocation = 85;
    bondAllocation = 10;
    cashAllocation = 5;
  }
  
  // Adjust for time horizon
  if (timeHorizon === 'short') {
    stockAllocation = Math.max(20, stockAllocation - 30);
    cashAllocation += 20;
    bondAllocation = 100 - stockAllocation - cashAllocation;
  } else if (timeHorizon === 'long') {
    stockAllocation = Math.min(95, stockAllocation + 15);
    bondAllocation = Math.max(0, bondAllocation - 10);
    cashAllocation = 100 - stockAllocation - bondAllocation;
  }
  
  // Recommend a starting lesson sequence
  let priorityTopics: string[] = [];
  if (goal === 'retirement' || timeHorizon === 'long') {
    priorityTopics = ['compounding', 'index_funds', 'tax_advantaged'];
  } else if (goal === 'income') {
    priorityTopics = ['dividends', 'bonds', 'income_strategies'];
  } else if (goal === 'wealth_building') {
    priorityTopics = ['growth_stocks', 'valuation', 'portfolio_construction'];
  } else {
    priorityTopics = ['fundamentals', 'markets', 'strategies'];
  }
  
  return {
    portfolioAllocation: {
      stocks: stockAllocation,
      bonds: bondAllocation,
      cash: cashAllocation,
    },
    priorityTopics,
    estimatedReturn: riskTolerance === 'aggressive' ? '8-12%' : 
                     riskTolerance === 'moderate' ? '6-9%' : '4-6%',
    riskLabel: riskTolerance === 'aggressive' ? 'Higher growth, higher swings' :
               riskTolerance === 'moderate' ? 'Balanced growth and stability' :
               'Steady growth, lower swings',
  };
}
