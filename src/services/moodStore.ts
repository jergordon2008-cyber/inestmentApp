import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Mood = 'calm' | 'excited' | 'anxious' | 'frustrated' | 'fomo';

export interface MoodEntry {
  mood: Mood;
  date: string;
  tradeSymbol?: string;
}

interface MoodState {
  todayMood: Mood | null;
  history: MoodEntry[];
  setMood: (mood: Mood, symbol?: string) => void;
}
// Mood used to be scored by the P&L of the trade that followed it
// (getMoodStats / recordTradeOutcome — never called, but one hookup away from
// the leak Phase C removed). A mood is now recorded on the prediction it came
// before, and scored like everything else: by the student's own grade (see
// predictionGrading's byMood).

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


}));
