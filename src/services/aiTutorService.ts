/**
 * AI Tutor Service
 *
 * Provides conversational AI tutoring tailored to user's current tier and progress.
 * Features:
 * - Context-aware responses (beginner vs advanced)
 * - Rate limiting (100 questions/hour per user)
 * - Caching of common questions
 * - Follow-up tracking (multi-turn conversations)
 */

import { callClaudeForTutor as _callClaudeForTutor } from './claudeAPI';

export interface TutorQuestion {
  id: string;
  userId: string;
  question: string;
  tier: 1 | 2 | 3;
  lessonsCompleted: number;
  timestamp: number;
}

export interface TutorAnswer {
  id: string;
  questionId: string;
  answer: string;
  followUpPrompts: string[];
  relatedLessonIds: string[];
  confidence: 'high' | 'medium' | 'low';
  sourceTopics: string[];
}

export interface TutorContext {
  userId: string;
  currentTier: 1 | 2 | 3;
  lessonsCompleted: number;
  completedLessonIds: string[];
  recentQuestions: TutorQuestion[];
  questionsAskedToday: number;
  totalQuestionsAsked: number;
}

// ============================================================================
// Cache for common questions (avoids redundant API calls)
// ============================================================================

const COMMON_QUESTIONS_CACHE: Record<string, TutorAnswer> = {
  'what is a p/e ratio': {
    id: 'cached-pe-ratio',
    questionId: 'cached-pe-ratio',
    answer: "The P/E ratio (Price-to-Earnings) measures how much investors pay for each dollar of a company's earnings. A P/E of 20 means investors pay $20 for every $1 of annual profit. High P/E (growth stocks like NVDA) means investors expect strong future growth. Low P/E (value stocks) may signal undervaluation — or a struggling business. Always compare P/E within the same industry.",
    followUpPrompts: [
      'What is a good P/E ratio?',
      'How does P/E compare to PEG ratio?',
      'Why do tech stocks have high P/E ratios?',
    ],
    relatedLessonIds: ['T1L05', 'T1L06'],
    confidence: 'high',
    sourceTopics: ['valuation', 'fundamental-analysis'],
  },
  'what is dollar cost averaging': {
    id: 'cached-dca',
    questionId: 'cached-dca',
    answer: "Dollar-cost averaging (DCA) means investing a fixed amount regularly — say $200 every month — regardless of the market price. When prices drop, your $200 buys more shares. When prices rise, it buys fewer. Over time this smooths out volatility and removes the pressure of timing the market perfectly. It's especially powerful for index funds and long-term investors.",
    followUpPrompts: [
      'How often should I invest with DCA?',
      'Does DCA work in a bear market?',
      'What ETF is best for DCA?',
    ],
    relatedLessonIds: ['T1L03'],
    confidence: 'high',
    sourceTopics: ['investing-strategy', 'risk-management'],
  },
};

// ============================================================================
// Rate limiting (simple in-memory store — resets on app restart)
// ============================================================================

const questionsAskedThisHour: { count: number; resetAt: number } = {
  count: 0,
  resetAt: Date.now() + 3_600_000,
};

const MAX_QUESTIONS_PER_HOUR = 100;

function checkRateLimit(): boolean {
  if (Date.now() > questionsAskedThisHour.resetAt) {
    questionsAskedThisHour.count = 0;
    questionsAskedThisHour.resetAt = Date.now() + 3_600_000;
  }
  if (questionsAskedThisHour.count >= MAX_QUESTIONS_PER_HOUR) return false;
  questionsAskedThisHour.count++;
  return true;
}

// ============================================================================
// Main ask function
// ============================================================================

export async function askTutor(
  question: string,
  context: Pick<TutorContext, 'currentTier' | 'lessonsCompleted'>,
): Promise<string> {
  if (!checkRateLimit()) {
    return "You've asked a lot of great questions! Take a short break and come back in an hour.";
  }

  const cacheKey = question.toLowerCase().trim();
  const cached = COMMON_QUESTIONS_CACHE[cacheKey];
  if (cached) return cached.answer;

  return _callClaudeForTutor(question, {
    tier: context.currentTier,
    lessonsCompleted: context.lessonsCompleted,
  });
}
