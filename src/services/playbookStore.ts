/**
 * Playbook Store
 * Tracks which playbooks user has activated and progress through each step.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PlaybookProgress {
  playbookId: string;
  activatedAt: string;
  completedSteps: string[];   // step IDs marked done
  notes: Record<string, string>; // optional notes per step
}

interface PlaybookState {
  activePlaybooks: PlaybookProgress[];
  activatePlaybook: (playbookId: string) => void;
  deactivatePlaybook: (playbookId: string) => void;
  toggleStep: (playbookId: string, stepId: string) => void;
  setStepNote: (playbookId: string, stepId: string, note: string) => void;
  getPlaybookProgress: (playbookId: string) => PlaybookProgress | undefined;
  loadPlaybooks: () => Promise<void>;
  resetPlaybooks: () => void;
}

const persist = (state: PlaybookProgress[]) => {
  AsyncStorage.setItem('active_playbooks', JSON.stringify(state)).catch(() => {});
};

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  activePlaybooks: [],

  activatePlaybook: (playbookId) => {
    const existing = get().activePlaybooks.find(p => p.playbookId === playbookId);
    if (existing) return;
    const updated = [
      ...get().activePlaybooks,
      {
        playbookId,
        activatedAt: new Date().toISOString(),
        completedSteps: [],
        notes: {},
      },
    ];
    set({ activePlaybooks: updated });
    persist(updated);
  },

  deactivatePlaybook: (playbookId) => {
    const updated = get().activePlaybooks.filter(p => p.playbookId !== playbookId);
    set({ activePlaybooks: updated });
    persist(updated);
  },

  toggleStep: (playbookId, stepId) => {
    const updated = get().activePlaybooks.map(p => {
      if (p.playbookId !== playbookId) return p;
      const isComplete = p.completedSteps.includes(stepId);
      return {
        ...p,
        completedSteps: isComplete
          ? p.completedSteps.filter(s => s !== stepId)
          : [...p.completedSteps, stepId],
      };
    });
    set({ activePlaybooks: updated });
    persist(updated);
  },

  setStepNote: (playbookId, stepId, note) => {
    const updated = get().activePlaybooks.map(p => {
      if (p.playbookId !== playbookId) return p;
      return { ...p, notes: { ...p.notes, [stepId]: note } };
    });
    set({ activePlaybooks: updated });
    persist(updated);
  },

  getPlaybookProgress: (playbookId) =>
    get().activePlaybooks.find(p => p.playbookId === playbookId),

  loadPlaybooks: async () => {
    try {
      const raw = await AsyncStorage.getItem('active_playbooks');
      if (raw) set({ activePlaybooks: JSON.parse(raw) });
    } catch {}
  },

  resetPlaybooks: () => {
    set({ activePlaybooks: [] });
    AsyncStorage.removeItem('active_playbooks').catch(() => {});
  },
}));
