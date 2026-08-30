import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Mood = 'calm' | 'excited' | 'anxious' | 'frustrated' | 'fomo';

export interface MoodEntry {
  mood: Mood;
  date: string;
  tradeSymbol?: string;
  tradeOutcome?: number; // % gain/loss on that trade
}

interface MoodState {
  todayMood: Mood | null;
  history: MoodEntry[];
  setMood: (mood: Mood, symbol?: string) => void;
  recordTradeOutcome: (symbol: string, pct: number) => void;
  getMoodStats: () => Record<Mood, { count: number; avgReturn: number }>;
}

export const MOOD_CONFIG: Record<Mood, { emoji: string; label: string; color: string; warning: string; safe: boolean }> = {
  calm:       { emoji: '😌', label: 'Calm',       color: '#10B981', warning: '', safe: true },
  excited:    { emoji: '🤩', label: 'Excited',     color: '#F59E0B', warning: 'Excitement can lead to overtrading. Double-check your sizing.', safe: false },
  anxious:    { emoji: '😰', label: 'Anxious',     color: '#F87171', warning: 'Anxiety often causes panic selling. Is this really the right time?', safe: false },
  frustrated: { emoji: '😤', label: 'Frustrated',  color: '#EF4444', warning: 'Frustrated trading = revenge trading. Step away if you can.', safe: false },
  fomo:       { emoji: '🏃', label: 'FOMO',        color: '#8B5CF6', warning: 'FOMO is the #1 cause of buying tops. Pause and breathe.', safe: false },
};

export const useMoodStore = create<MoodState>((set, get) => ({
  todayMood: null,
  history: [],

  setMood: (mood, symbol) => {
    const entry: MoodEntry = { mood, date: new Date().toISOString(), tradeSymbol: symbol };
    const updated = [entry, ...get().history].slice(0, 200);
    set({ todayMood: mood, history: updated });
    AsyncStorage.setItem('@investapp:mood_history', JSON.stringify(updated)).catch(() => {});
  },

  recordTradeOutcome: (symbol, pct) => {
    set(s => ({
      history: s.history.map((h, i) =>
        i === 0 && h.tradeSymbol === symbol ? { ...h, tradeOutcome: pct } : h
      ),
    }));
  },

  getMoodStats: () => {
    const stats: Record<Mood, { count: number; avgReturn: number }> = {
      calm: { count: 0, avgReturn: 0 }, excited: { count: 0, avgReturn: 0 },
      anxious: { count: 0, avgReturn: 0 }, frustrated: { count: 0, avgReturn: 0 },
      fomo: { count: 0, avgReturn: 0 },
    };
    get().history.filter(h => h.tradeOutcome !== undefined).forEach(h => {
      stats[h.mood].count++;
      stats[h.mood].avgReturn += h.tradeOutcome!;
    });
    Object.keys(stats).forEach(k => {
      const m = k as Mood;
      if (stats[m].count > 0) stats[m].avgReturn /= stats[m].count;
    });
    return stats;
  },
}));
