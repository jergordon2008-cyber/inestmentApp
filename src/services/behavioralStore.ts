/**
 * Behavioral Store
 * Persists user's bias profile from the assessment.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiasProfile, scoreAssessment } from '../data/behavioralAssessment';

interface BehavioralState {
  profile: BiasProfile | null;
  hasCompletedAssessment: boolean;
  completeAssessment: (answers: Record<string, number>) => BiasProfile;
  loadProfile: () => Promise<void>;
  resetAssessment: () => void;
}

export const useBehavioralStore = create<BehavioralState>((set) => ({
  profile: null,
  hasCompletedAssessment: false,

  completeAssessment: (answers) => {
    const profile = scoreAssessment(answers);
    set({ profile, hasCompletedAssessment: true });
    AsyncStorage.setItem('behavioral_profile', JSON.stringify(profile)).catch(() => {});
    return profile;
  },

  loadProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem('behavioral_profile');
      if (raw) {
        const profile = JSON.parse(raw) as BiasProfile;
        set({ profile, hasCompletedAssessment: true });
      }
    } catch {}
  },

  resetAssessment: () => {
    set({ profile: null, hasCompletedAssessment: false });
    AsyncStorage.removeItem('behavioral_profile').catch(() => {});
  },
}));
