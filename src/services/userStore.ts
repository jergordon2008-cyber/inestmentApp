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

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;

  // Actions
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  completeLesson: (lessonId: string) => void;
  earnBadge: (badgeId: string) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
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

      incrementStreak: () => set((state) => {
        if (!state.user) return state;
        const today = new Date().toISOString().split('T')[0];
        if (state.user.lastActiveDate === today) return state; // already counted today

        return {
          user: {
            ...state.user,
            streak: state.user.streak + 1,
            lastActiveDate: today,
            updatedAt: new Date().toISOString(),
          },
        };
      }),

      resetStreak: () => set((state) => {
        if (!state.user) return state;
        return {
          user: {
            ...state.user,
            streak: 0,
            updatedAt: new Date().toISOString(),
          },
        };
      }),

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
    totalLessonsWatched: 0,
    totalTradesExecuted: 0,
    subscription: 'free',
    notificationsEnabled: true,
    themeMode: 'dark',
    createdAt: now,
    updatedAt: now,
  };
}
