/**
 * User Store
 *
 * Centralized state for the current user. Uses Zustand for simplicity.
 * Any component can read/update user state via useUserStore().
 *
 * Persisted to AsyncStorage so user stays logged in across app restarts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Tier, RiskTolerance } from '../types';
import { applyActivity, streakFieldsOf, localDay, currentStreak, ActivityEvent } from './dailyStreak';
import { logEvent } from './analyticsService';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;

  // Actions
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  completeLesson: (lessonId: string) => void;
  earnBadge: (badgeId: string) => void;
  /**
   * Records a qualifying action (finished lesson, finished Market Minute,
   * graded prediction). Counts at most once per local day. Returns the
   * streak before and after, for the screen that celebrates it.
   */
  recordActivity: () => { before: number; after: number; event: ActivityEvent } | null;
  unlockTier: (tier: Tier) => void;
  logout: () => void;
  setOnboarded: (value: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isOnboarded: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates, updatedAt: new Date().toISOString() } : null,
      })),

      completeLesson: (lessonId) => set((state) => {
        if (!state.user) return state;
        if (state.user.lessonsCompleted.includes(lessonId)) return state;

        return {
          user: {
            ...state.user,
            lessonsCompleted: [...state.user.lessonsCompleted, lessonId],
            totalLessonsWatched: state.user.totalLessonsWatched + 1,
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      earnBadge: (badgeId) => set((state) => {
        if (!state.user) return state;
        if (state.user.badgesEarned.includes(badgeId)) return state;

        return {
          user: {
            ...state.user,
            badgesEarned: [...state.user.badgesEarned, badgeId],
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      recordActivity: () => {
        const user = get().user;
        if (!user) return null;
        const before = streakFieldsOf(user);
        const { next, event } = applyActivity(before, localDay());
        if (next !== before) {
          set({ user: { ...user, ...next, updatedAt: new Date().toISOString() } });
        }
        if (event === 'continued' || event === 'frozen') logEvent('streak_continued', { streak_length: next.streak });
        if (event === 'broken') logEvent('streak_broken', { streak_length: before.streak });
        return { before: before.streak, after: next.streak, event };
      },

      unlockTier: (tier) => set((state) => {
        if (!state.user) return state;
        if (state.user.currentTier >= tier) return state;

        return {
          user: {
            ...state.user,
            currentTier: tier,
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      logout: () => set({ user: null, isAuthenticated: false, isOnboarded: false }),

      setOnboarded: (value) => set({ isOnboarded: value }),
    }),
    {
      name: 'investapp-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================================================
// HELPER: Create a new user (used during signup/onboarding)
// ============================================================================

export function createNewUser(params: {
  id: string; // Firebase Auth uid — must match the account so Firestore docs key correctly
  email: string;
  displayName: string;
  riskTolerance: RiskTolerance;
  experienceLevel: 'none' | 'beginner' | 'some' | 'experienced';
  primaryGoal: 'retirement' | 'wealth_building' | 'education' | 'income';
}): User {
  const now = new Date().toISOString();

  return {
    id: params.id,
    email: params.email,
    displayName: params.displayName,
    currentTier: 1,
    lessonsCompleted: [],
    badgesEarned: [],
    riskTolerance: params.riskTolerance,
    experienceLevel: params.experienceLevel,
    primaryGoal: params.primaryGoal,
    streak: 0,
    lastActiveDate: '',
    longestStreak: 0,
    freezesAvailable: 0,
    totalDaysActive: 0,
    totalLessonsWatched: 0,
    totalTradesExecuted: 0,
    subscription: 'free',
    notificationsEnabled: true,
    themeMode: 'dark',
    createdAt: now,
    updatedAt: now,
  };
}

/** The streak as it stands today (0 if it lapsed), for display. */
export function useCurrentStreak(): number {
  const user = useUserStore(s => s.user);
  return user ? currentStreak(streakFieldsOf(user), localDay()) : 0;
}
