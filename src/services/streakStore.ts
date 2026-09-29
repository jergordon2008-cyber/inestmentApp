/**
 * Streak Store — now only the Market Minute's device state, plus the retired
 * streak fields kept for a one-time migration.
 *
 * The daily streak moved to the user profile (services/dailyStreak.ts):
 * here it was device-only, belonged to no account (it carried over to the
 * next account on the device), counted UTC days, and never reached the cloud.
 * currentStreak / longestStreak / lastActiveDate / freezesAvailable /
 * totalDaysActive are no longer written; App.tsx reads them once per account
 * (fromLegacyStreakStore) when this device's portfolio belongs to that
 * account, and records `migratedTo` so it never happens twice.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDay } from './dailyStreak';

export interface MicroLesson {
  id: string;
  date: string;              // local 'YYYY-MM-DD'
  title: string;
  contentMarkdown: string;
  estimatedReadSeconds: number;
  category: 'concept' | 'market_news' | 'tip' | 'history';
  relatedStockSymbols?: string[];
}

interface StreakState {
  // Retired streak fields — read once for migration, never written.
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezesAvailable: number;
  totalDaysActive: number;
  /** uids this device's legacy streak has already been migrated into. */
  migratedTo: string[];

  // Market Minute
  microLessonsRead: string[];          // IDs of completed micro-lessons
  /** Local day the Market Minute was last finished on this device. */
  microLessonReadOn: string | null;

  markMicroLessonRead: (lessonId: string) => void;
  markLegacyMigrated: (uid: string) => void;
}

/** Whether today's Market Minute is already done on this device. */
export const selectMicroLessonReadToday = (s: StreakState) => s.microLessonReadOn === localDay();

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      freezesAvailable: 0,
      totalDaysActive: 0,
      migratedTo: [],
      microLessonsRead: [],
      microLessonReadOn: null,

      markMicroLessonRead: (lessonId: string) => {
        const state = get();
        set({
          microLessonsRead: state.microLessonsRead.includes(lessonId) ? state.microLessonsRead : [...state.microLessonsRead, lessonId],
          microLessonReadOn: localDay(),
        });
      },

      markLegacyMigrated: (uid: string) => {
        const state = get();
        if (!state.migratedTo.includes(uid)) set({ migratedTo: [...state.migratedTo, uid] });
      },
    }),
    {
      name: 'investapp-streak-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================================================
// MICRO-LESSON CONTENT BANK
// ============================================================================

/**
 * 3-minute "Market Minute" daily lessons. These are NOT part of Tier 1 — they're
 * lightweight engagement content shown daily to keep users coming back.
 * 
 * Pulled in rotation. Real production would have hundreds, refreshed daily.
 */
export const microLessonBank: Omit<MicroLesson, 'date'>[] = [
  {
    id: 'ml_001',
    title: 'Why compound interest is "the 8th wonder"',
    contentMarkdown: `Einstein supposedly called compound interest "the 8th wonder of the world." Here's why:

$1,000 invested at 8% per year:
- After 1 year: $1,080
- After 10 years: $2,159
- After 30 years: $10,062
- After 50 years: $46,901

The money makes money on top of money. Time is the secret ingredient.

**Key insight:** Starting at 25 vs 35 (10 years earlier) more than DOUBLES your retirement at 65, with the same monthly contribution.`,
    estimatedReadSeconds: 90,
    category: 'concept',
  },
  
  {
    id: 'ml_002',
    title: 'The 4% rule explained',
    contentMarkdown: `The "4% rule" is one of the most famous concepts in retirement planning.

**The idea:** If you withdraw 4% of your portfolio per year, your money should last 30+ years.

**Example:** $1,000,000 portfolio = $40,000/year safe withdrawal.

The rule comes from the "Trinity Study" (1998), which tested withdrawal rates against actual stock market history.

**Caveats:** It assumes 60/40 stocks/bonds, and recent research suggests 3.3% may be safer in low-return environments.`,
    estimatedReadSeconds: 75,
    category: 'concept',
  },
  
  {
    id: 'ml_003',
    title: 'What "dollar-cost averaging" really does',
    contentMarkdown: `Instead of investing $12,000 all at once, you invest $1,000 per month for a year.

**Why it works:**
- When prices are high → your $1,000 buys fewer shares
- When prices are low → your $1,000 buys more shares
- Net result: lower average cost per share

It's not about getting "the best return" — it's about removing emotion and timing from the equation.

**Pro tip:** Most 401(k) plans dollar-cost average automatically. That's why they work so well.`,
    estimatedReadSeconds: 70,
    category: 'concept',
  },
  
  {
    id: 'ml_004',
    title: 'The most misunderstood metric: P/E ratio',
    contentMarkdown: `Price-to-Earnings (P/E) is everyone's favorite metric, but it's often misused.

**What it actually means:** "Years of current earnings to pay for the stock"

A P/E of 20 = you're paying $20 for every $1 of annual earnings.

**Common misuse:** "P/E is low, so it's cheap!"

But cheap stocks are often cheap for reasons:
- Earnings might be declining
- Industry might be dying
- One-time event inflating current earnings

**Better question:** Why is the P/E what it is? Is the market right or wrong?`,
    estimatedReadSeconds: 85,
    category: 'concept',
  },
  
  {
    id: 'ml_005',
    title: 'Why Warren Buffett owns Coca-Cola forever',
    contentMarkdown: `Buffett's Berkshire Hathaway has owned Coca-Cola since 1988 — that's 38+ years.

**Why hasn't he sold?**

1. The dividend keeps growing (15%+ years of increases)
2. His original $1.3 billion investment now pays him over $700M/year in dividends
3. His effective dividend yield on cost is ~50%

**The lesson:** Truly great companies + time = wealth. The temptation to sell after a 100% gain often cuts off the next 1,000% gain.

This is why "buy and hold" beats "buy and trade" 90% of the time.`,
    estimatedReadSeconds: 80,
    category: 'history',
  },
  
  {
    id: 'ml_006',
    title: 'The biggest market crash in history',
    contentMarkdown: `The 1929 crash was historic, but the worst single day was...

**October 19, 1987 — "Black Monday"**

The Dow dropped 22.6% in a single day. Today that would be like the market falling 9,500 points overnight.

**The cause?** A combination of:
- Computer-driven "portfolio insurance" selling
- Margin calls cascading
- Pure panic

**The recovery?** Stocks were back to pre-crash levels within 2 years. By 2000, the market was up 600% from that low point.

**Lesson:** Even the worst single days don't matter if you don't sell.`,
    estimatedReadSeconds: 90,
    category: 'history',
  },
  
  {
    id: 'ml_007',
    title: 'The 401(k) match is free money',
    contentMarkdown: `If your employer offers a 401(k) match, NOT contributing is leaving free money on the table.

**Example:** You earn $60k, employer matches 100% up to 4% of salary.

If you contribute 4% ($2,400):
- You put in: $2,400
- Employer adds: $2,400
- Total: $4,800 invested

That's a **100% instant return** before the market does anything.

**Step 1 of investing:** Always contribute at least enough to capture your full employer match. Other strategies come later.`,
    estimatedReadSeconds: 65,
    category: 'tip',
  },
  
  {
    id: 'ml_008',
    title: 'Why you should ignore CNBC',
    contentMarkdown: `Financial TV (CNBC, Bloomberg, etc.) needs you to watch every day.

To keep you watching, they need:
- Drama, urgency, fear
- Constant "breaking news"
- Pundits making bold predictions

**The result:** They make you feel like you need to do something NOW.

**The reality:** The best investors do almost nothing most of the time. Warren Buffett checks his portfolio... rarely.

**The advice:** Set a quarterly review schedule. Ignore daily noise. Long-term thinking is your edge over Wall Street.`,
    estimatedReadSeconds: 75,
    category: 'tip',
  },
];

/**
 * Returns today's micro-lesson based on day-of-year hash.
 * Same lesson shown to all users on the same day for community feel.
 */
/**
 * Not shown until their factual claims are checked (Buffett / Coca-Cola
 * figures; crash statistics). Kept in the bank, out of the rotation.
 */
export const UNVERIFIED_MICRO_LESSONS = new Set(['ml_005', 'ml_006']);

export function getTodaysMicroLesson(): MicroLesson {
  const today = new Date();
  const rotation = microLessonBank.filter(l => !UNVERIFIED_MICRO_LESSONS.has(l.id));
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const lesson = rotation[dayOfYear % rotation.length];
  return { ...lesson, date: localDay(today) };
}
