import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TradeReason = 'fundamental' | 'technical' | 'news' | 'tip' | 'gut' | 'plan' | 'fomo';

export interface JournalEntry {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  reason: TradeReason;
  reasonNote: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  mood?: string;
  timestamp: string;
  outcome?: number; // % gain/loss when closed
}

export const REASON_CONFIG: Record<TradeReason, { label: string; icon: string; color: string }> = {
  fundamental: { label: 'Fundamentals',  icon: '📊', color: '#10B981' },
  technical:   { label: 'Chart Signal',  icon: '📈', color: '#5B5FEF' },
  news:        { label: 'News Event',    icon: '📰', color: '#F59E0B' },
  plan:        { label: 'My Playbook',   icon: '📖', color: '#06B6D4' },
  gut:         { label: 'Gut Feeling',   icon: '🤔', color: '#8B5CF6' },
  tip:         { label: 'Tip/Social',    icon: '💬', color: '#F87171' },
  fomo:        { label: 'FOMO',          icon: '🏃', color: '#EF4444' },
};

interface JournalState {
  entries: JournalEntry[];
  addEntry: (e: Omit<JournalEntry, 'id' | 'timestamp'>) => void;
  getReasonStats: () => Record<TradeReason, { count: number; avgOutcome: number; winRate: number }>;
  getConfidenceStats: () => { avgActualReturn: number; calibrationScore: number }[];
}

function genId() { return Date.now().toString(36); }

export const useDecisionJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (e) => {
        const entry: JournalEntry = { ...e, id: genId(), timestamp: new Date().toISOString() };
        const updated = [entry, ...get().entries].slice(0, 500);
        set({ entries: updated });
      },

      getReasonStats: () => {
    const base: Record<TradeReason, { count: number; avgOutcome: number; winRate: number }> = {
      fundamental: { count: 0, avgOutcome: 0, winRate: 0 },
      technical:   { count: 0, avgOutcome: 0, winRate: 0 },
      news:        { count: 0, avgOutcome: 0, winRate: 0 },
      tip:         { count: 0, avgOutcome: 0, winRate: 0 },
      gut:         { count: 0, avgOutcome: 0, winRate: 0 },
      plan:        { count: 0, avgOutcome: 0, winRate: 0 },
      fomo:        { count: 0, avgOutcome: 0, winRate: 0 },
    };
    const wins: Record<TradeReason, number> = { fundamental: 0, technical: 0, news: 0, tip: 0, gut: 0, plan: 0, fomo: 0 };
    get().entries.filter(e => e.outcome !== undefined).forEach(e => {
      base[e.reason].count++;
      base[e.reason].avgOutcome += e.outcome!;
      if (e.outcome! > 0) wins[e.reason]++;
    });
    (Object.keys(base) as TradeReason[]).forEach(r => {
      if (base[r].count > 0) {
        base[r].avgOutcome /= base[r].count;
        base[r].winRate = wins[r] / base[r].count;
      }
    });
    return base;
  },

      getConfidenceStats: () =>
        [1, 2, 3, 4, 5].map(conf => {
          const relevant = get().entries.filter(e => e.confidence === conf && e.outcome !== undefined);
          const avg = relevant.length ? relevant.reduce((s, e) => s + e.outcome!, 0) / relevant.length : 0;
          return { avgActualReturn: avg, calibrationScore: avg };
        }),
    }),
    {
      name: 'investapp-decision-journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
