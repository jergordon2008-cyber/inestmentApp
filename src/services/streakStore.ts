/**
 * Streak Store
 * 
 * Manages the daily engagement system:
 * - Streaks (consecutive days active)
 * - Daily micro-lessons (3-minute "Market Minutes")
 * - Streak freezes (powerups to maintain streak)
 * - Last activity tracking
 * 
 * This is the engagement engine. Without daily streaks, users drop off
 * between full lessons. Duolingo's data shows streaks 5x retention.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from './analyticsService';

export interface MicroLesson {
  id: string;
  date: string;              // ISO date 'YYYY-MM-DD'
  title: string;
  contentMarkdown: string;
  estimatedReadSeconds: number;
  category: 'concept' | 'market_news' | 'tip' | 'history';
  relatedStockSymbols?: string[];
}

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;      // ISO date 'YYYY-MM-DD'
  freezesAvailable: number;
  totalDaysActive: number;
  microLessonsRead: string[];          // IDs of completed micro-lessons
  todaysMicroLessonRead: boolean;
  
  // Actions
  recordActivity: () => StreakUpdate;
  useFreezeToken: () => boolean;
  markMicroLessonRead: (lessonId: string) => void;
  resetStreak: () => void;
  earnFreeze: () => void;
}

interface StreakUpdate {
  newStreak: number;
  isNewRecord: boolean;
  isFirstToday: boolean;
  streakBroken: boolean;
  daysSinceLastActive: number;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      freezesAvailable: 0,
      totalDaysActive: 0,
      microLessonsRead: [],
      todaysMicroLessonRead: false,
      
      recordActivity: () => {
        const state = get();
        const today = getToday();
        
        // Already recorded activity today
        if (state.lastActiveDate === today) {
          return {
            newStreak: state.currentStreak,
            isNewRecord: false,
            isFirstToday: false,
            streakBroken: false,
            daysSinceLastActive: 0,
          };
        }
        
        // First time ever
        if (!state.lastActiveDate) {
          const newStreak = 1;
          set({
            currentStreak: newStreak,
            longestStreak: 1,
            lastActiveDate: today,
            totalDaysActive: 1,
            todaysMicroLessonRead: false,
          });
          return {
            newStreak,
            isNewRecord: true,
            isFirstToday: true,
            streakBroken: false,
            daysSinceLastActive: 0,
          };
        }
        
        const daysSince = getDaysBetween(state.lastActiveDate, today);
        
        // Continuing streak (yesterday)
        if (daysSince === 1) {
          const newStreak = state.currentStreak + 1;
          const isNewRecord = newStreak > state.longestStreak;
          set({
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, state.longestStreak),
            lastActiveDate: today,
            totalDaysActive: state.totalDaysActive + 1,
            todaysMicroLessonRead: false,
          });
          // Bonus: every 7 days, earn a freeze
          if (newStreak > 0 && newStreak % 7 === 0) {
            get().earnFreeze();
          }
          logEvent('streak_continued', { streak_length: newStreak });
          return {
            newStreak,
            isNewRecord,
            isFirstToday: true,
            streakBroken: false,
            daysSinceLastActive: daysSince,
          };
        }
        
        // Streak broken — use freeze if available
        if (state.freezesAvailable > 0 && daysSince === 2) {
          set({
            freezesAvailable: state.freezesAvailable - 1,
            lastActiveDate: today,
            totalDaysActive: state.totalDaysActive + 1,
            todaysMicroLessonRead: false,
          });
          return {
            newStreak: state.currentStreak,
            isNewRecord: false,
            isFirstToday: true,
            streakBroken: false,
            daysSinceLastActive: daysSince,
          };
        }
        
        // Streak broken, no freeze available
        set({
          currentStreak: 1,
          lastActiveDate: today,
          totalDaysActive: state.totalDaysActive + 1,
          todaysMicroLessonRead: false,
        });
        logEvent('streak_broken', { streak_length: state.currentStreak });
        return {
          newStreak: 1,
          isNewRecord: false,
          isFirstToday: true,
          streakBroken: true,
          daysSinceLastActive: daysSince,
        };
      },
      
      useFreezeToken: () => {
        const state = get();
        if (state.freezesAvailable > 0) {
          set({ freezesAvailable: state.freezesAvailable - 1 });
          return true;
        }
        return false;
      },
      
      markMicroLessonRead: (lessonId: string) => {
        const state = get();
        if (state.microLessonsRead.includes(lessonId)) return;
        set({
          microLessonsRead: [...state.microLessonsRead, lessonId],
          todaysMicroLessonRead: true,
        });
      },
      
      resetStreak: () => set({
        currentStreak: 0,
        lastActiveDate: null,
      }),
      
      earnFreeze: () => {
        const state = get();
        // Max 3 freezes at a time
        if (state.freezesAvailable < 3) {
          set({ freezesAvailable: state.freezesAvailable + 1 });
        }
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
export function getTodaysMicroLesson(): MicroLesson {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const lessonIndex = dayOfYear % microLessonBank.length;
  const lesson = microLessonBank[lessonIndex];
  
  return {
    ...lesson,
    date: today.toISOString().split('T')[0],
  };
}
